from django.contrib import admin
from activity.models import ActivityEvent, ActivityLogConfig


@admin.register(ActivityEvent)
class ActivityEventAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'event_type', 'upn', 'endpoint', 'http_method', 'status_code', 'request_id')
    list_filter = ('event_type', 'status_code', 'http_method')
    search_fields = ('upn', 'request_id', 'endpoint', 'seedr_account_name')
    readonly_fields = [f.name for f in ActivityEvent._meta.fields]
    ordering = ('-timestamp',)

    def has_add_permission(self, request):
        return False


@admin.register(ActivityLogConfig)
class ActivityLogConfigAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'auth_events', 'seedr_events', 'stream_events', 'media_events', 'admin_events', 'updated_at')
    readonly_fields = ('updated_at',)

    def has_add_permission(self, request):
        return not ActivityLogConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
