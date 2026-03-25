from typing import Dict, Any, Optional
from flask import request


class AnalyzeRequestSchema:
    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}
    ALLOWED_AUDIO_EXTENSIONS = {'wav', 'mp3', 'flac', 'webm', 'ogg'}
    
    @staticmethod
    def validate(req: request) -> Dict[str, Any]:
        result = {
            'patient': AnalyzeRequestSchema._extract_patient_info(req),
            'mri_image': None,
            'cognitive_tests': None,
            'handwriting': None,
            'speech': None,
            'risk_factors': None,
            'genomics': None,
        }
        
        if 'mri_image' in req.files:
            file = req.files['mri_image']
            if file.filename and AnalyzeRequestSchema._allowed_file(file.filename):
                result['mri_image'] = file
        
        patient_text = req.form.get('patient_text', '').strip()
        if patient_text:
            result['patient']['patient_text'] = patient_text
        
        cognitive_data = req.form.get('cognitive_tests', '').strip()
        if cognitive_data:
            import json
            try:
                result['cognitive_tests'] = json.loads(cognitive_data)
            except json.JSONDecodeError:
                pass
        
        risk_data = req.form.get('risk_factors', '').strip()
        if risk_data:
            import json
            try:
                result['risk_factors'] = json.loads(risk_data)
            except json.JSONDecodeError:
                pass
        
        if 'handwriting_image' in req.files:
            file = req.files['handwriting_image']
            if file.filename:
                result['handwriting'] = {'type': 'file', 'file': file}
        else:
            hw_canvas = req.form.get('handwriting_canvas', '').strip()
            if hw_canvas:
                result['handwriting'] = {'type': 'canvas', 'data': hw_canvas}
        
        if 'audio_file' in req.files:
            file = req.files['audio_file']
            if file.filename and AnalyzeRequestSchema._allowed_audio(file.filename):
                result['speech'] = {'type': 'file', 'file': file}
        else:
            audio_text = req.form.get('audio_text', '').strip()
            if audio_text:
                result['speech'] = {'type': 'text', 'text': audio_text}
        
        if 'dna_file' in req.files:
            file = req.files['dna_file']
            result['genomics'] = {'type': 'file', 'file': file}
        else:
            dna_text = req.form.get('dna_text', '').strip()
            if dna_text:
                result['genomics'] = {'type': 'text', 'text': dna_text}
        
        return result
    
    @staticmethod
    def _extract_patient_info(req: request) -> Dict[str, Any]:
        patient = {}
        for field in ('name', 'age', 'sex', 'patient_id', 'education_years'):
            val = req.form.get(field, '').strip()
            if val:
                if field in ('age', 'education_years') and val.isdigit():
                    patient[field] = int(val)
                else:
                    patient[field] = val
        return patient
    
    @staticmethod
    def _allowed_file(filename: str) -> bool:
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in AnalyzeRequestSchema.ALLOWED_IMAGE_EXTENSIONS
    
    @staticmethod
    def _allowed_audio(filename: str) -> bool:
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in AnalyzeRequestSchema.ALLOWED_AUDIO_EXTENSIONS


class SentimentSchema:
    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, str]:
        text = data.get('text', '').strip()
        if not text:
            raise ValueError({'text': 'Text is required for sentiment analysis'})
        return {'text': text}


class CognitiveTestSchema:
    EXPECTED_FIELDS = {'mini_cog', 'serial_7s', 'category_fluency', 'digit_span', 'orientation'}
    
    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, int]:
        if not data:
            raise ValueError({'data': 'Cognitive test data is required'})
        
        result = {}
        for key, value in data.items():
            if key in CognitiveTestSchema.EXPECTED_FIELDS:
                try:
                    result[key] = int(value)
                except (ValueError, TypeError):
                    raise ValueError({key: f'{key} must be a number'})
        
        return result


class RiskProfileSchema:
    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        if not data:
            raise ValueError({'data': 'Risk factor data is required'})
        return data
