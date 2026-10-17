from django.db import models
from django.conf import settings
from auditlog.registry import auditlog


class MaintenanceConfig(models.Model):
    """
    Singleton model controlling server-side maintenance mode.
    """
    is_enabled = models.BooleanField(
        default=False,
        help_text="When enabled, normal users will receive a 503 Maintenance response."
    )
    message = models.TextField(
        default="RSG Movies is currently undergoing maintenance. Please check back shortly.",
        help_text="Message displayed to users during maintenance mode."
    )
    allow_admins = models.BooleanField(
        default=True,
        help_text="If True, Admin users can still access the application during maintenance."
    )
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="maintenance_updates"
    )

    class Meta:
        verbose_name = "Maintenance Configuration"
        verbose_name_plural = "Maintenance Configuration"

    def __str__(self):
        status = "Active" if self.is_enabled else "Inactive"
        return f"Maintenance Mode ({status})"

    def save(self, *args, **kwargs):
        # Enforce singleton
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        obj, _ = cls.objects.get_or_create(
            pk=1,
            defaults={
                "is_enabled": False,
                "message": "RSG Movies is currently undergoing maintenance. Please check back shortly.",
                "allow_admins": True,
            }
        )
        return obj


auditlog.register(MaintenanceConfig)
