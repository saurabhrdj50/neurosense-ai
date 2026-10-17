"""Clinical-data version endpoint.

A single monotonically increasing number that changes whenever clinical data
mutates anywhere (any session, any role). Clients poll it cheaply and drop
their caches when it moves — this is the propagation mechanism that makes a
patient deleted by a doctor disappear immediately from the admin's open tabs
too, without websockets.
"""
from fastapi import APIRouter, Depends

from app.api.deps import require_user
from app.shared.bootstrap import get_data_version

router = APIRouter(prefix='/api/meta', tags=['meta'])


@router.get('/data-version')
def data_version(user=Depends(require_user)):
    return {'version': get_data_version()}
