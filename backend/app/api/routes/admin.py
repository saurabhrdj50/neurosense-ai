import logging
from flask import Blueprint, jsonify
from app.core.security import get_current_user, admin_required, role_required
from app.repositories.user_repository import UserRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.session_repository import SessionRepository

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def dashboard():
    """Get admin dashboard statistics."""
    user_repo = UserRepository()
    patient_repo = PatientRepository()
    session_repo = SessionRepository()
    
    users = user_repo.get_all()
    patients = patient_repo.get_all()
    sessions = session_repo.get_all()
    
    doctors = [u for u in users if u.role == 'doctor']
    
    return jsonify({
        'total_users': len(users),
        'total_doctors': len(doctors),
        'total_patients': len(patients),
        'total_analyses': len(sessions),
    })


@admin_bp.route('/doctors', methods=['GET'])
@admin_required
def list_doctors():
    """List all doctors."""
    user_repo = UserRepository()
    users = user_repo.get_all()
    doctors = [u for u in users if u.role == 'doctor']
    return jsonify({'doctors': [d.to_dict() for d in doctors]})


@admin_bp.route('/doctors/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_doctor(user_id):
    """Delete a doctor."""
    user_repo = UserRepository()
    user = user_repo.get_by_id(user_id)
    
    if not user:
        return jsonify({'success': False, 'message': 'Doctor not found'}), 404
    
    if user.role == 'admin':
        return jsonify({'success': False, 'message': 'Cannot delete admin'}), 403
    
    # Delete the user
    with user_repo.db.get_connection() as conn:
        conn.execute('DELETE FROM users WHERE id=?', (user_id,))
    
    return jsonify({'success': True, 'message': 'Doctor deleted successfully'})


@admin_bp.route('/patients', methods=['GET'])
@admin_required
def list_all_patients():
    """List all patients from all doctors."""
    patient_repo = PatientRepository()
    patients = patient_repo.get_all()
    return jsonify({'patients': patients})


@admin_bp.route('/patients/<patient_id>', methods=['DELETE'])
@admin_required
def delete_patient(patient_id):
    """Delete a patient."""
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)
    
    if not patient:
        return jsonify({'success': False, 'message': 'Patient not found'}), 404
    
    # Delete the patient
    with patient_repo.db.get_connection() as conn:
        conn.execute('DELETE FROM patients WHERE patient_id=?', (patient_id,))
        conn.execute('DELETE FROM sessions WHERE patient_id=?', (patient_id,))
    
    return jsonify({'success': True, 'message': 'Patient deleted successfully'})


@admin_bp.route('/analytics', methods=['GET'])
@admin_required
def analytics():
    """Get system analytics."""
    user_repo = UserRepository()
    patient_repo = PatientRepository()
    session_repo = SessionRepository()
    
    users = user_repo.get_all()
    patients = patient_repo.get_all()
    sessions = session_repo.get_all()
    
    doctors = [u for u in users if u.role == 'doctor']
    
    stage_counts = {}
    for session in sessions:
        stage = session.get('final_stage', 'Unknown')
        stage_counts[stage] = stage_counts.get(stage, 0) + 1
    
    return jsonify({
        'total_users': len(users),
        'total_doctors': len(doctors),
        'total_patients': len(patients),
        'total_analyses': len(sessions),
        'stage_distribution': stage_counts,
    })


@admin_bp.route('/sessions', methods=['GET'])
@admin_required
def list_all_sessions():
    """List all analysis sessions."""
    session_repo = SessionRepository()
    sessions = session_repo.get_all()
    return jsonify({'sessions': sessions})
