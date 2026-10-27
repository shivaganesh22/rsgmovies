from django.db import models
from django.conf import settings
from auditlog.registry import auditlog


class UserProfile(models.Model):
    """
    Profile representing an RSG Movies user authenticated via Microsoft Entra ID.
    Enforces exactly one RSG user per profile, single active session tracking,
    role-based authorization, and Seedr account mapping.
    """
    ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('User', 'User'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='userprofile'
    )
    upn = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="User Principal Name (primary external identity identifier from Entra ID)"
    )
    display_name = models.CharField(
        max_length=255,
        help_text="Display Name from Microsoft Entra ID"
    )
    email = models.EmailField(
        blank=True,
        null=True,
        help_text="Email address (falls back to UPN if not present in Entra token)"
    )
    entra_object_id = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
        help_text="Microsoft Entra Object ID (oid / sub claim)"
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='User',
        help_text="Application authorization role"
    )
    seedr_account = models.ForeignKey(
        'seedr_service.SeedrAccount',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_users',
        help_text="The Seedr account assigned to this user (defaults to Main Seedr)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this user profile is active"
    )
    active_session_key = models.CharField(
        max_length=128,
        blank=True,
        null=True,
        db_index=True,
        help_text="Reference to the single active Django session key for this user"
    )
    last_login = models.DateTimeField(
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.display_name} ({self.upn}) [{self.role}]"

    def is_admin(self) -> bool:
        return self.role == 'Admin' or (self.user and self.user.is_superuser)


auditlog.register(UserProfile, exclude_fields=['active_session_key'])
