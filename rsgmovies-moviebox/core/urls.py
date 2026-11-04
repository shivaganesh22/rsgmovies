from django.urls import path
from core.views import health_check, health_live, health_ready

urlpatterns = [
    path('', health_check, name='health-check'),
    path('live/', health_live, name='health-live'),
    path('ready/', health_ready, name='health-ready'),
]
