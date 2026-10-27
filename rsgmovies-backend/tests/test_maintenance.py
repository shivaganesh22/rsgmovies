from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from core.models import MaintenanceConfig
from accounts.models import UserProfile
from seedr_service.models import SeedrAccount

User = get_user_model()


class MaintenanceModeTests(TestCase):
    def setUp(self):
        self.config = MaintenanceConfig.get_config()
        self.config.is_enabled = True
        self.config.message = "System upgrade in progress."
        self.config.allow_admins = True
        self.config.save()

        self.seedr = SeedrAccount.objects.create(name="Main Seedr", username="seedr@seedr.com", is_default=True)

        # Admin user
        self.admin = User.objects.create(username="admin@rsgmovies.com", is_staff=True)
        self.admin_profile = UserProfile.objects.create(
            user=self.admin,
            upn="admin@rsgmovies.com",
            display_name="Admin",
            role="Admin",
            seedr_account=self.seedr
        )

        # Normal user
        self.user = User.objects.create(username="user@rsgmovies.com")
        self.user_profile = UserProfile.objects.create(
            user=self.user,
            upn="user@rsgmovies.com",
            display_name="Normal User",
            role="User",
            seedr_account=self.seedr
        )

    def test_normal_user_blocked_with_503(self):
        client = Client()
        client.force_login(self.user)
        self.user_profile.active_session_key = client.session.session_key
        self.user_profile.save()

        res = client.get('/react/files/')
        self.assertEqual(res.status_code, 503)
        data = res.json()
        self.assertEqual(data['error']['code'], 'MAINTENANCE_MODE')
        self.assertEqual(data['error']['message'], "System upgrade in progress.")

    def test_admin_bypasses_maintenance_mode(self):
        client = Client()
        client.force_login(self.admin)
        self.admin_profile.active_session_key = client.session.session_key
        self.admin_profile.save()

        res = client.get('/api/admin/users/')
        self.assertEqual(res.status_code, 200)

    def test_health_checks_exempt_from_maintenance_mode(self):
        client = Client()
        res = client.get('/health/')
        self.assertEqual(res.status_code, 200)
        res_ready = client.get('/health/ready/')
        self.assertEqual(res_ready.status_code, 200)
