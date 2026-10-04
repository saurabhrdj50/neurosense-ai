from flask import Blueprint, request, jsonify, send_file
import io
import csv
import zipfile
import base64

from app.config.settings import Config
from app.features.patients.schemas import PatientSchema
from app.features.patients.repository import PatientRepository
from app.features.history.repository import SessionRepository
from app.shared.security import login_required, get_current_user, get_current_user_id

patient_bp = Blueprint('patient', __name__, url_prefix='/api/patients')


def _csv_safe(value) -> str:
    """Neutralize CSV formula injection (=, +, -, @ prefixes) in exported cells."""
    s = str(value) if value is not None else ''
    if s and s[0] in ('=', '+', '-', '@'):
        return f"'{s}"
    return s


def _audit(action: str, resource_type: str, resource_id: str, resource_name: str = None, details: dict = None):
    """Best-effort audit row for doctor-initiated destructive/export actions."""
    try:
        from app.features.admin.repository import AuditRepository
        user = get_current_user()
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
        logging.getLogger(__name__).exception("Failed to write audit row for %s %s", action, resource_id)


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
    from app.shared.db_orm import session_scope
    # Single transaction: sessions and the patient row commit together or not
    # at all — a partial delete must never leave orphaned sessions.
    with session_scope() as session:
        session_repo.delete_patient(patient_id, session=session)
        success = patient_repo.delete(patient_id, session=session)

    if not success:
        return jsonify({'error': 'Patient not found'}), 404

    _audit('DELETE_PATIENT', 'patient', patient_id,
           resource_name=patient.get('name'), details={'doctor_id': doctor_id})

    # Cascade delete all file artifacts (photos, reports, MRI uploads)
    from app.shared.storage import StorageManager
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


@patient_bp.route('/photo/<patient_id>', methods=['GET'])
@login_required
def get_patient_photo(patient_id):
    user = get_current_user()
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(patient_id)

    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    if user and not user.is_admin and patient.get('created_by') != user.id:
        return jsonify({'error': 'Access denied'}), 403

    from app.shared.storage import StorageManager
    patient_dir = StorageManager.get_patient_directory(
        doctor_id=patient.get('created_by'),
        patient_id=patient_id,
        patient_name=patient.get('name')
    )
    avatar_path = patient_dir / 'profile' / 'avatar.png'
    if avatar_path.exists():
        return send_file(avatar_path, mimetype='image/png')

    photo_val = patient.get('photo')
    if photo_val and photo_val.startswith('data:image'):
        if ',' in photo_val:
            photo_val = photo_val.split(',', 1)[1]
        data = base64.b64decode(photo_val)
        return send_file(io.BytesIO(data), mimetype='image/png')

    return jsonify({'error': 'Photo not found'}), 404


@patient_bp.route('/session/<int:session_id>/report', methods=['GET'])
@login_required
def get_session_report(session_id):
    user = get_current_user()
    session_repo = SessionRepository()
    session_data = session_repo.get_by_id(session_id)
    if not session_data:
        return jsonify({'error': 'Session not found'}), 404

    patient_repo = PatientRepository()
    patient = patient_repo.get_by_patient_id(session_data.get('patient_id'))
    if not patient:
        return jsonify({'error': 'Patient not found'}), 404

    if user and not user.is_admin and patient.get('created_by') != user.id:
        return jsonify({'error': 'Access denied'}), 403

    from app.shared.storage import StorageManager
    patient_dir = StorageManager.get_patient_directory(
        doctor_id=patient.get('created_by'),
        patient_id=patient.get('patient_id'),
        patient_name=patient.get('name')
    )
    pdf_file = patient_dir / 'sessions' / f'sess_{session_id}' / 'reports' / f'report_{session_id}.pdf'
    if pdf_file.exists():
        return send_file(pdf_file, mimetype='application/pdf')

    reports_dir = patient_dir / 'sessions' / f'sess_{session_id}' / 'reports'
    if reports_dir.exists():
        pdfs = list(reports_dir.glob('*.pdf'))
        if pdfs:
            return send_file(pdfs[0], mimetype='application/pdf')

    return jsonify({'error': 'Report not found'}), 404



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
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'patient_{patient_id}_history.csv'
    )


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
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='patients_metadata_export.csv'
    )


@patient_bp.route('/export/reports', methods=['GET'])
@login_required
def export_reports_zip():
    user = get_current_user()
    patient_repo = PatientRepository()

    if user and user.is_admin:
        patients = patient_repo.get_all()
    else:
        patients = patient_repo.get_all(created_by=user.id if user else None)

    allowed_patient_ids = {p['patient_id'] for p in patients}

    zip_buffer = io.BytesIO()
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
                            arcname = f"{patient_folder}/session_{session_id}_report.pdf"
                        else:
                            arcname = f"{patient_folder}/{filename}"
                        zf.write(pdf_path, arcname=arcname)

    zip_buffer.seek(0)
    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name='clinical_reports.zip'
    )







