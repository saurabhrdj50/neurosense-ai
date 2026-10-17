"""One-time database bootstrap: schema creation and account provisioning.

Runs exactly once per process at startup (the FastAPI lifespan). Request-path
code must never run DDL or seed checks — repositories are plain session
consumers.

The admin account is a fixed deployment constant (username ``admin``,
password ``admin``): it is created on first boot and its credential is
re-enforced on every startup, so the login can never drift. It deliberately
bypasses the user-facing password-strength rules and never participates in
the forgot-password flow. Doctors are never seeded — they self-register via
/api/auth/register. Demo patient data is an explicit opt-in via
``SEED_DEMO_DATA`` and latched in the ``app_meta`` table so a manual wipe of
demo patients is not undone on restart.
"""
import os
import logging
from typing import Optional

from sqlalchemy.exc import IntegrityError

from app.shared.db_orm import Base, get_engine, get_sessionmaker
from app.shared.time_utils import utc_now_iso

logger = logging.getLogger(__name__)

_BOOTSTRAPPED = False

# Keep model imports so Base.metadata knows every table.
from app.shared.models.user import User  # noqa: E402,F401
from app.shared.models.patient import Patient  # noqa: E402,F401
from app.shared.models.session import AnalysisSession  # noqa: E402,F401
from app.shared.models.audit_log import AuditLog  # noqa: E402,F401
from app.shared.models.app_meta import AppMeta  # noqa: E402,F401

# Fixed system-admin credential (deployment constant — see module docstring).
FIXED_ADMIN_USERNAME = 'admin'
FIXED_ADMIN_PASSWORD = os.getenv('INITIAL_ADMIN_PASSWORD') or os.getenv('ADMIN_PASSWORD') or 'admin'
FIXED_ADMIN_EMAIL = 'admin@neurosense.ai'

SAMPLE_PATIENTS = [
    {'name': 'Ramesh Kumar', 'age': 68, 'sex': 'male', 'education_years': 16, 'stage': 'Cognitively Normal (CN)', 'notes': 'Regular check-up'},
    {'name': 'Sunita Sharma', 'age': 72, 'sex': 'female', 'education_years': 12, 'stage': 'Cognitively Normal (CN)', 'notes': 'Family history of AD'},
    {'name': 'Mohan Patel', 'age': 75, 'sex': 'male', 'education_years': 10, 'stage': 'Mild Cognitive Impairment (MCI)', 'notes': 'Occasional word-finding difficulty'},
    {'name': 'Lakshmi Iyer', 'age': 70, 'sex': 'female', 'education_years': 14, 'stage': 'Mild Cognitive Impairment (MCI)', 'notes': 'Mild forgetfulness'},
    {'name': 'Anand Deshmukh', 'age': 78, 'sex': 'male', 'education_years': 8, 'stage': 'Mild Cognitive Impairment (MCI)', 'notes': 'Repeats questions'},
    {'name': 'Kamla Devi', 'age': 80, 'sex': 'female', 'education_years': 5, 'stage': 'Mild Cognitive Impairment (MCI)', 'notes': 'Difficulty managing finances'},
    {'name': 'Rajendra Singh', 'age': 76, 'sex': 'male', 'education_years': 12, 'stage': 'Mild Cognitive Impairment (MCI)', 'notes': 'Needs help with daily tasks'},
    {'name': 'Savita Joshi', 'age': 82, 'sex': 'female', 'education_years': 10, 'stage': 'Mild Cognitive Impairment (MCI)', 'notes': 'Gets lost in familiar places'},
    {'name': 'Gopal Verma', 'age': 85, 'sex': 'male', 'education_years': 6, 'stage': "Alzheimer's Disease (AD)", 'notes': 'Significant memory loss'},
    {'name': 'Pushpa Agarwal', 'age': 79, 'sex': 'female', 'education_years': 8, 'stage': "Alzheimer's Disease (AD)", 'notes': 'Cannot recognise family'},
]


def get_meta(key: str) -> Optional[str]:
    with get_sessionmaker()() as db:
        row = db.get(AppMeta, key)
        return row.value if row else None


def set_meta(key: str, value: str) -> None:
    with get_sessionmaker()() as db:
        row = db.get(AppMeta, key)
        if row is None:
            row = AppMeta(key=key, value=value, updated_at=utc_now_iso())
            db.add(row)
        else:
            row.value = value
            row.updated_at = utc_now_iso()
        db.commit()


