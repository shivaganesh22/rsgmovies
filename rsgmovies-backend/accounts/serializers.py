from rest_framework import serializers
from accounts.models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    seedr_account_name = serializers.CharField(source='seedr_account.name', read_only=True, default=None)
    seedr_account_status = serializers.CharField(source='seedr_account.status', read_only=True, default=None)

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
            'seedr_account_status',
            'is_active',
            'last_login',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'upn',
            'entra_object_id',
            'last_login',
            'created_at',
            'updated_at'
        ]


class SessionInfoSerializer(serializers.Serializer):
    authenticated = serializers.BooleanField()
    user = UserProfileSerializer(allow_null=True)
    session_expiry_seconds = serializers.IntegerField(allow_null=True)
    request_id = serializers.CharField(allow_null=True)
