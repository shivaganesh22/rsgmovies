from django.contrib import admin
from tv.models import TVAuthRequest, TVDeviceSession, AppVersionConfig


@admin.register(AppVersionConfig)
class AppVersionConfigAdmin(admin.ModelAdmin):
    list_display = (
        'platform',
        'latest_version',
        'min_supported_version',
        'is_update_required',
        'update_url',
        'updated_at',
    )
    list_filter = ('platform', 'is_update_required')
    search_fields = ('platform', 'latest_version', 'release_notes')


@admin.register(TVDeviceSession)
class TVDeviceSessionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'device_name',
        'device_model',
        'app_version',
        'is_active',
        'ip_address',
        'last_active_at',
        'created_at',
    )
    list_filter = ('is_active', 'device_name')
    search_fields = ('user__username', 'device_name', 'device_id', 'ip_address')
    readonly_fields = ('session_token', 'created_at', 'last_active_at')


@admin.register(TVAuthRequest)
class TVAuthRequestAdmin(admin.ModelAdmin):
    list_display = (
        'request_id',
        'device_name',
        'status',
        'approved_user',
        'ip_address',
        'created_at',
        'expires_at',
    )
    list_filter = ('status',)
    search_fields = ('request_id', 'device_name', 'device_id', 'approved_user__username')