# ── Global data version ──────────────────────────────────────────────────────
# A monotonic counter that increments whenever clinical data mutates (patient
# create/update/delete, session delete, doctor delete, new analysis). Clients
# poll GET /api/meta/data-version and invalidate their caches when it moves —
# that is what makes a delete performed in one session appear immediately in
# every other session (another tab, the admin panel, another clinician).

DATA_VERSION_KEY = 'data_version'


def get_data_version() -> int:
    try:
        return int(get_meta(DATA_VERSION_KEY) or 0)
    except (TypeError, ValueError):
        return 0


def bump_data_version() -> None:
    """Increment the data version. Best-effort: never turns a completed
    mutation into an error just because the marker write failed."""
    try:
        set_meta(DATA_VERSION_KEY, str(get_data_version() + 1))
    except Exception:
        logger.exception("Failed to bump data version")


def ensure_schema() -> None:
    """Create all model tables if missing (idempotent)."""
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    _ensure_new_columns()
    _ensure_alembic_stamped(engine)


def _ensure_alembic_stamped(engine) -> None:
    """Ensure alembic_version table is stamped if tables exist.

    Prevents 'alembic upgrade head' in Docker/entrypoint scripts from crashing with
    'table already exists' when running against an existing database.
    """
    try:
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if inspector.has_table('users'):
            needs_stamp = False
            if not inspector.has_table('alembic_version'):
                needs_stamp = True
            else:
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT version_num FROM alembic_version")).fetchall()
                    if not result:
                        needs_stamp = True
            if needs_stamp:
                import pathlib
                from alembic import command
                from alembic.config import Config
                backend_dir = pathlib.Path(__file__).resolve().parents[2]
                alembic_ini = backend_dir / "alembic.ini"
                if alembic_ini.exists():
                    cfg = Config(str(alembic_ini))
                    command.stamp(cfg, "head")
                    logger.info("Stamped existing database schema to Alembic head")
    except Exception:
        logger.debug("Alembic auto-stamp check skipped", exc_info=True)


def _ensure_new_columns() -> None:
    """Add columns introduced after a database was first created.

    ``create_all`` only creates missing *tables* — it never alters existing
    ones. Bare-metal deployments (``python run.py``) do not run Alembic, so
    without this backfill an existing SQLite file would crash on the first
    INSERT/SELECT that touches the new column. Idempotent: the inspector
    skips columns that are already present. Alembic-managed databases are
    unaffected (the migration applies the same DDL).
    """
    from sqlalchemy import inspect, text

    engine = get_engine()
    inspector = inspect(engine)
    expected = {
        'users': {'hospital': 'VARCHAR'},
    }
    try:
        for table, columns in expected.items():
            if not inspector.has_table(table):
                continue
            present = {c['name'] for c in inspector.get_columns(table)}
            with engine.begin() as conn:
                for col, col_type in columns.items():
                    if col not in present:
                        logger.info("Backfilling missing column %s.%s", table, col)
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                        # Rows predating the column read back as NULL; empty
                        # string keeps the Python-side default semantics.
                        conn.execute(text(f"UPDATE {table} SET {col} = '' WHERE {col} IS NULL"))
    except Exception:
        logger.exception("Column backfill failed — schema may be out of date")
        # Non-fatal: Alembic-managed deployments apply the column themselves.


