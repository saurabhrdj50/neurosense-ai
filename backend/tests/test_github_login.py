"""GitHub OAuth login + simplified-deploy gating.

Covers the feat/github-login-simplified changes:
  - GET /api/auth/github/login answers 503 until the GitHub OAuth App is
    configured, and redirects to github.com once it is.
  - GET /api/auth/github/callback rejects a mismatched ``state`` (CSRF).
  - UserRepository.create_github_user() / get_by_github_id() round-trip,
    and GitHub-only accounts cannot log in with a password.
  - No fixed admin is created in production when ADMIN_PASSWORD is unset.
  - MRI preview answers 503 while ENABLE_MRI is false.
"""
import pytest

from app.config.settings import Config
from app.features.auth.repository import UserRepository
from app.shared.db_orm import SessionLocal
from app.shared.models.user import User


class TestGithubLoginDisabled:
    def test_login_503_when_unconfigured(self, client):
        resp = client.get('/api/auth/github/login', follow_redirects=False)
        assert resp.status_code == 503
        assert 'not configured' in resp.json()['message']

    def test_login_redirects_when_configured(self, client, monkeypatch):
        monkeypatch.setattr(Config, 'GITHUB_CLIENT_ID', 'test-client-id')
        monkeypatch.setattr(Config, 'GITHUB_CLIENT_SECRET', 'test-secret')
        monkeypatch.setattr(Config, 'GITHUB_REDIRECT_URI',
                            'https://api.example.com/api/auth/github/callback')
        resp = client.get('/api/auth/github/login', follow_redirects=False)
        assert resp.status_code == 302
        location = resp.headers['location']
        assert location.startswith('https://github.com/login/oauth/authorize')
        assert 'client_id=test-client-id' in location
        assert 'scope=read%3Auser' in location or 'scope=read:user' in location
        assert 'state=' in location


class TestGithubCallback:
    def test_callback_rejects_state_mismatch(self, client, monkeypatch):
        monkeypatch.setattr(Config, 'GITHUB_CLIENT_ID', 'test-client-id')
        monkeypatch.setattr(Config, 'GITHUB_CLIENT_SECRET', 'test-secret')
        monkeypatch.setattr(Config, 'GITHUB_REDIRECT_URI',
                            'https://api.example.com/api/auth/github/callback')
        resp = client.get(
            '/api/auth/github/callback?code=abc&state=not-the-stored-state',
            follow_redirects=False,
        )
        assert resp.status_code == 302
        assert 'github_error=state_mismatch' in resp.headers['location']

    def test_callback_503_when_unconfigured(self, client):
        resp = client.get(
            '/api/auth/github/callback?code=abc&state=abc',
            follow_redirects=False,
        )
        assert resp.status_code == 503


class TestGithubUsers:
    def test_create_and_find_github_user(self, app):
        repo = UserRepository()
        result = repo.create_github_user(
            github_id='123456',
            github_login='octo-doc',
            email='octo-doc@example.com',
            full_name='Dr. Octo',
            avatar_url='https://example.com/avatar.png',
        )
        assert result['success'] is True
        user = repo.get_by_github_id('123456')
        assert user is not None
        assert user.username == 'octo-doc'
        assert user.role == 'doctor'
        assert user.auth_provider == 'github'
        assert user.avatar_url == 'https://example.com/avatar.png'

    def test_github_user_cannot_log_in_with_password(self, app):
        repo = UserRepository()
        repo.create_github_user(
            github_id='999',
            github_login='gh-only',
            email='gh-only@example.com',
        )
        assert repo.authenticate('gh-only', 'anything-at-all') is None

    def test_github_username_deduplicated(self, app):
        repo = UserRepository()
        repo.create(
            username='octo-doc', email='plain@example.com',
            password='SecurePass123!', role='doctor',
        )
        result = repo.create_github_user(
            github_id='777', github_login='octo-doc',
            email='octo-doc@example.com',
        )
        assert result['success'] is True
        user = repo.get_by_github_id('777')
        assert user.username != 'octo-doc'
        assert user.username.startswith('octo-doc')

    def test_link_github_account_to_existing_user(self, app):
        repo = UserRepository()
        created = repo.create(
            username='email-doc', email='email-doc@example.com',
            password='SecurePass123!', role='doctor',
        )
        assert created['success'] is True
        user = repo.get_by_email('email-doc@example.com')
        assert repo.link_github_account(user.id, '555', 'email-doc', '') is True
        assert repo.get_by_github_id('555').id == user.id


class TestAdminInProduction:
    def test_no_fixed_admin_without_password_in_production(self, app, monkeypatch):
        from app.shared import bootstrap

        monkeypatch.setattr(Config, 'IS_PRODUCTION', True)
        monkeypatch.delenv('ADMIN_PASSWORD', raising=False)
        monkeypatch.delenv('INITIAL_ADMIN_PASSWORD', raising=False)

        with SessionLocal() as db:
            db.query(User).filter(User.username == 'admin').delete()
            db.commit()
            bootstrap._ensure_fixed_admin(db)
            assert db.query(User).filter(User.username == 'admin').first() is None

    def test_admin_created_when_password_set_in_production(self, app, monkeypatch):
        from app.shared import bootstrap

        monkeypatch.setattr(Config, 'IS_PRODUCTION', True)
        monkeypatch.setenv('ADMIN_PASSWORD', 'ProdAdmin@123')

        with SessionLocal() as db:
            db.query(User).filter(User.username == 'admin').delete()
            db.commit()
            bootstrap._ensure_fixed_admin(db)
            admin = db.query(User).filter(User.username == 'admin').first()
            assert admin is not None
            assert admin.check_password('ProdAdmin@123') is True


class TestSimplifiedGating:
    def test_mri_preview_disabled_when_flag_off(self, authenticated_client, monkeypatch):
        monkeypatch.setattr(Config, 'ENABLE_MRI', False)
        resp = authenticated_client.post(
            '/api/analysis/mri/preview',
            files={'mri_image': ('scan.png', b'\x89PNG\r\n\x1a\n', 'image/png')},
        )
        assert resp.status_code == 503
        assert 'disabled' in resp.json()['error'].lower()

    def test_mri_preview_enabled_by_default(self, authenticated_client):
        # No model file in the test env, so the preview cannot render — but
        # the request must get past the feature gate (400/500, not 503).
        resp = authenticated_client.post(
            '/api/analysis/mri/preview',
            files={'mri_image': ('scan.png', b'\x89PNG\r\n\x1a\n', 'image/png')},
        )
        assert resp.status_code != 503
