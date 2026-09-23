from flask import Blueprint, request, jsonify, send_file
import io

from app.core.security import login_required, get_current_user
from app.repositories.patient_repository import PatientRepository
from app.repositories.session_repository import SessionRepository
from app.services.report_service import ReportOrchestrator

utility_bp = Blueprint('utility', __name__, url_prefix='/api/utils')

_orchestrator = ReportOrchestrator()


def _can_access_patient(user, patient_id: str) -> bool:
    """Admins can access any patient; clinicians see only their own patients."""
    if not patient_id:
        return True
    if not user:
        return False
    if user.is_admin:
        return True
    patient = PatientRepository().get_by_patient_id(patient_id)
    return patient is not None and patient.get('created_by') == user.id


@utility_bp.route('/chat', methods=['POST'])
@login_required
def chat():
    data = request.get_json()
    if not data or not data.get('query'):
        return jsonify({'error': 'No query provided'}), 400
    
    patient_id = data.get('patient_id')
    user = get_current_user()

    if not _can_access_patient(user, patient_id):
        return jsonify({'error': 'Access denied'}), 403

    history = []
    
    if patient_id:
        session_repo = SessionRepository()
        history = session_repo.get_history(patient_id)
    
    from app.services.chatbot_service import MedicalChatbotService
    chatbot = MedicalChatbotService()
    
    answer = chatbot.ask(
        query=data['query'],
        patient_history=history,
        api_key=data.get('api_key'),
        provider=data.get('provider', 'gemini')
    )
    
    return jsonify({'answer': answer})


@utility_bp.route('/music', methods=['POST'])
@login_required
def recommend_music():
    data = request.get_json()
    stage = data.get('stage', 'Mild Demented') if data else 'Mild Demented'
    emotion = data.get('emotion', 'neutral') if data else 'neutral'
    
    from app.services.music_service import MusicRecommendationService
    music_service = MusicRecommendationService()
    
    return jsonify(music_service.recommend(stage, emotion))


@utility_bp.route('/report', methods=['POST'])
@login_required
def generate_report():
    data = request.get_json()
    if not data or 'results' not in data:
        return jsonify({'error': 'No analysis results provided'}), 400
    
    try:
        pdf_bytes = _orchestrator.generate_report(
            results=data['results'],
            patient_info=data.get('patient_info')
        )
        
        if pdf_bytes is None:
            return jsonify({'error': 'PDF generation unavailable. Install reportlab.'}), 500
        
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name='NeuroSense_Report.pdf'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500
