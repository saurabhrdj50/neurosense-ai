"""
Tests for authentication routes and AuthManager.
"""

import pytest


class TestLogin:
    def test_login_success(self, client):
        """POST /login with valid credentials should return success."""
        resp = client.post('/api/auth/login', json={
            'username': 'admin',
            'password': 'admin',
        })
        data = resp.json()
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
        data = resp.json()
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
        data = resp.json()
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

    def test_register_without_username_derives_from_email(self, client):
        """Simplified registration omits the username — it must be derived
        from the email local part, not rejected."""
        resp = client.post('/api/auth/register', json={
            'email': 'jane.doe@hospital.org',
            'password': 'SecurePass123!',
            'full_name': 'Dr. Jane Doe',
            'date_of_birth': '1990-03-10',
        })
        data = resp.json()
        assert data['success'] is True, f"Failed: {data.get('message', data)}"

    def test_register_raw_email_as_username_is_rejected(self, client):
        """A raw email ('@' included) is never a valid username — clients
        must derive it; sending the bare email keeps failing loudly."""
        resp = client.post('/api/auth/register', json={
            'username': 'someone@hospital.org',
            'email': 'someone@hospital.org',
            'password': 'SecurePass123!',
            'date_of_birth': '1990-03-10',
        })
        assert resp.status_code == 400

    def test_register_with_hospital_persists(self, client):
        """Full registration payload (name, username, email, hospital, DOB,
        password) stores the hospital on the user profile and echoes it back
        from /current-user after login."""
        resp = client.post('/api/auth/register', json={
            'username': 'hospitaldoc1',
            'email': 'hospitaldoc1@hospital.org',
            'password': 'SecurePass123!',
            'full_name': 'Dr. Hos Pital',
            'date_of_birth': '1988-02-20',
            'hospital': 'City General Hospital',
        })
        data = resp.json()
        assert data['success'] is True, f"Failed: {data.get('message', data)}"

        login = client.post('/api/auth/login', json={
            'username': 'hospitaldoc1',
            'password': 'SecurePass123!',
        })
        assert login.status_code == 200
        me = client.get('/api/auth/current-user').json()
        assert me['authenticated'] is True
        assert me['user']['hospital'] == 'City General Hospital'

    def test_register_hospital_is_whitespace_collapsed_and_length_capped(self, client):
        resp = client.post('/api/auth/register', json={
            'username': 'hospitaldoc2',
            'email': 'hospitaldoc2@hospital.org',
            'password': 'SecurePass123!',
            'date_of_birth': '1988-02-20',
            'hospital': '  City   General   Hospital  ',
        })
        data = resp.json()
        assert data['success'] is True, f"Failed: {data.get('message', data)}"

        client.post('/api/auth/login', json={
            'username': 'hospitaldoc2', 'password': 'SecurePass123!'})
        me = client.get('/api/auth/current-user').json()
        assert me['user']['hospital'] == 'City General Hospital'

        resp = client.post('/api/auth/register', json={
            'username': 'hospitaldoc3',
            'email': 'hospitaldoc3@hospital.org',
            'password': 'SecurePass123!',
            'date_of_birth': '1988-02-20',
            'hospital': 'X' * 121,
        })
        assert resp.status_code == 400

    def test_register_without_hospital_still_succeeds(self, client):
        """Legacy clients omit hospital — the field is optional server-side."""
        resp = client.post('/api/auth/register', json={
            'username': 'nohospitaldoc',
            'email': 'nohospitaldoc@hospital.org',
            'password': 'SecurePass123!',
            'date_of_birth': '1988-02-20',
        })
        data = resp.json()
        assert data['success'] is True, f"Failed: {data.get('message', data)}"


class TestCurrentUser:
    def test_unauthenticated_user(self, client):
        """GET /api/current-user should return authenticated=False."""
        resp = client.get('/api/auth/current-user')
        data = resp.json()
        assert data['authenticated'] is False

    def test_authenticated_user(self, authenticated_client):
        """After login, /api/current-user should return user info."""
        resp = authenticated_client.get('/api/auth/current-user')
        data = resp.json()
        assert data['authenticated'] is True
        assert data['user']['role'] == 'doctor'


class TestLogout:
    def test_logout_success(self, authenticated_client):
        """POST /api/auth/logout should logout and return success."""
        resp = authenticated_client.post('/api/auth/logout')
        assert resp.status_code == 200
        data = resp.json()
        assert data['success'] is True

class TestForgotPassword:
    def test_forgot_password_valid(self, client):
        """Doctor identity (email + DOB) receives an echoable reset token."""
        resp = client.post('/api/auth/forgot-password', json={
            'email': 'doctor@neurosense.ai',
            'date_of_birth': '1980-06-20'
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data['success'] is True
        assert 'reset_token' in data

    def test_reset_password_valid(self, client):
        # 1. Request token for the doctor identity
        resp1 = client.post('/api/auth/forgot-password', json={
            'email': 'doctor@neurosense.ai',
            'date_of_birth': '1980-06-20'
        })
        token = resp1.json()['reset_token']

        # 2. Use token
        resp2 = client.post('/api/auth/reset-password', json={
            'token': token,
            'new_password': 'NewDoctor@123!'
        })
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2['success'] is True

    def test_forgot_password_admin_never_gets_token(self, client):
        """Even with a perfectly matching identity, the fixed admin account
        must never receive a reset token (tests run with EXPOSE_RESET_TOKEN
        enabled, so a token would show up here if the guard failed)."""
        from app.shared.db_orm import SessionLocal
        from app.shared.models.user import User
        with SessionLocal() as db:
            admin = db.query(User).filter(User.username == 'admin').first()
            admin.date_of_birth = '1980-01-01'  # make the identity matchable
            db.commit()

        resp = client.post('/api/auth/forgot-password', json={
            'email': 'admin@neurosense.ai',
            'date_of_birth': '1980-01-01'
        })
        assert resp.status_code == 200
        assert 'reset_token' not in resp.json()

    def test_fixed_admin_credential_is_enforced_on_bootstrap(self, client):
        """admin/admin is a deployment constant: a direct password change is
        reverted by the next startup bootstrap."""
        from app.features.auth.repository import UserRepository
        from app.shared import bootstrap

        repo = UserRepository()
        admin = repo.get_by_username('admin')
        repo.reset_password(admin.id, 'Changed@123')

        assert client.post('/api/auth/login', json={
            'username': 'admin', 'password': 'admin'}).status_code == 401

        bootstrap.bootstrap_database()  # simulates a container restart

        assert client.post('/api/auth/login', json={
            'username': 'admin', 'password': 'admin'}).status_code == 200

    def test_fresh_bootstrap_has_only_fixed_admin(self, tmp_path, monkeypatch):
        """A brand-new database ships with exactly one account: the fixed
        admin (admin/admin). No default doctor — doctors self-register."""
        from app.config.settings import Config
        from app.shared import bootstrap, db_orm

        monkeypatch.setattr(Config, 'DATABASE_URL', None)
        monkeypatch.setattr(Config, 'DB_PATH', str(tmp_path / 'fresh_bootstrap.db'))
        db_orm.reset_engine()
        try:
            bootstrap.bootstrap_database()
            from app.features.auth.repository import UserRepository
            repo = UserRepository()
            assert repo.get_by_username('doctor') is None
            admin = repo.get_by_username('admin')
            assert admin is not None and admin.role == 'admin'
            assert admin.check_password('admin')
        finally:
            db_orm.reset_engine()
