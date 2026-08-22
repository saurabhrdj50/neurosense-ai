import sqlite3
import logging
from contextlib import contextmanager
from typing import Optional, Any
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)


class Database:
    """SQLite database connection manager with context manager support."""
    
    _instance: Optional['Database'] = None
    
    def __init__(self, db_path: Optional[str] = None):
        from app.core.config import Config
        target_path = db_path or getattr(Config, 'DB_PATH', 'patient_data.db')
        self.db_path = str(Path(target_path))
        self._ensure_directory()
    
    @classmethod
    def get_instance(cls, db_path: Optional[str] = None) -> 'Database':
        from app.core.config import Config
        target_path = db_path or getattr(Config, 'DB_PATH', 'patient_data.db')
        normalized_path = str(Path(target_path))
        if cls._instance is None or cls._instance.db_path != normalized_path:
            if cls._instance is not None and cls._instance.db_path != normalized_path:
                logger.info("Reinitializing database singleton for %s", normalized_path)
            cls._instance = cls(target_path)
        return cls._instance
    
    def _ensure_directory(self) -> None:
        path = Path(self.db_path)
        path.parent.mkdir(parents=True, exist_ok=True)
    
    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA journal_mode = WAL;')
        conn.execute('PRAGMA busy_timeout = 30000;')
        conn.execute('PRAGMA foreign_keys = ON;')
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    
    def execute(self, query: str, params: tuple = ()) -> sqlite3.Cursor:
        with self.get_connection() as conn:
            return conn.execute(query, params)
    
    def fetch_one(self, query: str, params: tuple = ()) -> Optional[dict]:
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(query, params).fetchone()
            return dict(row) if row else None
    
    def fetch_all(self, query: str, params: tuple = ()) -> list[dict]:
        with self.get_connection() as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(query, params).fetchall()
            return [dict(row) for row in rows]
    
    def execute_many(self, query: str, params_list: list[tuple]) -> None:
        with self.get_connection() as conn:
            conn.executemany(query, params_list)
    
    def _column_exists(self, conn, table: str, column: str) -> bool:
        rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
        return any(r['name'] == column for r in rows)

    def init_schema(self) -> None:
        with self.get_connection() as conn:
            conn.executescript('''
                CREATE TABLE IF NOT EXISTS app_meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'doctor',
                    full_name TEXT DEFAULT '',
                    date_of_birth TEXT DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT DEFAULT NULL,
                    last_login TEXT DEFAULT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
                    locked_until TEXT DEFAULT NULL,
                    reset_token TEXT DEFAULT NULL,
                    reset_token_expires TEXT DEFAULT NULL
                );
                
                CREATE TABLE IF NOT EXISTS patients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    age INTEGER,
                    sex TEXT,
                    education_years INTEGER,
                    stage TEXT,
                    photo TEXT,
                    notes TEXT DEFAULT '',
                    created_by INTEGER,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                );
                
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id TEXT NOT NULL,
                    patient_name TEXT DEFAULT 'Anonymous',
                    created_by INTEGER DEFAULT NULL,
                    timestamp TEXT NOT NULL,
                    mri_stage TEXT,
                    mri_confidence REAL,
                    cognitive_score REAL,
                    sentiment_risk REAL,
                    risk_score REAL,
                    final_stage TEXT,
                    final_confidence REAL,
                    results_json TEXT,
                    FOREIGN KEY (created_by) REFERENCES users(id),
                    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    actor_id INTEGER,
                    actor_username TEXT,
                    actor_role TEXT,
                    action TEXT NOT NULL,
                    resource_type TEXT NOT NULL,
                    resource_id TEXT,
                    resource_name TEXT,
                    details TEXT,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
                );
            ''')

            migrations = [
                ('users', 'date_of_birth',           "ALTER TABLE users ADD COLUMN date_of_birth TEXT DEFAULT ''"),
                ('users', 'full_name',               "ALTER TABLE users ADD COLUMN full_name TEXT DEFAULT ''"),
                ('users', 'storage_key',             "ALTER TABLE users ADD COLUMN storage_key TEXT DEFAULT NULL"),
                ('users', 'updated_at',              "ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT NULL"),
                ('users', 'last_login',              "ALTER TABLE users ADD COLUMN last_login TEXT DEFAULT NULL"),
                ('users', 'is_active',               "ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1"),
                ('users', 'failed_login_attempts',   "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0"),
                ('users', 'locked_until',            "ALTER TABLE users ADD COLUMN locked_until TEXT DEFAULT NULL"),
                ('users', 'reset_token',             "ALTER TABLE users ADD COLUMN reset_token TEXT DEFAULT NULL"),
                ('users', 'reset_token_expires',     "ALTER TABLE users ADD COLUMN reset_token_expires TEXT DEFAULT NULL"),
                ('patients', 'created_by',           "ALTER TABLE patients ADD COLUMN created_by INTEGER"),
                ('patients', 'updated_at',           "ALTER TABLE patients ADD COLUMN updated_at TEXT DEFAULT NULL"),
                ('sessions', 'created_by',           "ALTER TABLE sessions ADD COLUMN created_by INTEGER DEFAULT NULL"),
            ]
            for table, column, sql in migrations:
                if not self._column_exists(conn, table, column):
                    try:
                        conn.execute(sql)
                        logger.info(f"Migration: added {table}.{column}")
                    except Exception:
                        pass

            conn.executescript('''
                CREATE INDEX IF NOT EXISTS idx_patients_created_by ON patients(created_by);
                CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);
                CREATE INDEX IF NOT EXISTS idx_sessions_patient_id ON sessions(patient_id);
                CREATE INDEX IF NOT EXISTS idx_sessions_patient_timestamp ON sessions(patient_id, timestamp);
                CREATE INDEX IF NOT EXISTS idx_sessions_created_by_timestamp ON sessions(created_by, timestamp);
                CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
                CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
                CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
                CREATE INDEX IF NOT EXISTS idx_users_storage_key ON users(storage_key);
                CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log(actor_id);
                CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
                CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
                CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);
            ''')
            logger.info("Database schema initialized")

    def get_meta(self, key: str, conn: Optional[sqlite3.Connection] = None) -> Optional[str]:
        if conn is not None:
            row = conn.execute('SELECT value FROM app_meta WHERE key = ?', (key,)).fetchone()
            return row['value'] if row else None

        row = self.fetch_one('SELECT value FROM app_meta WHERE key = ?', (key,))
        if not row:
            return None
        return row.get('value')

    def set_meta(self, key: str, value: str, conn: Optional[sqlite3.Connection] = None) -> None:
        query = '''
            INSERT INTO app_meta (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
        '''
        params = (key, value, datetime.now().isoformat())

        if conn is not None:
            conn.execute(query, params)
            return

        with self.get_connection() as managed_conn:
            managed_conn.execute(query, params)
