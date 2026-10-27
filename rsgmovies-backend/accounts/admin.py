from django.contrib import admin
from accounts.models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('upn', 'display_name', 'email', 'role', 'seedr_account', 'is_active', 'last_login')
    list_filter = ('role', 'is_active', 'seedr_account')
    search_fields = ('upn', 'display_name', 'email', 'entra_object_id')
    readonly_fields = ('upn', 'entra_object_id', 'active_session_key', 'last_login', 'created_at', 'updated_at')
    ordering = ('-created_at',)
