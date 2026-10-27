import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    NotFound,
    ValidationError,
    Throttled,
    MethodNotAllowed,
)

logger = logging.getLogger(__name__)


class ServiceUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'The external service is currently unavailable. Please try again later.'
    default_code = 'service_unavailable'


class ExternalServiceError(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = 'An error occurred while communicating with an upstream service.'
    default_code = 'bad_gateway'


class ExternalTimeoutError(APIException):
    status_code = status.HTTP_504_GATEWAY_TIMEOUT
    default_detail = 'The external service timed out while processing the request.'
    default_code = 'gateway_timeout'


class ConflictError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'A conflict occurred with the current state of the resource.'
    default_code = 'conflict'


def custom_exception_handler(exc, context):
    """
    Standardized DRF Exception Handler.
    Produces predictable JSON errors across all API endpoints:
    {
        "error": {
            "code": "ERROR_CODE",
            "message": "Human readable error description",
            "request_id": "...",
            "details": {...} or [...] or null
        }
    }
    """
    request = context.get('request')
    request_id = getattr(request, 'id', None) if request else None

    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)

    if response is not None:
        error_code = getattr(exc, 'default_code', 'error')

        if isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
            error_code = 'AUTHENTICATION_FAILED'
            message = str(exc.detail) if hasattr(exc, 'detail') else 'Authentication credentials were not provided or are invalid.'
            response.status_code = status.HTTP_401_UNAUTHORIZED
        elif isinstance(exc, PermissionDenied):
            error_code = 'PERMISSION_DENIED'
            message = str(exc.detail) if hasattr(exc, 'detail') else 'You do not have permission to perform this action.'
            response.status_code = status.HTTP_403_FORBIDDEN
        elif isinstance(exc, NotFound):
            error_code = 'NOT_FOUND'
            message = str(exc.detail) if hasattr(exc, 'detail') else 'The requested resource was not found.'
        elif isinstance(exc, ValidationError):
            error_code = 'VALIDATION_ERROR'
            message = 'Invalid request data.'
        elif isinstance(exc, Throttled):
            error_code = 'RATE_LIMITED'
            message = f'Request was throttled. Expected available in {exc.wait} seconds.'
        elif isinstance(exc, MethodNotAllowed):
            error_code = 'METHOD_NOT_ALLOWED'
            message = f'Method "{request.method}" not allowed.'
        else:
            error_code = str(error_code).upper()
            message = str(exc.detail) if hasattr(exc, 'detail') else str(exc)

        # Structure response
        data = {
            "error": {
                "code": error_code,
                "message": message,
                "request_id": request_id,
                "details": response.data if isinstance(response.data, (dict, list)) and response.data != {'detail': message} else None
            }
        }
        response.data = data
        return response

    # Unhandled 500 exceptions
    view_name = context.get('view').__class__.__name__ if context.get('view') else 'UnknownView'
    logger.error(
        f"Unhandled exception in {view_name} [request_id={request_id}]: {str(exc)}",
        exc_info=True,
        extra={'request_id': request_id}
    )

    data = {
        "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An internal server error occurred. Please contact support with the request ID.",
            "request_id": request_id,
            "details": None
        }
    }
    return Response(data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
