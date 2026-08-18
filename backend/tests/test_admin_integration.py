"""
Integration tests for admin dashboard registry features and bulk data export endpoints.
"""

import pytest
import io
import csv
import zipfile
from app.repositories.user_repository import UserRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.session_repository import SessionRepository
from app.services.storage_manager import StorageManager


@pytest.fixture
def admin_client(client):
    """Log in client as admin."""
    client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'Admin@123!',
    })
    return client


@pytest.fixture
def doctor_client(client):
    """Log in client as doctor."""
    client.post('/api/auth/login', json={
        'username': 'doctor',
        'password': 'Doctor@123!',
    })
    return client


class TestAdminIntegration:
    def test_list_doctors_requires_admin(self, doctor_client):
        """GET /api/admin/doctors should be forbidden for regular doctors."""
        resp = doctor_client.get('/api/admin/doctors')
        assert resp.status_code in (302, 401, 403)

    def test_list_doctors_success(self, admin_client):
        """GET /api/admin/doctors should return all doctors with patient counts."""
        resp = admin_client.get('/api/admin/doctors')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'doctors' in data
        assert len(data['doctors']) > 0
        
        # Verify schema details
        doc = data['doctors'][0]
        assert 'patient_count' in doc
        assert isinstance(doc['patient_count'], int)

    def test_list_doctor_patients_success(self, admin_client):
        """GET /api/admin/doctors/<doctor_id>/patients returns patient roster."""
        # Find doctor's ID
        resp_docs = admin_client.get('/api/admin/doctors')
        doc_id = resp_docs.get_json()['doctors'][0]['id']

        resp = admin_client.get(f'/api/admin/doctors/{doc_id}/patients')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'patients' in data
        assert isinstance(data['patients'], list)

    def test_export_all_patients_csv_admin(self, admin_client):
        """GET /api/patients/export returns complete CSV of clinical metadata for admins."""
        resp = admin_client.get('/api/patients/export')
        assert resp.status_code == 200
        assert resp.mimetype == 'text/csv'

        csv_content = resp.data.decode('utf-8')
        f = io.StringIO(csv_content)
        reader = csv.reader(f)
        rows = list(reader)
        
        # Check header structure
        assert len(rows) > 0
        header = rows[0]
        assert 'Patient ID' in header
        assert 'Notes' in header
        assert 'Clinician ID' in header

    def test_export_patients_csv_doctor_scoped(self, doctor_client):
        """GET /api/patients/export restricts CSV metadata export to doctor's own patients."""
        resp = doctor_client.get('/api/patients/export')
        assert resp.status_code == 200
        assert resp.mimetype == 'text/csv'

        csv_content = resp.data.decode('utf-8')
        f = io.StringIO(csv_content)
        reader = csv.reader(f)
        rows = list(reader)

        # Get current user ID to match
        user_resp = doctor_client.get('/api/auth/current-user')
        current_user_id = user_resp.get_json()['user']['id']

        if len(rows) > 1:
            for row in rows[1:]:
                # Clinician ID is the 9th column (index 8)
                assert int(row[8]) == current_user_id

    def test_export_reports_zip_returns_archive(self, admin_client, app):
        """GET /api/patients/export/reports packages PDF clinical dossiers into a ZIP."""
        # Insert a mock session/report and build the matching storage directory
        with app.app_context():
            patient_repo = PatientRepository()
            session_repo = SessionRepository()
            user_repo = UserRepository()
            
            # Find a doc and patient
            doc = user_repo.get_by_username('doctor')
            patient = patient_repo.get_all(created_by=doc.id)[0]
            
            # Create a session
            session_id = session_repo.save(
                patient_id=patient['patient_id'],
                patient_name=patient['name'],
                results={
                    'mri': {'stage': 'Very Mild AD'},
                    'cognitive': {'score': 88},
                    'biomarkers': {'tau': 150},
                    'sentiment': {'risk': 'Low'},
                },
                created_by=doc.id
            )
            
            # Save a dummy PDF report using StorageManager.save_patient_pdf
            dummy_pdf = b"mock clinical report pdf content"
            StorageManager.save_patient_pdf(
                doctor_id=doc.id,
                doctor_name=doc.username,
                patient_id=patient['patient_id'],
                patient_name=patient['name'],
                pdf_bytes=dummy_pdf,
                filename=f"report_{session_id}.pdf",
                session_id=session_id
            )

        resp = admin_client.get('/api/patients/export/reports')
        assert resp.status_code == 200
        assert resp.mimetype == 'application/zip'

        zip_data = io.BytesIO(resp.data)
        with zipfile.ZipFile(zip_data) as zf:
            namelist = zf.namelist()
            assert len(namelist) > 0
            # Ensure filenames match predicted pattern: patient_id_patient_name/session_session_id_report.pdf
            assert any(f"session_{session_id}_report.pdf" in name for name in namelist)
