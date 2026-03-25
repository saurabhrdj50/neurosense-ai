"""
Tests for authentication routes and AuthManager.
"""

import pytest


class TestLogin:
    def test_login_page_renders(self, client):
        """GET /login should return 200."""
        resp = client.get('/login')
        assert resp.status_code == 200

    def test_login_success(self, client):
        """POST /login with valid credentials should return success."""
        resp = client.post('/login', json={
            'username': 'admin',
            'password': 'admin123',
        })
        data = resp.get_json()
        assert data['success'] is True
        assert data['user']['username'] == 'admin'
        assert data['user']['role'] == 'admin'

    def test_login_failure(self, client):
        """POST /login with bad credentials should return 401."""
        resp = client.post('/login', json={
            'username': 'admin',
            'password': 'wrongpassword',
        })
        assert resp.status_code == 401
        data = resp.get_json()
        assert data['success'] is False

    def test_login_empty_credentials(self, client):
        """POST /login with empty credentials should fail."""
        resp = client.post('/login', json={
            'username': '',
            'password': '',
        })
        assert resp.status_code == 401


class TestRegister:
    def test_register_success(self, client):
        """POST /register with new user should succeed."""
        resp = client.post('/register', json={
            'username': 'newdoctor123',
            'email': 'new123@hospital.com',
            'password': 'pass123',
            'role': 'doctor',
            'full_name': 'Dr. New',
        })
        data = resp.get_json()
        assert data['success'] is True, f"Failed: {data.get('message', data)}"

    def test_register_duplicate(self, client):
        """POST /register with existing username should return 409."""
        resp = client.post('/register', json={
            'username': 'admin',
            'email': 'admin2@test.com',
            'password': 'pass123',
            'role': 'admin',
            'full_name': 'Admin 2',
        })
        assert resp.status_code == 409


class TestCurrentUser:
    def test_unauthenticated_user(self, client):
        """GET /api/current-user should return authenticated=False."""
        resp = client.get('/api/current-user')
        data = resp.get_json()
        assert data['authenticated'] is False

    def test_authenticated_user(self, authenticated_client):
        """After login, /api/current-user should return user info."""
        resp = authenticated_client.get('/api/current-user')
        data = resp.get_json()
        assert data['authenticated'] is True
        assert data['user']['role'] == 'doctor'


class TestLogout:
    def test_logout_redirects(self, authenticated_client):
        """GET /logout should redirect to login."""
        resp = authenticated_client.get('/logout')
        assert resp.status_code in (302, 308)
