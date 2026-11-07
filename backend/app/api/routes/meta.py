"""Clinical-data version endpoint + SSE push channel.

A single monotonically increasing number that changes whenever clinical data
mutates anywhere (any session, any role). Clients poll it cheaply and drop
their caches when it moves — this is the propagation mechanism that makes a
patient deleted by a doctor disappear immediately from the admin's open tabs
too, without websockets.

The SSE endpoint (/api/meta/events) is the preferred alternative to polling:
the server pushes a data-version event only when the number changes, so each
tab maintains one persistent connection with near-zero overhead instead of
hammering the DB every 15 s.
"""
import asyncio

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response, StreamingResponse

from app.api.deps import require_user
from app.shared.bootstrap import get_data_version

router = APIRouter(prefix='/api/meta', tags=['meta'])


@router.get('/data-version')
def data_version(user=Depends(require_user)):
    return {'version': get_data_version()}


@router.get('/events')
async def sse_events(request: Request, user=Depends(require_user)):
    """Server-Sent Events stream for clinical-data changes.

    The client replaces its setInterval poll with a single EventSource
    connection. The server checks the data-version every 5 s and pushes an
    event only when it moves, keeping DB load near zero regardless of tab
    count.

    Usage (frontend):
        const es = new EventSource('/api/meta/events', { withCredentials: true })
        es.onmessage = (e) => queryClient.invalidateQueries()
    """
    async def generator():
        last = get_data_version()
        # Send an initial keep-alive comment so the browser doesn't treat the
        # connection as failed before the first real event.
        yield ': connected\n\n'
        while True:
            # Honour client disconnect — avoids leaking async tasks.
            if await request.is_disconnected():
                break
            await asyncio.sleep(5)
            current = get_data_version()
            if current != last:
                last = current
                yield f'data: {current}\n\n'
            else:
                # Keep-alive comment every 5 s prevents proxy timeouts.
                yield ': ping\n\n'

    return StreamingResponse(
        generator(),
        media_type='text/event-stream',
        headers={
            'Cache-Control': 'no-store',
            'X-Accel-Buffering': 'no',   # disable Nginx buffering for SSE
        },
    )
