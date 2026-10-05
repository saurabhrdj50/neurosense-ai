import logging
import json
import io
from flask import Blueprint, request, jsonify, Response

from app.features.analysis.service import AnalysisOrchestrator
from app.features.analysis.patient.service import parse_patient_info
from app.features.patients.repository import PatientRepository
from app.shared.security import login_required, get_current_user
from app.features.history.repository import SessionRepository
from app.ml.contracts import AnalysisInput

logger = logging.getLogger(__name__)

analysis_bp = Blueprint('analysis', __name__, url_prefix='/api/analysis')

_orchestrator = AnalysisOrchestrator()


def _allowed_file(fn):
    if not fn:
        return False
    fn_lower = fn.lower()
    if fn_lower.endswith('.nii.gz'):
        return True
    return '.' in fn and fn_lower.rsplit('.', 1)[1] in {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'nii'}


def _allowed_audio(fn):
    if not fn:
        return False
    return '.' in fn and fn.rsplit('.', 1)[1].lower() in {'wav', 'mp3', 'flac', 'webm', 'ogg'}


def _valid_mri_upload(file_storage) -> bool:
    """Extension check AND content sniffing — extensions alone are trivially spoofed."""
    if not (file_storage and file_storage.filename and _allowed_file(file_storage.filename)):
        return False
    from app.shared.storage import sniff_content_category
    low = file_storage.filename.lower()
    category = 'nifti' if (low.endswith('.nii.gz') or low.endswith('.nii')) else 'image'
    if not sniff_content_category(file_storage, category):
        return False
    return True


def _valid_audio_upload(file_storage) -> bool:
    if not (file_storage and file_storage.filename and _allowed_audio(file_storage.filename)):
        return False
    from app.shared.storage import sniff_content_category
    return sniff_content_category(file_storage, 'audio')


def _parse_analyze_request():
    """Shared request parsing/validation for sync and async analyze.

    Returns (inputs, patient_info, input_errors) or (None, None, error_response)
    where error_response is a (body, status) tuple ready to return.
    """
    from app.shared.security import get_current_user_id
    current_user_id = get_current_user_id()
    current_user = get_current_user()

    try:
        patient_info = parse_patient_info(request.form)
    except ValueError as e:
        return None, None, ({'success': False, 'message': str(e)}, 400)

    # Fail fast on cross-tenant writes: refuse to analyze (and persist) a
    # patient owned by a different clinician.
    pid = (patient_info.get('patient_id') or '').strip()
    if pid and current_user and not current_user.is_admin:
        existing = PatientRepository().get_by_patient_id(pid)
        existing_owner = existing.get('created_by') if existing else None
        if existing_owner is not None and existing_owner != current_user_id:
            return None, None, ({
                'success': False,
                'message': f"Patient '{pid}' belongs to another clinician."
            }, 403)

    mri_file = request.files.get('mri_image')
    if mri_file and mri_file.filename and _allowed_file(mri_file.filename) and not _valid_mri_upload(mri_file):
        return None, None, ({'success': False, 'message': 'MRI file content does not match its extension (rejected).'}, 400)
    if not (mri_file and mri_file.filename and _allowed_file(mri_file.filename)):
        mri_file = None

    audio_file = request.files.get('audio_file')
    if audio_file and audio_file.filename and _allowed_audio(audio_file.filename) and not _valid_audio_upload(audio_file):
        return None, None, ({'success': False, 'message': 'Audio file content does not match its extension (rejected).'}, 400)
    if not (audio_file and audio_file.filename and _allowed_audio(audio_file.filename)):
        audio_file = None

    input_errors = {}
    cognitive_data = None
    cog_raw = request.form.get('cognitive_tests', '').strip()
    if cog_raw:
        try:
            cognitive_data = json.loads(cog_raw)
            if not isinstance(cognitive_data, dict):
                raise ValueError('cognitive_tests must be a JSON object')
        except Exception as e:
            input_errors['cognitive_error'] = str(e)

    risk_data = None
    risk_raw = request.form.get('risk_factors', '').strip()
    if risk_raw:
        try:
            risk_data = json.loads(risk_raw)
            if not isinstance(risk_data, dict):
                raise ValueError('risk_factors must be a JSON object')
        except Exception as e:
            input_errors['risk_error'] = str(e)

    inputs: AnalysisInput = {
        'patient_info': patient_info,
        'patient_notes': request.form.get('patient_text', '').strip(),
        'mri_file': mri_file,
        'audio_file': audio_file,
        'audio_text': request.form.get('audio_text', '').strip(),
        'cognitive_data': cognitive_data,
        'risk_data': risk_data,
        'gradcam': request.form.get('gradcam', 'true').lower() == 'true',
    }
    return (inputs, patient_info, input_errors), None, None


