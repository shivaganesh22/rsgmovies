from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from accounts.models import UserProfile
from accounts.auth_backend import EntraOIDCAuthenticationBackend
from seedr_service.models import SeedrAccount

User = get_user_model()


class EntraOIDCBackendTests(TestCase):
    def setUp(self):
        self.backend = EntraOIDCAuthenticationBackend()
        self.default_seedr = SeedrAccount.objects.create(
            name="Main Seedr",
            username="seedr_main@example.com",
            is_default=True,
            status="ACTIVE"
        )
        self.default_seedr.password = "SecretSeedr123!"
        self.default_seedr.save()

    def test_create_user_standard_claims(self):
        claims = {
            'preferred_username': 'john.doe@rsgmovies.com',
            'name': 'John Doe',
            'email': 'john.doe@rsgmovies.com',
            'oid': '00000000-0000-0000-0000-000000000001',
            'roles': ['User']
        }
        user = self.backend.create_user(claims)
        self.assertIsNotNone(user)
        self.assertEqual(user.username, 'john.doe@rsgmovies.com')
        self.assertFalse(user.has_usable_password())

        profile = user.userprofile
        self.assertEqual(profile.upn, 'john.doe@rsgmovies.com')
        self.assertEqual(profile.display_name, 'John Doe')
        self.assertEqual(profile.email, 'john.doe@rsgmovies.com')
        self.assertEqual(profile.role, 'User')
        self.assertEqual(profile.entra_object_id, '00000000-0000-0000-0000-000000000001')
        self.assertEqual(profile.seedr_account, self.default_seedr)
        self.assertTrue(profile.is_active)

    def test_create_admin_user(self):
        claims = {
            'preferred_username': 'admin@rsgmovies.com',
            'name': 'Admin User',
            'roles': ['Admin'],
            'oid': '00000000-0000-0000-0000-000000000002'
        }
        user = self.backend.create_user(claims)
        self.assertEqual(user.userprofile.role, 'Admin')
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)

    def test_filter_users_by_claims_existing_user(self):
        claims = {
            'preferred_username': 'existing@rsgmovies.com',
            'name': 'Existing User',
            'oid': '00000000-0000-0000-0000-000000000003'
        }
        created_user = self.backend.create_user(claims)

        matched_users = self.backend.filter_users_by_claims(claims)
        self.assertEqual(len(matched_users), 1)
        self.assertEqual(matched_users[0], created_user)

    def test_update_user_reconciliation(self):
        claims = {
            'preferred_username': 'update.test@rsgmovies.com',
            'name': 'Initial Name',
            'email': 'update.test@rsgmovies.com',
            'roles': ['User'],
            'oid': '00000000-0000-0000-0000-000000000004'
        }
        user = self.backend.create_user(claims)

        updated_claims = {
            'preferred_username': 'update.test@rsgmovies.com',
            'name': 'Updated Name',
            'email': 'new.email@rsgmovies.com',
            'roles': ['Admin'],
            'oid': '00000000-0000-0000-0000-000000000004'
        }
        updated_user = self.backend.update_user(user, updated_claims)
        profile = updated_user.userprofile
        self.assertEqual(profile.display_name, 'Updated Name')
        self.assertEqual(profile.email, 'new.email@rsgmovies.com')
        self.assertEqual(profile.role, 'Admin')

    def test_missing_upn_raises_value_error(self):
        claims = {'name': 'No UPN User'}
        with self.assertRaises(ValueError):
            self.backend.create_user(claims)

    def test_email_fallback_to_upn(self):
        claims = {
            'preferred_username': 'fallback@rsgmovies.com',
            'name': 'Fallback User'
        }
        user = self.backend.create_user(claims)
        self.assertEqual(user.userprofile.email, 'fallback@rsgmovies.com')

    @patch('mozilla_django_oidc.auth.OIDCAuthenticationBackend.get_userinfo')
    def test_get_userinfo_merges_id_token_payload_over_pairwise_sub(self, mock_super_get_userinfo):
        # In Entra ID, graph.microsoft.com/oidc/userinfo returns minimal pairwise sub hash
        mock_super_get_userinfo.return_value = {
            'sub': 'SHm5CQhyhC60c3qAyT35tRdlqy2gWxiQvbbtCT0fNfQ',
            'name': 'Real Display Name'
        }
        # The verified ID token (payload) contains the real UPN, email, oid, roles
        id_token_payload = {
            'preferred_username': 'real.user@rsgmovies.com',
            'email': 'real.user@rsgmovies.com',
            'name': 'Real Display Name',
            'oid': '12345678-abcd-1234-abcd-1234567890ab',
            'roles': ['Admin'],
            'tid': 'tenant-uuid'
        }

        merged = self.backend.get_userinfo(
            access_token='fake-access-token',
            id_token='fake-id-token',
            payload=id_token_payload
        )

        self.assertEqual(merged['preferred_username'], 'real.user@rsgmovies.com')
        self.assertEqual(merged['oid'], '12345678-abcd-1234-abcd-1234567890ab')
        self.assertEqual(self.backend._extract_upn(merged), 'real.user@rsgmovies.com')
        self.assertEqual(self.backend._extract_object_id(merged), '12345678-abcd-1234-abcd-1234567890ab')
