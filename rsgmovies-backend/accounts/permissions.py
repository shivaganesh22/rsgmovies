from rest_framework.permissions import BasePermission
from rest_framework.exceptions import NotAuthenticated, PermissionDenied


class IsAuthenticated(BasePermission):
    """
    Allows access only to authenticated users with active profiles.
    Raises NotAuthenticated (401) for anonymous and PermissionDenied (403) for inactive profiles.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            raise NotAuthenticated("Authentication credentials were not provided.")
        profile = getattr(request.user, 'userprofile', None)
        if profile and not profile.is_active:
            raise PermissionDenied("User profile is inactive or blocked.")
        return True


class IsAdminRole(BasePermission):
    """
    Allows access only to authenticated users with the Admin role or Django superusers.
    Raises NotAuthenticated (401) for anonymous and PermissionDenied (403) for non-admin users.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            raise NotAuthenticated("Authentication credentials were not provided.")
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'userprofile', None)
        if not (profile and profile.is_active and profile.role == 'Admin'):
            raise PermissionDenied("Administrator privileges are required.")
        return True


class IsUserRole(BasePermission):
    """
    Allows access to any authenticated user with an active UserProfile.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            raise NotAuthenticated("Authentication credentials were not provided.")
        profile = getattr(request.user, 'userprofile', None)
        if not (profile and profile.is_active):
            raise PermissionDenied("User profile is inactive or blocked.")
        return True