@analysis_bp.route('/analyze', methods=['POST'])
@login_required
def analyze():
    from app.shared.security import get_current_user_id
    current_user_id = get_current_user_id()

    parsed, _, error = _parse_analyze_request()
    if error is not None:
        return jsonify(error[0]), error[1]
    inputs, patient_info, input_errors = parsed

    results = _orchestrator.run_full_analysis(inputs, doctor_id=current_user_id)
    results.update(input_errors)
    try:
        results = _orchestrator.persist_analysis(patient_info, results, doctor_id=current_user_id)
    except PermissionError as e:
        # Race: the patient was claimed by another clinician between the
        # pre-analysis check and persistence.
        logger.warning("Blocked cross-tenant persist: %s", e)
        return jsonify({
            'success': False,
            'message': "Patient belongs to another clinician; analysis was not saved."
        }), 403

    return jsonify(results)


@analysis_bp.route('/analyze-async', methods=['POST'])
@login_required
def analyze_async():
    """Submit the analysis as a background job; returns 202 + a job id.

    Long Whisper/MRI runs then cannot hold or time out an HTTP worker —
    the client polls /api/analysis/jobs/<id> for real pipeline progress.
    """
    from app.shared.security import get_current_user_id
    from app.shared.jobs import get_job_manager
    current_user_id = get_current_user_id()

    parsed, _, error = _parse_analyze_request()
    if error is not None:
        return jsonify(error[0]), error[1]
    inputs, patient_info, input_errors = parsed

    def work(progress):
        results = _orchestrator.run_full_analysis(inputs, doctor_id=current_user_id, progress=progress)
        results.update(input_errors)
        return _orchestrator.persist_analysis(patient_info, results, doctor_id=current_user_id)

    job_id = get_job_manager().submit(work, user_id=current_user_id, label='analysis')
    return jsonify({
        'job_id': job_id,
        'status': 'queued',
        'status_url': f'/api/analysis/jobs/{job_id}',
    }), 202


@analysis_bp.route('/jobs/<job_id>', methods=['GET'])
@login_required
def analysis_job_status(job_id):
    from app.shared.security import get_current_user_id
    from app.shared.jobs import get_job_manager
    current_user = get_current_user()
    job = get_job_manager().get(
        job_id,
        user_id=getattr(current_user, 'id', None),
        is_admin=bool(current_user and current_user.is_admin),
    )
    if job is None:
        return jsonify({'success': False, 'message': 'Job not found'}), 404
    return jsonify(job)


@analysis_bp.route('/mri/preview', methods=['POST'])
@login_required
def mri_preview():
    """Render a displayable PNG preview slice from an uploaded MRI volume."""
    if 'mri_image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['mri_image']
    if not file.filename or not _valid_mri_upload(file):
        return jsonify({'error': 'Invalid file type'}), 400

    try:
        temp_path = _orchestrator._save_temp_file(file)
        try:
            from app.ml.mri.nifti import render_volume_preview
            preview_array = render_volume_preview(temp_path, size=256)

            from PIL import Image
            preview_img = Image.fromarray(preview_array, mode='L').convert('RGB')
            buf = io.BytesIO()
            preview_img.save(buf, format='PNG')
            buf.seek(0)
            return Response(
                buf.getvalue(),
                mimetype='image/png',
                headers={
                    'Content-Disposition': 'inline; filename=mri_preview.png',
                    'Cache-Control': 'no-store',
                },
            )
        finally:
            _orchestrator._cleanup_temp_file(temp_path)
    except Exception as e:
        logger.error("Failed to render MRI preview: %s", e)
        return jsonify({'error': 'Failed to render preview.'}), 500


@analysis_bp.route('/report/pdf', methods=['POST', 'GET'])
@login_required
def generate_pdf_report():
    data = request.get_json() if request.method == 'POST' else request.args.to_dict()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        from app.features.analysis.reporting import ReportOrchestrator
        patient_info = data.get('patient_info')
        pdf_content = ReportOrchestrator().generate_report(data, patient_info)
        if not pdf_content:
            return jsonify({'error': 'Failed to generate PDF report'}), 500
        return Response(
            pdf_content,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename=neurosense_report_{data.get("patient_info", {}).get("patient_id", "report")}.pdf'
            }
        )
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        return jsonify({'error': 'Failed to generate PDF report.'}), 500


@analysis_bp.route('/history', methods=['GET'])
@login_required
def get_analysis_history():
    user = get_current_user()
    session_repo = SessionRepository()

    if user and user.is_admin:
        analyses = session_repo.get_all()
    elif user:
        analyses = session_repo.get_for_doctor(user.id)
    else:
        analyses = []

    return jsonify({'history': analyses, 'analyses': analyses})
