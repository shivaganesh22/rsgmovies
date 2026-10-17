from django.db import models
from django.conf import settings


class ActivityEvent(models.Model):
    """
    Application-level event model for tracking security events,
    administrative actions, and critical operational/usage events.
    """
    EVENT_TYPES = [
        # Security & Authentication
        ('LOGIN_SUCCESS', 'Login Success'),
        ('LOGIN_FAILURE', 'Login Failure'),
        ('LOGOUT', 'Logout'),
        ('SESSION_CREATED', 'Session Created'),
        ('SESSION_EXPIRED', 'Session Expired'),
        ('SESSION_REVOKED', 'Session Revoked'),
        ('ACCESS_DENIED', 'Access Denied'),
        # Administration
        ('ROLE_CHANGED', 'Role Changed'),
        ('ACCOUNT_CHANGED', 'Seedr Account Changed'),
        ('MAINTENANCE_ENABLED', 'Maintenance Mode Enabled'),
        ('MAINTENANCE_DISABLED', 'Maintenance Mode Disabled'),
        ('SEEDR_CREDENTIALS_UPDATED', 'Seedr Credentials Updated'),
        # Seedr Operations
        ('SEEDR_AUTH_ERROR', 'Seedr Authentication Error'),
        ('SEEDR_OP_SUCCESS', 'Seedr Operation Success'),
        ('SEEDR_OP_ERROR', 'Seedr Operation Error'),
        # Application Usage
        ('MOVIE_VIEWED', 'Movie Viewed'),
        ('MOVIE_SEARCHED', 'Movie Searched'),
        ('FILE_ACCESSED', 'File Accessed'),
        ('STREAM_STARTED', 'Stream Started'),
    ]

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='activity_events'
    )
    upn = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        db_index=True,
        help_text="User Principal Name associated with the event"
    )
    seedr_account_name = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )
    event_type = models.CharField(
        max_length=50,
        choices=EVENT_TYPES,
        db_index=True
    )
    resource_type = models.CharField(
        max_length=50,
        blank=True,
        null=True
    )
    resource_id = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )
    endpoint = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )
    http_method = models.CharField(
        max_length=10,
        blank=True,
        null=True
    )
    status_code = models.IntegerField(
        null=True,
        blank=True
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True
    )
    user_agent = models.TextField(
        blank=True,
        null=True
    )
    request_id = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True
    )
    duration_ms = models.FloatField(
        null=True,
        blank=True
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Event-specific metadata (guaranteed free of secrets/passwords/tokens)"
    )

    class Meta:
        verbose_name = "Activity Event"
        verbose_name_plural = "Activity Events"
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['event_type', 'timestamp']),
            models.Index(fields=['upn', 'timestamp']),
            models.Index(fields=['request_id']),
        ]

    def __str__(self):
        user_display = self.upn or "Anonymous"
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {self.event_type} - {user_display} ({self.status_code or ''})"


class ActivityLogConfig(models.Model):
    """
    Controls which categories of activity logs are actively captured and written to the database.
    Allows administrators to disable high-volume event types to save storage.
    """
    auth_events = models.BooleanField(default=True, help_text="Capture login, logout, and session events")
    seedr_events = models.BooleanField(default=True, help_text="Capture torrent adds, deletes, and file management")
    stream_events = models.BooleanField(default=True, help_text="Capture video stream start events")
    media_events = models.BooleanField(default=True, help_text="Capture movie and series view/search events")
    admin_events = models.BooleanField(default=True, help_text="Capture admin changes, role updates, and maintenance")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Activity Log Configuration"
        verbose_name_plural = "Activity Log Configuration"

    @classmethod
    def get_config(cls):
        config, _ = cls.objects.get_or_create(id=1)
        return config

    def is_event_enabled(self, event_type: str) -> bool:
        if event_type in {'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'SESSION_CREATED', 'SESSION_EXPIRED', 'SESSION_REVOKED', 'ACCESS_DENIED'}:
            return self.auth_events
        if event_type in {'SEEDR_OP_SUCCESS', 'SEEDR_OP_ERROR', 'SEEDR_AUTH_ERROR', 'FILE_ACCESSED'}:
            return self.seedr_events
        if event_type in {'STREAM_STARTED'}:
            return self.stream_events
        if event_type in {'MOVIE_VIEWED', 'MOVIE_SEARCHED'}:
            return self.media_events
        if event_type in {'ROLE_CHANGED', 'ACCOUNT_CHANGED', 'MAINTENANCE_ENABLED', 'MAINTENANCE_DISABLED', 'SEEDR_CREDENTIALS_UPDATED'}:
            return self.admin_events
        return True
