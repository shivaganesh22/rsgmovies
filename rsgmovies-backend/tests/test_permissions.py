from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from accounts.models import UserProfile
from seedr_service.models import SeedrAccount

User = get_user_model()


class RoleAuthorizationTests(TestCase):
    def setUp(self):
        self.main_seedr = SeedrAccount.objects.create(name="Main Seedr", username="main@seedr.com", is_default=True)
        self.sec_seedr = SeedrAccount.objects.create(name="Secondary Seedr", username="sec@seedr.com", is_default=False)

        # Admin user
        self.admin_user = User.objects.create(username="admin@rsgmovies.com", email="admin@rsgmovies.com", is_staff=True)
        self.admin_profile = UserProfile.objects.create(
            user=self.admin_user,
            upn="admin@rsgmovies.com",
            display_name="Admin User",
            role="Admin",
            seedr_account=self.main_seedr
        )

        # Regular user
        self.normal_user = User.objects.create(username="user@rsgmovies.com", email="user@rsgmovies.com")
        self.normal_profile = UserProfile.objects.create(
            user=self.normal_user,
            upn="user@rsgmovies.com",
            display_name="Normal User",
            role="User",
            seedr_account=self.main_seedr
        )

        # Inactive user
        self.inactive_user = User.objects.create(username="blocked@rsgmovies.com", email="blocked@rsgmovies.com")
        self.inactive_profile = UserProfile.objects.create(
            user=self.inactive_user,
            upn="blocked@rsgmovies.com",
            display_name="Blocked User",
            role="User",
            is_active=False
        )

    def test_anonymous_access_denied_on_admin_endpoint(self):
        client = Client()
        res = client.get('/api/admin/users/')
        self.assertEqual(res.status_code, 401)

    def test_normal_user_denied_on_admin_endpoint(self):
        client = Client()
        client.force_login(self.normal_user)
        self.normal_profile.active_session_key = client.session.session_key
        self.normal_profile.save()

        res = client.get('/api/admin/users/')
        self.assertEqual(res.status_code, 403)

    def test_admin_allowed_on_admin_endpoint(self):
        client = Client()
        client.force_login(self.admin_user)
        self.admin_profile.active_session_key = client.session.session_key
        self.admin_profile.save()

        res = client.get('/api/admin/users/')
        self.assertEqual(res.status_code, 200)

    def test_admin_can_reassign_user_seedr_account(self):
        client = Client()
        client.force_login(self.admin_user)
        self.admin_profile.active_session_key = client.session.session_key
        self.admin_profile.save()

        # Reassign normal_user to Secondary Seedr
        res = client.patch(
            f'/api/admin/users/{self.normal_profile.id}/',
            data={'seedr_account': self.sec_seedr.id},
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        self.normal_profile.refresh_from_db()
        self.assertEqual(self.normal_profile.seedr_account, self.sec_seedr)

    def test_inactive_user_blocked_from_authenticated_endpoints(self):
        client = Client()
        client.force_login(self.inactive_user)
        self.inactive_profile.active_session_key = client.session.session_key
        self.inactive_profile.save()

        res = client.get('/api/auth/me/')
        self.assertEqual(res.status_code, 403)
