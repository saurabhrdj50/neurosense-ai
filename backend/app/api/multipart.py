"""Multipart/file adapters bridging Starlette uploads to the ML layer.

The ML/storage modules were written against Werkzeug's ``FileStorage``
interface (``.filename``, seekable ``.stream``, ``.save(path)``). This adapter
exposes the same surface over Starlette's ``UploadFile`` so the pipeline code
works unchanged.
"""
import shutil
from typing import Any, Dict, Optional, Tuple

from fastapi import Depends, Request
from starlette.datastructures import UploadFile

from app.api.deps import is_admin, require_user
from app.features.analysis.patient.service import parse_patient_info
from app.features.patients.repository import PatientRepository
from app.ml.contracts import AnalysisInput


class UploadedFileAdapter:
    """Werkzeug-FileStorage-compatible facade over Starlette's UploadFile."""

    def __init__(self, upload: UploadFile):
        self.upload = upload
        self.filename = upload.filename
        # Seekable spooled temporary file (over ~1 MB it lives on disk)
        self.stream = upload.file

    def save(self, path: str) -> None:
        self.stream.seek(0)
        with open(path, 'wb') as f:
            shutil.copyfileobj(self.stream, f)
        self.stream.seek(0)

    def read(self, n: int = -1) -> bytes:
        return self.stream.read(n)

    def seek(self, pos: int) -> None:
        self.stream.seek(pos)


def _allowed_file(fn: Optional[str]) -> bool:
    if not fn:
        return False
    fn_lower = fn.lower()
    if fn_lower.endswith('.nii.gz'):
        return True
    return '.' in fn and fn_lower.rsplit('.', 1)[1] in {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'nii'}


def _allowed_audio(fn: Optional[str]) -> bool:
    if not fn:
        return False
    return '.' in fn and fn.rsplit('.', 1)[1].lower() in {'wav', 'mp3', 'flac', 'webm', 'ogg'}


def _valid_mri_upload(file_storage) -> bool:
    """Extension check AND content sniffing — extensions alone are trivially spoofed."""
    if not (file_storage and file_storage.filename and _allowed_file(file_storage.filename)):
        return False
    from app.shared.storage import sniff_content_category
    low = file_storage.filename.lower()
    category = 'nifti' if (low.endswith('.nii.gz') or low.endswith('.nii')) else 'image'
    return sniff_content_category(file_storage, category)


def _valid_audio_upload(file_storage) -> bool:
    if not (file_storage and file_storage.filename and _allowed_audio(file_storage.filename)):
        return False
    from app.shared.storage import sniff_content_category
    return sniff_content_category(file_storage, 'audio')


async def parse_analyze_request(request: Request, user=Depends(require_user)):
    """Async dependency parsing the multipart analyze payload.

    Returns ``(inputs, patient_info, input_errors)``. Raises ``ApiError`` with
    the exact Flask-era bodies on validation failures.
    """
    from app.api.errors import ApiError

    form = await request.form()

    try:
        patient_info = parse_patient_info(form)
    except ValueError as e:
        raise ApiError(400, str(e))

    # Fail fast on cross-tenant writes: refuse to analyze (and persist) a
    # patient owned by a different clinician.
    pid = (patient_info.get('patient_id') or '').strip()
    if pid and not is_admin(user):
        existing = PatientRepository().get_by_patient_id(pid)
        existing_owner = existing.get('created_by') if existing else None
        if existing_owner is not None and existing_owner != user.id:
            raise ApiError(403, f"Patient '{pid}' belongs to another clinician.")

    mri_upload: Optional[UploadFile] = form.get('mri_image')
    mri_file = None
    if mri_upload and isinstance(mri_upload, UploadFile) and mri_upload.filename:
        if _allowed_file(mri_upload.filename) and not _valid_mri_upload(UploadedFileAdapter(mri_upload)):
            raise ApiError(400, 'MRI file content does not match its extension (rejected).')
        if _allowed_file(mri_upload.filename):
            mri_file = UploadedFileAdapter(mri_upload)

    audio_upload: Optional[UploadFile] = form.get('audio_file')
    audio_file = None
    if audio_upload and isinstance(audio_upload, UploadFile) and audio_upload.filename:
        if _allowed_audio(audio_upload.filename) and not _valid_audio_upload(UploadedFileAdapter(audio_upload)):
            raise ApiError(400, 'Audio file content does not match its extension (rejected).')
        if _allowed_audio(audio_upload.filename):
            audio_file = UploadedFileAdapter(audio_upload)

    import json

    input_errors: Dict[str, Any] = {}
    cognitive_data = None
    cog_raw = (form.get('cognitive_tests') or '').strip()
    if cog_raw:
        try:
            cognitive_data = json.loads(cog_raw)
            if not isinstance(cognitive_data, dict):
                raise ValueError('cognitive_tests must be a JSON object')
        except Exception as e:
            input_errors['cognitive_error'] = str(e)

    risk_data = None
    risk_raw = (form.get('risk_factors') or '').strip()
    if risk_raw:
        try:
            risk_data = json.loads(risk_raw)
            if not isinstance(risk_data, dict):
                raise ValueError('risk_factors must be a JSON object')
        except Exception as e:
            input_errors['risk_error'] = str(e)

    inputs: AnalysisInput = {
        'patient_info': patient_info,
        'patient_notes': (form.get('patient_text') or '').strip(),
        'mri_file': mri_file,
        'audio_file': audio_file,
        'audio_text': (form.get('audio_text') or '').strip(),
        'cognitive_data': cognitive_data,
        'risk_data': risk_data,
        'gradcam': (form.get('gradcam') or 'true').lower() == 'true',
    }
    return inputs, patient_info, input_errors
