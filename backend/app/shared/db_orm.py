"""SQLAlchemy engine/session infrastructure.

Single source of truth for database connectivity. The engine is a locked,
lazy process-wide singleton bound to either ``DATABASE_URL`` (PostgreSQL in
production, the recommended default) or a SQLite file (zero-config dev and
fast tests). Repositories consume sessions; schema creation and demo seeding
live in :mod:`app.shared.bootstrap` and run once at startup — never per
request.
"""
import logging
import threading
from contextlib import contextmanager

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config.settings import Config

logger = logging.getLogger(__name__)

_ENGINE: Engine | None = None
_SESSIONMAKER: sessionmaker | None = None
# Reentrant: get_sessionmaker() resolves the engine while holding this lock.
_ENGINE_LOCK = threading.RLock()


def _normalize_db_url(db_url: str) -> str:
    """Legacy scheme fix + explicit driver pin.

    SQLAlchemy ≥2.1 resolves a bare ``postgresql://`` URL to its psycopg 3
    dialect, which is not installed (we ship ``psycopg2-binary``) — so pin
    the driver in the URL instead of relying on the default, which varies
    by installed SQLAlchemy version.
    """
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return db_url


def _build_engine() -> Engine:
    db_url = _normalize_db_url(Config.DATABASE_URL) if Config.DATABASE_URL else None

    if not db_url:
        # Zero-config fallback: SQLite file with cross-thread access enabled.
        # WAL + busy_timeout keep concurrent request threads from tripping on
        # database locks.
        import os
        from pathlib import Path
        db_path = Path(Config.DB_PATH)
        if db_path.parent != Path(''):
            os.makedirs(db_path.parent, exist_ok=True)
        db_url = f"sqlite:///{db_path}?check_same_thread=False"
        engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False, "timeout": 30},
        )
        logger.info("Database engine: SQLite at %s", db_path)
        return engine

    if db_url.startswith("postgresql"):
        engine = create_engine(
            db_url,
            pool_size=10,
            max_overflow=20,
            pool_recycle=3600,
            pool_pre_ping=True,
            pool_use_lifo=True,  # recycle the least-recently-used connections
            connect_args={"application_name": "neurosense-api"},
        )
        logger.info("Database engine: PostgreSQL (%s)", engine.url.render_as_string(hide_password=True))
        return engine

    engine = create_engine(db_url)
    logger.info("Database engine: %s", engine.url.render_as_string(hide_password=True))
    return engine


@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    """SQLite session setup: enforce FKs, WAL journaling, and a generous lock
    timeout. No-ops on PostgreSQL drivers."""
    if type(dbapi_connection).__module__.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=30000")
        except Exception:
            pass
        finally:
            cursor.close()


def get_engine() -> Engine:
    global _ENGINE
    if _ENGINE is None:
        with _ENGINE_LOCK:
            if _ENGINE is None:
                _ENGINE = _build_engine()
    return _ENGINE


def get_sessionmaker() -> sessionmaker:
    global _SESSIONMAKER
    if _SESSIONMAKER is None:
        with _ENGINE_LOCK:
            if _SESSIONMAKER is None:
                _SESSIONMAKER = sessionmaker(
                    bind=get_engine(),
                    autocommit=False,
                    autoflush=False,
                )
    return _SESSIONMAKER


def reset_engine() -> None:
    """Dispose the engine and sessionmaker (used by the test suite to rebind
    to a fresh temporary database)."""
    global _ENGINE, _SESSIONMAKER
    with _ENGINE_LOCK:
        if _ENGINE is not None:
            _ENGINE.dispose()
        _ENGINE = None
        _SESSIONMAKER = None


# Backwards-compatible access: `SessionLocal()` still yields a Session, but the
# sessionmaker itself is now created once instead of per call.
class _SessionLocalProxy:
    def __call__(self, *args, **kwargs):
        return get_sessionmaker()(*args, **kwargs)


SessionLocal = _SessionLocalProxy()

Base = declarative_base()


def get_db_session():
    """FastAPI-style dependency yielding a session (used by the API layer)."""
    session = get_sessionmaker()()
    try:
        yield session
    finally:
        session.close()


@contextmanager
def session_scope():
    """Transactional scope for multi-step operations.

    Repositories accept an existing ``session`` to participate in the caller's
    transaction; everything commits together or rolls back together.
    """
    session = get_sessionmaker()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db() -> None:
    """Create all model tables (idempotent). Startup/bootstrap and tests only —
    request-path code must never run DDL."""
    Base.metadata.create_all(bind=get_engine())
