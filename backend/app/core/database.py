import sqlite3
import logging
from contextlib import contextmanager
from typing import Optional, Any
from pathlib import Path

logger = logging.getLogger(__name__)


class Database:
    """SQLite database connection manager with context manager support."""
    
    _instance: Optional['Database'] = None
    
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or 'patient_data.db'
        self._ensure_directory()
    
    @classmethod
    def get_instance(cls, db_path: Optional[str] = None) -> 'Database':
        if cls._instance is None:
            cls._instance = cls(db_path)
        return cls._instance
    
    def _ensure_directory(self) -> None:
        path = Path(self.db_path)
        path.parent.mkdir(parents=True, exist_ok=True)
    
    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
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
    
    def init_schema(self) -> None:
        with self.get_connection() as conn:
            conn.executescript('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'doctor',
                    full_name TEXT DEFAULT '',
                    created_at TEXT NOT NULL
                );
                
                CREATE TABLE IF NOT EXISTS patients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    age INTEGER,
                    sex TEXT,
                    education_years INTEGER,
                    stage TEXT,
                    notes TEXT DEFAULT '',
                    created_by INTEGER,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                );
                
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id TEXT NOT NULL,
                    patient_name TEXT DEFAULT 'Anonymous',
                    timestamp TEXT NOT NULL,
                    mri_stage TEXT,
                    mri_confidence REAL,
                    cognitive_score REAL,
                    sentiment_risk REAL,
                    risk_score REAL,
                    final_stage TEXT,
                    final_confidence REAL,
                    results_json TEXT
                );
            ''')
            logger.info("Database schema initialized")
