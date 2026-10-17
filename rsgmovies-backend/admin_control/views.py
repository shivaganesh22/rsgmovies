import logging
from django.db import connection
from django.contrib.sessions.models import Session
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from accounts.models import UserProfile
from accounts.permissions import IsAuthenticated, IsAdminRole
from seedr_service.models import SeedrAccount
from seedr_service.services import get_seedr_service_for_account
from core.models import MaintenanceConfig
from activity.models import ActivityEvent, ActivityLogConfig
from activity.serializers import ActivityEventSerializer
from activity.services import log_activity_event
from admin_control.serializers import (
    AdminUserDetailSerializer,
    AdminUserUpdateSerializer,
    AdminSeedrAccountSerializer,
    AdminSeedrAccountCreateUpdateSerializer,
    AdminMaintenanceSerializer,
    AdminActivityLogConfigSerializer,
)

logger = logging.getLogger(__name__)


class AdminUserListView(APIView):
    """
    Lists all user profiles in the application.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        users = UserProfile.objects.select_related('user', 'seedr_account').all()
        # Optional search
        q = request.query_params.get('search')
        if q:
            users = users.filter(upn__icontains=q) | users.filter(display_name__icontains=q) | users.filter(email__icontains=q)
        role = request.query_params.get('role')
        if role:
            users = users.filter(role=role)

        serializer = AdminUserDetailSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminUserDetailView(APIView):
    """
    Retrieves or updates a user's role, assigned Seedr account, or active status.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_object(self, pk):
        try:
            return UserProfile.objects.select_related('user', 'seedr_account').get(pk=pk)
        except UserProfile.DoesNotExist:
            return None

    def get(self, request, pk):
        profile = self.get_object(pk)
        if not profile:
            return Response({"error": {"code": "NOT_FOUND", "message": "User not found"}}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminUserDetailSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        profile = self.get_object(pk)
        if not profile:
            return Response({"error": {"code": "NOT_FOUND", "message": "User not found"}}, status=status.HTTP_404_NOT_FOUND)

        old_role = profile.role
        old_account = profile.seedr_account.name if profile.seedr_account else None

        serializer = AdminUserUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            updated_profile = serializer.save()

            # Synchronize Django user staff/superuser status
            if updated_profile.role == 'Admin':
                updated_profile.user.is_staff = True
            else:
                updated_profile.user.is_staff = False
                updated_profile.user.is_superuser = False
            updated_profile.user.is_active = updated_profile.is_active
            updated_profile.user.save(update_fields=['is_staff', 'is_superuser', 'is_active'])

            # Log events if role or account changed
            if old_role != updated_profile.role:
                log_activity_event(
                    event_type='ROLE_CHANGED',
                    request=request,
                    user=request.user,
                    resource_type='UserProfile',
                    resource_id=str(updated_profile.id),
                    metadata={'target_upn': updated_profile.upn, 'old_role': old_role, 'new_role': updated_profile.role}
                )
            new_account = updated_profile.seedr_account.name if updated_profile.seedr_account else None
            if old_account != new_account:
                log_activity_event(
                    event_type='ACCOUNT_CHANGED',
                    request=request,
                    user=request.user,
                    resource_type='UserProfile',
                    resource_id=str(updated_profile.id),
                    metadata={'target_upn': updated_profile.upn, 'old_account': old_account, 'new_account': new_account}
                )

            detail_serializer = AdminUserDetailSerializer(updated_profile)
            return Response(detail_serializer.data, status=status.HTTP_200_OK)

        return Response({"error": {"code": "VALIDATION_ERROR", "message": "Invalid data", "details": serializer.errors}}, status=status.HTTP_400_BAD_REQUEST)


class AdminRevokeSessionView(APIView):
    """
    Revokes the active session for a specific user.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        try:
            profile = UserProfile.objects.get(pk=pk)
        except UserProfile.DoesNotExist:
            return Response({"error": {"code": "NOT_FOUND", "message": "User not found"}}, status=status.HTTP_404_NOT_FOUND)

        old_session = profile.active_session_key
        tv_revoked_count = 0
        try:
            from tv.models import TVDeviceSession
            tv_revoked_count = TVDeviceSession.objects.filter(user=profile.user, is_active=True).update(is_active=False)
        except Exception as e:
            logger.warning(f"Error revoking TV device sessions for user {profile.upn}: {e}")

        if old_session:
            # Remove session from Django session table if present
            Session.objects.filter(session_key=old_session).delete()
            profile.active_session_key = None
            profile.save(update_fields=['active_session_key', 'updated_at'])

        log_activity_event(
            event_type='SESSION_REVOKED',
            request=request,
            user=request.user,
            resource_type='UserProfile',
            resource_id=str(profile.id),
            metadata={'target_upn': profile.upn, 'revoked_session_key': old_session, 'tv_sessions_revoked': tv_revoked_count}
        )

        return Response({
            "status": "ok",
            "message": f"Active session for user {profile.upn} was revoked ({tv_revoked_count} TV session(s) revoked)."
        }, status=status.HTTP_200_OK)


class AdminSeedrAccountListView(APIView):
    """
    Lists all configured Seedr accounts or creates a new one.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        accounts = SeedrAccount.objects.prefetch_related('assigned_users').all()
        serializer = AdminSeedrAccountSerializer(accounts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = AdminSeedrAccountCreateUpdateSerializer(data=request.data)
        if serializer.is_valid():
            account = serializer.save()
            log_activity_event(
                event_type='SEEDR_CREDENTIALS_UPDATED',
                request=request,
                user=request.user,
                resource_type='SeedrAccount',
                resource_id=str(account.id),
                metadata={'action': 'created', 'account_name': account.name}
            )
            detail_serializer = AdminSeedrAccountSerializer(account)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
        return Response({"error": {"code": "VALIDATION_ERROR", "message": "Invalid data", "details": serializer.errors}}, status=status.HTTP_400_BAD_REQUEST)


class AdminSeedrAccountDetailView(APIView):
    """
    Retrieves, updates, or deletes a Seedr account configuration.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_object(self, pk):
        try:
            return SeedrAccount.objects.get(pk=pk)
        except SeedrAccount.DoesNotExist:
            return None

    def get(self, request, pk):
        account = self.get_object(pk)
        if not account:
            return Response({"error": {"code": "NOT_FOUND", "message": "Seedr account not found"}}, status=status.HTTP_404_NOT_FOUND)
        serializer = AdminSeedrAccountSerializer(account)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        account = self.get_object(pk)
        if not account:
            return Response({"error": {"code": "NOT_FOUND", "message": "Seedr account not found"}}, status=status.HTTP_404_NOT_FOUND)

        serializer = AdminSeedrAccountCreateUpdateSerializer(account, data=request.data, partial=True)
        if serializer.is_valid():
            updated_account = serializer.save()
            log_activity_event(
                event_type='SEEDR_CREDENTIALS_UPDATED',
                request=request,
                user=request.user,
                resource_type='SeedrAccount',
                resource_id=str(updated_account.id),
                metadata={'action': 'updated', 'account_name': updated_account.name}
            )
            detail_serializer = AdminSeedrAccountSerializer(updated_account)
            return Response(detail_serializer.data, status=status.HTTP_200_OK)
        return Response({"error": {"code": "VALIDATION_ERROR", "message": "Invalid data", "details": serializer.errors}}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        account = self.get_object(pk)
        if not account:
            return Response({"error": {"code": "NOT_FOUND", "message": "Seedr account not found"}}, status=status.HTTP_404_NOT_FOUND)
        name = account.name
        account.delete()
        log_activity_event(
            event_type='SEEDR_CREDENTIALS_UPDATED',
            request=request,
            user=request.user,
            resource_type='SeedrAccount',
            resource_id=str(pk),
            metadata={'action': 'deleted', 'account_name': name}
        )
        return Response({"status": "ok", "message": f"Seedr account '{name}' deleted."}, status=status.HTTP_200_OK)


class AdminSeedrAccountTestView(APIView):
    """
    Performs a live connection test to Seedr for a given account.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        try:
            account = SeedrAccount.objects.get(pk=pk)
        except SeedrAccount.DoesNotExist:
            return Response({"error": {"code": "NOT_FOUND", "message": "Seedr account not found"}}, status=status.HTTP_404_NOT_FOUND)

        service = get_seedr_service_for_account(account)
        result = service.test_connection()
class AdminSeedrAccountSetDefaultView(APIView):
    """
    Sets a specific Seedr account as the system-wide default account.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        try:
            account = SeedrAccount.objects.get(pk=pk)
        except SeedrAccount.DoesNotExist:
            return Response({"error": {"code": "NOT_FOUND", "message": "Seedr account not found"}}, status=status.HTTP_404_NOT_FOUND)

        SeedrAccount.objects.exclude(pk=pk).update(is_default=False)
        account.is_default = True
        account.save(update_fields=['is_default', 'updated_at'])

        log_activity_event(
            event_type='SEEDR_CREDENTIALS_UPDATED',
            request=request,
            user=request.user,
            resource_type='SeedrAccount',
            resource_id=str(account.id),
            metadata={'action': 'set_default', 'account_name': account.name}
        )

        serializer = AdminSeedrAccountSerializer(account)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminActivityLogListView(APIView):
    """
    Filterable query view for application and security audit logs.
    Shows all logs ordered chronologically by newest first.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        events = ActivityEvent.objects.all().order_by('-timestamp')

        event_type = request.query_params.get('event_type')
        if event_type:
            events = events.filter(event_type=event_type)

        search = request.query_params.get('search') or request.query_params.get('q')
        if search:
            from django.db.models import Q
            events = events.filter(
                Q(upn__icontains=search) |
                Q(ip_address__icontains=search) |
                Q(request_id__icontains=search) |
                Q(endpoint__icontains=search) |
                Q(event_type__icontains=search) |
                Q(resource_id__icontains=search)
            )

        upn = request.query_params.get('upn')
        if upn:
            events = events.filter(upn__icontains=upn)

        request_id = request.query_params.get('request_id')
        if request_id:
            events = events.filter(request_id=request_id)

        # Allow retrieving up to 1000 logs at once
        limit = min(int(request.query_params.get('limit', 200)), 1000)
        events = events[:limit]

        serializer = ActivityEventSerializer(events, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminActivityLogConfigView(APIView):
    """
    Retrieves or updates the audit log capture configuration.
    Allows enabling/disabling specific categories to save storage.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        config = ActivityLogConfig.get_config()
        serializer = AdminActivityLogConfigSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        config = ActivityLogConfig.get_config()
        serializer = AdminActivityLogConfigSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response({"error": {"code": "VALIDATION_ERROR", "details": serializer.errors}}, status=status.HTTP_400_BAD_REQUEST)


class AdminActivityLogClearView(APIView):
    """
    Deletes all activity log records from the database to reclaim storage.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def delete(self, request):
        deleted_count, _ = ActivityEvent.objects.all().delete()
        log_activity_event(
            event_type='MAINTENANCE_ENABLED',
            request=request,
            user=request.user,
            resource_type='ActivityLog',
            metadata={'action': 'clear_all_logs', 'records_deleted': deleted_count}
        )
        return Response({"detail": f"Successfully deleted {deleted_count} log records."}, status=status.HTTP_200_OK)


class AdminMaintenanceView(APIView):
    """
    Retrieves or updates the server-side maintenance mode configuration.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        config = MaintenanceConfig.get_config()
        serializer = AdminMaintenanceSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        config = MaintenanceConfig.get_config()
        serializer = AdminMaintenanceSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            updated_config = serializer.save(updated_by=request.user)
            log_activity_event(
                event_type='MAINTENANCE_ENABLED' if updated_config.is_enabled else 'MAINTENANCE_DISABLED',
                request=request,
                user=request.user,
                resource_type='MaintenanceConfig',
                resource_id="1",
                metadata={'is_enabled': updated_config.is_enabled, 'message': updated_config.message}
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response({"error": {"code": "VALIDATION_ERROR", "message": "Invalid data", "details": serializer.errors}}, status=status.HTTP_400_BAD_REQUEST)


class AdminSystemHealthView(APIView):
    """
    Comprehensive system health and statistics for administrator dashboard.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        # Database check
        db_ok = False
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                db_ok = True
        except Exception:
            pass

        # Counts
        total_users = UserProfile.objects.count()
        active_sessions = UserProfile.objects.filter(active_session_key__isnull=False).exclude(active_session_key='').count()
        seedr_accounts = SeedrAccount.objects.values('id', 'name', 'status', 'is_default')

        config = MaintenanceConfig.get_config()

        return Response({
            "database_connected": db_ok,
            "total_users": total_users,
            "active_sessions": active_sessions,
            "maintenance_mode": config.is_enabled,
            "seedr_accounts": list(seedr_accounts),
            "server_time": timezone.now().isoformat(),
            "request_id": getattr(request, 'id', None)
        }, status=status.HTTP_200_OK)
