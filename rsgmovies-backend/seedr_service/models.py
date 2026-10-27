from django.db import models
from django.utils import timezone
from seedr_service.crypto import encrypt_value, decrypt_value
from auditlog.registry import auditlog


class SeedrAccount(models.Model):
    """
    Model representing a controlled Seedr account (e.g. Main Seedr, Secondary Seedr).
    Stores encrypted credentials at rest, token state, and safe cached metadata.
    """
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('REAUTH_REQUIRED', 'Re-authentication Required'),
        ('AUTH_ERROR', 'Authentication Error'),
        ('DISABLED', 'Disabled'),
    ]

    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Descriptive name (e.g. 'Main Seedr', 'Secondary Seedr')"
    )
    username = models.CharField(
        max_length=255,
        help_text="Seedr account email or username"
    )
    encrypted_password = models.TextField(
        help_text="Fernet encrypted password at rest"
    )
    encrypted_access_token = models.TextField(
        blank=True,
        null=True,
        help_text="Fernet encrypted access token"
    )
    encrypted_refresh_token = models.TextField(
        blank=True,
        null=True,
        help_text="Fernet encrypted refresh token"
    )
    encrypted_device_code = models.TextField(
        blank=True,
        null=True,
        help_text="Fernet encrypted device code if applicable"
    )

    # Account metadata & identity verification
    seedr_user_id = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
        help_text="Verified upstream Seedr user ID"
    )
    seedr_username = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Verified upstream Seedr account username"
    )
    premium = models.BooleanField(
        default=False,
        help_text="Whether this is a premium/pro Seedr account"
    )
    package_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Seedr package/tier name"
    )

    # Storage & bandwidth usage statistics
    space_used = models.BigIntegerField(
        blank=True,
        null=True,
        help_text="Current used storage space in bytes"
    )
    space_max = models.BigIntegerField(
        blank=True,
        null=True,
        help_text="Total storage capacity in bytes"
    )
    bandwidth_used = models.BigIntegerField(
        blank=True,
        null=True,
        help_text="Monthly bandwidth used in bytes"
    )
    bandwidth_max = models.BigIntegerField(
        blank=True,
        null=True,
        help_text="Total monthly bandwidth in bytes"
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='ACTIVE',
        db_index=True
    )
    is_default = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Indicates whether this account is the default account for new RSG users"
    )

    # Diagnostic & authentication timestamps
    last_authenticated = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of last successful authentication or token restoration"
    )
    last_token_refresh = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when access token was last refreshed"
    )
    last_connection_test = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when live connection test was last performed"
    )
    last_error = models.TextField(
        blank=True,
        null=True,
        help_text="Safe error diagnostic message (without credentials or tokens)"
    )
    last_error_type = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Category/type of the last recorded error (e.g. AuthenticationError, NetworkError)"
    )
    last_error_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the last error occurred"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Seedr Account"
        verbose_name_plural = "Seedr Accounts"
        ordering = ['-is_default', 'name']
        indexes = [
            models.Index(fields=['status', 'is_default']),
        ]

    def __str__(self):
        default_label = " [Default]" if self.is_default else ""
        return f"{self.name} ({self.username}) - {self.status}{default_label}"

    def save(self, *args, **kwargs):
        # If this account is marked default, unset default on other accounts
        if self.is_default:
            SeedrAccount.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    @property
    def password(self) -> str:
        return decrypt_value(self.encrypted_password)

    @password.setter
    def password(self, raw_password: str):
        self.encrypted_password = encrypt_value(raw_password)

    @property
    def access_token(self) -> str:
        return decrypt_value(self.encrypted_access_token)

    @access_token.setter
    def access_token(self, raw_token: str):
        self.encrypted_access_token = encrypt_value(raw_token)

    @property
    def refresh_token(self) -> str:
        return decrypt_value(self.encrypted_refresh_token)

    @refresh_token.setter
    def refresh_token(self, raw_token: str):
        self.encrypted_refresh_token = encrypt_value(raw_token)

    @property
    def device_code(self) -> str:
        return decrypt_value(self.encrypted_device_code)

    @device_code.setter
    def device_code(self, raw_code: str):
        self.encrypted_device_code = encrypt_value(raw_code)


auditlog.register(
    SeedrAccount,
    exclude_fields=[
        'encrypted_password',
        'encrypted_access_token',
        'encrypted_refresh_token',
        'encrypted_device_code'
    ]
)
