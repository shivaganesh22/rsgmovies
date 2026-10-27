import uuid
import re
import logging
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import logout
from django.utils import timezone
from core.models import MaintenanceConfig

logger = logging.getLogger(__name__)

# Request ID regex for safety (UUID or alphanumeric 8-64 chars)
REQUEST_ID_REGEX = re.compile(r'^[a-zA-Z0-9_-]{8,64}$')


class RequestIDMiddleware(MiddlewareMixin):
    """
    Middleware that assigns a correlation request ID to every incoming request
    and includes it in the response headers (X-Request-ID).
    """
    def process_request(self, request):
        incoming_id = request.headers.get('X-Request-ID') or request.META.get('HTTP_X_REQUEST_ID')
        if incoming_id and REQUEST_ID_REGEX.match(incoming_id):
            request.id = incoming_id
        else:
            request.id = str(uuid.uuid4())

    def process_response(self, request, response):
        request_id = getattr(request, 'id', None)
        if request_id:
            response['X-Request-ID'] = request_id
        return response


class TVDeviceSessionMiddleware(MiddlewareMixin):
    """
    Middleware that strictly authenticates TV application requests on ALL endpoints
    (plain Django views and DRF views alike).
    Extracts TV Bearer token or X-TV-Session-Token header.
    Enforces the single active device policy across all platforms (Web and Android TV).
    If the session was revoked or overridden by another login on Web or another TV,
    immediately invalidates the session, records TV_SESSION_REVOKED audit log, and returns 401 SESSION_REVOKED.
    """
    EXEMPT_PREFIXES = (
        '/health',
        '/api/tv/auth/',
        '/api/tv/config',
        '/api/tv/version',
        '/api/schema',
        '/api/docs',
        '/static',
        '/media',
    )

    def process_request(self, request):
        token = None
        custom_header = request.META.get('HTTP_X_TV_SESSION_TOKEN')
        is_tv_route = request.path.startswith('/api/tv/')

        if custom_header:
            token = custom_header.strip()
        elif is_tv_route:
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() in ('bearer', 'token'):
                token = parts[1].strip()

        # If this is not a TV session token and not a TV endpoint, let standard Django/DRF auth handle it
        if not token:
            return None

        # Process TV device session authentication
        try:
            from tv.models import TVDeviceSession
            from activity.services import log_activity_event

            session = TVDeviceSession.objects.select_related('user', 'user__userprofile').filter(
                session_token=token
            ).first()

            if not session or not session.is_active:
                # If it's a legacy DRF token on non-TV route, do not block
                if not is_tv_route and not custom_header:
                    return None

                if session:
                    log_activity_event(
                        event_type='TV_SESSION_REVOKED',
                        request=request,
                        user=session.user,
                        metadata={'session_id': session.id, 'device_id': session.device_id, 'reason': 'session_inactive'}
                    )
                if not any(request.path.startswith(p) for p in self.EXEMPT_PREFIXES):
                    return JsonResponse(
                        {
                            "error": {
                                "code": "SESSION_REVOKED",
                                "message": "Your TV session was revoked because your account was logged into from another device.",
                                "request_id": getattr(request, 'id', None),
                            }
                        },
                        status=401
                    )
                return None

            user = session.user
            profile = getattr(user, 'userprofile', None)

            # Strict Single Active Device Across All Platforms:
            # Check if active_session_key in profile matches this TV session token
            if profile and profile.active_session_key and profile.active_session_key != token:
                session.is_active = False
                session.save(update_fields=['is_active'])
                log_activity_event(
                    event_type='TV_SESSION_REVOKED',
                    request=request,
                    user=user,
                    metadata={'session_id': session.id, 'device_id': session.device_id, 'reason': 'logged_in_on_another_device'}
                )
                if not any(request.path.startswith(p) for p in self.EXEMPT_PREFIXES):
                    return JsonResponse(
                        {
                            "error": {
                                "code": "SESSION_REVOKED",
                                "message": "Your TV session was revoked because your account was logged into from another device.",
                                "request_id": getattr(request, 'id', None),
                            }
                        },
                        status=401
                    )
                return None

            if not user.is_active or (profile and not profile.is_active):
                return JsonResponse(
                    {
                        "error": {
                            "code": "FORBIDDEN",
                            "message": "User account or profile is inactive.",
                            "request_id": getattr(request, 'id', None),
                        }
                    },
                    status=403
                )

            # Authenticate request for this user
            request.user = user
            request.tv_session = session
            user._is_tv_client = True

            session.last_active_at = timezone.now()
            session.save(update_fields=['last_active_at'])

        except Exception as e:
            logger.error(f"Error in TVDeviceSessionMiddleware: {e}")

        return None


