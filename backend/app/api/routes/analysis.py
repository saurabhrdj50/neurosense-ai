import logging
import json
import io
from flask import Blueprint, request, jsonify, Response
from werkzeug.utils import secure_filename

from app.services.analysis_service import AnalysisOrchestrator
from app.api.schemas import SentimentSchema, CognitiveTestSchema, RiskProfileSchema
from app.core.security import login_required, get_current_user
from app.repositories.session_repository import SessionRepository

logger = logging.getLogger(__name__)

analysis_bp = Blueprint('analysis', __name__, url_prefix='/api/analysis')

_orchestrator = AnalysisOrchestrator()


def _allowed_file(fn):
    if not fn:
        return False
    fn_lower = fn.lower()
    if fn_lower.endswith('.nii.gz'):
        return True
    return '.' in fn and fn_lower.rsplit('.', 1)[1] in {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'dcm', 'nii'}


def _allowed_audio(fn):
    if not fn:
        return False
    return '.' in fn and fn.rsplit('.', 1)[1].lower() in {'wav', 'mp3', 'flac', 'webm', 'ogg'}


@analysis_bp.route('/analyze', methods=['POST'])
@login_required
def analyze():
    from app.core.security import get_current_user_id
    current_user_id = get_current_user_id()

    results = {}
    
    patient_info = {}
    for field in ('name', 'age', 'sex', 'patient_id', 'education_years', 'handedness', 'ethnicity', 'onset_duration', 'progression_rate'):
        val = request.form.get(field, '').strip()
        if val:
            patient_info[field] = int(val) if field in ('age', 'education_years') and val.isdigit() else val
    
    pid = patient_info.get('patient_id', '')
    
    safety_flags_json = request.form.get('safety_flags', '').strip()
    if safety_flags_json:
        try:
            patient_info['safety_flags'] = json.loads(safety_flags_json)
        except Exception:
            patient_info['safety_flags'] = [f.strip() for f in safety_flags_json.split(',') if f.strip()]

    photo_data = request.form.get('photo', '').strip()
    if photo_data and photo_data.startswith('data:image'):
        patient_info['photo'] = photo_data
    
    patient_notes = request.form.get('patient_text', '').strip()
    if patient_notes:
        patient_info['notes'] = patient_notes
    
    results['patient_info'] = patient_info
    
    # --- 1. MRI ---
    mri_file = request.files.get('mri_image')
    if mri_file and mri_file.filename and _allowed_file(mri_file.filename):
        fn = secure_filename(mri_file.filename)
        gradcam = request.form.get('gradcam', 'true').lower() == 'true'
        if pid:
            try:
                from app.services.storage_manager import StorageManager
                mri_file.stream.seek(0)
                saved_rel_path = StorageManager.persist_raw_file(current_user_id, pid, mri_file, 'mri', mri_file.filename)
                mri_file.stream.seek(0)
                results['mri_saved_path'] = saved_rel_path
            except Exception as e:
                logger.error("Failed to persist raw MRI file: %s", e)
        try:
            results['mri'] = _orchestrator.analyze_mri(mri_file, gradcam=gradcam)
        except Exception as e:
            results['mri_error'] = str(e)
    
    # --- 2. Clinical Notes NLP (Supplementary, NOT replacing Speech) ---
    patient_text = request.form.get('patient_text', '').strip()
    if patient_text:
        try:
            results['clinical_notes_nlp'] = _orchestrator.analyze_sentiment(patient_text)
        except Exception as e:
            results['clinical_notes_error'] = str(e)
    
    # --- 3. Speech / Audio ---
    audio_file = request.files.get('audio_file')
    audio_text = request.form.get('audio_text', '').strip()
    
    transcription = None
    if audio_file and audio_file.filename and _allowed_audio(audio_file.filename):
        if pid:
            try:
                from app.services.storage_manager import StorageManager
                audio_file.stream.seek(0)
                saved_rel_path = StorageManager.persist_raw_file(current_user_id, pid, audio_file, 'audio', audio_file.filename)
                audio_file.stream.seek(0)
                results['audio_saved_path'] = saved_rel_path
            except Exception as e:
                logger.error("Failed to persist raw audio file: %s", e)
        try:
            transcription = _orchestrator.transcribe_audio(audio_file)
            results['audio_transcription'] = transcription
        except Exception as e:
            results['audio_error'] = str(e)
    elif audio_text:
        # We don't have a file, just text, so we can't extract real acoustic features
        transcription = {
            'text': audio_text,
            'speech_rate_wpm': None,
            'acoustic_features': {},
            'linguistic_biomarkers': {}
        }
        results['audio_transcription'] = transcription

    if transcription:
        # Map speech pipeline directly to frontend's expected 'sentiment' object
        # without double-counting it through NLP SentimentAnalyzer
        ac = transcription.get('acoustic_features', {})
        ling = transcription.get('linguistic_biomarkers', {})
        
        sem_coh = ling.get('semantic_coherence')
        
        results['sentiment'] = {
            'dominant_emotion': 'Neutral', # No facial/emotion tracking currently
            'cognitive_risk_score': None, # Removed arbitrary heuristic
            'semantic_coherence': f"{int(sem_coh*100)}%" if sem_coh is not None else None,
            'speech_fluency': ac.get('speech_rate'),
            'word_finding': f"{ling.get('filler_word_count', 0)} fillers",
            'speaking_speed': f"{transcription.get('speech_rate_wpm')} WPM" if transcription.get('speech_rate_wpm') else None,
            'pause_frequency': ac.get('pause_frequency'),
            'topic_focus': None, # Unreliable to extract without specific prompt tracking
            'story_recall': None, # Unreliable without explicit story task
            'clinical_summary': 'Speech transcribed and acoustic features extracted.' if transcription.get('speech_rate_wpm') else 'Manual text transcript provided without audio.'
        }
    
    # --- 4. Cognitive ---
    cog_data = request.form.get('cognitive_tests', '').strip()
    if cog_data:
        try:
            cognitive_result = _orchestrator.evaluate_cognitive(json.loads(cog_data))
            results['cognitive'] = cognitive_result
        except Exception as e:
            results['cognitive_error'] = str(e)
    
    # --- 5. Risk ---
    risk_data = request.form.get('risk_factors', '').strip()
    if risk_data:
        try:
            results['risk_profile'] = _orchestrator.assess_risk(json.loads(risk_data))
        except Exception as e:
            results['risk_error'] = str(e)
    
    # --- 6. Fusion ---
    if any([
        results.get('mri'), results.get('cognitive'), results.get('risk_profile'),
        results.get('sentiment')
    ]):
        try:
            results['final_stage'] = _orchestrator.fuse_results(
                mri_result=results.get('mri'),
                sentiment_result=results.get('sentiment'),
                cognitive_result=results.get('cognitive'),
                risk_result=results.get('risk_profile'),
                audio_result=None, # Speech is already handled in sentiment
            )
        except Exception as e:
            results['fusion_error'] = str(e)
    
    # Music / CDS
    stage = results.get('final_stage', {}).get('stage') or results.get('mri', {}).get('stage')
    emotion = results.get('sentiment', {}).get('dominant_emotion', 'neutral')
    if stage:
        results['music'] = _orchestrator.get_music_recommendation(stage, emotion)
        results['clinical_decision_support'] = _orchestrator.get_cds_recommendations(
            stage=stage,
            patient_info=patient_info,
            risk_factors=results.get('risk_profile', {})
        )
    else:
        results['music'] = {
            'recommendations': [],
            'message': 'Music recommendations require at least one valid stage prediction.',
        }
    
    # AI Explanation & Recs
    try:
        from app.services.explanation_service import generate_explanation
        results['ai_explanation'] = generate_explanation(results)
    except Exception as e:
        results['explanation_error'] = str(e)
    
    try:
        from app.services.recommendation_service import generate_recommendations
        results['recommendations'] = generate_recommendations(results)
    except Exception as e:
        results['recommendations_error'] = str(e)
    
    # DB Save
    if pid and patient_info.get('name'):
        try:
            from app.repositories.patient_repository import PatientRepository
            patient_repo = PatientRepository()
            existing = patient_repo.get_by_patient_id(pid)
            
            if existing:
                patient_repo.update(
                    patient_id=pid,
                    name=patient_info.get('name', existing.get('name')),
                    age=patient_info.get('age'),
                    sex=patient_info.get('sex'),
                    education_years=patient_info.get('education_years'),
                    stage=results.get('final_stage', {}).get('stage') or results.get('mri', {}).get('stage'),
                    notes=patient_info.get('notes', ''),
                    photo=patient_info.get('photo'),
                )
                logger.info(f"Updated patient {pid}")
            else:
                result = patient_repo.create(
                    patient_id=pid,
                    name=patient_info.get('name', 'Anonymous'),
                    age=patient_info.get('age'),
                    sex=patient_info.get('sex'),
                    education_years=patient_info.get('education_years'),
                    notes=patient_info.get('notes', ''),
                    created_by=current_user_id,
                    photo=patient_info.get('photo'),
                    stage=results.get('final_stage', {}).get('stage') or results.get('mri', {}).get('stage'),
                )
                if result.get('success'):
                    logger.info(f"Created new patient {pid}")
        except Exception as e:
            logger.warning(f"Could not save patient: {e}")
        
        if pid:
            try:
                sid = _orchestrator.save_session(pid, results, patient_info.get('name', 'Anonymous'), created_by=current_user_id)
                results['session_id'] = sid
                
                try:
                    from app.services.report_service import ReportOrchestrator
                    report_orc = ReportOrchestrator()
                    pdf_bytes = report_orc.generate_report(results, patient_info)
                    if pdf_bytes:
                        from app.services.storage_manager import StorageManager
                        doc_name = None
                        from app.repositories.user_repository import UserRepository
                        user = UserRepository().get_by_id(current_user_id)
                        if user:
                            doc_name = user.username
                        
                        saved_path = StorageManager.save_patient_pdf(
                            doctor_id=current_user_id,
                            patient_id=pid,
                            pdf_bytes=pdf_bytes,
                            filename=f"report_{sid}.pdf",
                            doctor_name=doc_name,
                            patient_name=patient_info.get('name'),
                            session_id=sid
                        )
                        results['pdf_report_path'] = saved_path
                        logger.info(f"Auto-saved session report PDF to {saved_path}")
                except Exception as ex:
                    logger.error(f"Failed to auto-save report PDF for session {sid}: {ex}")
            except Exception as e:
                results['history_error'] = str(e)
    
    return jsonify(results)


