"""Admin router — byte-compatible port of features/admin/routes.py (Flask)."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse

from app.api.deps import get_current_user, require_admin
from app.features.auth.repository import UserRepository
from app.features.patients.repository import PatientRepository
from app.features.history.repository import SessionRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/admin', tags=['admin'])

# Same pagination contract as /api/patients and /api/analyses: the admin
# tables see every row in the deployment, so they page hardest of all.
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


def _page_params(limit: int, offset: int) -> tuple:
    return max(1, min(limit, MAX_PAGE_SIZE)), max(offset, 0)


@router.get('/dashboard')
def dashboard(user=Depends(require_admin)):
    from app.shared.db_orm import SessionLocal
    from app.shared.models.user import User
    from app.shared.models.patient import Patient
    from app.shared.models.session import Session
    from sqlalchemy import func

    with SessionLocal() as db:
        total_users = db.query(func.count(User.id)).scalar() or 0
        total_doctors = db.query(func.count(User.id)).filter(User.role.in_(['doctor', 'clinician'])).scalar() or 0
        total_patients = db.query(func.count(Patient.id)).scalar() or 0
        total_analyses = db.query(func.count(Session.id)).scalar() or 0

        # Efficient SQL aggregation for stage counts without loading all session JSONs into memory
        effective_stage = func.coalesce(Session.final_stage, Session.mri_stage, 'Unknown')
        stage_rows = db.query(effective_stage, func.count(Session.id)).group_by(effective_stage).all()
        stage_counts = {stage: count for stage, count in stage_rows if stage}

    return {
        'total_users': total_users,
        'total_doctors': total_doctors,
        'total_patients': total_patients,
        'total_analyses': total_analyses,
        'stage_distribution': stage_counts,
    }


@router.get('/doctors')
def list_doctors(user=Depends(require_admin)):
    from app.shared.db_orm import SessionLocal
    from app.shared.models.user import User
    from app.shared.models.patient import Patient
    from sqlalchemy import func

    with SessionLocal() as db:
        # Avoid N+1: aggregate patient counts per doctor in a single GROUP BY query
        counts = dict(
            db.query(Patient.created_by, func.count(Patient.id))
            .filter(Patient.created_by.isnot(None))
            .group_by(Patient.created_by)
            .all()
        )
        doctors = db.query(User).filter(User.role.in_(['doctor', 'clinician'])).order_by(User.id).all()
        doctors_list = []
        for d in doctors:
            d_dict = d.to_dict()
            d_dict['patient_count'] = counts.get(d.id, 0)
            doctors_list.append(d_dict)

    return {'doctors': doctors_list}


@router.get('/doctors/{doctor_id}/patients')
def list_doctor_patients(doctor_id: int, user=Depends(require_admin)):
    user_repo = UserRepository()
    doctor = user_repo.get_by_id(doctor_id)
    if not doctor:
        return JSONResponse({'success': False, 'message': 'Doctor not found'}, status_code=404)

    patient_repo = PatientRepository()
    patients = patient_repo.get_all(created_by=doctor_id)
    return {'patients': patients}


@router.delete('/doctors/{user_id}')
def delete_doctor(user_id: int, request: Request, user=Depends(require_admin)):
    from app.shared.storage import StorageManager
    from app.features.admin.repository import AuditRepository

    current_admin = get_current_user(request)
    user_repo = UserRepository()
    target = user_repo.get_by_id(user_id)

    if not target:
        return JSONResponse({'success': False, 'message': 'Doctor not found'}, status_code=404)

    if target.role == 'admin':
        return JSONResponse({'success': False, 'message': 'Cannot delete admin'}, status_code=403)

    doc_name = target.full_name or target.username
    patient_repo = PatientRepository()
    session_repo = SessionRepository()

    doctor_patients = patient_repo.get_all(created_by=user_id)

    # Collect patient IDs before deleting from DB so we can clean up files after
    patient_ids = [p['patient_id'] for p in doctor_patients]

    # Delete all DB records in ONE transaction (sessions, then patients, then user)
    from app.shared.db_orm import session_scope
    with session_scope() as session:
        for patient_id in patient_ids:
            session_repo.delete_patient(patient_id, session=session)
        session_repo.delete_created_by(user_id, session=session)
        patient_repo.delete_by_creator(user_id, session=session)
        user_repo.delete(user_id, session=session)

    # Delete all file artifacts for each patient
    for patient_id in patient_ids:
        StorageManager.delete_patient_directory(user_id, patient_id)

    # Delete the entire doctor directory (catches any remaining artifacts)
    StorageManager.delete_doctor_directory(user_id)
    logger.info("Admin deleted doctor %d and all associated data/files", user_id)

    try:
        AuditRepository().log(
            action='DELETE_DOCTOR',
            resource_type='doctor',
            actor_id=getattr(current_admin, 'id', None),
            actor_username=getattr(current_admin, 'username', None),
            actor_role=getattr(current_admin, 'role', None) or 'admin',
            resource_id=str(user_id),
            resource_name=doc_name,
            details={'deleted_patient_count': len(patient_ids)},
        )
    except Exception:
        # The deletion already succeeded; never turn a completed destructive
        # operation into a 500 because the audit write failed.
        logger.exception("Failed to audit DELETE_DOCTOR for user %s", user_id)

    from app.shared.bootstrap import bump_data_version
    bump_data_version()

    return {'success': True, 'message': 'Doctor and all associated data deleted successfully'}


@router.get('/patients')
def list_all_patients(
    user=Depends(require_admin),
    limit: int = Query(DEFAULT_PAGE_SIZE, description='Page size (1-200)'),
    offset: int = Query(0, ge=0, description='Rows to skip'),
):
    patient_repo = PatientRepository()
    limit, offset = _page_params(limit, offset)
    patients = patient_repo.get_all(limit=limit, offset=offset)
    total = patient_repo.count_all()
    return {'patients': patients, 'total': total, 'limit': limit, 'offset': offset}


@router.delete('/patients/{patient_id}')
def delete_patient(patient_id: str, request: Request, user=Depends(require_admin)):
    from app.shared.storage import StorageManager
    from app.features.admin.repository import AuditRepository

    current_admin = get_current_user(request)
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if not patient:
        return JSONResponse({'success': False, 'message': 'Patient not found'}, status_code=404)

    doctor_id = patient.get('created_by')
    pat_name = patient.get('name')

    session_repo = SessionRepository()
    from app.shared.db_orm import session_scope
    with session_scope() as session:
        session_repo.delete_patient(patient_id, session=session)
        deleted = patient_repo.delete(patient_id, session=session)

    if not deleted:
        return JSONResponse({'success': False, 'message': 'Patient not found'}, status_code=404)

    # Delete all file artifacts (photos, PDFs, MRI uploads) for this patient
    StorageManager.delete_patient_directory(doctor_id, patient_id)
    logger.info("Admin deleted patient %s and all associated files", patient_id)

    try:
        AuditRepository().log(
            action='DELETE_PATIENT',
            resource_type='patient',
            actor_id=getattr(current_admin, 'id', None),
            actor_username=getattr(current_admin, 'username', None),
            actor_role=getattr(current_admin, 'role', None) or 'admin',
            resource_id=patient_id,
            resource_name=pat_name,
            details={'doctor_id': doctor_id},
        )
    except Exception:
        logger.exception("Failed to audit DELETE_PATIENT for %s", patient_id)

    from app.shared.bootstrap import bump_data_version
    bump_data_version()

    return {'success': True, 'message': 'Patient and all associated data deleted successfully'}


@router.get('/sessions')
def list_all_sessions(
    user=Depends(require_admin),
    limit: int = Query(DEFAULT_PAGE_SIZE, description='Page size (1-200)'),
    offset: int = Query(0, ge=0, description='Rows to skip'),
):
    session_repo = SessionRepository()
    limit, offset = _page_params(limit, offset)
    sessions = session_repo.get_all(limit=limit, offset=offset)
    total = session_repo.count_all()
    return {'sessions': sessions, 'total': total, 'limit': limit, 'offset': offset}


@router.delete('/sessions/{session_id}')
def delete_session(session_id: int, request: Request, user=Depends(require_admin)):
    from app.shared.storage import StorageManager
    from app.features.admin.repository import AuditRepository
    from app.shared.db_orm import SessionLocal
    from app.shared.models.session import Session as SessionModel

    current_admin = get_current_user(request)
    session_repo = SessionRepository()
    session = session_repo.get_session_detail(session_id)

    if not session:
        return JSONResponse({'success': False, 'message': 'Session not found'}, status_code=404)

    patient_id = session.get('patient_id')
    patient_name = session.get('patient_name')
    doctor_id = session.get('created_by')

    # Delete session row from DB
    with SessionLocal() as db:
        sess_obj = db.query(SessionModel).filter(SessionModel.id == session_id).first()
        if sess_obj:
            db.delete(sess_obj)
            db.commit()

    # Remove session files from disk
    if patient_id:
        StorageManager.delete_session_directory(doctor_id, patient_id, session_id)
        logger.info("Admin deleted session %d and its files for patient %s", session_id, patient_id)

    AuditRepository().log(
        action='DELETE_SESSION',
        resource_type='session',
        actor_id=getattr(current_admin, 'id', None),
        actor_username=getattr(current_admin, 'username', None),
        actor_role=getattr(current_admin, 'role', None) or 'admin',
        resource_id=str(session_id),
        resource_name=f"Session #{session_id} ({patient_name})",
        details={'patient_id': patient_id, 'doctor_id': doctor_id},
    )

    from app.shared.bootstrap import bump_data_version
    bump_data_version()

    return {'success': True, 'message': 'Session deleted successfully'}


@router.get('/audit-log')
def list_audit_logs(
    request: Request,
    limit: int = Query(50),
    offset: int = Query(0),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    user=Depends(require_admin),
):
    from app.features.admin.repository import AuditRepository

    # Clamp: SQLite treats LIMIT -1 as unlimited and huge limits allow a
    # trivial dump-the-table request.
    limit = max(1, min(limit, 500))
    offset = max(0, offset)

    audit_repo = AuditRepository()
    logs = audit_repo.get_logs(limit=limit, offset=offset, action=action, resource_type=resource_type)
    total = audit_repo.count(action=action, resource_type=resource_type)

    return {'logs': logs, 'total': total, 'limit': limit, 'offset': offset}
