import logging
from django.conf import settings
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.shortcuts import redirect
from django.utils import timezone
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from mozilla_django_oidc.views import (
    OIDCAuthenticationRequestView,
    OIDCAuthenticationCallbackView,
)

from accounts.models import UserProfile
from accounts.serializers import UserProfileSerializer, SessionInfoSerializer
from activity.services import log_activity_event, log_security_event

logger = logging.getLogger(__name__)


class EntraOIDCInitView(OIDCAuthenticationRequestView):
    """
    Initiates Microsoft Entra ID OpenID Connect login flow.
    Redirects browser to Entra ID authentication page.
    """
    pass


class EntraOIDCCallbackView(OIDCAuthenticationCallbackView):
    """
    Handles callback from Microsoft Entra ID with authorization code.
    Authenticates user, establishes Django server-side session,
    enforces one active session per user, and records security audit event.
    """
    def login_success(self):
        super().login_success()
        user = self.user
        request = self.request

        # Ensure session is saved and has a key
        if not request.session.session_key:
            request.session.save()

        session_key = request.session.session_key

        profile = getattr(user, 'userprofile', None)
        if profile:
            old_session_key = profile.active_session_key
            profile.active_session_key = session_key
            profile.last_login = timezone.now()
            profile.save(update_fields=['active_session_key', 'last_login', 'updated_at'])

            # Revoke any active TV device sessions for single-active-device policy
            try:
                from tv.models import TVDeviceSession
                revoked_count = TVDeviceSession.objects.filter(user=user, is_active=True).update(is_active=False)
                if revoked_count > 0:
                    log_security_event(
                        event_type='TV_SESSION_REVOKED',
                        request=request,
                        user=user,
                        status_code=200,
                        metadata={'reason': 'User signed into Web browser', 'revoked_sessions': revoked_count}
                    )
            except Exception as e:
                logger.warning(f"Error invalidating TV sessions on web login: {e}")

            log_security_event(
                event_type='LOGIN_SUCCESS',
                request=request,
                user=user,
                status_code=200,
                metadata={
                    'upn': profile.upn,
                    'role': profile.role,
                    'new_session_key': session_key,
                    'previous_session_key': old_session_key
                }
            )
            log_security_event(
                event_type='SESSION_CREATED',
                request=request,
                user=user,
                status_code=200,
                metadata={'session_key': session_key}
            )

        # Redirect cleanly to frontend URL (session is established via standard Django session cookie)
        redirect_url = getattr(settings, 'LOGIN_REDIRECT_URL', '/')
        return redirect(redirect_url)

    def login_failure(self):
        request = self.request
        log_security_event(
            event_type='LOGIN_FAILURE',
            request=request,
            status_code=401,
            metadata={'error': 'OIDC verification failed'}
        )
        return JsonResponse(
            {
                "error": {
                    "code": "AUTHENTICATION_FAILED",
                    "message": "Microsoft Entra ID authentication failed or user is unauthorized.",
                    "request_id": getattr(request, 'id', None),
                    "details": None
                }
            },
            status=401
        )


from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfTokenView(APIView):
    """
    Sets and returns the CSRF token cookie for frontend clients.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        token = get_token(request)
        return Response({
            "status": "ok",
            "csrf_token": token,
            "request_id": getattr(request, 'id', None)
        }, status=status.HTTP_200_OK)


class SessionMeView(APIView):
    """
    Retrieves information about the currently authenticated session and user profile.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, 'userprofile', None)

        if not profile or not profile.is_active:
            return Response(
                {
                    "error": {
                        "code": "USER_INACTIVE",
                        "message": "Your user profile is inactive or blocked.",
                        "request_id": getattr(request, 'id', None),
                        "details": None
                    }
                },
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = UserProfileSerializer(profile)
        session_expiry = request.session.get_expiry_age() if hasattr(request, 'session') else None

        data = {
            "authenticated": True,
            "user": serializer.data,
            "session_expiry_seconds": session_expiry,
            "request_id": getattr(request, 'id', None)
        }
        return Response(data, status=status.HTTP_200_OK)


class SessionLogoutView(APIView):
    """
    Terminates the current Django server-side session.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        user = request.user
        if user.is_authenticated:
            profile = getattr(user, 'userprofile', None)
            if profile and profile.active_session_key == request.session.session_key:
                profile.active_session_key = None
                profile.save(update_fields=['active_session_key', 'updated_at'])

            log_security_event(
                event_type='LOGOUT',
                request=request,
                user=user,
                status_code=200,
                metadata={'session_key': request.session.session_key}
            )

            auth_logout(request)

        return Response(
            {
                "status": "ok",
                "message": "Logged out successfully",
                "request_id": getattr(request, 'id', None)
            },
            status=status.HTTP_200_OK
        )

    def get(self, request):
        """Allow GET logout for simple browser navigation."""
        return self.post(request)
