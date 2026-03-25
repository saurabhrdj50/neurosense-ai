from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

from app.services.analysis_service import AnalysisOrchestrator
from app.api.schemas import SentimentSchema, CognitiveTestSchema, RiskProfileSchema

analysis_bp = Blueprint('analysis', __name__, url_prefix='/api/analysis')

_orchestrator = AnalysisOrchestrator()


def _allowed_file(fn):
    if not fn:
        return False
    return '.' in fn and fn.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}


def _allowed_audio(fn):
    if not fn:
        return False
    return '.' in fn and fn.rsplit('.', 1)[1].lower() in {'wav', 'mp3', 'flac', 'webm', 'ogg'}


@analysis_bp.route('/analyze', methods=['POST'])
def analyze():
    results = {}
    
    patient_info = {}
    for field in ('name', 'age', 'sex', 'patient_id', 'education_years'):
        val = request.form.get(field, '').strip()
        if val:
            patient_info[field] = int(val) if field in ('age', 'education_years') and val.isdigit() else val
    results['patient_info'] = patient_info
    
    mri_file = request.files.get('mri_image')
    if mri_file and mri_file.filename and _allowed_file(mri_file.filename):
        fn = secure_filename(mri_file.filename)
        gradcam = request.form.get('gradcam', 'true').lower() == 'true'
        try:
            results['mri'] = _orchestrator.analyze_mri(mri_file, gradcam=gradcam)
        except Exception as e:
            results['mri_error'] = str(e)
    
    patient_text = request.form.get('patient_text', '').strip()
    if patient_text:
        try:
            results['sentiment'] = _orchestrator.analyze_sentiment(patient_text)
        except Exception as e:
            results['sentiment_error'] = str(e)
    
    frames_json = request.form.get('webcam_frames', '[]').strip()
    if frames_json and frames_json != '[]':
        try:
            import json
            visual_frames = json.loads(frames_json)
            if visual_frames:
                results['visual_emotion'] = _orchestrator.analyze_facial(visual_frames)
        except Exception as e:
            results['facial_error'] = str(e)
    
    audio_file = request.files.get('audio_file')
    if audio_file and audio_file.filename and _allowed_audio(audio_file.filename):
        try:
            transcription = _orchestrator.transcribe_audio(audio_file)
            results['audio_transcription'] = transcription
            if transcription.get('text'):
                results['audio_sentiment'] = _orchestrator.analyze_sentiment(transcription['text'])
        except Exception as e:
            results['audio_error'] = str(e)
    else:
        audio_text = request.form.get('audio_text', '').strip()
        if audio_text:
            try:
                results['audio_sentiment'] = _orchestrator.analyze_sentiment(audio_text)
                results['audio_transcription'] = {'text': audio_text, 'method': 'web_speech_api', 'confidence': 90}
            except Exception as e:
                results['audio_error'] = str(e)
    
    hw_file = request.files.get('handwriting_image')
    if hw_file and hw_file.filename:
        try:
            results['handwriting'] = _orchestrator.analyze_handwriting(file=hw_file)
        except Exception as e:
            results['handwriting_error'] = str(e)
    else:
        hw_canvas = request.form.get('handwriting_canvas', '').strip()
        if hw_canvas:
            try:
                if ',' in hw_canvas:
                    hw_canvas = hw_canvas.split(',', 1)[1]
                results['handwriting'] = _orchestrator.analyze_handwriting(canvas_data=hw_canvas)
            except Exception as e:
                results['handwriting_error'] = str(e)
    
    cog_data = request.form.get('cognitive_tests', '').strip()
    if cog_data:
        try:
            import json
            cognitive_result = _orchestrator.evaluate_cognitive(json.loads(cog_data))
            results['cognitive'] = cognitive_result
        except Exception as e:
            results['cognitive_error'] = str(e)
    
    risk_data = request.form.get('risk_factors', '').strip()
    if risk_data:
        try:
            import json
            results['risk_profile'] = _orchestrator.assess_risk(json.loads(risk_data))
        except Exception as e:
            results['risk_error'] = str(e)
    
    if any([
        results.get('mri'), results.get('sentiment'), results.get('cognitive'),
        results.get('risk_profile'), results.get('handwriting'),
        results.get('audio_sentiment'), results.get('visual_emotion')
    ]):
        try:
            results['final_stage'] = _orchestrator.fuse_results(
                mri_result=results.get('mri'),
                sentiment_result=results.get('sentiment'),
                cognitive_result=results.get('cognitive'),
                risk_result=results.get('risk_profile'),
                handwriting_result=results.get('handwriting'),
                audio_result=results.get('audio_sentiment'),
                visual_result=results.get('visual_emotion'),
            )
        except Exception as e:
            results['fusion_error'] = str(e)
    
    stage = results.get('final_stage', {}).get('stage') or results.get('mri', {}).get('stage') or 'Mild Demented'
    emotion = results.get('sentiment', {}).get('dominant_emotion', 'neutral')
    results['music'] = _orchestrator.get_music_recommendation(stage, emotion)
    
    pid = patient_info.get('patient_id', '')
    if pid:
        try:
            sid = _orchestrator.save_session(pid, results, patient_info.get('name', 'Anonymous'))
            results['session_id'] = sid
        except Exception as e:
            results['history_error'] = str(e)
    
    return jsonify(results)


@analysis_bp.route('/mri', methods=['POST'])
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
def analyze_sentiment():
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
def cognitive_test():
    data = request.get_json()
    
    try:
        validated = CognitiveTestSchema.validate(data or {})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    try:
        return jsonify(_orchestrator.evaluate_cognitive(validated))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analysis_bp.route('/risk', methods=['POST'])
def risk_profile():
    data = request.get_json()
    
    try:
        validated = RiskProfileSchema.validate(data or {})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    try:
        return jsonify(_orchestrator.assess_risk(validated))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analysis_bp.route('/handwriting', methods=['POST'])
def analyze_handwriting():
    if 'image' in request.files:
        file = request.files['image']
        if file.filename:
            try:
                return jsonify(_orchestrator.analyze_handwriting(file=file))
            except Exception as e:
                return jsonify({'error': str(e)}), 500
    
    data = request.get_json() or {}
    if data.get('canvas_data'):
        canvas = data['canvas_data']
        if ',' in canvas:
            canvas = canvas.split(',', 1)[1]
        try:
            return jsonify(_orchestrator.analyze_handwriting(canvas_data=canvas))
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'No handwriting data provided'}), 400


@analysis_bp.route('/genomics', methods=['POST'])
def analyze_genomics():
    text_data = ""
    
    if 'dna_file' in request.files:
        file = request.files['dna_file']
        if file.filename:
            text_data = file.read().decode('utf-8', errors='ignore')
    elif 'dna_text' in request.form:
        text_data = request.form['dna_text']
    elif request.is_json:
        text_data = request.get_json().get('dna_text', '')
    
    if not text_data.strip():
        return jsonify({'success': False, 'error': 'No DNA data provided'})
    
    try:
        return jsonify(_orchestrator.analyze_genomics(text_data))
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@analysis_bp.route('/transcribe', methods=['POST'])
def transcribe_audio():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file uploaded'}), 400
    
    file = request.files['audio']
    if not file.filename:
        return jsonify({'error': 'No filename provided'}), 400
    
    try:
        return jsonify(_orchestrator.transcribe_audio(file))
    except Exception as e:
        return jsonify({'error': str(e)}), 500
