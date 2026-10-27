from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import get_random_string


def generate_random_folder_link():
    return get_random_string(30)


class Contact(models.Model):
    full_name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.full_name} - {self.subject}"


class LockFolder(models.Model):
    folder_id = models.CharField(max_length=30, unique=True)
    created = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Locked Folder {self.folder_id} ({self.created})"


class UserToken(models.Model):
    """
    Token model supporting Android TV app and legacy client token authentication.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="auth_tokens")
    key = models.CharField(max_length=40, unique=True)
    device_info = models.TextField(blank=True, null=True)
    browser_info = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    created = models.DateTimeField(default=timezone.now)
    last_used = models.DateTimeField(default=timezone.now)
    expiry = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    DEFAULT_EXPIRY_DAYS = 365

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = get_random_string(40)
        if not self.expiry:
            self.expiry = timezone.now() + timezone.timedelta(days=self.DEFAULT_EXPIRY_DAYS)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email} - {self.key[:8]}..."