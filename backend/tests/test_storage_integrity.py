import pytest
import io
import base64
from pathlib import Path
from app.services.storage_manager import StorageManager
from app.repositories.patient_repository import PatientRepository
from app.repositories.user_repository import UserRepository
from app.models.patient import Patient
from app.core.config import Config

def test_storage_manager_paths():
    """Verify clean directory resolution for doctor and patient IDs."""
    path = StorageManager.get_patient_directory(doctor_id=1, patient_id="PAT-1234", doctor_name="JohnDoe", patient_name="JaneDoe")
    assert "doctors" in path.parts
    assert any(p.startswith("1_") for p in path.parts)
    assert "PAT-1234_janedoe" in path.parts
    
    path_traversal = StorageManager.get_patient_directory(doctor_id=1, patient_id="../../bad_path", doctor_name="docA", patient_name="patA")
    assert "bad_path" in path_traversal.name
    assert ".." not in path_traversal.parts

def test_base64_avatar_save(tmp_path):
    """Verify base64 avatar decoding and saving structure."""
    original_upload_folder = Config.UPLOAD_FOLDER
    Config.UPLOAD_FOLDER = tmp_path
    
    try:
        base64_img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        rel_path = StorageManager.save_base64_avatar(doctor_id=42, patient_id="PAT-BASE64", base64_str=base64_img, doctor_name="doc_smith", patient_name="secure_patient")
        
        assert rel_path == "doctors/42_doc_smith/patients/PAT-BASE64_secure_patient/profile/avatar.png"
        
        full_path = tmp_path / rel_path
        assert full_path.exists()
        assert full_path.stat().st_size > 0
    finally:
        Config.UPLOAD_FOLDER = original_upload_folder

def test_persist_raw_file(tmp_path):
    """Verify secure file stream persistence to patient folder subdirectories."""
    original_upload_folder = Config.UPLOAD_FOLDER
    Config.UPLOAD_FOLDER = tmp_path
    
    try:
        from werkzeug.datastructures import FileStorage
        file_stream = io.BytesIO(b"mri_image_data_mock")
        mock_file = FileStorage(stream=file_stream, filename="mri_scan.nii.gz")
        
        rel_path = StorageManager.persist_raw_file(doctor_id=99, patient_id="PAT-MRI", file_obj=mock_file, subfolder="mri", filename="mri_scan.nii.gz", doctor_name="doc_jones", patient_name="mri_patient")
        
        assert rel_path == "doctors/99_doc_jones/patients/PAT-MRI_mri_patient/mri/mri_scan.nii.gz"
        full_path = tmp_path / rel_path
        assert full_path.exists()
        with open(full_path, "rb") as f:
            assert f.read() == b"mri_image_data_mock"
    finally:
        Config.UPLOAD_FOLDER = original_upload_folder

def test_patient_repository_create_with_base64(app, tmp_path):
    """Verify that PatientRepository automatically intercepts base64 avatars and persists physical files."""
    original_upload_folder = Config.UPLOAD_FOLDER
    Config.UPLOAD_FOLDER = tmp_path
    
    try:
        patient_repo = PatientRepository()
        
        base64_img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        patient_id = "PAT-REPO-TEST"
        result = patient_repo.create(
            patient_id=patient_id,
            name="Test Storage Patient",
            age=45,
            sex="M",
            education_years=12,
            created_by=1,
            photo=base64_img
        )
        
        assert result["success"] is True
        
        patient_data = patient_repo.get_by_patient_id(patient_id)
        assert patient_data["photo"] == "/api/patients/photo/PAT-REPO-TEST"
        
        full_path = tmp_path / "doctors/1_admin/patients/PAT-REPO-TEST_test_storage_patient/profile/avatar.png"
        assert full_path.exists()
    finally:
        Config.UPLOAD_FOLDER = original_upload_folder

def test_serve_photo_access_control(app, client, tmp_path):
    """Verify authenticated route is restricted by clinical ownership/roles."""
    original_upload_folder = Config.UPLOAD_FOLDER
    Config.UPLOAD_FOLDER = tmp_path
    
    try:
        user_repo = UserRepository()
        
        user_a = user_repo.create(
            username="docA",
            password="DocPasswordA@123!",
            email="docA@neurosense.ai",
            full_name="Doctor A",
            role="clinician"
        )
        assert user_a["success"] is True
        doc_a_id = user_a["user_id"]
        
        user_b = user_repo.create(
            username="docB",
            password="DocPasswordB@123!",
            email="docB@neurosense.ai",
            full_name="Doctor B",
            role="clinician"
        )
        assert user_b["success"] is True
        
        patient_repo = PatientRepository()
        
        base64_img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        patient_id = "PAT-AUTH-TEST"
        res = patient_repo.create(
            patient_id=patient_id,
            name="Secure Patient",
            created_by=doc_a_id,
            photo=base64_img
        )
        assert res["success"] is True
        
        avatar_path = StorageManager.get_patient_directory(doctor_id=doc_a_id, patient_id=patient_id, doctor_name="docA", patient_name="Secure Patient") / "profile" / "avatar.png"
        avatar_path.parent.mkdir(parents=True, exist_ok=True)
        avatar_path.write_bytes(b"test_image_bytes")

        resp = client.get(f"/api/patients/photo/{patient_id}")
        assert resp.status_code == 401

        client.post("/api/auth/login", json={
            "username": "docB",
            "password": "DocPasswordB@123!"
        })
        resp = client.get(f"/api/patients/photo/{patient_id}")
        assert resp.status_code == 403
        client.post("/api/auth/logout")

        client.post("/api/auth/login", json={
            "username": "docA",
            "password": "DocPasswordA@123!"
        })
        resp = client.get(f"/api/patients/photo/{patient_id}")
        assert resp.status_code == 200
        assert resp.data == b"test_image_bytes"
        client.post("/api/auth/logout")

        client.post("/api/auth/login", json={
            "username": "admin",
            "password": "Admin@123!"
        })
        resp = client.get(f"/api/patients/photo/{patient_id}")
        assert resp.status_code == 200
        assert resp.data == b"test_image_bytes"
        client.post("/api/auth/logout")
    finally:
        Config.UPLOAD_FOLDER = original_upload_folder

