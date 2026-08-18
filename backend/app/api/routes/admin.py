import logging
from flask import Blueprint, jsonify, request
from app.core.security import get_current_user, admin_required
from app.repositories.user_repository import UserRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.session_repository import SessionRepository

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def dashboard():
    user_repo = UserRepository()
    patient_repo = PatientRepository()
    session_repo = SessionRepository()

    users = user_repo.get_all()
    patients = patient_repo.get_all()
    sessions = session_repo.get_all()

    doctors = [u for u in users if u.role == 'doctor']

    stage_counts = {}
    for session in sessions:
        stage = session.get('final_stage') or session.get('mri_stage') or 'Unknown'
        stage_counts[stage] = stage_counts.get(stage, 0) + 1

    return jsonify({
        'total_users': len(users),
        'total_doctors': len(doctors),
        'total_patients': len(patients),
        'total_analyses': len(sessions),
        'stage_distribution': stage_counts,
    })


@admin_bp.route('/doctors', methods=['GET'])
@admin_required
def list_doctors():
    user_repo = UserRepository()
    patient_repo = PatientRepository()
    users = user_repo.get_all()
    doctors = [u for u in users if u.role in ('doctor', 'clinician')]

    doctors_list = []
    for d in doctors:
        d_dict = d.to_dict()
        patients = patient_repo.get_all(created_by=d.id)
        d_dict['patient_count'] = len(patients)
        doctors_list.append(d_dict)

    return jsonify({'doctors': doctors_list})


@admin_bp.route('/doctors/<int:doctor_id>/patients', methods=['GET'])
@admin_required
def list_doctor_patients(doctor_id):
    user_repo = UserRepository()
    doctor = user_repo.get_by_id(doctor_id)
    if not doctor:
        return jsonify({'success': False, 'message': 'Doctor not found'}), 404

    patient_repo = PatientRepository()
    patients = patient_repo.get_all(created_by=doctor_id)
    return jsonify({'patients': patients})


