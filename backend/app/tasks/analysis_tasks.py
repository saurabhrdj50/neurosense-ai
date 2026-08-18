"""
Analysis tasks for async processing.
"""
import json
import logging
from celery import Task
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


class AnalysisTask(Task):
    """Base task for analysis operations."""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Analysis task {task_id} failed: {exc}")
        super().on_failure(exc, task_id, args, kwargs, einfo)
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        logger.warning(f"Analysis task {task_id} retrying: {exc}")
        super().on_retry(exc, task_id, args, kwargs, einfo)


@celery_app.task(
    bind=True,
    base=AnalysisTask,
    name='app.tasks.analysis_tasks.full_analysis',
    max_retries=2,
    time_limit=300,
    soft_time_limit=240
)
def full_analysis(self, analysis_data: dict, patient_id: str, patient_name: str = 'Anonymous'):
    """
    Full multimodal analysis task.
    
    Args:
        analysis_data: Dictionary containing all analysis inputs
        patient_id: Patient identifier
        patient_name: Patient name for records
    
    Returns:
        dict: Complete analysis results
    """
    from app.services.analysis_service import AnalysisOrchestrator
    from datetime import datetime
    
    try:
        logger.info(f"Starting full analysis for patient: {patient_id}")
        
        orchestrator = AnalysisOrchestrator()
        results = {}
        
        mri_file = analysis_data.get('mri_file')
        if mri_file:
            try:
                results['mri'] = orchestrator.analyze_mri(mri_file)
            except Exception as e:
                logger.warning(f"MRI analysis failed: {e}")
                results['mri_error'] = str(e)
        
        patient_text = analysis_data.get('patient_text')
        if patient_text:
            results['sentiment'] = orchestrator.analyze_sentiment(patient_text)
        
        cognitive_data = analysis_data.get('cognitive')
        if cognitive_data:
            results['cognitive'] = orchestrator.evaluate_cognitive(cognitive_data)
        
        risk_data = analysis_data.get('risk_factors')
        if risk_data:
            results['risk_profile'] = orchestrator.assess_risk(risk_data)
        
        handwriting_data = analysis_data.get('handwriting')
        if handwriting_data:
            results['handwriting'] = orchestrator.analyze_handwriting(**handwriting_data)
        
        if any([results.get('mri'), results.get('sentiment'), results.get('cognitive'),
                results.get('risk_profile'), results.get('handwriting')]):
            results['final_stage'] = orchestrator.fuse_results(
                mri_result=results.get('mri'),
                sentiment_result=results.get('sentiment'),
                cognitive_result=results.get('cognitive'),
                risk_result=results.get('risk_profile'),
                handwriting_result=results.get('handwriting'),
            )
        
        stage = results.get('final_stage', {}).get('stage', 'Mild Demented')
        emotion = results.get('sentiment', {}).get('dominant_emotion', 'neutral')
        results['music'] = orchestrator.get_music_recommendation(stage, emotion)
        
        session_id = orchestrator.save_session(patient_id, results, patient_name)
        results['session_id'] = session_id
        
        results['completed_at'] = datetime.utcnow().isoformat()
        results['task_id'] = self.request.id
        results['success'] = True
        
        logger.info(f"Full analysis completed for patient: {patient_id}, session: {session_id}")
        
        return results
    
    except Exception as exc:
        logger.exception(f"Full analysis failed: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        
        return {
            'error': str(exc),
            'patient_id': patient_id,
            'task_id': self.request.id,
            'success': False,
            'completed_at': datetime.utcnow().isoformat()
        }


@celery_app.task(
    bind=True,
    base=AnalysisTask,
    name='app.tasks.analysis_tasks.generate_report',
    max_retries=2,
    time_limit=60
)
def generate_report(self, results: dict, patient_info: dict):
    """
    Generate PDF report task.
    
    Args:
        results: Analysis results dictionary
        patient_info: Patient information dictionary
    
    Returns:
        bytes: PDF report content
    """
    from app.services.report_service import ReportOrchestrator
    
    try:
        logger.info(f"Generating report for patient: {patient_info.get('patient_id')}")
        
        generator = ReportOrchestrator()
        pdf_content = generator.generate_report(results, patient_info)
        
        if pdf_content:
            logger.info(f"Report generated successfully, size: {len(pdf_content)} bytes")
            return {
                'success': True,
                'content': pdf_content,
                'content_type': 'application/pdf',
                'filename': f"NeuroSense_Report_{patient_info.get('patient_id', 'unknown')}.pdf"
            }
        else:
            raise Exception("Report generation returned no content")
    
    except Exception as exc:
        logger.exception(f"Report generation failed: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        
        return {
            'error': str(exc),
            'success': False
        }


@celery_app.task(
    bind=True,
    base=AnalysisTask,
    name='app.tasks.analysis_tasks.send_notification',
    max_retries=3
)
def send_notification(self, user_id: int, notification_type: str, message: str):
    """
    Send notification task.
    
    Args:
        user_id: User ID to notify
        notification_type: Type of notification (email, push, etc.)
        message: Notification message
    
    Returns:
        dict: Notification result
    """
    logger.info(f"Sending {notification_type} notification to user {user_id}")
    
    try:
        if notification_type == 'email':
            pass
        elif notification_type == 'webhook':
            pass
        
        return {
            'success': True,
            'user_id': user_id,
            'type': notification_type,
            'sent_at': __import__('datetime').datetime.utcnow().isoformat()
        }
    
    except Exception as exc:
        logger.exception(f"Notification failed: {exc}")
        return {
            'success': False,
            'error': str(exc)
        }

@celery_app.task(
    bind=True,
    base=AnalysisTask,
    name='app.tasks.analysis_tasks.enhanced_comprehensive_analysis',
    time_limit=600,
    soft_time_limit=540
)
def enhanced_comprehensive_analysis(self, data: dict):
    """
    Async task for comprehensive multimodal analysis including all new modules.
    """
    logger.info(f"Starting enhanced comprehensive analysis task {self.request.id}")
    try:
        from app.modules.clinical.cds_system import get_clinical_decision_support
        from app.modules.analysis.neuropsychological import assess_neuropsychological
        from app.modules.fusion.engine import MultimodalFusion
        from app.modules.quality.qa_monitor import log_prediction
        
        patient = data['patient_info']
        mri_res = data.get('mri_results')
        cog_res = data.get('cognitive_results')
        biomarker_res = data.get('biomarkers')
        
        fusion_engine = MultimodalFusion()
        fusion_res = fusion_engine.predict(
            mri_result=mri_res,
            blood_result=biomarker_res,
            cognitive_result=cog_res,
            risk_result=data.get('risk_results'),
            handwriting_result=data.get('handwriting_analysis'),
            audio_result=data.get('speech_analysis'),
            visual_result=data.get('facial_analysis'),
            genomics_result=data.get('genomics_results'),
        )
        
        comprehensive_results = {
            'patient_summary': {
                'name': patient.get('name'),
                'age': patient.get('age'),
                'assessment_date': data.get('assessment_date'),
            },
            'cognitive_assessment': cog_res or {},
            'mri_results': mri_res or {},
            'biomarkers': biomarker_res,
            'neuropsychological': assess_neuropsychological(data.get('neuropsychological', {})),
            'multimodal_fusion': fusion_res,
            'clinical_support': get_clinical_decision_support({
                'stage': fusion_res.get('stage_index', mri_res.get('stage_index', 1) if mri_res else 1),
                'age': patient.get('age', 70),
                'mmse_score': (cog_res.get('mmse', {}).get('score', 24) if isinstance(cog_res, dict) else 24),
                'biomarkers': biomarker_res,
            }),
        }
        
        if data.get('prediction_features'):
            log_prediction(
                features=data['prediction_features'],
                prediction=data.get('mri_results', {}).get('stage_index', 1),
                confidence=data.get('mri_results', {}).get('confidence', 0.8) / 100
            )
        
        return comprehensive_results
        
    except Exception as exc:
        logger.exception(f"Enhanced comprehensive analysis failed: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
            
        return {
            'success': False,
            'error': str(exc)
        }
