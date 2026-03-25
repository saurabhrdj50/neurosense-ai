"""
Patient History Module
SQLite-based storage for tracking patient analysis sessions
over time, enabling longitudinal trend analysis.

Stores:
- Patient demographic snapshots
- Analysis results per session
- Cognitive score trends
- Risk score trends
"""

import json
import sqlite3
import os
from datetime import datetime
from typing import Optional


DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'patient_data.db')


class PatientHistory:
    """
    Lightweight patient history store using SQLite.
    """

    def __init__(self, db_path: str = None):
        self.db_path = db_path or DB_PATH
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id  TEXT NOT NULL,
                    patient_name TEXT DEFAULT 'Anonymous',
                    timestamp   TEXT NOT NULL,
                    mri_stage   TEXT,
                    mri_confidence REAL,
                    cognitive_score REAL,
                    sentiment_risk  REAL,
                    risk_score      REAL,
                    final_stage     TEXT,
                    final_confidence REAL,
                    results_json    TEXT
                )
            ''')
            conn.commit()

    def save_session(
        self,
        patient_id: str,
        results: dict,
        patient_name: str = 'Anonymous',
    ) -> int:
        """
        Store a complete analysis session.

        Returns
        -------
        int — the session row ID.
        """
        mri = results.get('mri', {})
        cog = results.get('cognitive', {})
        sent = results.get('sentiment', {})
        risk = results.get('risk_profile', {})
        fusion = results.get('final_stage', {})

        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute(
                '''INSERT INTO sessions
                   (patient_id, patient_name, timestamp,
                    mri_stage, mri_confidence,
                    cognitive_score, sentiment_risk, risk_score,
                    final_stage, final_confidence, results_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (
                    patient_id,
                    patient_name,
                    datetime.now().isoformat(),
                    mri.get('stage'),
                    mri.get('confidence'),
                    cog.get('composite_score'),
                    sent.get('cognitive_risk_score'),
                    risk.get('overall_risk_score'),
                    fusion.get('stage'),
                    fusion.get('confidence'),
                    json.dumps(results, default=str),
                ),
            )
            conn.commit()
            return cur.lastrowid

    def get_history(self, patient_id: str, limit: int = 20) -> list[dict]:
        """
        Retrieve analysis history for a patient.
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                '''SELECT id, patient_id, patient_name, timestamp,
                          mri_stage, mri_confidence,
                          cognitive_score, sentiment_risk, risk_score,
                          final_stage, final_confidence
                   FROM sessions
                   WHERE patient_id = ?
                   ORDER BY timestamp DESC LIMIT ?''',
                (patient_id, limit),
            ).fetchall()

        return [dict(r) for r in rows]

    def get_session_detail(self, session_id: int) -> Optional[dict]:
        """
        Get the full results JSON for a specific session.
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                'SELECT * FROM sessions WHERE id = ?', (session_id,)
            ).fetchone()

        if not row:
            return None

        result = dict(row)
        if result.get('results_json'):
            result['full_results'] = json.loads(result['results_json'])
        return result

    def get_trends(self, patient_id: str) -> dict:
        """
        Return trend data for charting (timestamps + scores).
        """
        history = self.get_history(patient_id, limit=50)
        history.reverse()  # chronological order

        return {
            'patient_id': patient_id,
            'session_count': len(history),
            'timestamps': [h['timestamp'] for h in history],
            'mri_confidence': [h.get('mri_confidence') for h in history],
            'cognitive_scores': [h.get('cognitive_score') for h in history],
            'sentiment_risk': [h.get('sentiment_risk') for h in history],
            'risk_scores': [h.get('risk_score') for h in history],
            'stages': [h.get('final_stage') or h.get('mri_stage') for h in history],
        }

    def delete_patient(self, patient_id: str) -> int:
        """Delete all records for a patient. Returns rows deleted."""
        with sqlite3.connect(self.db_path) as conn:
            cur = conn.execute(
                'DELETE FROM sessions WHERE patient_id = ?', (patient_id,)
            )
            conn.commit()
            return cur.rowcount
