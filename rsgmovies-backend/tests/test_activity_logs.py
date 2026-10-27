from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from accounts.models import UserProfile
from seedr_service.models import SeedrAccount
from activity.models import ActivityEvent, ActivityLogConfig
from activity.services import log_activity_event

User = get_user_model()


class ActivityLogsManagementTests(TestCase):
    def setUp(self):
        self.main_seedr = SeedrAccount.objects.create(name="Main Seedr", username="main@seedr.com", is_default=True)

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

    def test_activity_log_creation_and_config_filtering(self):
        config = ActivityLogConfig.get_config()
        config.media_events = False
        config.save()

        # Media event should be suppressed to save storage
        event1 = log_activity_event(event_type='MOVIE_VIEWED', user=self.normal_user, resource_type='Movie', resource_id='101')
        self.assertIsNone(event1)
        self.assertEqual(ActivityEvent.objects.filter(event_type='MOVIE_VIEWED').count(), 0)

        # Auth event should be recorded
        event2 = log_activity_event(event_type='LOGIN_SUCCESS', user=self.normal_user)
        self.assertIsNotNone(event2)
        self.assertEqual(ActivityEvent.objects.filter(event_type='LOGIN_SUCCESS').count(), 1)

    def test_admin_can_retrieve_and_update_log_settings(self):
        client = Client()
        client.force_login(self.admin_user)
        self.admin_profile.active_session_key = client.session.session_key
        self.admin_profile.save()

        # GET settings
        res = client.get('/api/admin/activity-logs/settings/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue('auth_events' in res.json())

        # POST update settings
        res = client.post(
            '/api/admin/activity-logs/settings/',
            data={'media_events': False, 'stream_events': False},
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()['media_events'])
        self.assertFalse(res.json()['stream_events'])

    def test_admin_can_clear_all_logs(self):
        # Create some events
        log_activity_event(event_type='LOGIN_SUCCESS', user=self.normal_user)
        log_activity_event(event_type='SEEDR_OP_SUCCESS', user=self.normal_user)
        self.assertTrue(ActivityEvent.objects.count() >= 2)

        client = Client()
        client.force_login(self.admin_user)
        self.admin_profile.active_session_key = client.session.session_key
        self.admin_profile.save()

        res = client.delete('/api/admin/activity-logs/clear/')
        self.assertEqual(res.status_code, 200)
        # Should contain only the new clear action audit event
        self.assertEqual(ActivityEvent.objects.count(), 1)
        self.assertEqual(ActivityEvent.objects.first().event_type, 'MAINTENANCE_ENABLED')
