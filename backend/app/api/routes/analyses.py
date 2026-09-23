from flask import Blueprint, jsonify

from app.core.security import get_current_user, login_required
from app.repositories.patient_repository import PatientRepository
from app.repositories.session_repository import SessionRepository


analyses_bp = Blueprint('analyses', __name__, url_prefix='/api/analyses')


@analyses_bp.route('', methods=['GET'])
@login_required
def list_analyses():
    user = get_current_user()
    session_repo = SessionRepository()

    if user and user.is_admin:
        analyses = session_repo.get_all()
    elif user:
        analyses = session_repo.get_for_doctor(user.id)
    else:
        analyses = []

    return jsonify({'analyses': analyses})


@analyses_bp.route('/<int:session_id>', methods=['GET'])
@login_required
def get_analysis(session_id):
    user = get_current_user()
    session_repo = SessionRepository()
    session = session_repo.get_session_detail(session_id)

    if not session:
        return jsonify({'success': False, 'error': 'Analysis not found'}), 404

    if user and not user.is_admin and session.get('created_by') != user.id:
        patient = PatientRepository().get_by_patient_id(session.get('patient_id'))
        if not patient or patient.get('created_by') != user.id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403

    return jsonify({'analysis': session})