def _ensure_fixed_admin(db) -> None:
    """Guarantee the system-admin account exists.

    Created on first boot. On subsequent boots, account active state and roles
    are verified, but existing passwords are NOT overwritten unless
    FORCE_RESET_ADMIN_PASSWORD is set.
    """
    from app.shared.security import hash_password

    admin = db.query(User).filter(User.username == FIXED_ADMIN_USERNAME).first()
    if admin is None:
        admin = User(
            username=FIXED_ADMIN_USERNAME,
            email=FIXED_ADMIN_EMAIL,
            password_hash=hash_password(FIXED_ADMIN_PASSWORD),
            role='admin',
            full_name='System Admin',
            date_of_birth='',
        )
        db.add(admin)
        try:
            db.flush()  # obtain the auto-generated id for the storage key
            admin.storage_key = f"{admin.id}_{FIXED_ADMIN_USERNAME}"
            db.commit()
            logger.info("Provisioned fixed admin account '%s'", FIXED_ADMIN_USERNAME)
        except IntegrityError:
            db.rollback()
            logger.warning("Fixed admin provisioning hit a conflict — already present?")
        return

    # In development/test mode (IS_PRODUCTION=False), admin/admin acts as a
    # convenience constant. In production (IS_PRODUCTION=True) or when
    # PRESERVE_ADMIN_PASSWORD is set, passwords are never wiped on container restart.
    from app.config.settings import Config
    preserve_admin_password = (
        Config.IS_PRODUCTION
        or os.getenv('PRESERVE_ADMIN_PASSWORD', '').lower() in ('1', 'true', 'yes')
    )
    force_reset = os.getenv('FORCE_RESET_ADMIN_PASSWORD', '').lower() in ('1', 'true', 'yes')

    if not preserve_admin_password or force_reset:
        admin.password_hash = hash_password(FIXED_ADMIN_PASSWORD)

    admin.role = 'admin'
    admin.is_active = True
    admin.failed_login_attempts = 0
    admin.locked_until = None
    if not admin.storage_key:
        admin.storage_key = f"{admin.id}_{FIXED_ADMIN_USERNAME}"
    db.commit()


def _ensure_demo_doctor(db) -> None:
    """Ensure a demo doctor account exists when demo data is requested."""
    if not (_should_seed_demo_patients() or os.getenv('SEED_DEMO_DOCTOR', '').lower() in ('1', 'true', 'yes')):
        return

    from app.shared.security import hash_password
    doctor = db.query(User).filter(User.username == 'doctor').first()
    if doctor is None:
        doctor = User(
            username='doctor',
            email='doctor@neurosense.ai',
            password_hash=hash_password('Doctor@123'),
            role='doctor',
            full_name='Dr. Sarah Demo',
            date_of_birth='1980-01-01',
            hospital='Demo General Hospital',
        )
        db.add(doctor)
        try:
            db.flush()
            doctor.storage_key = f"{doctor.id}_doctor"
            db.commit()
            logger.info("Provisioned demo doctor account 'doctor'")
        except IntegrityError:
            db.rollback()


def _seed_demo_patients(db) -> None:
    if get_meta('patients_seeded') == '1':
        return

    count = db.query(Patient).count()
    if count > 0:
        set_meta('patients_seeded', '1')
        return

    if not _should_seed_demo_patients():
        return

    doctor = db.query(User).filter(User.username == 'doctor').first()
    doctor_id = doctor.id if doctor else None

    now = utc_now_iso()
    for i, p in enumerate(SAMPLE_PATIENTS):
        db.add(Patient(
            patient_id=f"PAT-{1001 + i}",
            name=p['name'],
            age=p['age'],
            sex=p['sex'],
            education_years=p['education_years'],
            stage=p['stage'],
            notes=p['notes'],
            created_by=doctor_id,
            created_at=now,
        ))
    try:
        db.commit()
        set_meta('patients_seeded', '1')
        logger.info("Seeded %d demo patients", len(SAMPLE_PATIENTS))
    except IntegrityError:
        db.rollback()


def _should_seed_demo_patients() -> bool:
    import os
    explicit = os.environ.get('SEED_DEMO_DATA')
    return explicit is not None and explicit.lower() in ('1', 'true', 'yes')


def _sanitize(username: str) -> str:
    return "".join(
        c if c.isalnum() or c in ('-', '_') else '_'
        for c in (username or 'unknown')
    ).strip('_').lower()


def _backfill_storage_keys(db) -> None:
    """Backfill storage_key for legacy users who have none set."""
    users = db.query(User).filter(User.storage_key.is_(None)).all()
    for user in users:
        user.storage_key = f"{user.id}_{_sanitize(user.username)}"
    if users:
        try:
            db.commit()
            logger.info("Backfilled storage_key for %d users", len(users))
        except Exception:
            db.rollback()


def bootstrap_database() -> None:
    """Ensure schema exists and the fixed admin is provisioned. Idempotent per
    process; call once at startup (or per test with a fresh engine)."""
    global _BOOTSTRAPPED
    ensure_schema()
    db = get_sessionmaker()()
    try:
        _ensure_fixed_admin(db)
        _ensure_demo_doctor(db)
        _backfill_storage_keys(db)
        _seed_demo_patients(db)
    finally:
        db.close()
    _BOOTSTRAPPED = True
