"""Patients router — byte-compatible port of features/patients/routes.py (Flask).

Endpoints are sync ``def`` (they run in FastAPI's threadpool — DB, PIL and
file I/O block); JSON bodies are parsed by a small async dependency so the
event loop is never blocked.
"""
import base64
import csv
import io
import logging
import zipfile
from typing import Any, Dict

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import FileResponse, JSONResponse

from app.api.deps import get_current_user, is_admin, require_user
from app.config.settings import Config
from app.features.patients.schemas import PatientSchema
from app.features.patients.repository import PatientRepository
from app.features.history.repository import SessionRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/patients', tags=['patients'])


async def _json_body(request: Request) -> Dict[str, Any]:
    """Async dependency: read the JSON body off the wire (never blocks), so
    the sync route body can do blocking work in the threadpool."""
    try:
        data = await request.json()
    except Exception:
        data = None
    return data if isinstance(data, dict) else {}


def _csv_safe(value) -> str:
    """Neutralize CSV formula injection (=, +, -, @ prefixes) in exported cells."""
    s = str(value) if value is not None else ''
    if s and s[0] in ('=', '+', '-', '@'):
        return f"'{s}"
    return s


def _attachment(content: bytes, media_type: str, filename: str) -> Response:
    return Response(
        content=content,
        media_type=media_type,
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )


@router.get('')
def list_patients(
    user=Depends(require_user),
    limit: int = Query(50, description='Page size (1-200)'),
    offset: int = Query(0, ge=0, description='Rows to skip'),
):
    patient_repo = PatientRepository()
    limit = max(1, min(limit, 200))
    offset = max(offset, 0)

    if is_admin(user):
        patients = patient_repo.get_all(limit=limit, offset=offset)
        total = patient_repo.count_all()
    else:
        patients = patient_repo.get_all(created_by=user.id, limit=limit, offset=offset)
        total = patient_repo.count_all(created_by=user.id)

    return {'patients': patients, 'total': total, 'limit': limit, 'offset': offset}


@router.post('')
def add_patient(data: Dict = Depends(_json_body), user=Depends(require_user)):
    try:
        validated = PatientSchema.validate_create(data)
    except ValueError as e:
        return JSONResponse({'success': False, 'message': str(e)}, status_code=400)

    # Optional avatar: re-encoded through PIL into the patient's profile/
    # directory exactly like the analysis flow. A payload that fails to store
    # must never reach the DB as a raw data URL — it is simply dropped.
    photo = validated.pop('photo', None)
    stored_photo = None
    if photo and photo.startswith('data:image'):
        from app.features.patients.service import PatientService
        stored_photo = PatientService().store_avatar(
            user.id, validated['patient_id'], photo, patient_name=validated['name']
        )
        if not stored_photo or stored_photo.startswith('data:'):
            stored_photo = None

    patient_repo = PatientRepository()
    result = patient_repo.create(
        patient_id=validated['patient_id'],
        name=validated['name'],
        age=validated.get('age'),
        sex=validated.get('sex'),
        education_years=validated.get('education_years'),
        notes=validated.get('notes', ''),
        created_by=user.id,
        photo=stored_photo,
    )

    if result.get('success'):
        from app.shared.bootstrap import bump_data_version
        bump_data_version()

    return JSONResponse(result, status_code=200 if result.get('success') else 400)


@router.get('/history/{patient_id}')
def patient_history(patient_id: str, request: Request, user=Depends(require_user)):
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if patient and not is_admin(user) and patient.get('created_by') != user.id:
        return JSONResponse({'error': 'Access denied'}, status_code=403)

    session_repo = SessionRepository()
    history = session_repo.get_history(patient_id)
    trends = session_repo.get_trends(patient_id)

    return {'history': history, 'trends': trends}


@router.get('/photo/{patient_id}')
def get_patient_photo(patient_id: str, user=Depends(require_user)):
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if not patient:
        return JSONResponse({'error': 'Patient not found'}, status_code=404)

    if not is_admin(user) and patient.get('created_by') != user.id:
        return JSONResponse({'error': 'Access denied'}, status_code=403)

    from app.shared.storage import StorageManager
    patient_dir = StorageManager.get_patient_directory(
        doctor_id=patient.get('created_by'),
        patient_id=patient_id,
        patient_name=patient.get('name')
    )
    phi_headers = {'Cache-Control': 'private, no-cache'}
    avatar_path = patient_dir / 'profile' / 'avatar.png'
    if avatar_path.exists():
        return FileResponse(avatar_path, media_type='image/png', headers=phi_headers)

    photo_val = patient.get('photo')
    if photo_val and photo_val.startswith('data:image'):
        if ',' in photo_val:
            photo_val = photo_val.split(',', 1)[1]
        data = base64.b64decode(photo_val)
        return Response(content=data, media_type='image/png', headers=phi_headers)

    return JSONResponse({'error': 'Photo not found'}, status_code=404)


