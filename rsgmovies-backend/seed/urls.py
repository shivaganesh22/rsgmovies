"""
RSG Movies Backend URL Configuration.
API-first architecture serving React frontend, Android TV, and Admin management.
"""

from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from react.loaderr import media_proxy

urlpatterns = [
    # Static files direct route for serverless / production environments
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),

    # Django Admin Panel
    path('admin/', admin.site.urls),

    # Health Checks & Probes
    path('health/', include('core.urls')),

    # Authentication & Session Management (Microsoft Entra OIDC + Django Sessions)
    path('api/auth/', include('accounts.urls')),

    # Admin Dashboard Management APIs (Secured with IsAuthenticated + IsAdminRole)
    path('api/admin/', include('admin_control.urls')),

    # OpenAPI Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/media/proxy/', media_proxy, name='media-proxy'),

    # React Frontend & Android TV API Endpoints (Media, Scrapers, Seedr Files)
    path('react/', include('react.urls')),

    # New React Native TV App APIs (QR Auth, Device Session, Config, Updates)
    path('api/tv/', include('tv.urls')),
]
