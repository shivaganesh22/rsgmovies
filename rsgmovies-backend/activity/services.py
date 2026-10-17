import logging
from typing import Optional, Dict, Any
from django.http import HttpRequest
from activity.models import ActivityEvent, ActivityLogConfig

logger = logging.getLogger(__name__)

# Keys that must never be recorded in audit metadata
SENSITIVE_KEYS = {
    'password', 'encrypted_password', 'token', 'access_token', 'refresh_token',
    'secret', 'client_secret', 'authorization', 'cookie', 'cookies', 'credentials',
    'seedr_password', 'api_key', 'session_key', 'session', 'active_session_key',
    'sessionid', 'previous_session_key', 'new_session_key'
}


def _sanitize_metadata(data: Any) -> Any:
    """
    Recursively sanitize a dictionary or list to ensure no credentials/secrets are stored.
    """
    if isinstance(data, dict):
        sanitized = {}
        for k, v in data.items():
            if str(k).lower() in SENSITIVE_KEYS:
                sanitized[k] = "[REDACTED]"
            else:
                sanitized[k] = _sanitize_metadata(v)
        return sanitized
    elif isinstance(data, list):
        return [_sanitize_metadata(item) for item in data]
    return data


def _get_client_ip(request: HttpRequest) -> Optional[str]:
    if not request:
        return None
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded:
        return x_forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_activity_event(
    event_type: str,
    request: Optional[HttpRequest] = None,
    user=None,
    upn: Optional[str] = None,
    seedr_account_name: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    status_code: Optional[int] = None,
    duration_ms: Optional[float] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[ActivityEvent]:
    """
    Records an application activity or security event safely without blocking.
    Checks ActivityLogConfig to ensure the event category is enabled.
    """
    try:
        # Check if event type is enabled in config to save storage
        try:
            config = ActivityLogConfig.get_config()
            if not config.is_event_enabled(event_type):
                return None
        except Exception:
            pass  # Fallback to recording if config check fails

        # Extract user & UPN
        event_user = user
        event_upn = upn
        if not event_user and request and getattr(request, 'user', None) and request.user.is_authenticated:
            event_user = request.user

        if not event_upn and event_user:
            profile = getattr(event_user, 'userprofile', None)
            event_upn = profile.upn if profile else getattr(event_user, 'username', None)

        if not seedr_account_name and event_user:
            profile = getattr(event_user, 'userprofile', None)
            if profile and profile.seedr_account:
                seedr_account_name = profile.seedr_account.name

        # Extract request details
        endpoint = request.path if request else None
        http_method = request.method if request else None
        ip_address = _get_client_ip(request) if request else None
        user_agent = request.META.get('HTTP_USER_AGENT', '') if request else None
        request_id = getattr(request, 'id', None) if request else None

        safe_metadata = _sanitize_metadata(metadata or {})

        # Check for TV client header or session
        is_tv = bool(
            (request and request.META.get('HTTP_X_CLIENT') == 'TV') or
            (request and request.META.get('HTTP_X_TV_SESSION_TOKEN')) or
            (request and getattr(request, 'tv_session', None) is not None) or
            (event_user and getattr(event_user, '_is_tv_client', False))
        )
        if is_tv and not event_type.startswith('TV_'):
            event_type = f"TV_{event_type}"

        event = ActivityEvent.objects.create(
            user=event_user if (event_user and event_user.is_authenticated) else None,
            upn=event_upn,
            seedr_account_name=seedr_account_name,
            event_type=event_type,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            endpoint=endpoint,
            http_method=http_method,
            status_code=status_code,
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else None,
            request_id=request_id,
            duration_ms=duration_ms,
            metadata=safe_metadata
        )
        return event
    except Exception as e:
        logger.error(f"Failed to record activity event ({event_type}): {e}")
        return None


def log_security_event(event_type: str, request: Optional[HttpRequest] = None, user=None, metadata: Optional[Dict[str, Any]] = None, status_code: Optional[int] = None):
    """Convenience wrapper for security-related events."""
    return log_activity_event(
        event_type=event_type,
        request=request,
        user=user,
        status_code=status_code,
        metadata=metadata
    )
