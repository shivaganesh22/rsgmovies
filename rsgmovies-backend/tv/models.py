import uuid
import secrets
from django.db import models
from django.conf import settings
from django.utils import timezone
from auditlog.registry import auditlog


def generate_secure_token():
    return secrets.token_hex(32)


class TVAuthRequest(models.Model):
    """
    Temporary single-use QR authentication request generated when a TV opens the login screen.
    Expires after a short TTL (e.g. 5 minutes).
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending Approval'),
        ('APPROVED', 'Approved by User'),
        ('REJECTED', 'Rejected / Cancelled'),
        ('EXPIRED', 'Expired'),
    ]

    request_id = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        default=generate_secure_token,
        help_text="Unique secure identifier for the QR authentication request"
    )
    device_id = models.CharField(
        max_length=128,
        db_index=True,
        help_text="Installation / Hardware identifier of the TV device"
    )
    device_name = models.CharField(
        max_length=255,
        default="Android TV",
        help_text="Human-readable device model or name (e.g., Sony Bravia 4K TV)"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="Originating IP address of the TV device"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        db_index=True
    )
    approved_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='tv_approved_requests'
    )
    session_token = models.CharField(
        max_length=128,
        null=True,
        blank=True,
        help_text="Issued session token once approved"
    )
    expires_at = models.DateTimeField(
        db_index=True,
        help_text="Timestamp when this QR request becomes invalid"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "TV Auth Request"
        verbose_name_plural = "TV Auth Requests"
        ordering = ['-created_at']

    def is_valid(self) -> bool:
        return self.status == 'PENDING' and timezone.now() < self.expires_at

    def __str__(self):
        return f"TVAuth [{self.device_name}] - {self.status} (Exp: {self.expires_at})"


class TVDeviceSession(models.Model):
    """
    Persistent, revocable device session for the new React Native TV application.
    Enforces single-active-device per user across TV and Web.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tv_device_sessions'
    )
    device_id = models.CharField(
        max_length=128,
        db_index=True,
        help_text="Installation ID of the TV device"
    )
    device_name = models.CharField(
        max_length=255,
        default="Android TV",
        help_text="Human-readable name of the TV"
    )
    device_model = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Hardware model or brand"
    )
    app_version = models.CharField(
        max_length=32,
        default="1.0.0",
        help_text="Installed React Native TV app version"
    )
    session_token = models.CharField(
        max_length=128,
        unique=True,
        db_index=True,
        default=generate_secure_token,
        help_text="High-entropy Bearer/Token credentials used for authenticated requests"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this TV device session is currently active"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True
    )
    last_active_at = models.DateTimeField(
        default=timezone.now
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "TV Device Session"
        verbose_name_plural = "TV Device Sessions"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.device_name} ({'Active' if self.is_active else 'Revoked'})"


class AppVersionConfig(models.Model):
    """
    Backend-controlled version metadata for TV app update awareness.
    """
    PLATFORM_CHOICES = [
        ('android_tv', 'Android TV / Google TV'),
        ('fire_tv', 'Amazon Fire TV'),
        ('web', 'Web App'),
    ]

    platform = models.CharField(
        max_length=32,
        choices=PLATFORM_CHOICES,
        default='android_tv',
        unique=True
    )
    min_supported_version = models.CharField(
        max_length=32,
        default="1.0.0",
        help_text="Minimum version required. Versions below this will be blocked with mandatory update."
    )
    latest_version = models.CharField(
        max_length=32,
        default="1.0.0",
        help_text="Latest available release version."
    )
    is_update_required = models.BooleanField(
        default=False,
        help_text="Forces all client versions below latest_version to update immediately."
    )
    update_url = models.URLField(
        default="https://rsgmovies.vercel.app/download/tv",
        help_text="URL to download latest APK or store page."
    )
    release_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Changelog and release notes for this version."
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "App Version Config"
        verbose_name_plural = "App Version Configs"

    def __str__(self):
        return f"{self.platform} v{self.latest_version} (Min: {self.min_supported_version})"


auditlog.register(TVDeviceSession, exclude_fields=['session_token'])
auditlog.register(AppVersionConfig)
