import shutil
import base64
import binascii
import logging
from pathlib import Path
from typing import Optional
from werkzeug.datastructures import FileStorage
from app.config.settings import Config

logger = logging.getLogger(__name__)

# Maximum decoded avatar size (bytes) — avatars are display thumbnails.
MAX_AVATAR_BYTES = 2 * 1024 * 1024

# Content signatures for upload validation (category → list of magics).
# Checked on the first bytes of the stream so an attacker cannot smuggle an
# HTML/script payload in with an image extension.
CONTENT_SIGNATURES = {
    'image': [
        b'\x89PNG\r\n\x1a\n',   # PNG
        b'\xff\xd8\xff',        # JPEG
        b'GIF8',                # GIF87a/89a
        b'BM',                  # BMP
        b'II*\x00',             # TIFF (little endian)
        b'MM\x00*',             # TIFF (big endian)
    ],
    'audio': [
        b'RIFF',                # WAV
        b'ID3',                 # MP3 (tagged)
        b'\xff\xfb', b'\xff\xf3', b'\xff\xf2',  # MP3 (raw frames)
        b'OggS',                # OGG
        b'\x1a\x45\xdf\xa3',    # WebM/Matroska
        b'fLaC',                # FLAC
    ],
    'nifti': [
        b'\x1f\x8b',            # gzip (.nii.gz)
    ],
}


def sniff_content_category(file_obj: FileStorage, category: str) -> bool:
    """Return True when the stream starts with a known signature for `category`.

    Reads the first bytes and seeks back so later consumers see the whole
    stream. NIfTI volumes are accepted by gzip magic or the NIfTI-1 magic at
    offset 344.
    """
    signatures = CONTENT_SIGNATURES.get(category, [])
    if not signatures or file_obj is None:
        return False
    stream = file_obj.stream
    try:
        head = stream.read(348)
        stream.seek(0)
    except (AttributeError, OSError, ValueError):
        return False
    if not head:
        return False
    if any(head.startswith(sig) for sig in signatures):
        return True
    # Uncompressed NIfTI: magic at byte 344
    if category == 'nifti' and len(head) >= 348 and head[344:347] in (b'n+1', b'n-1'):
        return True
    return False

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
        from app.shared.models.user import User
        from app.shared.models.patient import Patient
        from app.shared.db_orm import SessionLocal

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
        The payload is size-capped, decoded and re-encoded through PIL so only
        genuine images are ever written to disk (and served as image/png).
        Returns relative path, e.g. 'doctors/1_doctor/patients/PAT-123_eleanor/profile/avatar.png'
        """
        if not base64_str:
            return ""

        if ',' in base64_str:
            base64_str = base64_str.split(',', 1)[1]

        try:
            data = base64.b64decode(base64_str, validate=False)
        except (binascii.Error, ValueError) as exc:
            raise ValueError(f"Invalid base64 image data: {exc}") from exc

        if len(data) > MAX_AVATAR_BYTES:
            raise ValueError(f"Avatar exceeds the {MAX_AVATAR_BYTES // (1024 * 1024)} MB size limit")

        # Decode-then-re-encode: rejects polyglots/scripts disguised as images
        # and normalizes everything to a real PNG.
        from PIL import Image
        import io as _io
        try:
            with Image.open(_io.BytesIO(data)) as img:
                img = img.convert('RGB')
                out_buf = _io.BytesIO()
                img.thumbnail((512, 512))
                img.save(out_buf, format='PNG')
        except Exception as exc:
            raise ValueError(f"Avatar is not a readable image: {exc}") from exc
        data = out_buf.getvalue()

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
        safe_filename = secure_filename(filename) or 'upload.bin'

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
                # Exact doctor-folder match: '<id>' or '<id>_<name>'.
                # A plain startswith(str(id)) would let id=1 match '10_doc'.
                if not (doctor_folder.name == str(doctor_id)
                        or doctor_folder.name.startswith(f"{doctor_id}_")):
                    continue
            patients_root = doctor_folder / 'patients'
            if not patients_root.exists():
                continue
            for patient_folder in patients_root.iterdir():
                # Folders are named '{patient_id}_{name}'. Match the id
                # followed by the separator (or an exact-name legacy folder) —
                # a bare startswith would let 'PAT-10' destroy 'PAT-100_mary'.
                if patient_folder.name == patient_id or patient_folder.name.startswith(f"{patient_id}_"):
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
            if doctor_id is not None and not (
                doctor_folder.name == str(doctor_id)
                or doctor_folder.name.startswith(f"{doctor_id}_")
            ):
                continue
            patients_root = doctor_folder / 'patients'
            if not patients_root.exists():
                continue
            for patient_folder in patients_root.iterdir():
                # Same separator-aware match as delete_patient_directory.
                if patient_folder.name == patient_id or patient_folder.name.startswith(f"{patient_id}_"):
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
            if doctor_folder.name == str(doctor_id) \
                    or doctor_folder.name.startswith(f"{doctor_id}_"):
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