@router.get('/session/{session_id}/report')
def get_session_report(session_id: int, user=Depends(require_user)):
    session_repo = SessionRepository()
    session_data = session_repo.get_by_id(session_id)
    if not session_data:
        return JSONResponse({'error': 'Session not found'}, status_code=404)

    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(session_data.get('patient_id'))
    if not patient:
        return JSONResponse({'error': 'Patient not found'}, status_code=404)

    if not is_admin(user) and patient.get('created_by') != user.id:
        return JSONResponse({'error': 'Access denied'}, status_code=403)

    from app.shared.storage import StorageManager
    patient_dir = StorageManager.get_patient_directory(
        doctor_id=patient.get('created_by'),
        patient_id=patient.get('patient_id'),
        patient_name=patient.get('name')
    )
    pdf_file = patient_dir / 'sessions' / f'sess_{session_id}' / 'reports' / f'report_{session_id}.pdf'
    if pdf_file.exists():
        return FileResponse(pdf_file, media_type='application/pdf')

    reports_dir = patient_dir / 'sessions' / f'sess_{session_id}' / 'reports'
    if reports_dir.exists():
        pdfs = list(reports_dir.glob('*.pdf'))
        if pdfs:
            return FileResponse(pdfs[0], media_type='application/pdf')

    return JSONResponse({'error': 'Report not found'}, status_code=404)


@router.get('/export/reports')
def export_reports_zip(user=Depends(require_user)):
    patient_repo = PatientRepository()

    if is_admin(user):
        patients = patient_repo.get_all()
    else:
        patients = patient_repo.get_all(created_by=user.id)

    allowed_patient_ids = {p['patient_id'] for p in patients}

    zip_buffer = io.BytesIO()
    seen_arcnames = set()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        doctors_dir = Config.UPLOAD_FOLDER / 'doctors'
        if doctors_dir.exists():
            for pdf_path in doctors_dir.glob('**/*.pdf'):
                parts = pdf_path.parts
                patient_folder = None
                session_id = None
                for i, part in enumerate(parts):
                    if part == 'patients' and i + 1 < len(parts):
                        patient_folder = parts[i + 1]
                    if part.startswith('sess_'):
                        session_id = part.replace('sess_', '')

                if patient_folder:
                    # Folder name is '{patient_id}_{sanitized_name}' — split on
                    # the FIRST separator only. split('_')[0] truncated ids
                    # containing underscores (PAT_1 → 'PAT'), silently dropping
                    # those patients from the export.
                    pid = patient_folder.split('_', 1)[0]
                    if pid in allowed_patient_ids:
                        filename = pdf_path.name
                        if session_id:
                            base_arcname = f"{patient_folder}/session_{session_id}_report.pdf"
                        else:
                            base_arcname = f"{patient_folder}/{filename}"
                        arcname = base_arcname
                        counter = 1
                        while arcname in seen_arcnames:
                            name_part, ext = base_arcname.rsplit('.', 1)
                            arcname = f"{name_part}_{counter}.{ext}"
                            counter += 1
                        seen_arcnames.add(arcname)
                        zf.write(pdf_path, arcname=arcname)

    zip_buffer.seek(0)
    return _attachment(zip_buffer.getvalue(), 'application/zip', 'clinical_reports.zip')


def _audit(request: Request, action: str, resource_type: str, resource_id: str,
           resource_name: str = None, details: dict = None):
    """Best-effort audit row for doctor-initiated destructive/export actions."""
    try:
        from app.features.admin.repository import AuditRepository
        user = get_current_user(request)
        AuditRepository().log(
            action=action,
            resource_type=resource_type,
            actor_id=getattr(user, 'id', None),
            actor_username=getattr(user, 'username', None),
            actor_role=getattr(user, 'role', None),
            resource_id=str(resource_id),
            resource_name=resource_name,
            details=details or {},
        )
    except Exception:
        logger.exception("Failed to write audit row for %s %s", action, resource_id)


