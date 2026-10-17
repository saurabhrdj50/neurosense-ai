"""Analyses (history) router — byte-compatible port of features/history/routes.py."""
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse

from app.api.deps import get_current_user, is_admin, require_user
from app.features.patients.repository import PatientRepository
from app.features.history.repository import SessionRepository

router = APIRouter(prefix='/api/analyses', tags=['analyses'])

# List pagination: the sessions table grows without bound, so the default page
# size is small and clients page through; `total` lets the UI size its pager.
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200


def _page_params(limit: int, offset: int) -> tuple:
    return max(1, min(limit, MAX_PAGE_SIZE)), max(offset, 0)


@router.get('')
def list_analyses(
    request: Request,
    user=Depends(require_user),
    limit: int = Query(DEFAULT_PAGE_SIZE, description='Page size (1-200)'),
    offset: int = Query(0, ge=0, description='Rows to skip'),
):
    session_repo = SessionRepository()
    limit, offset = _page_params(limit, offset)

    if is_admin(user):
        analyses = session_repo.get_all(limit=limit, offset=offset)
        total = session_repo.count_all()
    else:
        analyses = session_repo.get_for_doctor(user.id, limit=limit, offset=offset)
        total = session_repo.count_for_doctor(user.id)

    return {'analyses': analyses, 'total': total, 'limit': limit, 'offset': offset}


@router.get('/{session_id}')
def get_analysis(session_id: int, request: Request, user=Depends(require_user)):
    session_repo = SessionRepository()
    session = session_repo.get_session_detail(session_id)

    if not session:
        return JSONResponse({'success': False, 'error': 'Analysis not found'}, status_code=404)

    if not is_admin(user) and session.get('created_by') != user.id:
        patient = PatientRepository().get_by_patient_id(session.get('patient_id'))
        if not patient or patient.get('created_by') != user.id:
            return JSONResponse({'success': False, 'error': 'Access denied'}, status_code=403)

    return {'analysis': session}
