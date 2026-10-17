"""Analysis router — byte-compatible port of features/analysis/routes.py (Flask)."""
import io
import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import JSONResponse
from starlette.datastructures import UploadFile

from app.api.deps import is_admin, require_user
from app.api.ratelimit import limiter
from app.api.errors import ApiError
from app.api.multipart import UploadedFileAdapter, _valid_mri_upload, parse_analyze_request
from app.features.history.repository import SessionRepository

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/analysis', tags=['analysis'])


def _orchestrator():
    from app.features.analysis.service import AnalysisOrchestrator
    return AnalysisOrchestrator()


@router.post('/analyze')
@limiter.limit("30/minute")
def analyze(request: Request,
    parsed=Depends(parse_analyze_request),
    user=Depends(require_user),
):
    from app.api.multipart import parse_analyze_request  # noqa: F401 (doc clarity)
    inputs, patient_info, input_errors = parsed
    orchestrator = _orchestrator()

    results = orchestrator.run_full_analysis(inputs, doctor_id=user.id)
    results.update(input_errors)
    try:
        results = orchestrator.persist_analysis(patient_info, results, doctor_id=user.id)
    except PermissionError as e:
        # Race: the patient was claimed by another clinician between the
        # pre-analysis check and persistence.
        logger.warning("Blocked cross-tenant persist: %s", e)
        return JSONResponse({
            'success': False,
            'message': "Patient belongs to another clinician; analysis was not saved."
        }, status_code=403)

    return results


@router.post('/analyze-async', status_code=202)
@limiter.limit("30/minute")
def analyze_async(request: Request,
    parsed=Depends(parse_analyze_request),
    user=Depends(require_user),
):
    """Submit the analysis as a background job; returns 202 + a job id.

    Long Whisper/MRI runs then cannot hold or time out an HTTP worker —
    the client polls /api/analysis/jobs/<id> for real pipeline progress.
    """
    from app.shared.jobs import get_job_manager
    from app.config.settings import Config
    inputs, patient_info, input_errors = parsed

    if getattr(Config, 'USE_CELERY', False):
        try:
            job_id = get_job_manager().submit_celery(inputs, patient_info, user.id, input_errors)
            return {
                'job_id': job_id,
                'status': 'queued',
                'engine': 'celery',
                'status_url': f'/api/analysis/jobs/{job_id}',
            }
        except Exception as exc:
            logger.warning("Celery submission error (%s) — falling back to local pool.", exc)

    orchestrator = _orchestrator()

    def work(progress):
        results = orchestrator.run_full_analysis(inputs, doctor_id=user.id, progress=progress)
        results.update(input_errors)
        return orchestrator.persist_analysis(patient_info, results, doctor_id=user.id)

    job_id = get_job_manager().submit(work, user_id=user.id, label='analysis')
    return {
        'job_id': job_id,
        'status': 'queued',
        'engine': 'in-process',
        'status_url': f'/api/analysis/jobs/{job_id}',
    }


@router.get('/jobs/{job_id}')
def analysis_job_status(job_id: str, request: Request, user=Depends(require_user)):
    from app.shared.jobs import get_job_manager
    job = get_job_manager().get(
        job_id,
        user_id=getattr(user, 'id', None),
        is_admin=is_admin(user),
    )
    if job is None:
        return JSONResponse({'success': False, 'message': 'Job not found'}, status_code=404)
    return job


@router.post('/mri/preview')
async def mri_preview(request: Request, user=Depends(require_user)):
    """Render a displayable PNG preview slice from an uploaded MRI volume."""
    form = await request.form()
    file = form.get('mri_image')
    if not (file and isinstance(file, UploadFile) and file.filename):
        return JSONResponse({'error': 'No image uploaded'}, status_code=400)
    adapted = UploadedFileAdapter(file)
    if not _valid_mri_upload(adapted):
        return JSONResponse({'error': 'Invalid file type'}, status_code=400)

    orchestrator = _orchestrator()
    try:
        temp_path = orchestrator._save_temp_file(adapted)
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
                media_type='image/png',
                headers={
                    'Content-Disposition': 'inline; filename=mri_preview.png',
                    'Cache-Control': 'no-store',
                },
            )
        finally:
            orchestrator._cleanup_temp_file(temp_path)
    except Exception as e:
        logger.error("Failed to render MRI preview: %s", e)
        return JSONResponse({'error': 'Failed to render preview.'}, status_code=500)


@router.post('/report/pdf', name='generate_pdf_report_post')
@router.get('/report/pdf', name='generate_pdf_report_get')
async def generate_pdf_report(request: Request, user=Depends(require_user)):
    if request.method == 'POST':
        try:
            data = await request.json()
        except Exception:
            data = None
    else:
        data = dict(request.query_params)

    if not data:
        return JSONResponse({'error': 'No data provided'}, status_code=400)
    try:
        from app.features.analysis.reporting import ReportOrchestrator
        patient_info = data.get('patient_info')
        pdf_content = ReportOrchestrator().generate_report(data, patient_info)
        if not pdf_content:
            return JSONResponse({'error': 'Failed to generate PDF report'}, status_code=500)
        filename = data.get('patient_info', {}).get('patient_id', 'report') if isinstance(data.get('patient_info'), dict) else 'report'
        return Response(
            pdf_content,
            media_type='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename=neurosense_report_{filename}.pdf'
            },
        )
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        return JSONResponse({'error': 'Failed to generate PDF report.'}, status_code=500)


@router.get('/history')
def get_analysis_history(
    request: Request,
    user=Depends(require_user),
    limit: int = Query(50, description='Page size (1-200)'),
    offset: int = Query(0, ge=0, description='Rows to skip'),
):
    session_repo = SessionRepository()
    limit = max(1, min(limit, 200))
    offset = max(offset, 0)
    if is_admin(user):
        analyses = session_repo.get_all(limit=limit, offset=offset)
        total = session_repo.count_all()
    else:
        analyses = session_repo.get_for_doctor(user.id, limit=limit, offset=offset)
        total = session_repo.count_for_doctor(user.id)

    return {'history': analyses, 'analyses': analyses, 'total': total, 'limit': limit, 'offset': offset}


async def _retry_body(request: Request) -> Dict[str, Any]:
    """Async dependency: read the retry JSON body off the wire."""
    try:
        data = await request.json()
    except Exception:
        data = None
    return data if isinstance(data, dict) else {}


@router.post('/sessions/{session_id}/retry')
@limiter.limit("10/minute")
def retry_session_modality(
    request: Request,
    session_id: int,
    body: Dict[str, Any] = Depends(_retry_body),
    user=Depends(require_user),
):
    """Re-run one failed modality (mri|audio) for a stored session from its
    persisted raw upload, then refresh fusion, explanation and the PDF."""
    modality = (body.get('modality') or '').strip().lower()

    from app.features.analysis.retry import retry_modality
    try:
        results = retry_modality(session_id, modality, user)
    except ApiError:
        raise
    except Exception as e:
        logger.exception("Retry crashed for session %d modality %s", session_id, modality)
        return JSONResponse({'success': False, 'error': str(e)}, status_code=500)
    return results
