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
    os.environ['SECRET_KEY'] = 'test-secret-key'
    os.environ['TESTING'] = 'true'  # disables rate-limiter in test mode
    os.environ['SEED_DEMO_DATA'] = 'true'  # ensure seed users/patients are created
    os.environ['FLASK_ENV'] = 'development'

    # Patch the DB path BEFORE modules are loaded
    from app.core.database import Database
    
    from app.core.config import Config
    original_config_db = Config.DB_PATH
    Config.DB_PATH = tmp_db

    # Now reset the singleton AFTER patching, so create_app() picks up the new path
    original_db_instance = Database._instance
    Database._instance = None

    # Clear cached modules so they reinitialise with fresh DB
    import app as app_module
    flask_app = app_module.create_app()
    
    flask_app.config['TESTING'] = True
    flask_app.config['WTF_CSRF_ENABLED'] = False

    from app.core.db_orm import Base, get_engine
    Base.metadata.drop_all(bind=get_engine())
    Base.metadata.create_all(bind=get_engine())
    from app.repositories.user_repository import UserRepository
    UserRepository()
    from app.repositories.patient_repository import PatientRepository
    PatientRepository()

    with flask_app.app_context():
        yield flask_app

    # Restore original DB paths and clear modules
    Database._instance = None
    Config.DB_PATH = original_config_db
    os.environ.pop('TESTING', None)
    os.environ.pop('SEED_DEMO_DATA', None)
    os.environ.pop('FLASK_ENV', None)


@pytest.fixture
def client(app):
    """Flask test client."""
    return app.test_client()


@pytest.fixture
def authenticated_client(client):
    """A test client that is already logged in as doctor."""
    client.post('/api/auth/login', json={
        'username': 'doctor',
        'password': 'Doctor@123',
    })
    return client
