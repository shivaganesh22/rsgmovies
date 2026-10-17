import os
import logging
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from tv.models import TVAuthRequest, TVDeviceSession, AppVersionConfig, generate_secure_token
from tv.serializers import (
    TVAuthInitRequestSerializer,
    TVAuthInitResponseSerializer,
    TVAuthPollResponseSerializer,
    TVAuthApproveRequestSerializer,
    TVDeviceSessionSerializer,
    AppVersionConfigSerializer,
    UserTVProfileSerializer,
)
from tv.auth_backend import TVDeviceSessionAuthentication
from accounts.models import UserProfile
from activity.services import log_activity_event, log_security_event
from react import movie_blast
from core.models import MaintenanceConfig

logger = logging.getLogger(__name__)

# Constants
TV_AUTH_TTL_SECONDS = 300  # 5 minutes
TV_POLL_INTERVAL_SECONDS = 3


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


class TVQRInitView(APIView):
    """
    Generates a new single-use QR Code authentication request for an Android TV device.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TVAuthInitRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": {"code": "VALIDATION_ERROR", "details": serializer.errors}}, status=status.HTTP_400_BAD_REQUEST)

        device_id = serializer.validated_data['device_id']
        device_name = serializer.validated_data.get('device_name', 'Android TV')
        client_ip = get_client_ip(request)

        # Cleanup older pending requests for this device
        TVAuthRequest.objects.filter(device_id=device_id, status='PENDING').update(status='EXPIRED')

        expires_at = timezone.now() + timedelta(seconds=TV_AUTH_TTL_SECONDS)
        auth_req = TVAuthRequest.objects.create(
            device_id=device_id,
            device_name=device_name,
            ip_address=client_ip,
            status='PENDING',
            expires_at=expires_at,
        )

        web_base_url = getattr(settings, 'LOGIN_REDIRECT_URL', 'https://rsgmovies.vercel.app/').rstrip('/')
        qr_code_url = f"{web_base_url}/tv-login?req={auth_req.request_id}"

        log_security_event(
            event_type='TV_QR_INIT',
            request=request,
            status_code=200,
            metadata={
                'request_id': auth_req.request_id,
                'device_id': device_id,
                'device_name': device_name,
                'expires_at': str(expires_at),
            }
        )

        response_data = {
            'request_id': auth_req.request_id,
            'qr_code_url': qr_code_url,
            'device_id': device_id,
            'expires_at': expires_at,
            'expires_in_seconds': TV_AUTH_TTL_SECONDS,
            'poll_interval_seconds': TV_POLL_INTERVAL_SECONDS,
        }

        return Response(response_data, status=status.HTTP_201_CREATED)


class TVQRPollView(APIView):
    """
    Fast rate-limited polling endpoint for the Android TV app to check QR login status.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        request_id = request.query_params.get('request_id', '').strip()
        device_id = request.query_params.get('device_id', '').strip()

        if not request_id:
            return Response({"error": {"code": "VALIDATION_ERROR", "message": "Query parameter 'request_id' is required"}}, status=status.HTTP_400_BAD_REQUEST)

        auth_req = TVAuthRequest.objects.filter(request_id=request_id).first()
        if not auth_req:
            return Response({"status": "EXPIRED", "message": "Authentication request not found or expired"}, status=status.HTTP_404_NOT_FOUND)

        # Check expiration
        if auth_req.status == 'PENDING' and timezone.now() > auth_req.expires_at:
            auth_req.status = 'EXPIRED'
            auth_req.save(update_fields=['status'])
            return Response({"status": "EXPIRED", "message": "Authentication request has expired"}, status=status.HTTP_200_OK)

        if auth_req.status == 'PENDING':
            return Response({"status": "PENDING", "message": "Waiting for user approval on phone/web"}, status=status.HTTP_200_OK)

        if auth_req.status == 'REJECTED':
            return Response({"status": "REJECTED", "message": "Authentication request was rejected by user"}, status=status.HTTP_200_OK)

        if auth_req.status == 'APPROVED':
            user = auth_req.approved_user
            profile = getattr(user, 'userprofile', None) if user else None
            user_data = UserTVProfileSerializer(profile).data if profile else None

            return Response({
                "status": "APPROVED",
                "session_token": auth_req.session_token,
                "user": user_data,
            }, status=status.HTTP_200_OK)

        return Response({"status": auth_req.status}, status=status.HTTP_200_OK)


