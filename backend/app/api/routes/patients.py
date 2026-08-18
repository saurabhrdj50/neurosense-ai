from flask import Blueprint, request, jsonify, send_file
import io
import csv

from app.api.schemas import PatientSchema
from app.repositories.patient_repository import PatientRepository
from app.repositories.session_repository import SessionRepository
from app.core.security import login_required, get_current_user, get_current_user_id

patient_bp = Blueprint('patient', __name__, url_prefix='/api/patients')


@patient_bp.route('', methods=['GET'])
@login_required
def list_patients():
    user = get_current_user()
    patient_repo = PatientRepository()

    if user and user.is_admin:
        patients = patient_repo.get_all()
    else:
        patients = patient_repo.get_all(created_by=user.id if user else None)

    return jsonify({'patients': patients})


@patient_bp.route('', methods=['POST'])
@login_required
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
@login_required
def get_patient(patient_id):
    user = get_current_user()
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    if user and not user.is_admin and patient.get('created_by') != user.id:
        return jsonify({'error': 'Access denied'}), 403

    return jsonify(patient)


@patient_bp.route('/<patient_id>', methods=['PUT'])
@login_required
def update_patient(patient_id):
    user = get_current_user()
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    if user and not user.is_admin and patient.get('created_by') != user.id:
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json()

    try:
        validated = PatientSchema.validate_update(data)
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    result = patient_repo.update(patient_id, **validated)

    return jsonify(result), 200 if result.get('success') else 400


@patient_bp.route('/<patient_id>', methods=['DELETE'])
@login_required
def delete_patient(patient_id):
    user = get_current_user()
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    if user and not user.is_admin and patient.get('created_by') != user.id:
        return jsonify({'error': 'Access denied'}), 403

    doctor_id = patient.get('created_by')

    session_repo = SessionRepository()
    with patient_repo.db.get_connection() as conn:
        session_repo.delete_patient(patient_id, conn=conn)
        success = patient_repo.delete(patient_id, conn=conn)

    if not success:
        return jsonify({'error': 'Patient not found'}), 404

    # Cascade delete all file artifacts (photos, reports, MRI uploads)
    from app.services.storage_manager import StorageManager
    StorageManager.delete_patient_directory(doctor_id, patient_id)

    return jsonify({'success': True})


@patient_bp.route('/history/<patient_id>', methods=['GET'])
@login_required
def patient_history(patient_id):
    user = get_current_user()
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if patient and user and not user.is_admin and patient.get('created_by') != user.id:
        return jsonify({'error': 'Access denied'}), 403

    session_repo = SessionRepository()
    history = session_repo.get_history(patient_id)
    trends = session_repo.get_trends(patient_id)

    return jsonify({
        'history': history,
        'trends': trends,
    })


@patient_bp.route('/export/<patient_id>', methods=['GET'])
@login_required
def export_csv(patient_id):
    user = get_current_user()
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if patient and user and not user.is_admin and patient.get('created_by') != user.id:
        return jsonify({'error': 'Access denied'}), 403

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
        writer.writerow([
            session_data.get('id', ''),
            session_data.get('timestamp', ''),
            session_data.get('mri_stage', ''),
            session_data.get('mri_confidence', ''),
            session_data.get('sentiment_risk', ''),
            session_data.get('cognitive_score', ''),
            session_data.get('risk_score', ''),
            session_data.get('final_stage', ''),
            session_data.get('final_confidence', ''),
        ])

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'patient_{patient_id}_history.csv'
    )


@patient_bp.route('/compare/report', methods=['GET'])
@login_required
def compare_report():
    user = get_current_user()
    ids_param = request.args.get('ids', '')
    patient_ids = [pid.strip() for pid in ids_param.split(',') if pid.strip()]
    if len(patient_ids) != 2:
        return jsonify({'error': 'Exactly two patient IDs are required'}), 400
    
    patient_repo = PatientRepository()
    session_repo = SessionRepository()
    
    patient_a = patient_repo.get_by_patient_id(patient_ids[0])
    patient_b = patient_repo.get_by_patient_id(patient_ids[1])
    
    if not patient_a or not patient_b:
        return jsonify({'error': 'One or both patients not found'}), 404
        
    if user and not user.is_admin:
        if patient_a.get('created_by') != user.id or patient_b.get('created_by') != user.id:
            return jsonify({'error': 'Access denied'}), 403
            
    history_a = session_repo.get_history(patient_ids[0])
    history_b = session_repo.get_history(patient_ids[1])
    
    from app.modules.reporting.report_generator import ClinicalReportGenerator
    generator = ClinicalReportGenerator()
    try:
        pdf_bytes = generator.generate_comparison_pdf_report(patient_a, history_a, patient_b, history_b)
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'patient_comparison_{patient_ids[0]}_{patient_ids[1]}.pdf'
        )
    except Exception as e:
        return jsonify({'error': f'Failed to generate comparison report: {str(e)}'}), 500


