from flask import Blueprint, request, jsonify, send_file
import io

from app.repositories.session_repository import SessionRepository
from app.services.report_service import ReportOrchestrator

utility_bp = Blueprint('utility', __name__, url_prefix='/api/utils')

_orchestrator = ReportOrchestrator()


@utility_bp.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    if not data or not data.get('query'):
        return jsonify({'error': 'No query provided'}), 400
    
    patient_id = data.get('patient_id')
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
def recommend_music():
    data = request.get_json()
    stage = data.get('stage', 'Mild Demented') if data else 'Mild Demented'
    emotion = data.get('emotion', 'neutral') if data else 'neutral'
    
    from app.services.music_service import MusicRecommendationService
    music_service = MusicRecommendationService()
    
    return jsonify(music_service.recommend(stage, emotion))


@utility_bp.route('/report', methods=['POST'])
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