class TVAuthRequestDetailView(APIView):
    """
    Provides public metadata for the phone / web approval page when scanning the TV QR code.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        request_id = request.query_params.get('request_id', '').strip()
        if not request_id:
            return Response({"error": {"code": "VALIDATION_ERROR", "message": "request_id is required"}}, status=status.HTTP_400_BAD_REQUEST)

        auth_req = TVAuthRequest.objects.filter(request_id=request_id).first()
        if not auth_req:
            return Response({"error": {"code": "NOT_FOUND", "message": "Invalid or expired QR code"}}, status=status.HTTP_404_NOT_FOUND)

        is_valid = auth_req.is_valid()
        return Response({
            "request_id": auth_req.request_id,
            "device_name": auth_req.device_name,
            "device_id": auth_req.device_id,
            "status": auth_req.status,
            "is_valid": is_valid,
            "expires_at": auth_req.expires_at,
            "created_at": auth_req.created_at,
        }, status=status.HTTP_200_OK)


class TVQRApproveView(APIView):
    """
    Called from the user's phone / web browser after authenticating with Microsoft Entra ID.
    Approves the pending TV login request and enforces single active device per user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TVAuthApproveRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": {"code": "VALIDATION_ERROR", "details": serializer.errors}}, status=status.HTTP_400_BAD_REQUEST)

        request_id = serializer.validated_data['request_id']
        action = serializer.validated_data['action']
        user = request.user
        profile = getattr(user, 'userprofile', None)

        if not profile or not profile.is_active:
            return Response({"error": {"code": "FORBIDDEN", "message": "User profile is inactive or blocked"}}, status=status.HTTP_403_FORBIDDEN)

        auth_req = TVAuthRequest.objects.filter(request_id=request_id).first()
        if not auth_req:
            return Response({"error": {"code": "NOT_FOUND", "message": "Authentication request not found"}}, status=status.HTTP_404_NOT_FOUND)

        if not auth_req.is_valid():
            return Response({"error": {"code": "EXPIRED", "message": "This QR authentication request has expired or has already been used"}}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'reject':
            auth_req.status = 'REJECTED'
            auth_req.save(update_fields=['status', 'updated_at'])
            log_security_event(
                event_type='TV_QR_REJECTED',
                request=request,
                user=user,
                status_code=200,
                metadata={'request_id': request_id, 'device_id': auth_req.device_id}
            )
            return Response({"status": "REJECTED", "message": "TV authentication request was rejected"}, status=status.HTTP_200_OK)

        # Action: Approve
        # 1. Enforce Single Active Device: Revoke any existing active TV sessions for this user
        TVDeviceSession.objects.filter(user=user, is_active=True).update(is_active=False)

        # 2. Create New Long-Lived TV Device Session
        session_token = generate_secure_token()
        tv_session = TVDeviceSession.objects.create(
            user=user,
            device_id=auth_req.device_id,
            device_name=auth_req.device_name,
            session_token=session_token,
            is_active=True,
            ip_address=auth_req.ip_address or get_client_ip(request),
            last_active_at=timezone.now(),
        )

        # 3. Update UserProfile active_session_key
        profile.active_session_key = session_token
        profile.last_login = timezone.now()
        profile.save(update_fields=['active_session_key', 'last_login', 'updated_at'])

        # 4. Finalize Auth Request
        auth_req.status = 'APPROVED'
        auth_req.approved_user = user
        auth_req.session_token = session_token
        auth_req.save(update_fields=['status', 'approved_user', 'session_token', 'updated_at'])

        log_security_event(
            event_type='TV_QR_APPROVED',
            request=request,
            user=user,
            status_code=200,
            metadata={
                'request_id': request_id,
                'device_id': auth_req.device_id,
                'device_name': auth_req.device_name,
                'session_id': tv_session.id,
            }
        )
        log_security_event(
            event_type='TV_SESSION_CREATED',
            request=request,
            user=user,
            status_code=200,
            metadata={
                'session_id': tv_session.id,
                'device_id': auth_req.device_id,
                'device_name': auth_req.device_name,
            }
        )

        return Response({
            "status": "APPROVED",
            "message": f"Successfully authenticated {auth_req.device_name}. The TV will sign in momentarily.",
            "device_name": auth_req.device_name,
        }, status=status.HTTP_200_OK)


class TVSessionValidateView(APIView):
    """
    Validates TV device session credentials and returns user identity & permission status.
    """
    authentication_classes = [TVDeviceSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, 'userprofile', None)

        if not profile or not profile.is_active:
            return Response({"error": {"code": "FORBIDDEN", "message": "User profile is inactive or blocked"}}, status=status.HTTP_403_FORBIDDEN)

        # Check maintenance mode
        maint = MaintenanceConfig.get_config()
        is_maintenance = maint.is_enabled and not (user.is_superuser or profile.role == 'Admin')

        tv_session = getattr(request, 'tv_session', None)
        session_data = TVDeviceSessionSerializer(tv_session).data if tv_session else None

        return Response({
            "valid": True,
            "user": UserTVProfileSerializer(profile).data,
            "session": session_data,
            "maintenance": {
                "is_active": is_maintenance,
                "title": "Maintenance Mode" if is_maintenance else None,
                "message": maint.message if is_maintenance else None,
            }
        }, status=status.HTTP_200_OK)


class TVSessionLogoutView(APIView):
    """
    Explicit logout for the TV application, permanently revoking the device session.
    """
    authentication_classes = [TVDeviceSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tv_session = getattr(request, 'tv_session', None)
        if tv_session:
            tv_session.is_active = False
            tv_session.save(update_fields=['is_active', 'updated_at'])

        log_security_event(
            event_type='TV_SESSION_REVOKED',
            request=request,
            user=request.user,
            status_code=200,
            metadata={'action': 'tv_logout'}
        )

        return Response({"success": True, "message": "TV device session revoked successfully"}, status=status.HTTP_200_OK)


class TVConfigView(APIView):
    """
    Returns app configuration, Blast credentials, maintenance mode status, and version checks.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        # 1. Maintenance Status
        maint = MaintenanceConfig.get_config()

        # 2. Blast Configuration (Secure)
        # Will be evaluated after determining data_mode

        # 3. App Version & Update Metadata
        platform = request.query_params.get('platform', 'android_tv')
        client_version = request.query_params.get('version', '1.0.0')

        # Find version config case-insensitively without creating unwanted records
        version_obj = AppVersionConfig.objects.filter(platform__iexact=platform).first()
        if not version_obj:
            # Fallback to any configured TV platform entry (e.g. "android_tv" or "AndroidTV")
            version_obj = AppVersionConfig.objects.first()

        def parse_v(v_str):
            try:
                import re
                cleaned = re.sub(r'[^0-9.]', '', str(v_str or '')).strip('.')
                parts = [int(x) for x in cleaned.split('.') if x.isdigit()]
                while len(parts) < 3:
                    parts.append(0)
                return parts
            except Exception:
                return [1, 0, 0]

        client_v = parse_v(client_version)

        if version_obj:
            min_v = parse_v(version_obj.min_supported_version)
            latest_v = parse_v(version_obj.latest_version)

            has_update = client_v < latest_v
            is_below_min = client_v < min_v
            is_mandatory = has_update and (version_obj.is_update_required or is_below_min)

            version_info = {
                "platform": version_obj.platform,
                "latest_version": version_obj.latest_version,
                "min_supported_version": version_obj.min_supported_version,
                "has_update": has_update,
                "is_update_required": is_mandatory,
                "update_url": version_obj.update_url,
                "release_notes": version_obj.release_notes,
            }
        else:
            version_info = {
                "platform": platform,
                "latest_version": client_version,
                "min_supported_version": client_version,
                "has_update": False,
                "is_update_required": False,
                "update_url": "",
                "release_notes": "",
            }

        data_mode = os.getenv("TV_BLAST_DATA_MODE", os.getenv("BLAST_DATA_MODE", "BACKEND")).strip().upper()
        if data_mode not in ["BACKEND", "DIRECT"]:
            data_mode = "BACKEND"

        blast_conf = None
        if data_mode == "DIRECT":
            try:
                auth = TVDeviceSessionAuthentication().authenticate(request)
                if auth and auth[0] and auth[0].is_authenticated:
                    blast_conf = {
                        "domain": movie_blast.DOMAIN,
                        "endpoint": movie_blast.ENDPOINT_KEY,
                        "token": movie_blast.TOKEN,
                        "decrypt": movie_blast.BLAST_SECRET_KEY,
                    }
            except Exception:
                pass

        return Response({
            "maintenance": {
                "is_active": maint.is_enabled,
                "title": "Maintenance Mode" if maint.is_enabled else None,
                "message": maint.message if maint.is_enabled else None,
            },
            "blast": blast_conf,
            "data_mode": data_mode,
            "version": version_info,
        }, status=status.HTTP_200_OK)
