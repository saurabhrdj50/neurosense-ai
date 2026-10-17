"""One-time data migration: SQLite (patient_data.db) → PostgreSQL.

Usage (target URL required, source defaults to the configured SQLite file):

    DATABASE_URL=postgresql://neuro:neuro@localhost:5432/neurosense \
        python scripts/migrate_sqlite_to_pg.py [--source sqlite:///path.db] [--force]

Behaviour:
  * Runs ``alembic upgrade head`` against the target first, so the schema
    exists and is versioned.
  * Copies every table in FK order (users → patients → sessions → audit_log →
    app_meta), preserving primary keys and password hashes verbatim.
  * Idempotent by default: tables that already contain rows are skipped, so
    re-running after a partial failure is safe. ``--force`` truncates the
    target tables and re-copies instead.

Not copied: uploaded files (uploads/ volume) — copy or mount that separately.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402


# FK-safe copy order; app_meta last (seeding latch).
TABLES = ['users', 'patients', 'sessions', 'audit_log', 'app_meta']
PK = {
    'users': 'id', 'patients': 'id', 'sessions': 'id', 'audit_log': 'id',
    'app_meta': 'key',
}


def _norm(url: str) -> str:
    if url.startswith('postgres://'):
        return url.replace('postgres://', 'postgresql://', 1)
    return url


def _type_coercers(dst_engine):
    """Build per-table column coercers from the target schema.

    SQLite stores booleans as INTEGER and everything as TEXT-typed values, so
    a raw row copy fails PostgreSQL's strict type checks. Coerce by target
    column type: BOOLEAN <- int/str truthiness, INTEGER/BIGINT <- int, and
    Numeric <- float.
    """
    from sqlalchemy import inspect, Boolean, Integer, BigInteger, Numeric, Float
    inspector = inspect(dst_engine)
    coercers = {}
    for table in TABLES:
        table_coercers = {}
        for col in inspector.get_columns(table):
            t = col['type']
            if isinstance(t, Boolean):
                table_coercers[col['name']] = lambda v: bool(v) if v is not None else None
            elif isinstance(t, (Integer, BigInteger)):
                table_coercers[col['name']] = lambda v: int(v) if v is not None else None
            elif isinstance(t, (Numeric, Float)):
                table_coercers[col['name']] = lambda v: float(v) if v is not None else None
        coercers[table] = table_coercers
    return coercers


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', default=None,
                        help='SQLite URL (default: sqlite:///<SQLITE_PATH or patient_data.db>)')
    parser.add_argument('--target', default=None,
                        help='Target URL (default: $DATABASE_URL — must be postgresql://)')
    parser.add_argument('--force', action='store_true',
                        help='Truncate target tables before copying (destructive).')
    args = parser.parse_args()

    from app.config.settings import Config
    source_url = _norm(args.source or f"sqlite:///{Config.DB_PATH}")
    target_url = _norm(args.target or os.environ.get('DATABASE_URL', ''))
    if not target_url:
        print("ERROR: set DATABASE_URL (or --target) to the PostgreSQL destination.")
        return 2
    if not target_url.startswith('postgresql'):
        print(f"ERROR: target must be a PostgreSQL URL, got: {target_url}")
        return 2

    print(f"Source: {source_url}")
    print(f"Target: {target_url}")

    # 1. Versioned schema on the target
    os.environ['ALEMBIC_DATABASE_URL'] = target_url
    from alembic.config import Config as AlembicConfig
    from alembic import command
    alembic_cfg = AlembicConfig(os.path.join(os.path.dirname(__file__), '..', 'alembic.ini'))
    alembic_cfg.set_main_option('script_location',
                                os.path.join(os.path.dirname(__file__), '..', 'alembic'))
    command.upgrade(alembic_cfg, 'head')
    print("Target schema: alembic head applied.")

    src_engine = create_engine(source_url)
    dst_engine = create_engine(target_url)
    coercers = _type_coercers(dst_engine)

    total_copied = 0
    with src_engine.connect() as src, dst_engine.begin() as dst:
        for table in TABLES:
            pk = PK[table]
            existing = dst.execute(text(f'SELECT COUNT(*) FROM {table}')).scalar()
            if existing and args.force:
                print(f"  {table}: --force → truncating {existing} existing rows")
                dst.execute(text(f'DELETE FROM {table}'))
                existing = 0
            if existing:
                print(f"  {table}: skipped ({existing} rows already present)")
                continue

            rows = [dict(r._mapping) for r in src.execute(text(f'SELECT * FROM {table}'))]
            if not rows:
                print(f"  {table}: 0 rows in source, nothing to copy")
                continue

            coerce = coercers.get(table, {})
            for row in rows:
                for col, fn in coerce.items():
                    if col in row:
                        row[col] = fn(row[col])

            cols = list(rows[0].keys())
            col_list = ', '.join(cols)
            param_list = ', '.join(f':{c}' for c in cols)
            dst.execute(
                text(f'INSERT INTO {table} ({col_list}) VALUES ({param_list})'),
                rows,
            )
            # Keep sequence counters in sync with copied explicit PKs (PG only;
            # harmless no-op semantics for the audit trail when target is PG).
            if pk == 'id':
                dst.execute(text(
                    f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                    f"COALESCE((SELECT MAX(id) FROM {table}), 1))"
                ))
            print(f"  {table}: copied {len(rows)} rows")
            total_copied += len(rows)

    print(f"Done — {total_copied} rows migrated.")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
