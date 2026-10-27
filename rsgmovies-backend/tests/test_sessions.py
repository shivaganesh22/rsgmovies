from django.test import TestCase, Client
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from accounts.models import UserProfile
from seedr_service.models import SeedrAccount

User = get_user_model()


class SessionManagementTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.default_seedr = SeedrAccount.objects.create(
            name="Main Seedr",
            username="seedr_main@example.com",
            is_default=True
        )
        self.user = User.objects.create(username="session.user@rsgmovies.com", email="session.user@rsgmovies.com")
        self.profile = UserProfile.objects.create(
            user=self.user,
            upn="session.user@rsgmovies.com",
            display_name="Session User",
            email="session.user@rsgmovies.com",
            role="User",
            seedr_account=self.default_seedr
        )

    def test_session_cookie_age_is_one_hour(self):
        self.assertEqual(settings.SESSION_COOKIE_AGE, 3600)
        self.assertTrue(settings.SESSION_COOKIE_HTTPONLY)

    def test_single_active_session_enforcement(self):
        # 1. Login on Device 1
        client1 = Client()
        client1.force_login(self.user)
        session1_key = client1.session.session_key
        self.profile.active_session_key = session1_key
        self.profile.save()

        # Request with client1 should succeed
        res1 = client1.get('/api/auth/me/')
        self.assertEqual(res1.status_code, 200)
        self.assertTrue(res1.json()['authenticated'])

        # 2. Login on Device 2 (supersedes Device 1)
        client2 = Client()
        client2.force_login(self.user)
        session2_key = client2.session.session_key
        self.profile.active_session_key = session2_key
        self.profile.save()

        # Request with client2 should succeed
        res2 = client2.get('/api/auth/me/')
        self.assertEqual(res2.status_code, 200)

        # Request with old client1 should now be revoked (status 401)
        res1_revoked = client1.get('/api/auth/me/')
        self.assertEqual(res1_revoked.status_code, 401)
        data = res1_revoked.json()
        self.assertEqual(data['error']['code'], 'SESSION_REVOKED')

    def test_session_logout(self):
        client = Client()
        client.force_login(self.user)
        self.profile.active_session_key = client.session.session_key
        self.profile.save()

        # Call logout
        response = client.post('/api/auth/logout/')
        self.assertEqual(response.status_code, 200)

        self.profile.refresh_from_db()
        self.assertIsNone(self.profile.active_session_key)

        # Subsequent authenticated check should fail
        me_res = client.get('/api/auth/me/')
        self.assertEqual(me_res.status_code, 401)
