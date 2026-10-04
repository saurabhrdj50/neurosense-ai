from contextlib import contextmanager
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
import os

from app.config.settings import Config

_ENGINE = None


def get_engine():
    global _ENGINE
    if _ENGINE is not None:
        return _ENGINE
    db_url = os.environ.get("DATABASE_URL")
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
        
    if not db_url:
        db_url = f"sqlite:///{Config.DB_PATH}?check_same_thread=False"
    
    if db_url.startswith("postgresql"):
        _ENGINE = create_engine(
            db_url,
            pool_size=10,
            max_overflow=20,
            pool_recycle=3600,
            pool_pre_ping=True,
            use_native_hstore=False
        )
        return _ENGINE
    _ENGINE = create_engine(db_url)
    return _ENGINE

class _SessionLocalProxy:
    def __call__(self, *args, **kwargs):
        eng = get_engine()
        sm = sessionmaker(autocommit=False, autoflush=False, bind=eng)
        return sm(*args, **kwargs)

SessionLocal = _SessionLocalProxy()

Base = declarative_base()

def get_db_session():
    """Dependency or context manager for getting a DB session."""
    session = SessionLocal()
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
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def init_db():
    Base.metadata.create_all(bind=get_engine())


from sqlalchemy.engine import Engine
from sqlalchemy import event

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if type(dbapi_connection).__module__.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        try:
            cursor.execute("PRAGMA foreign_keys=ON")
        except Exception:
            pass
        finally:
            cursor.close()


