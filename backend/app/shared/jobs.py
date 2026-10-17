"""In-process background job manager for long-running ML work.

``POST /api/analysis/analyze-async`` submits an analysis to a bounded thread
pool and returns a job id immediately, so a long Whisper/MRI run can never
hold (or time out) an HTTP worker. The client polls the status endpoint and
receives real per-modality progress.

Storage: in-memory execution + state, optionally mirrored to Redis. Without
``REDIS_URL`` everything is memory-backed — correct for the single-process
deployment (docker compose default). With ``REDIS_URL`` set, every job-state
mutation is mirrored to a shared Redis key (TTL 1h) and ``get()`` falls back
to it for jobs unknown locally: a poll request that lands on a second worker
process can then see statuses submitted by its sibling, and completed results
survive a same-hour process restart. Job *execution* still happens in the
submitting process (heavyweight ML singletons are per-process by design).
"""
import json
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
REDIS_KEY_PREFIX = 'neurosense:job:'
REDIS_TTL_SECONDS = int(JOB_TTL.total_seconds())


def _redis_client():
    """Shared Redis client for the job mirror, or None when unconfigured."""
    global _redis
    url = os.environ.get('REDIS_URL', '').strip()
    if not url:
        return None
    if _redis is None:
        try:
            import redis as redis_lib
            _redis = redis_lib.Redis.from_url(
                url, socket_connect_timeout=2, socket_timeout=2,
                decode_responses=True,
            )
            _redis.ping()
            logger.info("Job registry mirroring to Redis (%s).", url)
        except Exception as e:
            logger.warning("Redis unavailable (%s) — job registry stays memory-only.", e)
            _redis = None
    return _redis


_redis: Optional[Any] = None
_redis_lock = threading.Lock()


def get_redis_client():
    with _redis_lock:
        return _redis_client()


class JobManager:
    def __init__(self, max_workers: int = 2):
        # ML jobs are heavyweight (Whisper ~1.5GB, ResNet ~45MB): a small
        # pool prevents memory blowup under concurrent submissions.
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix='mljob')
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    # -- Redis mirror ------------------------------------------------------ #

    def _mirror(self, job: Dict[str, Any]) -> None:
        """Best-effort snapshot of one job to Redis (never raises)."""
        client = get_redis_client()
        if client is None:
            return
        try:
            client.set(REDIS_KEY_PREFIX + job['job_id'],
                       json.dumps(job, default=str), ex=REDIS_TTL_SECONDS)
        except Exception as e:
            logger.debug("Redis mirror write failed: %s", e)

    def _load_remote(self, job_id: str) -> Optional[Dict[str, Any]]:
        client = get_redis_client()
        if client is None:
            return None
        try:
            raw = client.get(REDIS_KEY_PREFIX + job_id)
            return json.loads(raw) if raw else None
        except Exception:
            return None

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
        self._mirror(job)

        def runner() -> None:
            def progress(stage: str, pct: int) -> None:
                with self._lock:
                    job['stage'] = stage
                    job['progress'] = max(0, min(int(pct), 99))
                self._mirror(job)

            with self._lock:
                job['status'] = 'running'
                job['started_at'] = utc_now_iso()
            self._mirror(job)
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
            self._mirror(job)

        self._executor.submit(runner)
        logger.info("Submitted background job %s (label=%s, user=%s)", job_id, label, user_id)
        return job_id

    # -- access ------------------------------------------------------------ #

    def get(self, job_id: str, user_id: Optional[int] = None,
            is_admin: bool = False) -> Optional[Dict[str, Any]]:
        """Snapshot of a job. Non-admin callers only ever see their own jobs;
        the result payload is only included once the job completed.

        A job unknown to this process is looked up in the Redis mirror, so a
        poll that lands on a second worker still finds its job."""
        with self._lock:
            job = self._jobs.get(job_id)
            if job is not None:
                if not is_admin and user_id is not None and job.get('user_id') != user_id:
                    return None
                snapshot = dict(job)
            else:
                snapshot = None
        if snapshot is None:
            remote = self._load_remote(job_id)
            if remote is not None:
                if not is_admin and user_id is not None and remote.get('user_id') != user_id:
                    return None
                snapshot = remote
        if snapshot is None:
            # Query Celery task backend as a secondary source if configured
            celery_snapshot = self._check_celery_task(job_id)
            if celery_snapshot is not None:
                return celery_snapshot
            return None

        if snapshot['status'] != 'completed':
            snapshot['result'] = None
        return snapshot

    def submit_celery(self, inputs: Dict[str, Any], patient_info: Dict[str, Any],
                      doctor_id: Optional[int], input_errors: Optional[Dict[str, Any]] = None) -> str:
        """Submit analysis to Celery distributed worker queue."""
        from app.tasks.analysis_tasks import run_analysis_task
        task = run_analysis_task.delay(inputs, patient_info, doctor_id, input_errors)
        job = {
            'job_id': task.id,
            'label': 'analysis',
            'user_id': doctor_id,
            'status': 'queued',
            'stage': 'queued',
            'progress': 0,
            'result': None,
            'error': None,
            'created_at': utc_now_iso(),
            'started_at': None,
            'finished_at': None,
        }
        with self._lock:
            self._jobs[task.id] = job
        self._mirror(job)
        logger.info("Enqueued Celery analysis task %s for doctor %s", task.id, doctor_id)
        return task.id

    def _check_celery_task(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Query Celery backend for task status if Celery is available."""
        try:
            from celery.result import AsyncResult
            from app.celery_app import celery_app
            backend = getattr(celery_app, 'backend', None)
            if backend and hasattr(backend, 'client'):
                key = backend.get_key_for_task(job_id)
                try:
                    if not backend.client.exists(key):
                        return None
                except Exception:
                    pass

            res = AsyncResult(job_id, app=celery_app)
            if res.state == 'PENDING':
                return {
                    'job_id': job_id,
                    'status': 'queued',
                    'progress': 0,
                    'stage': 'queued',
                    'result': None,
                    'error': None,
                }
            elif res.state == 'PROGRESS':
                info = res.info or {}
                return {
                    'job_id': job_id,
                    'status': 'running',
                    'progress': info.get('progress', 50),
                    'stage': info.get('step', 'processing'),
                    'message': info.get('message', ''),
                    'result': None,
                    'error': None,
                }
            elif res.state == 'SUCCESS':
                return {
                    'job_id': job_id,
                    'status': 'completed',
                    'progress': 100,
                    'stage': 'completed',
                    'result': res.result,
                    'error': None,
                }
            elif res.state in ('FAILURE', 'REVOKED'):
                return {
                    'job_id': job_id,
                    'status': 'failed',
                    'progress': 100,
                    'stage': 'failed',
                    'result': None,
                    'error': str(res.result) if res.result else 'Task failed',
                }
        except Exception:
            return None
        return None

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
                # Eagerly attempt the Redis mirror so misconfiguration is
                # logged at startup, not on the first poll.
                get_redis_client()
    return _job_manager
