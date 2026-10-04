import pytest
from app.ml.reporting.report_generator import ClinicalReportGenerator, generate_clinical_report
from app.features.analysis.reporting import ReportOrchestrator
from app.ml.explainability.explanation import ExplanationService

def test_generate_pdf_report_with_explanation_attribution():
    """Verify PDF report builds cleanly when feature_attribution is a dict from ExplanationService."""
    raw_results = {
        'mri': {
            'stage': 'Mild Demented',
            'confidence': 88.5,
            'probabilities': {'Non-Demented': 0.05, 'Very Mild Demented': 0.15, 'Mild Demented': 0.80}
        },
        'cognitive': {
            'composite_score': 62.0,
            'impairment_level': 'Moderate Impairment',
            'test_results': {
                'clock_drawing': {
                    'name': 'Clock Drawing Test',
                    'raw_score': 0,
                    'max_score': 1,
                    'percentage': 0.0,
                    'interpretation': 'Severe Impairment'
                }
            }
        },
        'speech': {
            'speech_fluency': 'Impaired',
            'dominant_emotion': 'Hesitant',
            'speaking_speed': '110 wpm',
            'pause_frequency': 'High'
        },
        'risk_profile': {
            'overall_risk_score': 58.0,
            'risk_category': 'Moderate Risk',
            'contributing_factors': ['Age > 65', 'Physical Inactivity']
        },
        'final_stage': {
            'stage': 'Mild Demented',
            'confidence': 85.0,
            'modality_contributions': {'mri': 45.0, 'cognitive': 35.0, 'speech': 10.0, 'risk_profile': 10.0}
        },
        'final_confidence': 85.0
    }
    
    # Generate ai_explanation using the actual ExplanationService
    explainer = ExplanationService()
    ai_explanation = explainer.generate_explanation(raw_results)
    raw_results['ai_explanation'] = ai_explanation
    
    patient_info = {
        'patient_id': 'PAT-TEST-PDF',
        'name': 'E2E Testing Subject',
        'age': 71,
        'gender': 'Female'
    }
    
    orchestrator = ReportOrchestrator()
    pdf_bytes = orchestrator.generate_report(raw_results, patient_info, format_type='pdf')
    
    assert pdf_bytes is not None
    assert len(pdf_bytes) > 1000
    assert pdf_bytes[:4] == b'%PDF'
