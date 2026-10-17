from sqlalchemy import text

from app.shared import db_orm
from app.features.patients.repository import PatientRepository
from app.features.history.repository import SessionRepository
from app.features.auth.repository import UserRepository


def _fresh_engine():
    """Dispose the cached engine so the next use binds to Config.DB_PATH."""
    db_orm.reset_engine()


class TestDatabaseIntegrity:
    def test_patients_are_not_reseeded_after_manual_deletion(self, tmp_path, monkeypatch):
        monkeypatch.setenv('APP_ENV', 'development')
        monkeypatch.setenv('SEED_DEMO_DATA', 'true')

        from app.config.settings import Config
        from app.main import create_app
        db_path = tmp_path / 'patient_data.db'
        monkeypatch.setattr(Config, 'DB_PATH', str(db_path))
        _fresh_engine()

        # Initialize app so schema (including app_meta) is created
        create_app()

        seeded_repo = PatientRepository(str(db_path))
        assert len(seeded_repo.get_all()) == 10

        with db_orm.get_engine().begin() as conn:
            conn.execute(text('DELETE FROM patients'))

        _fresh_engine()

        repo_after_delete = PatientRepository(str(db_path))
        with db_orm.get_engine().begin() as conn:
            count = conn.execute(text('SELECT COUNT(*) FROM patients')).scalar()
            assert count == 0

    def test_patient_delete_cleans_related_sessions_in_same_database(self, tmp_path, monkeypatch):
        monkeypatch.setenv('APP_ENV', 'development')
        monkeypatch.setenv('SEED_DEMO_DATA', 'true')

        from app.config.settings import Config
        from app.main import create_app
        db_path = tmp_path / 'patient_data.db'
        monkeypatch.setattr(Config, 'DB_PATH', str(db_path))
        _fresh_engine()

        create_app()

        # The app no longer seeds a doctor (self-registration only) — create
        # the test doctor explicitly, like the conftest fixture does.
        UserRepository(str(db_path)).create(
            username='doctor',
            email='doctor@neurosense.ai',
            password='Doctor@123',
            role='doctor',
            full_name='Dr. Gupta',
            date_of_birth='1980-06-20',
        )
        user_repo = UserRepository(str(db_path))
        doctor = user_repo.get_by_username('doctor')
        assert doctor is not None

        patient_repo = PatientRepository(str(db_path))
        create_result = patient_repo.create(
            patient_id='PAT-9999',
            name='Delete Me',
            age=71,
            created_by=doctor.id,
        )
        assert create_result['success'] is True

        session_repo = SessionRepository(str(db_path))
        session_repo.save(
            patient_id='PAT-9999',
            patient_name='Delete Me',
            created_by=doctor.id,
            results={'mri': {'stage': 'Normal', 'confidence': 98.1}},
        )
        assert session_repo.get_history('PAT-9999')

        deleted_sessions = session_repo.delete_patient('PAT-9999')
        deleted_patient = patient_repo.delete('PAT-9999')

        assert deleted_sessions == 1
        assert deleted_patient is True
        assert patient_repo.get_by_patient_id('PAT-9999') is None
        assert session_repo.get_history('PAT-9999') == []

    def test_foreign_key_delete_cascade_at_db_level(self, tmp_path, monkeypatch):
        monkeypatch.setenv('APP_ENV', 'development')
        monkeypatch.setenv('SEED_DEMO_DATA', 'true')

        from app.config.settings import Config
        from app.main import create_app
        db_path = tmp_path / 'patient_data_cascade.db'
        monkeypatch.setattr(Config, 'DB_PATH', str(db_path))
        _fresh_engine()

        create_app()

        # The app no longer seeds a doctor (self-registration only) — create
        # the test doctor explicitly, like the conftest fixture does.
        UserRepository(str(db_path)).create(
            username='doctor',
            email='doctor@neurosense.ai',
            password='Doctor@123',
            role='doctor',
            full_name='Dr. Gupta',
            date_of_birth='1980-06-20',
        )
        user_repo = UserRepository(str(db_path))
        doctor = user_repo.get_by_username('doctor')
        assert doctor is not None

        patient_repo = PatientRepository(str(db_path))
        create_result = patient_repo.create(
            patient_id='PAT-8888',
            name='Cascade Test',
            age=65,
            created_by=doctor.id,
        )
        assert create_result['success'] is True

        session_repo = SessionRepository(str(db_path))
        session_repo.save(
            patient_id='PAT-8888',
            patient_name='Cascade Test',
            created_by=doctor.id,
            results={'mri': {'stage': 'Normal', 'confidence': 95.0}},
        )
        assert len(session_repo.get_history('PAT-8888')) == 1

        # Delete the patient record ONLY (without calling delete_patient on session_repo)
        patient_repo.delete('PAT-8888')

        # Since foreign keys are enabled (with cascade), the session should be deleted automatically!
        assert patient_repo.get_by_patient_id('PAT-8888') is None
        assert session_repo.get_history('PAT-8888') == []
