from django.contrib import admin
from react.models import (
    Contact,
    LockFolder,
    UserToken,
)


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'email', 'subject', 'created_at')
    search_fields = ('full_name', 'email', 'subject', 'message')
    readonly_fields = ('created_at',)


@admin.register(LockFolder)
class LockFolderAdmin(admin.ModelAdmin):
    list_display = ('folder_id', 'created')
    search_fields = ('folder_id',)
    readonly_fields = ('created',)


@admin.register(UserToken)
class UserTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'key', 'ip_address', 'location', 'created', 'last_used', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('user__username', 'user__email', 'key', 'ip_address', 'location')
    readonly_fields = ('created', 'last_used')