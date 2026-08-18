from app.core.database import Database
from app.repositories.patient_repository import PatientRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.user_repository import UserRepository


def reset_db_singleton():
    Database._instance = None


class TestDatabaseIntegrity:
    def test_patients_are_not_reseeded_after_manual_deletion(self, tmp_path, monkeypatch):
        monkeypatch.setenv('FLASK_ENV', 'development')
        monkeypatch.setenv('SEED_DEMO_DATA', 'true')

        from app.core.config import Config
        from app import create_app
        db_path = tmp_path / 'patient_data.db'
        monkeypatch.setattr(Config, 'DB_PATH', str(db_path))
        Database._instance = None

        # Initialize app so schema (including app_meta) is created
        app = create_app()
        app.config['TESTING'] = True

        seeded_repo = PatientRepository(str(db_path))
        assert len(seeded_repo.get_all()) == 10

        with seeded_repo.db.get_connection() as conn:
            conn.execute('DELETE FROM patients')
        
        Database._instance = None

        repo_after_delete = PatientRepository(str(db_path))
        with repo_after_delete.db.get_connection() as conn:
            cur = conn.execute('SELECT COUNT(*) FROM patients')
            assert cur.fetchone()[0] == 0

    def test_patient_delete_cleans_related_sessions_in_same_database(self, tmp_path, monkeypatch):
        monkeypatch.setenv('FLASK_ENV', 'development')
        monkeypatch.delenv('SEED_DEMO_DATA', raising=False)

        from app.core.config import Config
        from app import create_app
        db_path = tmp_path / 'patient_data.db'
        monkeypatch.setattr(Config, 'DB_PATH', str(db_path))
        Database._instance = None

        app = create_app()
        app.config['TESTING'] = True

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

        with patient_repo.db.get_connection() as conn:
            deleted_sessions = session_repo.delete_patient('PAT-9999', conn=conn)
            deleted_patient = patient_repo.delete('PAT-9999', conn=conn)

        assert deleted_sessions == 1
        assert deleted_patient is True
        assert patient_repo.get_by_patient_id('PAT-9999') is None
        assert session_repo.get_history('PAT-9999') == []

    def test_foreign_key_delete_cascade_at_db_level(self, tmp_path, monkeypatch):
        monkeypatch.setenv('FLASK_ENV', 'development')
        monkeypatch.delenv('SEED_DEMO_DATA', raising=False)

        from app.core.config import Config
        from app import create_app
        db_path = tmp_path / 'patient_data_cascade.db'
        monkeypatch.setattr(Config, 'DB_PATH', str(db_path))
        Database._instance = None

        app = create_app()
        app.config['TESTING'] = True

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

