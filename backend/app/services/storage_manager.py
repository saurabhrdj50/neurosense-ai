import os
import shutil
import base64
import logging
from pathlib import Path
from typing import Optional
from werkzeug.datastructures import FileStorage
from app.core.config import Config

logger = logging.getLogger(__name__)

class StorageManager:
    @staticmethod
    def sanitize_name(name: str) -> str:
        if not name:
            return "unknown"
        # Convert non-alphanumeric to underscores
        sanitized = "".join(c if c.isalnum() or c in ('-', '_') else "_" for c in name)
        while "__" in sanitized:
            sanitized = sanitized.replace("__", "_")
        return sanitized.strip("_").lower()

    @staticmethod
    def get_patient_directory(doctor_id: int, patient_id: str, doctor_name: Optional[str] = None, patient_name: Optional[str] = None) -> Path:
        """
        Resolves and ensures the patient storage directory exists:
        {UPLOAD_FOLDER}/doctors/{storage_key}/patients/{patient_id}_{patient_name}/

        Uses the user's immutable `storage_key` as the doctor folder name when available,
        falling back to `{doctor_id}_{doctor_name}` for legacy records.
        """
        from app.models.user import User
        from app.models.patient import Patient
        from app.core.db_orm import SessionLocal

        clean_patient_id = "".join(c for c in patient_id if c.isalnum() or c in ('-', '_')).strip()
        if not clean_patient_id:
            clean_patient_id = "unknown"

        # Resolve doctor folder: prefer storage_key from DB
        doc_folder = None
        if doctor_id is not None:
            try:
                with SessionLocal() as db:
                    user = db.query(User).filter(User.id == doctor_id).first()
                    if user:
                        if user.storage_key:
                            doc_folder = user.storage_key
                        else:
                            # Legacy: build from id + username
                            safe = StorageManager.sanitize_name(user.username or 'anonymous')
                            doc_folder = f"{user.id}_{safe}"
                        doctor_name = user.username
            except Exception:
                pass
        if not doc_folder:
            safe_name = StorageManager.sanitize_name(doctor_name or 'anonymous')
            doc_folder = f"{doctor_id}_{safe_name}" if doctor_id is not None else "anonymous"

        # Resolve patient name if not provided
        if not patient_name:
            try:
                with SessionLocal() as db:
                    pat = db.query(Patient).filter(Patient.patient_id == patient_id).first()
                    patient_name = pat.name if pat else "unknown"
            except Exception:
                patient_name = "unknown"

        pat_folder = f"{clean_patient_id}_{StorageManager.sanitize_name(patient_name)}"

        path = Config.UPLOAD_FOLDER / 'doctors' / doc_folder / 'patients' / pat_folder
        path.mkdir(parents=True, exist_ok=True)
        return path

    @staticmethod
    def save_base64_avatar(doctor_id: int, patient_id: str, base64_str: str, doctor_name: Optional[str] = None, patient_name: Optional[str] = None) -> str:
        """
        Decodes a base64 image data url and saves it as avatar.png in the patient's profile directory.
        Returns relative path, e.g. 'doctors/1_doctor/patients/PAT-123_eleanor/profile/avatar.png'
        """
        if not base64_str:
            return ""

        if ',' in base64_str:
            base64_str = base64_str.split(',', 1)[1]

        data = base64.b64decode(base64_str)
        patient_dir = StorageManager.get_patient_directory(doctor_id, patient_id, doctor_name, patient_name)
        profile_dir = patient_dir / 'profile'
        profile_dir.mkdir(parents=True, exist_ok=True)
        file_path = profile_dir / 'avatar.png'

        with open(file_path, 'wb') as f:
            f.write(data)

        relative_path = file_path.relative_to(Config.UPLOAD_FOLDER)
        return relative_path.as_posix()

    @staticmethod
    def persist_raw_file(doctor_id: int, patient_id: str, file_obj: FileStorage, subfolder: str, filename: str, doctor_name: Optional[str] = None, patient_name: Optional[str] = None) -> str:
        """
        Persists a Flask FileStorage object to the patient's specific folder.
        Returns relative path, e.g. 'doctors/1_doctor/patients/PAT-123_eleanor/{subfolder}/{filename}'
        """
        patient_dir = StorageManager.get_patient_directory(doctor_id, patient_id, doctor_name, patient_name)
        target_dir = patient_dir / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)

        from werkzeug.utils import secure_filename
        safe_filename = secure_filename(filename)
        
        file_path = target_dir / safe_filename
        
        # Save file to disk
        file_obj.save(str(file_path))
        
        relative_path = file_path.relative_to(Config.UPLOAD_FOLDER)
        return relative_path.as_posix()

    @staticmethod
    def delete_patient_directory(doctor_id: Optional[int], patient_id: str) -> bool:
        """
        Deletes the entire patient directory (photos, sessions, PDFs) from disk.
        Searches all subdirectories under the doctor folder to handle legacy name variants.
        Returns True if any directory was removed.
        """
        removed = False
        doctors_root = Config.UPLOAD_FOLDER / 'doctors'
        if not doctors_root.exists():
            return False

        # Search for all folders whose name starts with the patient_id prefix
        for doctor_folder in doctors_root.iterdir():
            if doctor_id is not None:
                # Match only folders belonging to this doctor (prefix = str(doctor_id))
                if not doctor_folder.name.startswith(str(doctor_id)):
                    continue
            patients_root = doctor_folder / 'patients'
            if not patients_root.exists():
                continue
            for patient_folder in patients_root.iterdir():
                if patient_folder.name.startswith(patient_id):
                    try:
                        shutil.rmtree(str(patient_folder))
                        logger.info("Deleted patient directory: %s", patient_folder)
                        removed = True
                    except Exception as exc:
                        logger.error("Failed to delete patient directory %s: %s", patient_folder, exc)
        return removed

    @staticmethod
    def delete_session_directory(doctor_id: Optional[int], patient_id: str, session_id: int) -> bool:
        """
        Deletes only the session-specific subdirectory under the patient folder.
        Returns True if anything was removed.
        """
        removed = False
        doctors_root = Config.UPLOAD_FOLDER / 'doctors'
        if not doctors_root.exists():
            return False

        for doctor_folder in doctors_root.iterdir():
            if doctor_id is not None and not doctor_folder.name.startswith(str(doctor_id)):
                continue
            patients_root = doctor_folder / 'patients'
            if not patients_root.exists():
                continue
            for patient_folder in patients_root.iterdir():
                if patient_folder.name.startswith(patient_id):
                    sess_dir = patient_folder / 'sessions' / f'sess_{session_id}'
                    if sess_dir.exists():
                        try:
                            shutil.rmtree(str(sess_dir))
                            logger.info("Deleted session directory: %s", sess_dir)
                            removed = True
                        except Exception as exc:
                            logger.error("Failed to delete session directory %s: %s", sess_dir, exc)
        return removed

    @staticmethod
    def delete_doctor_directory(doctor_id: int) -> bool:
        """
        Deletes the entire doctor upload directory (all patients, all files).
        Returns True if any directory was removed.
        """
        removed = False
        doctors_root = Config.UPLOAD_FOLDER / 'doctors'
        if not doctors_root.exists():
            return False

        for doctor_folder in doctors_root.iterdir():
            if doctor_folder.name.startswith(str(doctor_id)):
                try:
                    shutil.rmtree(str(doctor_folder))
                    logger.info("Deleted doctor directory: %s", doctor_folder)
                    removed = True
                except Exception as exc:
                    logger.error("Failed to delete doctor directory %s: %s", doctor_folder, exc)
        return removed

    @staticmethod
    def save_patient_pdf(doctor_id: int, patient_id: str, pdf_bytes: bytes, filename: str, doctor_name: Optional[str] = None, patient_name: Optional[str] = None, session_id: Optional[int] = None) -> str:
        """
        Saves PDF report bytes into the patient's session-specific reports/ folder.
        Returns relative path: 'doctors/.../patients/.../sessions/sess_{session_id}/reports/{filename}'
        """
        if not session_id:
            import re
            match = re.search(r'\d+', filename)
            session_id = match.group(0) if match else "unknown"

        patient_dir = StorageManager.get_patient_directory(doctor_id, patient_id, doctor_name, patient_name)
        reports_dir = patient_dir / 'sessions' / f'sess_{session_id}' / 'reports'
        reports_dir.mkdir(parents=True, exist_ok=True)

        from werkzeug.utils import secure_filename
        safe_filename = secure_filename(filename)
        
        file_path = reports_dir / safe_filename
        with open(file_path, 'wb') as f:
            f.write(pdf_bytes)
            
        relative_path = file_path.relative_to(Config.UPLOAD_FOLDER)
        return relative_path.as_posix()