@analysis_bp.route('/mri/preview', methods=['POST'])
@login_required
def mri_preview():
    """Render a displayable PNG preview slice from an uploaded MRI volume."""
    if 'mri_image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['mri_image']
    if not file.filename or not _allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400

    try:
        temp_path = _orchestrator._save_temp_file(file)
        try:
            from app.modules.mri.nifti import render_volume_preview
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
        return jsonify({'error': f'Failed to render preview: {str(e)}'}), 500


@analysis_bp.route('/mri', methods=['POST'])
@login_required
def predict_mri():
    if 'mri_image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['mri_image']
    if not file.filename or not _allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400
    
    gradcam = request.form.get('gradcam', 'false').lower() == 'true'
    
    try:
        result = _orchestrator.analyze_mri(file, gradcam=gradcam)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analysis_bp.route('/sentiment', methods=['POST'])
@login_required
def analyze_sentiment():
    """Deprecated: NLP sentiment on text. Replaced by speech biomarker pipeline."""
    data = request.get_json()
    try:
        validated = SentimentSchema.validate(data or {})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    try:
        return jsonify(_orchestrator.analyze_sentiment(validated['text']))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analysis_bp.route('/cognitive', methods=['POST'])
@login_required
def cognitive_test():
    """Deprecated: duplicate endpoint – kept for backwards compatibility."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No cognitive test data provided.'}), 400
    try:
        return jsonify(_orchestrator.evaluate_cognitive(data))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analysis_bp.route('/risk', methods=['POST'])
@login_required
def risk_profile():
    """Deprecated: duplicate endpoint – kept for backwards compatibility."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No risk factor data provided.'}), 400
    try:
        return jsonify(_orchestrator.assess_risk(data))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analysis_bp.route('/transcribe', methods=['POST'])
@login_required
def transcribe_audio():
    """Deprecated: duplicate endpoint"""
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file uploaded'}), 400
    file = request.files['audio']
    if not file.filename:
        return jsonify({'error': 'No filename provided'}), 400
    try:
        return jsonify(_orchestrator.transcribe_audio(file))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analysis_bp.route('/report/pdf', methods=['POST', 'GET'])
@login_required
def generate_pdf_report():
    data = request.get_json() if request.method == 'POST' else request.args.to_dict()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    try:
        from app.services.report_service import ReportOrchestrator
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
        return jsonify({'error': f'Failed to generate PDF: {str(e)}'}), 500


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
