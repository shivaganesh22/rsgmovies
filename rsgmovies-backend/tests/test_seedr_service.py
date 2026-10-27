from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from seedrcc import Token, exceptions as seedr_exc, models as seedr_models
from seedr_service.models import SeedrAccount
from seedr_service.services import SeedrService, get_seedr_service_for_user, get_seedr_service_for_account
from seedr_service.exceptions import (
    SeedrError,
    SeedrAuthError,
    SeedrNetworkError,
    SeedrUnavailableError,
    SeedrAPIError,
    SeedrTokenError,
    SeedrNotFoundError,
)
from accounts.models import UserProfile

User = get_user_model()


class SeedrServiceV2Tests(TestCase):
    def setUp(self):
        self.account = SeedrAccount.objects.create(
            name="Main Seedr",
            username="main@seedr.com",
            is_default=True,
            status="ACTIVE"
        )
        self.account.password = "PlainPassword123!"
        self.account.access_token = "stored_access_token"
        self.account.refresh_token = "stored_refresh_token"
        self.account.device_code = "stored_device_code"
        self.account.save()

        self.user = User.objects.create(username="seedr.tester@rsgmovies.com")
        self.profile = UserProfile.objects.create(
            user=self.user,
            upn="seedr.tester@rsgmovies.com",
            display_name="Seedr Tester",
            seedr_account=self.account
        )

    def test_credential_encryption_at_rest(self):
        self.account.refresh_from_db()
        # Ensure ciphertext is stored in DB
        self.assertNotEqual(self.account.encrypted_password, "PlainPassword123!")
        self.assertNotEqual(self.account.encrypted_access_token, "stored_access_token")
        self.assertNotEqual(self.account.encrypted_refresh_token, "stored_refresh_token")
        self.assertNotEqual(self.account.encrypted_device_code, "stored_device_code")

        # Decrypted properties recover plain values
        self.assertEqual(self.account.password, "PlainPassword123!")
        self.assertEqual(self.account.access_token, "stored_access_token")
        self.assertEqual(self.account.refresh_token, "stored_refresh_token")
        self.assertEqual(self.account.device_code, "stored_device_code")

    def test_token_refresh_callback_persists_to_db(self):
        service = SeedrService(self.account)
        new_token = Token(
            access_token="refreshed_access_xyz",
            refresh_token="refreshed_refresh_abc",
            device_code="refreshed_dev_123"
        )
        service._token_refresh_callback(new_token)

        self.account.refresh_from_db()
        self.assertEqual(self.account.access_token, "refreshed_access_xyz")
        self.assertEqual(self.account.refresh_token, "refreshed_refresh_abc")
        self.assertEqual(self.account.device_code, "refreshed_dev_123")
        self.assertEqual(self.account.status, "ACTIVE")
        self.assertIsNotNone(self.account.last_token_refresh)
        self.assertIsNotNone(self.account.last_authenticated)

    @patch('seedr_service.services.Seedr')
    def test_zero_roundtrip_stored_token_restoration(self, mock_seedr_cls):
        mock_instance = MagicMock()
        mock_seedr_cls.return_value = mock_instance

        service = SeedrService(self.account)
        client = service.get_client()

        self.assertEqual(client, mock_instance)
        mock_seedr_cls.assert_called_once()
        # Ensure it was initialized with stored Token object
        called_token = mock_seedr_cls.call_args[1]['token']
        self.assertEqual(called_token.access_token, "stored_access_token")
        self.assertEqual(called_token.refresh_token, "stored_refresh_token")

    @patch('seedr_service.services.Seedr.from_password')
    @patch('seedr_service.services.Seedr')
    def test_invalid_refresh_token_falls_back_to_password(self, mock_seedr_cls, mock_from_pwd):
        # Simulate stored token failing auth
        mock_seedr_cls.side_effect = seedr_exc.AuthenticationError("Invalid or revoked token")
        mock_pwd_instance = MagicMock()
        mock_pwd_instance.token = Token(access_token="pwd_access", refresh_token="pwd_refresh")
        mock_from_pwd.return_value = mock_pwd_instance

        service = SeedrService(self.account)
        client = service.get_client()

        self.assertEqual(client, mock_pwd_instance)
        mock_from_pwd.assert_called_once_with(
            username="main@seedr.com",
            password="PlainPassword123!",
            on_token_refresh=service._token_refresh_callback,
            timeout=30.0
        )

    @patch('seedr_service.services.Seedr.from_password')
    @patch('seedr_service.services.Seedr')
    def test_failed_password_authentication_marks_auth_error_no_retry_storm(self, mock_seedr_cls, mock_from_pwd):
        mock_seedr_cls.side_effect = seedr_exc.AuthenticationError("Invalid token")
        mock_from_pwd.side_effect = seedr_exc.AuthenticationError("Invalid credentials: bad password")

        service = SeedrService(self.account)
        with self.assertRaises(SeedrAuthError):
            service.get_client()

        self.account.refresh_from_db()
        self.assertEqual(self.account.status, "AUTH_ERROR")
        self.assertEqual(self.account.last_error_type, "AuthenticationError")
        self.assertIn("Invalid Seedr credentials", self.account.last_error)
        self.assertIsNotNone(self.account.last_error_at)

    def test_get_seedr_service_for_user_assigned_account(self):
        service = get_seedr_service_for_user(self.user)
        self.assertEqual(service.account, self.account)

    @patch('seedr_service.services.Seedr')
    def test_list_contents_returns_sorted_and_normalized_data(self, mock_seedr_cls):
        mock_client = MagicMock()
        mock_res = MagicMock()
        mock_res._raw = {
            "folders": [
                {"id": 1, "name": "Old Folder", "last_update": "2024-01-01"},
                {"id": 2, "name": "New Folder", "last_update": "2026-08-15"}
            ],
            "files": [
                {"id": 10, "name": "z_file.mkv"},
                {"id": 20, "name": "a_file.mp4"}
            ],
            "torrents": [],
            "space_used": 1024,
            "space_max": 2048,
        }
        mock_client.list_contents.return_value = mock_res
        mock_seedr_cls.return_value = mock_client

        service = SeedrService(self.account)
        data = service.list_contents()

        # Folders sorted by last_update desc
        self.assertEqual(data['folders'][0]['id'], 2)
        # Files sorted by name asc
        self.assertEqual(data['files'][0]['name'], "a_file.mp4")
        self.assertEqual(data['space_used'], 1024)

    @patch('seedr_service.services.Seedr')
    def test_search_files(self, mock_seedr_cls):
        mock_client = MagicMock()
        mock_res = MagicMock()
        mock_res._raw = {
            "name": "Search Results",
            "folders": [],
            "files": [{"file_id": "123", "name": "Found Movie.mp4"}]
        }
        mock_client.search_files.return_value = mock_res
        mock_seedr_cls.return_value = mock_client

        service = SeedrService(self.account)
        results = service.search_files("Found Movie")

        self.assertEqual(len(results['files']), 1)
        self.assertEqual(results['files'][0]['name'], "Found Movie.mp4")
        mock_client.search_files.assert_called_once_with(query="Found Movie")

    @patch('seedr_service.services.Seedr')
    def test_fetch_file(self, mock_seedr_cls):
        mock_client = MagicMock()
        mock_res = MagicMock()
        mock_res._raw = {
            "result": True,
            "url": "https://download.seedr.cc/stream/123/video.mp4",
            "name": "video.mp4"
        }
        mock_client.fetch_file.return_value = mock_res
        mock_seedr_cls.return_value = mock_client

        service = SeedrService(self.account)
        data = service.fetch_file(123)

        self.assertTrue(data['result'])
        self.assertEqual(data['url'], "https://download.seedr.cc/stream/123/video.mp4")
        mock_client.fetch_file.assert_called_once_with(file_id="123")

    @patch('seedr_service.services.Seedr')
    def test_create_archive_uses_official_seedrcc_api(self, mock_seedr_cls):
        mock_client = MagicMock()
        mock_res = MagicMock()
        mock_res._raw = {
            "result": True,
            "archive_id": "arc_999",
            "archive_url": "https://download.seedr.cc/archive/999.zip",
            "code": 200
        }
        mock_client.create_archive.return_value = mock_res
        mock_seedr_cls.return_value = mock_client

        service = SeedrService(self.account)
        data = service.create_archive(555)

        self.assertTrue(data['result'])
        self.assertEqual(data['archive_id'], "arc_999")
        mock_client.create_archive.assert_called_once_with(folder_id="555")

    @patch('seedr_service.services.Seedr')
    def test_add_folder_rename_and_delete_operations(self, mock_seedr_cls):
        mock_client = MagicMock()
        api_ok = MagicMock()
        api_ok._raw = {"result": True, "code": 200}
        mock_client.add_folder.return_value = api_ok
        mock_client.rename_file.return_value = api_ok
        mock_client.rename_folder.return_value = api_ok
        mock_client.delete_file.return_value = api_ok
        mock_client.delete_folder.return_value = api_ok
        mock_client.delete_torrent.return_value = api_ok
        mock_seedr_cls.return_value = mock_client

        service = SeedrService(self.account)

        self.assertTrue(service.add_folder("New Folder")['result'])
        mock_client.add_folder.assert_called_once_with(name="New Folder")

        self.assertTrue(service.rename_file(10, "renamed.mp4")['result'])
        mock_client.rename_file.assert_called_once_with(file_id="10", rename_to="renamed.mp4")

        self.assertTrue(service.rename_folder(20, "Renamed Folder")['result'])
        mock_client.rename_folder.assert_called_once_with(folder_id="20", rename_to="Renamed Folder")

        self.assertTrue(service.delete_file(10)['result'])
        mock_client.delete_file.assert_called_once_with(file_id="10")

        self.assertTrue(service.delete_folder(20)['result'])
        mock_client.delete_folder.assert_called_once_with(folder_id="20")

        self.assertTrue(service.delete_torrent(30)['result'])
        mock_client.delete_torrent.assert_called_once_with(torrent_id="30")

    @patch('seedr_service.services.Seedr')
    def test_torrent_progress_and_page_scan(self, mock_seedr_cls):
        mock_client = MagicMock()
        prog_res = MagicMock()
        prog_res._raw = {
            "title": "Linux ISO",
            "size": 1073741824,
            "progress": 75.5,
            "download_rate": 1500000,
            "seeders": 42,
            "stopped": False,
        }
        mock_client.get_torrent_progress.return_value = prog_res
        mock_seedr_cls.return_value = mock_client

        service = SeedrService(self.account)
        progress = service.get_torrent_progress("https://seedr.cc/progress/abc")

        self.assertEqual(progress['title'], "Linux ISO")
        self.assertEqual(progress['progress'], 75.5)
        mock_client.get_torrent_progress.assert_called_once_with(progress_url="https://seedr.cc/progress/abc")

    @patch('seedr_service.services.Seedr')
    def test_test_connection_updates_metrics_and_sanitizes_credentials(self, mock_seedr_cls):
        mock_client = MagicMock()
        mock_settings = MagicMock()
        mock_account_info = MagicMock()
        mock_account_info.user_id = 998877
        mock_account_info.username = "seedr_user_main"
        mock_account_info.premium = True
        mock_account_info.package_name = "Master"
        mock_account_info.space_used = 5000000000
        mock_account_info.space_max = 100000000000
        mock_account_info.bandwidth_used = 2000000000
        mock_settings.account = mock_account_info
        mock_settings._raw = {
            "result": True,
            "account": {
                "user_id": 998877,
                "username": "seedr_user_main",
                "premium": True,
                "package_name": "Master",
                "space_used": 5000000000,
                "space_max": 100000000000,
                "bandwidth_used": 2000000000,
            }
        }
        mock_client.get_settings.return_value = mock_settings
        mock_seedr_cls.return_value = mock_client

        service = SeedrService(self.account)
        test_res = service.test_connection()

        self.assertTrue(test_res['success'])
        self.assertEqual(test_res['status'], "connected")
        self.assertEqual(test_res['seedr_user_id'], "998877")
        self.assertTrue(test_res['premium'])
        self.assertEqual(test_res['space_used'], 5000000000)

        # Ensure no passwords or tokens in test result
        self.assertNotIn('password', test_res)
        self.assertNotIn('access_token', test_res)
        self.assertNotIn('refresh_token', test_res)

        # Verify model cached fields were updated
        self.account.refresh_from_db()
        self.assertEqual(self.account.seedr_user_id, "998877")
        self.assertEqual(self.account.seedr_username, "seedr_user_main")
        self.assertTrue(self.account.premium)
        self.assertEqual(self.account.package_name, "Master")
        self.assertEqual(self.account.space_used, 5000000000)
        self.assertEqual(self.account.space_max, 100000000000)
        self.assertIsNotNone(self.account.last_connection_test)

    @patch('seedr_service.services.Seedr')
    def test_test_connection_identity_mismatch_detection(self, mock_seedr_cls):
        mock_client = MagicMock()
        mock_settings = MagicMock()
        mock_account_info = MagicMock()
        mock_account_info.user_id = 111222  # Authenticated as 111222
        mock_settings.account = mock_account_info
        mock_settings._raw = {"account": {"user_id": 111222}}
        mock_client.get_settings.return_value = mock_settings
        mock_seedr_cls.return_value = mock_client

        # SeedrAccount expected user_id is 999999
        self.account.seedr_user_id = "999999"
        self.account.save()

        service = SeedrService(self.account)
        test_res = service.test_connection(expected_user_id="999999")

        self.assertFalse(test_res['success'])
        self.assertEqual(test_res['status'], "identity_mismatch")
        self.assertIn("Expected user ID '999999', but authenticated as '111222'", test_res['error'])

    @patch('seedr_service.services.Seedr')
    def test_exception_mappings(self, mock_seedr_cls):
        mock_client = MagicMock()
        mock_seedr_cls.return_value = mock_client
        service = SeedrService(self.account)

        # NetworkError mapping
        mock_client.list_contents.side_effect = seedr_exc.NetworkError("Connection timed out")
        with self.assertRaises(SeedrNetworkError):
            service.list_contents()

        # ServerError mapping
        mock_client.list_contents.side_effect = seedr_exc.ServerError("502 Bad Gateway")
        with self.assertRaises(SeedrUnavailableError):
            service.list_contents()

        # TokenError mapping
        mock_client.list_contents.side_effect = seedr_exc.TokenError("Corrupt token")
        with self.assertRaises(SeedrTokenError):
            service.list_contents()

        # APIError 404 mapping
        mock_client.list_contents.side_effect = seedr_exc.APIError("Resource not found")
        with self.assertRaises(SeedrNotFoundError):
            service.list_contents()

        # Generic APIError mapping
        mock_client.list_contents.side_effect = seedr_exc.APIError("Rate limit exceeded")
        with self.assertRaises(SeedrAPIError):
            service.list_contents()
