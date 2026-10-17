from django.test import TestCase, Client


class HealthAndErrorTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_health_check_endpoint(self):
        res = self.client.get('/health/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['status'], 'ok')
        self.assertEqual(data['service'], 'rsg-movies-backend')

    def test_health_live_endpoint(self):
        res = self.client.get('/health/live/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['status'], 'live')

    def test_health_ready_endpoint(self):
        res = self.client.get('/health/ready/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['status'], 'ready')
        self.assertTrue(data['checks']['database'])

    def test_request_id_generation_and_propagation(self):
        # Without incoming header
        res = self.client.get('/health/')
        self.assertIn('X-Request-ID', res.headers)
        generated_id = res.headers['X-Request-ID']
        self.assertTrue(len(generated_id) >= 8)

        # With incoming custom header
        custom_id = "custom-test-request-id-12345"
        res_custom = self.client.get('/health/', HTTP_X_REQUEST_ID=custom_id)
        self.assertEqual(res_custom.headers['X-Request-ID'], custom_id)

    def test_structured_error_response_format(self):
        # Test 401 error structure on protected route
        res = self.client.get('/api/admin/users/')
        self.assertEqual(res.status_code, 401)
        data = res.json()
        self.assertIn('error', data)
        self.assertIn('code', data['error'])
        self.assertIn('message', data['error'])
        self.assertIn('request_id', data['error'])
