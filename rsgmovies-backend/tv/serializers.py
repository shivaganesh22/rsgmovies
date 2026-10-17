from rest_framework import serializers
from tv.models import TVAuthRequest, TVDeviceSession, AppVersionConfig
from accounts.models import UserProfile


class TVAuthInitRequestSerializer(serializers.Serializer):
    device_id = serializers.CharField(max_length=128, required=True)
    device_name = serializers.CharField(max_length=255, required=False, default="Android TV")
    device_model = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    app_version = serializers.CharField(max_length=32, required=False, default="1.0.0")


class TVAuthInitResponseSerializer(serializers.Serializer):
    request_id = serializers.CharField()
    qr_code_url = serializers.CharField()
    device_id = serializers.CharField()
    expires_at = serializers.DateTimeField()
    expires_in_seconds = serializers.IntegerField()
    poll_interval_seconds = serializers.IntegerField()


class TVAuthPollResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    session_token = serializers.CharField(allow_null=True, required=False)
    user = serializers.DictField(allow_null=True, required=False)


class TVAuthApproveRequestSerializer(serializers.Serializer):
    request_id = serializers.CharField(max_length=64, required=True)
    action = serializers.ChoiceField(choices=['approve', 'reject'], default='approve')


class UserTVProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    is_admin = serializers.BooleanField(read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'upn',
            'display_name',
            'email',
            'role',
            'is_admin',
            'username',
            'is_active',
            'last_login',
        ]


class TVDeviceSessionSerializer(serializers.ModelSerializer):
    user = UserTVProfileSerializer(source='user.userprofile', read_only=True)

    class Meta:
        model = TVDeviceSession
        fields = [
            'id',
            'device_id',
            'device_name',
            'device_model',
            'app_version',
            'is_active',
            'last_active_at',
            'created_at',
            'user',
        ]


class AppVersionConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppVersionConfig
        fields = [
            'platform',
            'min_supported_version',
            'latest_version',
            'is_update_required',
            'update_url',
            'release_notes',
            'updated_at',
        ]
