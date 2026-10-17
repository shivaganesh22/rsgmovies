from unittest.mock import patch, MagicMock
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from react.models import UserToken

User = get_user_model()


class AndroidTVAPITests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='tv_user', email='tv@rsgmovies.com', password='password123')
        self.token = UserToken.objects.create(
            user=self.user,
            key='deeb2172aa5f3a4a392c19f66cb557697399d208',
            is_active=True
        )

    def test_tv_blast_config_endpoint(self):
        res = self.client.get('/react/blast/config/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('domain', data)
        self.assertIn('endpoint', data)
        self.assertIn('token', data)
        self.assertIn('decrypt', data)
        self.assertTrue(len(data['decrypt']) > 0)

    @patch('react.views.get_seedr_service_for_user')
    def test_tv_token_header_files_endpoint(self, mock_get_service):
        mock_service = MagicMock()
        mock_service.list_contents.return_value = {
            'folders': [{'id': 101, 'name': 'TV Seedr Folder'}],
            'files': [{'id': 202, 'name': 'movie.mkv'}],
            'space_used': 1000,
            'space_max': 2000,
        }
        mock_get_service.return_value = mock_service

        res = self.client.get(
            '/react/files/',
            HTTP_AUTHORIZATION='Token deeb2172aa5f3a4a392c19f66cb557697399d208'
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('folders', data)
        self.assertIn('files', data)

    @patch('react.views.get_seedr_service_for_user')
    def test_tv_token_header_folder_file_endpoint(self, mock_get_service):
        mock_service = MagicMock()
        mock_service.list_contents.return_value = {
            'files': [{'id': 202, 'name': 'video.mp4', 'folder_file_id': 202}],
            'folders': []
        }
        mock_service.fetch_file.return_value = {
            'result': True,
            'url': 'https://stream.seedr.cc/video.mp4',
            'name': 'video.mp4'
        }
        mock_get_service.return_value = mock_service

        res = self.client.get(
            '/react/folder/file/101',
            HTTP_AUTHORIZATION='Token deeb2172aa5f3a4a392c19f66cb557697399d208'
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['result'], True)
        self.assertIn('url', data)

    def test_contact_endpoint(self):
        res = self.client.post(
            '/react/contact/',
            data={
                'full_name': 'Test User',
                'email': 'user@example.com',
                'subject': 'Support Inquiry',
                'message': 'Need assistance with streaming'
            },
            content_type='application/json',
            HTTP_AUTHORIZATION='Token deeb2172aa5f3a4a392c19f66cb557697399d208'
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['status'], 'true')
