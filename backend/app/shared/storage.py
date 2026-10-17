import shutil
import base64
import binascii
import logging
import os
import re
import unicodedata
from pathlib import Path
from typing import BinaryIO, Optional, Protocol
from app.config.settings import Config

logger = logging.getLogger(__name__)


class FileLike(Protocol):
    """Duck type shared by uploaded-file adapters and the tests.

    Mirrors the historical file-object surface: a name, a seekable binary
    stream, and a way to persist to a path.
    """

    filename: str
    stream: BinaryIO

    def save(self, path: str) -> None: ...


# ── Filename sanitization (same semantics as the historical helper) ────────
_FILENAME_ASCII_STRIP_RE = re.compile(r"[^A-Za-z0-9_.-]")
_WINDOWS_DEVICE_FILES = {
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
}


def secure_filename(filename: str) -> str:
    """Return an ASCII-only, filesystem-safe version of ``filename``.

    Normalizes Unicode, strips path separators and unsafe characters, and
    collapses whitespace to underscores. May return an empty string —
    callers supply a fallback.
    """
    filename = str(unicodedata.normalize('NFKD', filename))
    filename = filename.encode('ascii', 'ignore').decode('ascii')

    for sep in os.sep, os.path.altsep:
        if sep:
            filename = filename.replace(sep, ' ')
    filename = str(_FILENAME_ASCII_STRIP_RE.sub('', '_'.join(filename.split()))).strip('._')

    # Windows reserves a few device names in every folder — prepend an
    # underscore so a stored file can never collide with one.
    if os.name == 'nt' and filename and filename.split('.')[0].upper() in _WINDOWS_DEVICE_FILES:
        filename = f'_{filename}'

    return filename

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


def sniff_content_category(file_obj: Optional[FileLike], category: str) -> bool:
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


_MINIO_CLIENT = None
_MINIO_CHECKED = False


def get_minio_client():
    """Returns an initialized MinIO client instance if configured, else None."""
    global _MINIO_CLIENT, _MINIO_CHECKED
    if _MINIO_CHECKED:
        return _MINIO_CLIENT
    _MINIO_CHECKED = True
    endpoint = getattr(Config, 'MINIO_ENDPOINT', '')
    if not endpoint:
        return None
    try:
        from minio import Minio
        client = Minio(
            endpoint,
            access_key=getattr(Config, 'MINIO_ACCESS_KEY', 'minioadmin'),
            secret_key=getattr(Config, 'MINIO_SECRET_KEY', 'minioadmin'),
            secure=getattr(Config, 'MINIO_SECURE', False),
        )
        bucket = getattr(Config, 'MINIO_BUCKET', 'neurosense-uploads')
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            logger.info("Provisioned MinIO bucket '%s'", bucket)
        _MINIO_CLIENT = client
        logger.info("MinIO object storage initialized at %s (bucket: %s)", endpoint, bucket)
        return _MINIO_CLIENT
    except Exception as exc:
        logger.warning("MinIO initialization skipped (%s) — using local filesystem storage.", exc)
        _MINIO_CLIENT = None
        return None


class StorageManager:
    @staticmethod
    def sync_to_minio(local_path: Path, object_name: str) -> bool:
        """Best-effort upload of a file to MinIO object storage."""
        client = get_minio_client()
        if not client:
            return False
        try:
            bucket = getattr(Config, 'MINIO_BUCKET', 'neurosense-uploads')
            client.fput_object(bucket, object_name, str(local_path))
            return True
        except Exception as exc:
            logger.warning("Failed to sync %s to MinIO: %s", object_name, exc)
            return False

    @staticmethod
    def sync_from_minio(object_name: str, local_path: Path) -> bool:
        """Download file from MinIO if missing locally."""
        if local_path.exists():
            return True
        client = get_minio_client()
        if not client:
            return False
        try:
            bucket = getattr(Config, 'MINIO_BUCKET', 'neurosense-uploads')
            local_path.parent.mkdir(parents=True, exist_ok=True)
            client.fget_object(bucket, object_name, str(local_path))
            return True
        except Exception as exc:
            logger.debug("Object %s not found in MinIO: %s", object_name, exc)
            return False

    @staticmethod
    def delete_minio_prefix(prefix: str) -> bool:
        """Delete all objects matching a prefix in MinIO."""
        client = get_minio_client()
        if not client:
            return False
        try:
            bucket = getattr(Config, 'MINIO_BUCKET', 'neurosense-uploads')
            objects = client.list_objects(bucket, prefix=prefix, recursive=True)
            for obj in objects:
                client.remove_object(bucket, obj.object_name)
            return True
        except Exception as exc:
            logger.warning("Failed to delete MinIO prefix %s: %s", prefix, exc)
            return False

    @staticmethod
    def get_presigned_url(object_name: str, expiry_seconds: int = 3600) -> Optional[str]:
        """Generate a pre-signed GET URL for direct client download from MinIO."""
        client = get_minio_client()
        if not client:
            return None
        try:
            from datetime import timedelta
            bucket = getattr(Config, 'MINIO_BUCKET', 'neurosense-uploads')
            return client.presigned_get_object(bucket, object_name, expires=timedelta(seconds=expiry_seconds))
        except Exception as exc:
            logger.warning("Failed to generate presigned URL for %s: %s", object_name, exc)
            return None

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
        StorageManager.sync_to_minio(file_path, relative_path.as_posix())
        return relative_path.as_posix()

    @staticmethod
    def persist_raw_file(doctor_id: int, patient_id: str, file_obj: FileLike, subfolder: str, filename: str, doctor_name: Optional[str] = None, patient_name: Optional[str] = None) -> str:
        """
        Persists an uploaded file object to the patient's specific folder.
        Returns relative path, e.g. 'doctors/1_doctor/patients/PAT-123_eleanor/{subfolder}/{filename}'
        """
        patient_dir = StorageManager.get_patient_directory(doctor_id, patient_id, doctor_name, patient_name)
        target_dir = patient_dir / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)

        safe_filename = secure_filename(filename) or 'upload.bin'

        file_path = target_dir / safe_filename

        # Save file to disk
        file_obj.save(str(file_path))

        relative_path = file_path.relative_to(Config.UPLOAD_FOLDER)
        StorageManager.sync_to_minio(file_path, relative_path.as_posix())
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

        safe_filename = secure_filename(filename)
        
        file_path = reports_dir / safe_filename
        with open(file_path, 'wb') as f:
            f.write(pdf_bytes)
            
        relative_path = file_path.relative_to(Config.UPLOAD_FOLDER)
        StorageManager.sync_to_minio(file_path, relative_path.as_posix())
        return relative_path.as_posix()

