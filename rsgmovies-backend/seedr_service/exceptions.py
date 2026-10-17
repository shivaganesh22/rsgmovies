"""
Seedr service exceptions mapped from seedrcc library exceptions.
"""


class SeedrError(Exception):
    """Base exception for all Seedr-related errors."""
    def __init__(self, message="Seedr service error occurred", code="SEEDR_ERROR", details=None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details or {}


class SeedrAuthError(SeedrError):
    """Raised when Seedr authentication fails or credentials/refresh tokens are invalid, or account is unassigned."""
    def __init__(self, message="Failed to authenticate with Seedr account", code="SEEDR_AUTH_ERROR", details=None):
        super().__init__(message=message, code=code, details=details)


class SeedrNetworkError(SeedrError):
    """Raised when network communication with Seedr fails or times out."""
    def __init__(self, message="Could not connect to Seedr upstream service", details=None):
        super().__init__(message=message, code="SEEDR_NETWORK_ERROR", details=details)


# Backward-compatible alias
SeedrConnectionError = SeedrNetworkError


class SeedrUnavailableError(SeedrError):
    """Raised when Seedr upstream servers return 5xx or are undergoing maintenance."""
    def __init__(self, message="Seedr upstream service is temporarily unavailable", details=None):
        super().__init__(message=message, code="SEEDR_UNAVAILABLE", details=details)


class SeedrAPIError(SeedrError):
    """Raised when an API operation fails on Seedr."""
    def __init__(self, message="Seedr API operation failed", details=None):
        super().__init__(message=message, code="SEEDR_API_ERROR", details=details)


class SeedrTokenError(SeedrError):
    """Raised when token parsing or token serialization fails."""
    def __init__(self, message="Seedr token error occurred", details=None):
        super().__init__(message=message, code="SEEDR_TOKEN_ERROR", details=details)


class SeedrNotFoundError(SeedrError):
    """Raised when a requested Seedr file, folder, or torrent is not found."""
    def __init__(self, message="The requested Seedr item was not found", details=None):
        super().__init__(message=message, code="SEEDR_NOT_FOUND", details=details)


class SeedrOperationError(SeedrError):
    """Generic error for Seedr operation failures."""
    def __init__(self, message="Seedr operation failed", details=None):
        super().__init__(message=message, code="SEEDR_OPERATION_ERROR", details=details)