def test_auto_save_pdf_report(tmp_path):
    """Verify that StorageManager.save_patient_pdf correctly saves PDF bytes inside the report archive folder."""
    original_upload_folder = Config.UPLOAD_FOLDER
    Config.UPLOAD_FOLDER = tmp_path
    
    try:
        pdf_content = b"PDF-1.4 Mock Clinical Report Bytes"
        rel_path = StorageManager.save_patient_pdf(
            doctor_id=1,
            patient_id="PAT-PDF-TEST",
            pdf_bytes=pdf_content,
            filename="report_SESS-999.pdf",
            doctor_name="admin",
            patient_name="Alex Doe"
        )
        
        assert rel_path == "doctors/1_admin/patients/PAT-PDF-TEST_alex_doe/sessions/sess_999/reports/report_SESS-999.pdf"
        
        full_path = tmp_path / rel_path
        assert full_path.exists()
        with open(full_path, "rb") as f:
            assert f.read() == pdf_content
    finally:
        Config.UPLOAD_FOLDER = original_upload_folder


def test_serve_report_access_control(app, client, tmp_path):
    """Verify serve report endpoint checks clinician role and patient ownership."""
    original_upload_folder = Config.UPLOAD_FOLDER
    Config.UPLOAD_FOLDER = tmp_path
    
    try:
        user_repo = UserRepository()
        
        user_a = user_repo.create(
            username="docA_rep",
            password="DocPasswordA@123!",
            email="docA_rep@neurosense.ai",
            full_name="Doctor A Rep",
            role="clinician"
        )
        assert user_a["success"] is True
        doc_a_id = user_a["user_id"]
        
        user_b = user_repo.create(
            username="docB_rep",
            password="DocPasswordB@123!",
            email="docB_rep@neurosense.ai",
            full_name="Doctor B Rep",
            role="clinician"
        )
        assert user_b["success"] is True
        
        patient_repo = PatientRepository()
        patient_id = "PAT-AUTH-REPORTS"
        res = patient_repo.create(
            patient_id=patient_id,
            name="Secure Report Patient",
            created_by=doc_a_id
        )
        assert res["success"] is True
        
        # Save a session to DB
        from app.repositories.session_repository import SessionRepository
        session_repo = SessionRepository()
        session_id = session_repo.save(
            patient_id=patient_id,
            results={"test": "results"},
            patient_name="Secure Report Patient",
            created_by=doc_a_id
        )
        assert session_id > 0
        
        # Write dummy PDF report to patient reports directory
        patient_dir = StorageManager.get_patient_directory(doctor_id=doc_a_id, patient_id=patient_id, doctor_name="docA_rep", patient_name="Secure Report Patient")
        reports_dir = patient_dir / "sessions" / f"sess_{session_id}" / "reports"
        reports_dir.mkdir(parents=True, exist_ok=True)
        pdf_file = reports_dir / f"report_{session_id}.pdf"
        pdf_file.write_bytes(b"mock_report_pdf_bytes_data")
        
        # Test 1: Unauthenticated
        resp = client.get(f"/api/patients/session/{session_id}/report")
        assert resp.status_code == 401
        
        # Test 2: Unauthorized clinician (docB_rep)
        client.post("/api/auth/login", json={
            "username": "docB_rep",
            "password": "DocPasswordB@123!"
        })
        resp = client.get(f"/api/patients/session/{session_id}/report")
        assert resp.status_code == 403
        client.post("/api/auth/logout")
        
        # Test 3: Authorized clinician (docA_rep)
        client.post("/api/auth/login", json={
            "username": "docA_rep",
            "password": "DocPasswordA@123!"
        })
        resp = client.get(f"/api/patients/session/{session_id}/report")
        assert resp.status_code == 200
        assert resp.data == b"mock_report_pdf_bytes_data"
        client.post("/api/auth/logout")
        
        # Test 4: Admin
        client.post("/api/auth/login", json={
            "username": "admin",
            "password": "Admin@123!"
        })
        resp = client.get(f"/api/patients/session/{session_id}/report")
        assert resp.status_code == 200
        assert resp.data == b"mock_report_pdf_bytes_data"
        client.post("/api/auth/logout")
        
    finally:
        Config.UPLOAD_FOLDER = original_upload_folder


