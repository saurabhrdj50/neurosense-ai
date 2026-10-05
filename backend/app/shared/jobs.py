"""In-process background job manager for long-running ML work.

``POST /api/analysis/analyze-async`` submits an analysis to a bounded thread
pool and returns a job id immediately, so a long Whisper/MRI run can never
hold (or time out) an HTTP worker. The client polls the status endpoint and
receives real per-modality progress.

Storage: memory-backed. Correct for single-process deployments (Flask dev
server, one gunicorn worker, docker compose default). A multi-worker
deployment must back this registry with a shared store (Redis) or run the
job executor in a dedicated worker process — the public interface here is
deliberately small so that swap is contained to this module.
"""
import logging
import os
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from typing import Any, Callable, Dict, Optional

from app.shared.time_utils import utc_now, utc_now_iso

logger = logging.getLogger(__name__)

# Completed jobs are dropped after this long so the registry cannot grow
# without bound in a long-lived worker.
JOB_TTL = timedelta(hours=1)


class JobManager:
    def __init__(self, max_workers: int = 2):
        # ML jobs are heavyweight (Whisper ~1.5GB, ResNet ~45MB): a small
        # pool prevents memory blowup under concurrent submissions.
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix='mljob')
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    # -- submission -------------------------------------------------------- #

    def submit(self, work: Callable[[Callable[[str, int], None]], Dict[str, Any]],
               user_id: Optional[int] = None, label: str = 'analysis') -> str:
        """Run ``work(progress)`` in the pool. ``work`` receives a callable
        ``progress(stage: str, pct: int)`` it should call as it advances."""
        self._cleanup()
        job_id = uuid.uuid4().hex[:12]
        job = {
            'job_id': job_id,
            'label': label,
            'user_id': user_id,
            'status': 'queued',        # queued | running | completed | failed
            'stage': None,             # e.g. 'mri', 'speech', 'fusion'
            'progress': 0,             # 0-100
            'result': None,            # analyze payload once completed
            'error': None,
            'created_at': utc_now_iso(),
            'started_at': None,
            'finished_at': None,
        }
        with self._lock:
            self._jobs[job_id] = job

        def runner() -> None:
            def progress(stage: str, pct: int) -> None:
                with self._lock:
                    job['stage'] = stage
                    job['progress'] = max(0, min(int(pct), 99))

            with self._lock:
                job['status'] = 'running'
                job['started_at'] = utc_now_iso()
            try:
                result = work(progress)
                with self._lock:
                    job['result'] = result
                    job['status'] = 'completed'
                    job['progress'] = 100
            except Exception as e:  # noqa: BLE001 — job failures are data, not crashes
                logger.exception("Background job %s failed", job_id)
                with self._lock:
                    job['status'] = 'failed'
                    job['error'] = str(e)[:300]
            finally:
                with self._lock:
                    job['finished_at'] = utc_now_iso()

        self._executor.submit(runner)
        logger.info("Submitted background job %s (label=%s, user=%s)", job_id, label, user_id)
        return job_id

    # -- access ------------------------------------------------------------ #

    def get(self, job_id: str, user_id: Optional[int] = None,
            is_admin: bool = False) -> Optional[Dict[str, Any]]:
        """Snapshot of a job. Non-admin callers only ever see their own jobs;
        the result payload is only included once the job completed."""
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return None
            if not is_admin and user_id is not None and job.get('user_id') != user_id:
                return None
            snapshot = dict(job)
        if snapshot['status'] != 'completed':
            snapshot['result'] = None
        return snapshot

    def _cleanup(self) -> None:
        """Drop finished jobs older than JOB_TTL so the registry stays bounded."""
        from app.shared.time_utils import parse_timestamp
        cutoff = utc_now() - JOB_TTL
        with self._lock:
            expired = [
                job_id for job_id, job in self._jobs.items()
                if job['status'] in ('completed', 'failed')
                and (finished := parse_timestamp(job.get('finished_at'))) is not None
                and finished < cutoff
            ]
            for job_id in expired:
                del self._jobs[job_id]


_job_manager: Optional[JobManager] = None
_job_manager_lock = threading.Lock()


def get_job_manager() -> JobManager:
    global _job_manager
    if _job_manager is None:
        with _job_manager_lock:
            if _job_manager is None:
                try:
                    workers = max(1, int(os.environ.get('ML_JOB_WORKERS', '2')))
                except ValueError:
                    workers = 2
                _job_manager = JobManager(max_workers=workers)
    return _job_manager