@router.get('/export/{patient_id}')
def export_csv(patient_id: str, user=Depends(require_user)):
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if patient and not is_admin(user) and patient.get('created_by') != user.id:
        return JSONResponse({'error': 'Access denied'}, status_code=403)

    session_repo = SessionRepository()
    history = session_repo.get_history(patient_id)

    if not history:
        return JSONResponse({'error': 'No history found'}, status_code=404)

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        'Session ID', 'Date', 'MRI Stage', 'MRI Confidence',
        'Sentiment Score', 'Cognitive Score', 'Risk Score',
        'Final Stage', 'Final Confidence'
    ])

    for session_data in history:
        writer.writerow([
            _csv_safe(session_data.get('id', '')),
            _csv_safe(session_data.get('timestamp', '')),
            _csv_safe(session_data.get('mri_stage', '')),
            _csv_safe(session_data.get('mri_confidence', '')),
            _csv_safe(session_data.get('sentiment_risk', '')),
            _csv_safe(session_data.get('cognitive_score', '')),
            _csv_safe(session_data.get('risk_score', '')),
            _csv_safe(session_data.get('final_stage', '')),
            _csv_safe(session_data.get('final_confidence', '')),
        ])

    output.seek(0)
    return _attachment(
        output.getvalue().encode('utf-8'), 'text/csv', f'patient_{patient_id}_history.csv'
    )


@router.get('/export')
def export_all_patients_csv(user=Depends(require_user)):
    patient_repo = PatientRepository()

    if is_admin(user):
        patients = patient_repo.get_all()
    else:
        patients = patient_repo.get_all(created_by=user.id)

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        'Patient ID', 'Name', 'Age', 'Sex', 'Education Years', 'Latest Status/Stage', 'Created Date', 'Notes', 'Clinician ID'
    ])

    for p in patients:
        writer.writerow([
            _csv_safe(p.get('patient_id', '')),
            _csv_safe(p.get('name', '')),
            _csv_safe(p.get('age', '')),
            _csv_safe(p.get('sex', '')),
            _csv_safe(p.get('education_years', '')),
            _csv_safe(p.get('stage', '')),
            _csv_safe(p.get('created_at', '')),
            _csv_safe(p.get('notes', '')),
            _csv_safe(p.get('created_by', '')),
        ])

    output.seek(0)
    return _attachment(
        output.getvalue().encode('utf-8'), 'text/csv', 'patients_metadata_export.csv'
    )




@router.get('/{patient_id}')
def get_patient(patient_id: str, user=Depends(require_user)):
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if not patient:
        return JSONResponse({'error': 'Patient not found'}, status_code=404)

    if not is_admin(user) and patient.get('created_by') != user.id:
        return JSONResponse({'error': 'Access denied'}, status_code=403)

    return patient


@router.put('/{patient_id}')
def update_patient(
    patient_id: str, data: Dict = Depends(_json_body), user=Depends(require_user)
):
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if not patient:
        return JSONResponse({'error': 'Patient not found'}, status_code=404)

    if not is_admin(user) and patient.get('created_by') != user.id:
        return JSONResponse({'error': 'Access denied'}, status_code=403)

    try:
        validated = PatientSchema.validate_update(data)
    except ValueError as e:
        return JSONResponse({'success': False, 'message': str(e)}, status_code=400)

    result = patient_repo.update(patient_id, **validated)
    if result.get('success'):
        from app.shared.bootstrap import bump_data_version
        bump_data_version()
    return JSONResponse(result, status_code=200 if result.get('success') else 400)


@router.delete('/{patient_id}')
def delete_patient(patient_id: str, request: Request, user=Depends(require_user)):
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if not patient:
        return JSONResponse({'error': 'Patient not found'}, status_code=404)

    if not is_admin(user) and patient.get('created_by') != user.id:
        return JSONResponse({'error': 'Access denied'}, status_code=403)

    doctor_id = patient.get('created_by')

    session_repo = SessionRepository()
    from app.shared.db_orm import session_scope
    # Single transaction: sessions and the patient row commit together or not
    # at all — a partial delete must never leave orphaned sessions.
    with session_scope() as session:
        session_repo.delete_patient(patient_id, session=session)
        success = patient_repo.delete(patient_id, session=session)

    if not success:
        return JSONResponse({'error': 'Patient not found'}, status_code=404)

    _audit(request, 'DELETE_PATIENT', 'patient', patient_id,
           resource_name=patient.get('name'), details={'doctor_id': doctor_id})

    # Cascade delete all file artifacts (photos, reports, MRI uploads)
    from app.shared.storage import StorageManager
    StorageManager.delete_patient_directory(doctor_id, patient_id)

    from app.shared.bootstrap import bump_data_version
    bump_data_version()

    return {'success': True}
