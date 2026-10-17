from django.contrib import admin
from core.models import MaintenanceConfig


@admin.register(MaintenanceConfig)
class MaintenanceConfigAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'is_enabled', 'allow_admins', 'updated_at', 'updated_by')
    readonly_fields = ('updated_at',)

    def has_add_permission(self, request):
        # Only allow 1 instance
        return not MaintenanceConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
