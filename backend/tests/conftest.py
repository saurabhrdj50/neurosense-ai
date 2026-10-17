"""
Shared pytest fixtures for the NeuroSense FastAPI app.
"""

import os
import sys
import pytest

# Ensure the project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Test-mode env: disables the rate limiter and enables the reset-token echo
# (there is no email delivery channel in tests). Demo data seeding is opted
# into per-fixture below.
os.environ.setdefault('SECRET_KEY', 'test-secret-key')
os.environ.setdefault('TESTING', 'true')
os.environ.setdefault('EXPOSE_RESET_TOKEN', 'true')

from fastapi.testclient import TestClient


@pytest.fixture
def app(tmp_path, monkeypatch):
    """The FastAPI app with a fresh temporary database per test.

    Default: throwaway SQLite file. Set ``TEST_DATABASE_URL`` (e.g. a CI
    postgres service) to run the same suite against PostgreSQL — tables are
    dropped and recreated per test, so a dedicated empty database is required.
    """
    from app.config.settings import Config
    from app.shared import bootstrap, db_orm

    monkeypatch.setenv('SEED_DEMO_DATA', 'true')

    test_db_url = os.environ.get('TEST_DATABASE_URL')
    if test_db_url:
        if test_db_url.startswith('postgres://'):
            test_db_url = test_db_url.replace('postgres://', 'postgresql://', 1)
        monkeypatch.setattr(Config, 'DATABASE_URL', test_db_url)
    else:
        monkeypatch.setattr(Config, 'DATABASE_URL', None)
        monkeypatch.setattr(Config, 'DB_PATH', str(tmp_path / 'test_patient_data.db'))
    db_orm.reset_engine()

    from app.main import app as fastapi_app

    # Fresh schema per test (request-path code never runs DDL). Order matters:
    # schema → test doctor user → bootstrap, so the demo patients (opted into
    # below) are owned by the doctor exactly like the old seeded world. The
    # app itself ships only the fixed admin (admin/admin) — the doctor here
    # is test scaffolding, created through the repository like the seeder did.
    from app.shared.db_orm import Base, get_engine
    Base.metadata.drop_all(bind=get_engine())
    bootstrap.ensure_schema()

    from app.features.auth.repository import UserRepository
    UserRepository().create(
        username='doctor',
        email='doctor@neurosense.ai',
        password='Doctor@123',
        role='doctor',
        full_name='Dr. Gupta',
        date_of_birth='1980-06-20',
    )

    bootstrap.bootstrap_database()

    yield fastapi_app

    db_orm.reset_engine()


@pytest.fixture
def client(app):
    """FastAPI test client (httpx transport)."""
    return TestClient(app)


@pytest.fixture
def authenticated_client(client):
    """A test client that is already logged in as doctor."""
    client.post('/api/auth/login', json={
        'username': 'doctor',
        'password': 'Doctor@123',
    })
    return client
