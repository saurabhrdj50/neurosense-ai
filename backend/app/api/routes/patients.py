from flask import Blueprint, request, jsonify, send_file
import io
import csv

from app.api.schemas import PatientSchema
from app.repositories.patient_repository import PatientRepository
from app.repositories.session_repository import SessionRepository
from app.core.security import login_required, get_current_user_id

patient_bp = Blueprint('patient', __name__, url_prefix='/api/patients')


@patient_bp.route('', methods=['GET'])
def list_patients():
    patient_repo = PatientRepository()
    patients = patient_repo.get_all()
    return jsonify({'patients': patients})


@patient_bp.route('', methods=['POST'])
def add_patient():
    data = request.get_json()
    
    try:
        validated = PatientSchema.validate_create(data)
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    
    user_id = get_current_user_id()
    
    patient_repo = PatientRepository()
    result = patient_repo.create(
        patient_id=validated['patient_id'],
        name=validated['name'],
        age=validated.get('age'),
        sex=validated.get('sex'),
        education_years=validated.get('education_years'),
        notes=validated.get('notes', ''),
        created_by=user_id,
    )
    
    return jsonify(result), 200 if result.get('success') else 400


@patient_bp.route('/<patient_id>', methods=['GET'])
def get_patient(patient_id):
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)
    
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
    
    return jsonify(patient)


@patient_bp.route('/<patient_id>', methods=['PUT'])
def update_patient(patient_id):
    data = request.get_json()
    
    try:
        validated = PatientSchema.validate_update(data)
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    
    patient_repo = PatientRepository()
    result = patient_repo.update(patient_id, **validated)
    
    return jsonify(result), 200 if result.get('success') else 400


@patient_bp.route('/<patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    patient_repo = PatientRepository()
    success = patient_repo.delete(patient_id)
    
    if not success:
        return jsonify({'error': 'Patient not found'}), 404
    
    return jsonify({'success': True})


@patient_bp.route('/history/<patient_id>', methods=['GET'])
def patient_history(patient_id):
    session_repo = SessionRepository()
    
    history = session_repo.get_history(patient_id)
    trends = session_repo.get_trends(patient_id)
    
    return jsonify({
        'history': history,
        'trends': trends,
    })


@patient_bp.route('/export/<patient_id>', methods=['GET'])
def export_csv(patient_id):
    session_repo = SessionRepository()
    history = session_repo.get_history(patient_id)
    
    if not history:
        return jsonify({'error': 'No history found'}), 404
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        'Session ID', 'Date', 'MRI Stage', 'MRI Confidence',
        'Sentiment Score', 'Cognitive Score', 'Risk Score',
        'Final Stage', 'Final Confidence'
    ])
    
    for session_data in history:
        results = session_data
        writer.writerow([
            session_data.get('id', ''),
            session_data.get('timestamp', ''),
            results.get('mri_stage', ''),
            results.get('mri_confidence', ''),
            results.get('sentiment_risk', ''),
            results.get('cognitive_score', ''),
            results.get('risk_score', ''),
            results.get('final_stage', ''),
            results.get('final_confidence', ''),
        ])
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'patient_{patient_id}_history.csv'
    )
