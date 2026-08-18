"""
Tests for authentication routes and AuthManager.
"""

import pytest


class TestLogin:
    def test_login_success(self, client):
        """POST /login with valid credentials should return success."""
        resp = client.post('/api/auth/login', json={
            'username': 'admin',
            'password': 'Admin@123!',
        })
        data = resp.get_json()
        assert data['success'] is True
        assert data['user']['username'] == 'admin'
        assert data['user']['role'] == 'admin'

    def test_login_failure(self, client):
        """POST /login with bad credentials should return 401."""
        resp = client.post('/api/auth/login', json={
            'username': 'admin',
            'password': 'wrongpassword',
        })
        assert resp.status_code == 401
        data = resp.get_json()
        assert data['success'] is False

    def test_login_empty_credentials(self, client):
        """POST /login with empty credentials should fail."""
        resp = client.post('/api/auth/login', json={
            'username': '',
            'password': '',
        })
        assert resp.status_code == 400


class TestRegister:
    def test_register_success(self, client):
        """POST /register with new user should succeed."""
        resp = client.post('/api/auth/register', json={
            'username': 'brandnewdoc999',
            'email': 'brandnew999@hospital.com',
            'password': 'SecurePass123!',
            'role': 'doctor',
            'full_name': 'Dr. New',
            'date_of_birth': '1985-06-15',
        })
        data = resp.get_json()
        assert data['success'] is True, f"Failed: {data.get('message', data)}"

    def test_register_duplicate(self, client):
        """POST /register with existing username should return 409."""
        resp = client.post('/api/auth/register', json={
            'username': 'admin',
            'email': 'admin2@test.com',
            'password': 'SecurePass123!',
            'role': 'admin',
            'full_name': 'Admin 2',
            'date_of_birth': '1980-01-01',
        })
        assert resp.status_code == 409


class TestCurrentUser:
    def test_unauthenticated_user(self, client):
        """GET /api/current-user should return authenticated=False."""
        resp = client.get('/api/auth/current-user')
        data = resp.get_json()
        assert data['authenticated'] is False

    def test_authenticated_user(self, authenticated_client):
        """After login, /api/current-user should return user info."""
        resp = authenticated_client.get('/api/auth/current-user')
        data = resp.get_json()
        assert data['authenticated'] is True
        assert data['user']['role'] == 'doctor'


class TestLogout:
    def test_logout_success(self, authenticated_client):
        """POST /api/auth/logout should logout and return success."""
        resp = authenticated_client.post('/api/auth/logout')
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True

class TestForgotPassword:
    def test_forgot_password_valid(self, client):
        resp = client.post('/api/auth/forgot-password', json={
            'email': 'admin@neurosense.ai',
            'date_of_birth': '1985-01-15'
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['success'] is True
        assert 'reset_token' in data

    def test_reset_password_valid(self, client):
        # 1. Request token
        resp1 = client.post('/api/auth/forgot-password', json={
            'email': 'admin@neurosense.ai',
            'date_of_birth': '1985-01-15'
        })
        token = resp1.get_json()['reset_token']
        
        # 2. Use token
        resp2 = client.post('/api/auth/reset-password', json={
            'token': token,
            'new_password': 'NewAdmin@123!'
        })
        assert resp2.status_code == 200
        data2 = resp2.get_json()
        assert data2['success'] is True
