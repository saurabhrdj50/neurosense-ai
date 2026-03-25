"""
Shared pytest fixtures for NeuroSense tests.
"""

import os
import sys
import pytest

# Ensure the project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def app(tmp_path):
    """Create a Flask test application with a temporary database."""
    tmp_db = str(tmp_path / 'test_patient_data.db')
    os.environ.setdefault('SECRET_KEY', 'test-secret-key')

    # Patch the DB path BEFORE modules are loaded so AuthManager AND
    # PatientHistory both use the temp DB
    import app.services.auth as auth_module
    import app.services.patient_history as history_module
    original_auth_db = auth_module.DB_PATH
    original_history_db = history_module.DB_PATH
    auth_module.DB_PATH = tmp_db
    history_module.DB_PATH = tmp_db

    # Clear cached modules so they reinitialise with fresh DB
    import app as app_module
    app_module._modules.clear()

    app_module.app.config['TESTING'] = True
    app_module.app.config['WTF_CSRF_ENABLED'] = False

    yield app_module.app

    # Restore original DB paths and clear modules
    auth_module.DB_PATH = original_auth_db
    history_module.DB_PATH = original_history_db
    app_module._modules.clear()


@pytest.fixture
def client(app):
    """Flask test client."""
    return app.test_client()


@pytest.fixture
def authenticated_client(client):
    """A test client that is already logged in as doctor."""
    client.post('/login', json={
        'username': 'doctor',
        'password': 'doctor123',
    })
    return client
