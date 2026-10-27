from django.http import JsonResponse
from django.db import connection
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    General health check endpoint.
    """
    return JsonResponse({
        "status": "ok",
        "service": "rsg-movies-backend",
        "timestamp": timezone.now().isoformat(),
        "request_id": getattr(request, 'id', None)
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_live(request):
    """
    Liveness probe.
    """
    return JsonResponse({
        "status": "live",
        "timestamp": timezone.now().isoformat()
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_ready(request):
    """
    Readiness probe that validates database connectivity and seedr service configuration.
    """
    checks = {
        "database": False,
        "seedr_configured": False
    }
    is_ready = True

    # 1. Check Database Connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            row = cursor.fetchone()
            if row and row[0] == 1:
                checks["database"] = True
    except Exception as e:
        logger.error(f"Health ready DB check failed: {e}")
        is_ready = False

    # 2. Check Seedr Default Account
    try:
        from seedr_service.models import SeedrAccount
        default_acc = SeedrAccount.objects.filter(is_default=True).first()
        if not default_acc:
            default_acc = SeedrAccount.objects.first()
        if default_acc:
            checks["seedr_configured"] = True
            checks["seedr_status"] = default_acc.status
        else:
            checks["seedr_status"] = "NO_ACCOUNTS_CONFIGURED"
    except Exception as e:
        logger.warning(f"Health ready Seedr check warning: {e}")
        checks["seedr_status"] = "UNINITIALIZED"

    response_status = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JsonResponse({
        "status": "ready" if is_ready else "not_ready",
        "checks": checks,
        "timestamp": timezone.now().isoformat(),
        "request_id": getattr(request, 'id', None)
    }, status=response_status)
