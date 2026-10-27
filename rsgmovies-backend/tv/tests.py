from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from tv.models import TVAuthRequest, TVDeviceSession, AppVersionConfig
from accounts.models import UserProfile

User = get_user_model()


class TVBackendTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='tv_tester@rsgmovies.com',
            email='tv_tester@rsgmovies.com',
            password='password123'
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            upn='tv_tester@rsgmovies.com',
            display_name='TV Tester',
            role='User',
            is_active=True
        )

    def test_tv_qr_init(self):
        res = self.client.post('/api/tv/auth/qr/init/', {
            'device_id': 'tv-device-test-123',
            'device_name': 'Living Room Sony TV',
            'app_version': '1.0.0'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn('request_id', data)
        self.assertIn('qr_code_url', data)
        self.assertEqual(data['device_id'], 'tv-device-test-123')
        self.assertTrue(data['qr_code_url'].startswith('https://'))

    def test_tv_qr_poll_pending_and_expired(self):
        # 1. Test Pending
        auth_req = TVAuthRequest.objects.create(
            device_id='tv-device-poll-test',
            device_name='Samsung TV',
            status='PENDING',
            expires_at=timezone.now() + timedelta(minutes=5)
        )
        res = self.client.get(f'/api/tv/auth/qr/poll/?request_id={auth_req.request_id}&device_id=tv-device-poll-test')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['status'], 'PENDING')

        # 2. Test Expired
        auth_req_exp = TVAuthRequest.objects.create(
            device_id='tv-device-exp-test',
            device_name='LG TV',
            status='PENDING',
            expires_at=timezone.now() - timedelta(minutes=1)
        )
        res_exp = self.client.get(f'/api/tv/auth/qr/poll/?request_id={auth_req_exp.request_id}&device_id=tv-device-exp-test')
        self.assertEqual(res_exp.status_code, 200)
        self.assertEqual(res_exp.json()['status'], 'EXPIRED')

    def test_tv_qr_approval_and_single_active_device(self):
        auth_req = TVAuthRequest.objects.create(
            device_id='tv-device-approve-test',
            device_name='Sony Bravia 4K',
            status='PENDING',
            expires_at=timezone.now() + timedelta(minutes=5)
        )

        # Login user on web
        self.client.force_login(self.user)

        # Approve request
        res = self.client.post('/api/tv/auth/qr/approve/', {
            'request_id': auth_req.request_id,
            'action': 'approve'
        }, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['status'], 'APPROVED')

        # Verify TVDeviceSession was created
        session = TVDeviceSession.objects.filter(user=self.user, is_active=True).first()
        self.assertIsNotNone(session)
        self.assertEqual(session.device_id, 'tv-device-approve-test')

        # Verify TV Polling returns APPROVED with session_token
        poll_res = self.client.get(f'/api/tv/auth/qr/poll/?request_id={auth_req.request_id}')
        self.assertEqual(poll_res.status_code, 200)
        poll_data = poll_res.json()
        self.assertEqual(poll_data['status'], 'APPROVED')
        self.assertEqual(poll_data['session_token'], session.session_token)
        self.assertEqual(poll_data['user']['upn'], 'tv_tester@rsgmovies.com')

        # Test validating the session using TVDeviceSessionAuthentication
        val_res = self.client.get(
            '/api/tv/session/validate/',
            HTTP_AUTHORIZATION=f'Bearer {session.session_token}'
        )
        self.assertEqual(val_res.status_code, 200)
        self.assertTrue(val_res.json()['valid'])

        # Test TV Logout
        logout_res = self.client.post(
            '/api/tv/session/logout/',
            HTTP_AUTHORIZATION=f'Bearer {session.session_token}'
        )
        self.assertEqual(logout_res.status_code, 200)
        session.refresh_from_db()
        self.assertFalse(session.is_active)

    def test_tv_config_endpoint(self):
        AppVersionConfig.objects.create(
            platform='android_tv',
            min_supported_version='1.0.0',
            latest_version='1.2.0',
            is_update_required=False,
            update_url='https://rsgmovies.vercel.app/download/tv.apk',
            release_notes='Performance and UI improvements.'
        )

        res = self.client.get('/api/tv/config/?platform=android_tv&version=1.0.0')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('maintenance', data)
        self.assertIn('blast', data)
        self.assertIn('version', data)
        self.assertEqual(data['version']['latest_version'], '1.2.0')
        self.assertTrue(data['version']['has_update'])
