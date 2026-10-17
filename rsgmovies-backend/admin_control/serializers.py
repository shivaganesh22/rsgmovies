from rest_framework import serializers
from accounts.models import UserProfile
from seedr_service.models import SeedrAccount
from core.models import MaintenanceConfig
from activity.models import ActivityLogConfig


class AdminUserDetailSerializer(serializers.ModelSerializer):
    seedr_account_name = serializers.CharField(source='seedr_account.name', read_only=True, default=None)
    has_active_session = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'upn',
            'display_name',
            'email',
            'entra_object_id',
            'role',
            'seedr_account',
            'seedr_account_name',
            'is_active',
            'has_active_session',
            'last_login',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'upn', 'entra_object_id', 'last_login', 'created_at', 'updated_at']

    def get_has_active_session(self, obj) -> bool:
        if bool(obj.active_session_key):
            return True
        try:
            from tv.models import TVDeviceSession
            return TVDeviceSession.objects.filter(user=obj.user, is_active=True).exists()
        except Exception:
            return False


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['role', 'seedr_account', 'is_active']


class AdminSeedrAccountSerializer(serializers.ModelSerializer):
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = SeedrAccount
        fields = [
            'id',
            'name',
            'username',
            'seedr_user_id',
            'seedr_username',
            'premium',
            'package_name',
            'space_used',
            'space_max',
            'bandwidth_used',
            'bandwidth_max',
            'status',
            'is_default',
            'last_authenticated',
            'last_token_refresh',
            'last_connection_test',
            'last_error',
            'last_error_type',
            'last_error_at',
            'user_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'seedr_user_id',
            'seedr_username',
            'premium',
            'package_name',
            'space_used',
            'space_max',
            'bandwidth_used',
            'bandwidth_max',
            'last_authenticated',
            'last_token_refresh',
            'last_connection_test',
            'last_error',
            'last_error_type',
            'last_error_at',
            'user_count',
            'created_at',
            'updated_at'
        ]

    def get_user_count(self, obj) -> int:
        return obj.assigned_users.count()


class AdminSeedrAccountCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = SeedrAccount
        fields = ['name', 'username', 'password', 'status', 'is_default']

    def create(self, validated_data):
        raw_password = validated_data.pop('password', None)
        account = SeedrAccount(**validated_data)
        if raw_password:
            account.password = raw_password
        account.save()
        return account

    def update(self, instance, validated_data):
        raw_password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if raw_password:
            instance.password = raw_password
        instance.save()
        return instance


class AdminMaintenanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceConfig
        fields = ['is_enabled', 'message', 'allow_admins', 'updated_at']
        read_only_fields = ['updated_at']


class AdminActivityLogConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLogConfig
        fields = ['auth_events', 'seedr_events', 'stream_events', 'media_events', 'admin_events', 'updated_at']
        read_only_fields = ['updated_at']