@admin_bp.route('/doctors/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_doctor(user_id):
    from app.services.storage_manager import StorageManager
    from app.repositories.audit_repository import AuditRepository

    current_admin = get_current_user()
    user_repo = UserRepository()
    user = user_repo.get_by_id(user_id)

    if not user:
        return jsonify({'success': False, 'message': 'Doctor not found'}), 404

    if user.role == 'admin':
        return jsonify({'success': False, 'message': 'Cannot delete admin'}), 403

    doc_name = user.full_name or user.username
    patient_repo = PatientRepository()
    session_repo = SessionRepository()

    doctor_patients = patient_repo.get_all(created_by=user_id)

    # Collect patient IDs before deleting from DB so we can clean up files after
    patient_ids = [p['patient_id'] for p in doctor_patients]

    # Delete all DB records (sessions cascade via FK, then patients, then user)
    with user_repo.db.get_connection() as conn:
        for patient_id in patient_ids:
            session_repo.delete_patient(patient_id, conn=conn)
        session_repo.delete_created_by(user_id, conn=conn)
        patient_repo.delete_by_creator(user_id, conn=conn)
        user_repo.delete(user_id, conn=conn)

    # Delete all file artifacts for each patient
    for patient_id in patient_ids:
        StorageManager.delete_patient_directory(user_id, patient_id)

    # Delete the entire doctor directory (catches any remaining artifacts)
    StorageManager.delete_doctor_directory(user_id)
    logger.info("Admin deleted doctor %d and all associated data/files", user_id)

    AuditRepository().log(
        action='DELETE_DOCTOR',
        resource_type='doctor',
        actor_id=current_admin.id if current_admin else None,
        actor_username=current_admin.username if current_admin else None,
        actor_role=current_admin.role if current_admin else 'admin',
        resource_id=str(user_id),
        resource_name=doc_name,
        details={'deleted_patient_count': len(patient_ids)},
    )

    return jsonify({'success': True, 'message': 'Doctor and all associated data deleted successfully'})


@admin_bp.route('/patients', methods=['GET'])
@admin_required
def list_all_patients():
    patient_repo = PatientRepository()
    patients = patient_repo.get_all()
    return jsonify({'patients': patients})


@admin_bp.route('/patients/<patient_id>', methods=['DELETE'])
@admin_required
def delete_patient(patient_id):
    from app.services.storage_manager import StorageManager
    from app.repositories.audit_repository import AuditRepository

    current_admin = get_current_user()
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if not patient:
        return jsonify({'success': False, 'message': 'Patient not found'}), 404

    doctor_id = patient.get('created_by')
    pat_name = patient.get('name')

    session_repo = SessionRepository()
    with patient_repo.db.get_connection() as conn:
        session_repo.delete_patient(patient_id, conn=conn)
        deleted = patient_repo.delete(patient_id, conn=conn)

    if not deleted:
        return jsonify({'success': False, 'message': 'Patient not found'}), 404

    # Delete all file artifacts (photos, PDFs, MRI uploads) for this patient
    StorageManager.delete_patient_directory(doctor_id, patient_id)
    logger.info("Admin deleted patient %s and all associated files", patient_id)

    AuditRepository().log(
        action='DELETE_PATIENT',
        resource_type='patient',
        actor_id=current_admin.id if current_admin else None,
        actor_username=current_admin.username if current_admin else None,
        actor_role=current_admin.role if current_admin else 'admin',
        resource_id=patient_id,
        resource_name=pat_name,
        details={'doctor_id': doctor_id},
    )

    return jsonify({'success': True, 'message': 'Patient and all associated data deleted successfully'})


@admin_bp.route('/sessions', methods=['GET'])
@admin_required
def list_all_sessions():
    session_repo = SessionRepository()
    sessions = session_repo.get_all()
    return jsonify({'sessions': sessions})


@admin_bp.route('/sessions/<int:session_id>', methods=['DELETE'])
@admin_required
def delete_session(session_id):
    from app.services.storage_manager import StorageManager
    from app.repositories.audit_repository import AuditRepository
    from app.core.db_orm import SessionLocal
    from app.models.session import Session as SessionModel

    current_admin = get_current_user()
    session_repo = SessionRepository()
    session = session_repo.get_session_detail(session_id)

    if not session:
        return jsonify({'success': False, 'message': 'Session not found'}), 404

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
        actor_id=current_admin.id if current_admin else None,
        actor_username=current_admin.username if current_admin else None,
        actor_role=current_admin.role if current_admin else 'admin',
        resource_id=str(session_id),
        resource_name=f"Session #{session_id} ({patient_name})",
        details={'patient_id': patient_id, 'doctor_id': doctor_id},
    )

    return jsonify({'success': True, 'message': 'Session deleted successfully'})


@admin_bp.route('/audit-log', methods=['GET'])
@admin_required
def list_audit_logs():
    from app.repositories.audit_repository import AuditRepository

    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    action = request.args.get('action', None, type=str)
    resource_type = request.args.get('resource_type', None, type=str)

    audit_repo = AuditRepository()
    logs = audit_repo.get_logs(limit=limit, offset=offset, action=action, resource_type=resource_type)
    total = audit_repo.count(action=action, resource_type=resource_type)

    return jsonify({'logs': logs, 'total': total, 'limit': limit, 'offset': offset})


@admin_bp.route('/analytics', methods=['GET'])
@admin_required
def analytics():
    user_repo = UserRepository()
    patient_repo = PatientRepository()
    session_repo = SessionRepository()

    users = user_repo.get_all()
    patients = patient_repo.get_all()
    sessions = session_repo.get_all()

    doctors = [u for u in users if u.role == 'doctor']

    stage_counts = {}
    for session in sessions:
        stage = session.get('final_stage') or session.get('mri_stage') or 'Unknown'
        stage_counts[stage] = stage_counts.get(stage, 0) + 1

    return jsonify({
        'total_users': len(users),
        'total_doctors': len(doctors),
        'total_patients': len(patients),
        'total_analyses': len(sessions),
        'stage_distribution': stage_counts,
    })