class SingleActiveSessionMiddleware(MiddlewareMixin):
    """
    Middleware enforcing one active Django session per user.
    If the current session key does not match the active session key recorded in UserProfile,
    the session is invalidated and an authentication error is returned.
    """
    def process_request(self, request):
        # Exclude token/Bearer authenticated TV/API requests (handled by TVDeviceSessionMiddleware)
        if request.META.get('HTTP_AUTHORIZATION') or request.META.get('HTTP_X_TV_SESSION_TOKEN'):
            return None

        if not request.user.is_authenticated:
            return None

        # Exclude administrative/logout/tv-auth endpoints to allow clean exits
        path = request.path
        if path.startswith('/api/auth/logout') or path.startswith('/admin/logout') or path.startswith('/api/tv/auth/'):
            return None

        profile = getattr(request.user, 'userprofile', None)
        if profile is None:
            return None

        current_session_key = request.session.session_key
        active_session_key = profile.active_session_key

        # If user has an active session recorded and current session doesn't match
        if active_session_key and current_session_key and current_session_key != active_session_key:
            logger.warning(
                f"Session conflict detected for user {profile.upn} [request_id={getattr(request, 'id', None)}]. "
                f"Active session: {active_session_key}, Incoming session: {current_session_key}. Invalidating session."
            )
            logout(request)
            request_id = getattr(request, 'id', None)
            return JsonResponse(
                {
                    "error": {
                        "code": "SESSION_REVOKED",
                        "message": "Your session has ended because your account was logged into from another browser or window.",
                        "request_id": request_id,
                        "details": None
                    }
                },
                status=401
            )

        return None


class MaintenanceModeMiddleware(MiddlewareMixin):
    """
    Server-enforced maintenance mode middleware.
    When enabled in MaintenanceConfig:
    - Normal users receive a 503 Service Unavailable JSON response.
    - Admin users retain access if allow_admins is True.
    - Health checks and schema documentation endpoints remain accessible.
    """
    EXEMPT_URL_PREFIXES = (
        '/health',
        '/api/schema',
        '/api/docs',
        '/api/redoc',
        '/admin',
        '/api/auth',
        '/api/tv/config',
        '/api/tv/auth',
    )

    def process_request(self, request):
        # Exclude health check and doc endpoints
        if any(request.path.startswith(prefix) for prefix in self.EXEMPT_URL_PREFIXES):
            return None

        try:
            config = MaintenanceConfig.get_config()
            if not config.is_enabled:
                return None

            # Check if user is authenticated admin and admins are allowed
            if config.allow_admins and request.user.is_authenticated:
                profile = getattr(request.user, 'userprofile', None)
                if (profile and profile.role == 'Admin') or request.user.is_superuser:
                    return None

            # Block request with 503
            request_id = getattr(request, 'id', None)
            return JsonResponse(
                {
                    "error": {
                        "code": "SERVICE_UNAVAILABLE",
                        "message": config.message or "Service is temporarily unavailable due to scheduled maintenance.",
                        "request_id": request_id,
                        "details": {
                            "is_maintenance": True,
                            "title": getattr(config, 'title', 'System Maintenance') or 'System Maintenance',
                            "estimated_end": getattr(config, 'estimated_end', None).isoformat() if getattr(config, 'estimated_end', None) else None
                        }
                    }
                },
                status=503
            )
        except Exception as e:
            logger.error(f"Error checking maintenance mode: {e}")
            return None


class ReactSessionAuthMiddleware(MiddlewareMixin):
    """
    Middleware ensuring all React frontend endpoints (/react/...) and Admin APIs (/api/admin/...)
    strictly require authentication.
    - React Web App uses active authenticated Django session.
    - Android TV App uses TVDeviceSessionAuthentication / TVDeviceSessionMiddleware.
    - Admin endpoints additionally require the user to have the 'Admin' role.
    """
    PROTECTED_PREFIXES = (
        '/react/',
        '/api/admin/',
    )

    EXEMPT_PREFIXES = (
        '/react/contact/',
        '/react/test/',
    )

    def process_request(self, request):
        path = request.path

        # Exclude contact endpoints
        if any(path.startswith(prefix) for prefix in self.EXEMPT_PREFIXES):
            return None

        # If path starts with protected prefix (/react/ or /api/admin/)
        is_protected = any(path.startswith(prefix) for prefix in self.PROTECTED_PREFIXES)
        if not is_protected:
            return None

        if not request.user.is_authenticated:
            request_id = getattr(request, 'id', None)
            logger.warning(f"Unauthorized access attempt to {path} [req_id={request_id}]")
            return JsonResponse(
                {
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Authentication required. Please sign in or renew your session.",
                        "request_id": request_id,
                        "details": None
                    }
                },
                status=401
            )

        # For Admin management APIs, verify Admin role
        if path.startswith('/api/admin/'):
            profile = getattr(request.user, 'userprofile', None)
            is_admin = (profile and profile.role == 'Admin') or request.user.is_superuser
            if not is_admin:
                request_id = getattr(request, 'id', None)
                logger.warning(f"Forbidden admin access attempt by {request.user.username} to {path} [req_id={request_id}]")
                return JsonResponse(
                    {
                        "error": {
                            "code": "FORBIDDEN",
                            "message": "Access denied. Administrator privileges are required.",
                            "request_id": request_id,
                            "details": None
                        }
                    },
                    status=403
                )

        return None