@patient_bp.route('/photo/<patient_id>', methods=['GET'])
@login_required
def serve_patient_photo(patient_id):
    user = get_current_user()
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
        
    if user and not user.is_admin and patient.get('created_by') != user.id:
        return jsonify({'error': 'Access denied'}), 403
        
    raw_photo = patient.get('photo')
    # If the database has a base64 photo for legacy records, serve it directly
    if raw_photo and raw_photo.startswith('data:image'):
        if ',' in raw_photo:
            header, base64_str = raw_photo.split(',', 1)
            mime = header.split(';')[0].split(':')[1]
        else:
            base64_str = raw_photo
            mime = 'image/png'
        import base64
        data = base64.b64decode(base64_str)
        return send_file(io.BytesIO(data), mimetype=mime)
        
    # Serving from physical path
    from app.services.storage_manager import StorageManager
    doctor_id = patient.get('created_by')
    patient_dir = StorageManager.get_patient_directory(doctor_id, patient_id)
    file_path = patient_dir / 'profile' / 'avatar.png'
    
    if not file_path.exists():
        return jsonify({'error': 'Photo not found'}), 404
        
    return send_file(str(file_path))


@patient_bp.route('/session/<int:session_id>/report', methods=['GET'])
@login_required
def serve_patient_report(session_id):
    user = get_current_user()
    session_repo = SessionRepository()
    
    session_data = session_repo.get_session_detail(session_id)
    if not session_data:
        return jsonify({'error': 'Session not found'}), 404
        
    patient_id = session_data.get('patient_id')
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404
        
    if user and not user.is_admin and patient.get('created_by') != user.id:
        return jsonify({'error': 'Access denied'}), 403
        
    from app.services.storage_manager import StorageManager
    doctor_id = patient.get('created_by')
    
    try:
        patient_dir = StorageManager.get_patient_directory(doctor_id, patient_id)
        file_path = patient_dir / 'sessions' / f'sess_{session_id}' / 'reports' / f'report_{session_id}.pdf'
        
        if not file_path.exists():
            return jsonify({'error': 'Report PDF not found'}), 404
            
        return send_file(
            str(file_path),
            mimetype='application/pdf',
            as_attachment=False
        )
    except Exception as e:
        return jsonify({'error': f'Failed to retrieve report: {str(e)}'}), 500


@patient_bp.route('/export', methods=['GET'])
@login_required
def export_all_patients_csv():
    user = get_current_user()
    patient_repo = PatientRepository()
    
    if user and user.is_admin:
        patients = patient_repo.get_all()
    else:
        patients = patient_repo.get_all(created_by=user.id if user else None)
        
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        'Patient ID', 'Name', 'Age', 'Sex', 'Education Years', 'Latest Status/Stage', 'Created Date', 'Notes', 'Clinician ID'
    ])
    
    for p in patients:
        writer.writerow([
            p.get('patient_id', ''),
            p.get('name', ''),
            p.get('age', ''),
            p.get('sex', ''),
            p.get('education_years', ''),
            p.get('stage', ''),
            p.get('created_at', ''),
            p.get('notes', ''),
            p.get('created_by', ''),
        ])
        
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='patients_metadata_export.csv'
    )


@patient_bp.route('/export/reports', methods=['GET'])
@login_required
def export_all_reports_zip():
    import zipfile
    user = get_current_user()
    patient_repo = PatientRepository()
    session_repo = SessionRepository()
    
    if user and user.is_admin:
        patients = patient_repo.get_all()
    else:
        patients = patient_repo.get_all(created_by=user.id if user else None)
        
    from app.services.storage_manager import StorageManager
    
    # Create zip in memory
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for p in patients:
            patient_id = p.get('patient_id')
            patient_name = p.get('name')
            history = session_repo.get_history(patient_id)
            for s in history:
                session_id = s.get('id')
                if session_id:
                    doctor_id = p.get('created_by')
                    patient_dir = StorageManager.get_patient_directory(doctor_id, patient_id)
                    file_path = patient_dir / 'sessions' / f'sess_{session_id}' / 'reports' / f'report_{session_id}.pdf'
                    
                    if file_path.exists():
                        from werkzeug.utils import secure_filename
                        safe_name = secure_filename(patient_name)
                        zip_path = f"{secure_filename(patient_id)}_{safe_name}/session_{session_id}_report.pdf"
                        zip_file.write(str(file_path), zip_path)
                        
    zip_buffer.seek(0)
    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name='clinical_reports_archive.zip'
    )




