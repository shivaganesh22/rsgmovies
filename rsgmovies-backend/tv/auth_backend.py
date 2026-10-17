import logging
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from tv.models import TVDeviceSession
from activity.services import log_activity_event

logger = logging.getLogger(__name__)


class TVDeviceSessionAuthentication(BaseAuthentication):
    """
    DRF Authentication scheme for the new React Native TV application.
    Authenticates via:
    1. Authorization: Bearer <session_token>
    2. Authorization: Token <session_token>
    3. Header X-TV-Session-Token: <session_token>

    Validates that:
    - Session exists in TVDeviceSession and is_active is True.
    - If session is revoked (is_active is False), raises AuthenticationFailed with code 'SESSION_REVOKED'.
    - User and UserProfile are active.
    """

    def authenticate(self, request):
        token = self._extract_token(request)
        if not token:
            return None

        try:
            session = TVDeviceSession.objects.select_related('user', 'user__userprofile').filter(
                session_token=token
            ).first()

            if not session or not session.is_active:
                if session and not session.is_active:
                    log_activity_event(
                        event_type='TV_SESSION_REVOKED',
                        request=request,
                        user=session.user,
                        metadata={'session_id': session.id, 'device_id': session.device_id, 'reason': 'revoked_or_logged_in_elsewhere'}
                    )
                raise AuthenticationFailed({
                    "code": "SESSION_REVOKED",
                    "message": "Your TV session was revoked because your account was logged into from another device."
                })

            user = session.user
            if not user or not user.is_active:
                raise PermissionDenied("User account is inactive.")

            profile = getattr(user, 'userprofile', None)
            if profile and not profile.is_active:
                raise PermissionDenied("User profile is blocked or inactive.")

            # Update session last activity timestamp
            session.last_active_at = timezone.now()
            session.save(update_fields=['last_active_at'])

            # Attach session metadata to request
            request.tv_session = session
            user._is_tv_client = True

            return (user, session)

        except Exception as e:
            if isinstance(e, (AuthenticationFailed, PermissionDenied)):
                raise e
            logger.warning(f"Error authenticating TV device session: {e}")
            return None

    def _extract_token(self, request):
        # 1. Check custom X-TV-Session-Token header
        custom_header = request.META.get('HTTP_X_TV_SESSION_TOKEN')
        if custom_header:
            return custom_header.strip()

        # 2. Check standard Authorization header
        auth = get_authorization_header(request).split()
        if not auth:
            return None

        if len(auth) == 1:
            return auth[0].decode('utf-8')
        elif len(auth) == 2 and auth[0].lower() in (b'bearer', b'token'):
            return auth[1].decode('utf-8')

        return None
