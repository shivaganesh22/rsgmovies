from django.urls import path
from admin_control.views import (
    AdminUserListView,
    AdminUserDetailView,
    AdminRevokeSessionView,
    AdminSeedrAccountListView,
    AdminSeedrAccountDetailView,
    AdminSeedrAccountTestView,
    AdminSeedrAccountSetDefaultView,
    AdminActivityLogListView,
    AdminActivityLogConfigView,
    AdminActivityLogClearView,
    AdminMaintenanceView,
    AdminSystemHealthView,
)

urlpatterns = [
    path('users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('users/<int:pk>/revoke-session/', AdminRevokeSessionView.as_view(), name='admin-revoke-session'),
    path('seedr-accounts/', AdminSeedrAccountListView.as_view(), name='admin-seedr-account-list'),
    path('seedr-accounts/<int:pk>/', AdminSeedrAccountDetailView.as_view(), name='admin-seedr-account-detail'),
    path('seedr-accounts/<int:pk>/test/', AdminSeedrAccountTestView.as_view(), name='admin-seedr-account-test'),
    path('seedr-accounts/<int:pk>/set-default/', AdminSeedrAccountSetDefaultView.as_view(), name='admin-seedr-account-set-default'),
    path('activity-logs/', AdminActivityLogListView.as_view(), name='admin-activity-logs'),
    path('activity-logs/settings/', AdminActivityLogConfigView.as_view(), name='admin-activity-logs-settings'),
    path('activity-logs/clear/', AdminActivityLogClearView.as_view(), name='admin-activity-logs-clear'),
    path('maintenance/', AdminMaintenanceView.as_view(), name='admin-maintenance'),
    path('system-health/', AdminSystemHealthView.as_view(), name='admin-system-health'),
]
