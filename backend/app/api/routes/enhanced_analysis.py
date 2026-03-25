"""
Enhanced Analysis Routes for new modules.
"""
from flask import Blueprint, request, jsonify, send_file
import logging

logger = logging.getLogger(__name__)

enhanced_bp = Blueprint('enhanced_analysis', __name__, url_prefix='/api/analysis')


@enhanced_bp.route('/biomarkers', methods=['POST'])
def analyze_biomarkers():
    """
    Analyze blood biomarkers for AD risk assessment.
    
    Request body:
    {
        "results": {
            "amyloid_beta_42": 350,
            "total_tau": 450,
            "phosphorylated_tau_181": 85,
            ...
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'results' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing results in request body'
            }), 400
        
        from app.modules.analysis.blood_biomarkers import BloodBiomarkerAnalyzer
        
        analyzer = BloodBiomarkerAnalyzer()
        results = analyzer.analyze(data['results'])
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Biomarker analysis failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@enhanced_bp.route('/neuropsychological', methods=['POST'])
def assess_neuropsychological():
    """
    Run complete neuropsychological battery (MMSE, MoCA, CDR).
    
    Request body:
    {
        "mmse": {"orientation": 8, "registration": 3, ...},
        "moca": {"visuospatial": 3, "executive": 2, ...},
        "cdr": {"memory": 1, "orientation": 1, ...}
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Missing assessment data'
            }), 400
        
        from app.modules.analysis.neuropsychological import NeuropsychologicalBattery
        
        battery = NeuropsychologicalBattery()
        results = battery.run_complete_battery(data)
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Neuropsychological assessment failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@enhanced_bp.route('/mmse', methods=['POST'])
def assess_mmse():
    """Run MMSE assessment only."""
    try:
        data = request.get_json()
        
        from app.modules.analysis.neuropsychological import MMSEAssessor
        
        assessor = MMSEAssessor()
        results = assessor.assess(data or {})
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"MMSE assessment failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@enhanced_bp.route('/moca', methods=['POST'])
def assess_moca():
    """Run MoCA assessment only."""
    try:
        data = request.get_json()
        
        from app.modules.analysis.neuropsychological import MoCAAssessor
        
        assessor = MoCAAssessor()
        results = assessor.assess(data or {})
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"MoCA assessment failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@enhanced_bp.route('/cdr', methods=['POST'])
def assess_cdr():
    """Run CDR assessment only."""
    try:
        data = request.get_json()
        
        from app.modules.analysis.neuropsychological import CDRAssessor
        
        assessor = CDRAssessor()
        results = assessor.assess(data or {})
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"CDR assessment failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@enhanced_bp.route('/clinical-decision-support', methods=['POST'])
def clinical_decision_support():
    """
    Generate clinical decision support recommendations.
    
    Request body:
    {
        "stage": 1,
        "age": 72,
        "mmse_score": 24,
        "comorbidities": ["diabetes", "hypertension"],
        "biomarkers": {...},
        "current_medications": [...]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'stage' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: stage'
            }), 400
        
        from app.modules.clinical.cds_system import get_clinical_decision_support
        
        results = get_clinical_decision_support(data)
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Clinical decision support failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@enhanced_bp.route('/treatment-recommendations', methods=['POST'])
def get_treatment_recommendations():
    """
    Get treatment recommendations based on patient profile.
    
    Request body:
    {
        "stage": 2,
        "age": 70,
        "comorbidities": [...],
        "contraindications": [...]
    }
    """
    try:
        data = request.get_json()
        
        from app.modules.clinical.cds_system import TreatmentRecommender
        
        recommender = TreatmentRecommender()
        results = recommender.recommend_treatments(
            stage=data.get('stage', 1),
            age=data.get('age', 70),
            comorbidities=data.get('comorbidities', []),
            contraindications=data.get('contraindications', [])
        )
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Treatment recommendations failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@enhanced_bp.route('/prognosis', methods=['POST'])
def get_prognosis():
    """
    Estimate disease prognosis and progression.
    
    Request body:
    {
        "current_stage": 1,
        "age": 68,
        "biomarkers": {...},
        "comorbidities": [...]
    }
    """
    try:
        data = request.get_json()
        
        from app.modules.clinical.cds_system import PrognosisEstimator
        
        estimator = PrognosisEstimator()
        results = estimator.estimate_progression(
            current_stage=data.get('current_stage', 1),
            age=data.get('age', 70),
            biomarkers=data.get('biomarkers'),
            comorbidities=data.get('comorbidities', [])
        )
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Prognosis estimation failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@enhanced_bp.route('/clinical-trials', methods=['POST'])
def find_clinical_trials():
    """
    Find matching clinical trials for patient.
    
    Request body:
    {
        "age": 68,
        "stage": 1,
        "biomarkers": {...},
        "medications": [...]
    }
    """
    try:
        data = request.get_json()
        
        from app.modules.clinical.cds_system import ClinicalTrialMatcher
        
        matcher = ClinicalTrialMatcher()
        results = matcher.find_eligible_trials(
            age=data.get('age', 70),
            stage=data.get('stage', 1),
            biomarkers=data.get('biomarkers'),
            medications=data.get('medications', [])
        )
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Clinical trial matching failed: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@enhanced_bp.route('/explain', methods=['POST'])
def explain_prediction():
    """
    Generate explanation for a prediction using SHAP/LIME.
    
    Request body:
    {
        "features": [...],
        "feature_names": [...],
        "methods": ["shap", "lime"]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'features' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing features in request'
            }), 400
        
        import numpy as np
        from app.modules.explainability.shap_explainer import ModelExplainer
        
        features = np.array(data['features'])
        feature_names = data.get('feature_names', None)
        methods = data.get('methods', ['shap'])
        
        explainer = ModelExplainer()
        results = explainer.explain(
            model=None,
            X=features,
            feature_names=feature_names,
            methods=methods
        )
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Explanation generation failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@enhanced_bp.route('/report', methods=['POST'])
def generate_report():
    """
    Generate clinical report (PDF or HTML).
    
    Request body:
    {
        "analysis_results": {...},
        "patient_info": {...},
        "format": "html" or "pdf"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Missing report data'
            }), 400
        
        from app.modules.reporting.report_generator import generate_clinical_report
        
        report_format = data.get('format', 'html')
        report = generate_clinical_report(
            analysis_results=data.get('analysis_results', {}),
            patient_info=data.get('patient_info', {}),
            format=report_format
        )
        
        if report_format == 'pdf':
            return send_file(
                report,
                mimetype='application/pdf',
                as_attachment=True,
                download_name='clinical_report.pdf'
            )
        else:
            return report, 200, {'Content-Type': 'text/html'}
        
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@enhanced_bp.route('/quality-report', methods=['GET'])
def get_quality_report():
    """
    Get model quality and monitoring report.
    """
    try:
        from app.modules.quality.qa_monitor import get_quality_report
        
        results = get_quality_report()
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Quality report failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@enhanced_bp.route('/log-feedback', methods=['POST'])
def log_human_feedback():
    """
    Log human feedback for prediction.
    
    Request body:
    {
        "prediction_idx": 123,
        "human_outcome": 1
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Missing feedback data'
            }), 400
        
        from app.modules.quality.qa_monitor import log_human_feedback
        
        log_human_feedback(
            prediction_idx=data['prediction_idx'],
            human_outcome=data['human_outcome']
        )
        
        return jsonify({
            'success': True,
            'message': 'Feedback logged successfully'
        })
        
    except Exception as e:
        logger.error(f"Feedback logging failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@enhanced_bp.route('/comprehensive', methods=['POST'])
def run_comprehensive_analysis():
    """
    Run comprehensive multimodal analysis including all new modules.
    
    Request body:
    {
        "patient_info": {...},
        "mri_results": {...},
        "cognitive_results": {...},
        "biomarkers": {...},
        "speech_analysis": {...},
        "handwriting_analysis": {...}
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'patient_info' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing patient_info'
            }), 400
        
        from app.modules.clinical.cds_system import get_clinical_decision_support
        from app.modules.analysis.blood_biomarkers import analyze_blood_biomarkers
        from app.modules.analysis.neuropsychological import assess_neuropsychological
        from app.modules.quality.qa_monitor import log_prediction
        
        patient = data['patient_info']
        
        comprehensive_results = {
            'patient_summary': {
                'name': patient.get('name'),
                'age': patient.get('age'),
                'assessment_date': data.get('assessment_date'),
            },
            'cognitive_assessment': data.get('cognitive_results', {}),
            'mri_results': data.get('mri_results', {}),
            'biomarkers': analyze_blood_biomarkers(data.get('biomarkers', {})) if data.get('biomarkers') else None,
            'neuropsychological': assess_neuropsychological(data.get('neuropsychological', {})),
            'clinical_support': get_clinical_decision_support({
                'stage': data.get('mri_results', {}).get('stage_index', 1),
                'age': patient.get('age', 70),
                'mmse_score': data.get('cognitive_results', {}).get('mmse', {}).get('score', 24),
                'biomarkers': data.get('biomarkers'),
            }),
        }
        
        if data.get('prediction_features'):
            log_prediction(
                features=data['prediction_features'],
                prediction=data.get('mri_results', {}).get('stage_index', 1),
                confidence=data.get('mri_results', {}).get('confidence', 0.8) / 100
            )
        
        return jsonify({
            'success': True,
            'results': comprehensive_results
        })
        
    except Exception as e:
        logger.error(f"Comprehensive analysis failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
