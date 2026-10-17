"""Alembic environment for NeuroSense AI.

The migration URL comes from ``DATABASE_URL`` (or ``ALEMBIC_DATABASE_URL``,
which takes precedence) so the same baseline migrates SQLite and PostgreSQL.
Falls back to the app's default SQLite file when neither is set.
"""
import os
import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Make the backend package importable when alembic runs from another cwd.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Import the shared Base and every model so autogenerate sees the full schema.
from app.config.settings import Config  # noqa: E402
from app.shared.db_orm import Base  # noqa: E402
import app.shared.models.user  # noqa: E402,F401
import app.shared.models.patient  # noqa: E402,F401
import app.shared.models.session  # noqa: E402,F401
import app.shared.models.audit_log  # noqa: E402,F401
import app.shared.models.app_meta  # noqa: E402,F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _database_url() -> str:
    url = os.environ.get('ALEMBIC_DATABASE_URL') or os.environ.get('DATABASE_URL')
    if not url:
        url = f"sqlite:///{Config.DB_PATH}"
    if url.startswith('postgres://'):
        url = url.replace('postgres://', 'postgresql://', 1)
    # Pin the driver explicitly: SQLAlchemy ≥2.1 maps a bare postgresql://
    # URL to its psycopg 3 dialect (not installed); we ship psycopg2-binary.
    if url.startswith('postgresql://'):
        url = url.replace('postgresql://', 'postgresql+psycopg2://', 1)
    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL without a DB connection)."""
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=url_is_sqlite(),
    )

    with context.begin_transaction():
        context.run_migrations()


def url_is_sqlite() -> bool:
    return _database_url().startswith('sqlite')


def run_migrations_online() -> None:
    """Run migrations in 'online' mode with a real connection."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration['sqlalchemy.url'] = _database_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=url_is_sqlite(),
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
