"""
RSG Movies Moviebox Dedicated Microservice Backend URL Configuration.
Deployed in India region (bom1) for localized Moviebox content.
"""

from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve

urlpatterns = [
    # Static files direct route for serverless / production environments
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),

    # Django Admin Panel
    path('admin/', admin.site.urls),

    # Health Checks & Probes
    path('health/', include('core.urls')),

    # React Moviebox Endpoints (/react/moviebox/...)
    path('react/', include('react.urls')),
]
