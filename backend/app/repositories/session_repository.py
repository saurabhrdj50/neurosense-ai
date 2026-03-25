import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.repositories import BaseRepository

logger = logging.getLogger(__name__)


class SessionRepository(BaseRepository):
    def _init_schema(self) -> None:
        with self.db.get_connection() as conn:
            conn.execute('''
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
                )
            ''')

    def save(
        self,
        patient_id: str,
        results: Dict[str, Any],
        patient_name: str = 'Anonymous',
    ) -> int:
        mri = results.get('mri', {})
        cog = results.get('cognitive', {})
        sent = results.get('sentiment', {})
        risk = results.get('risk_profile', {})
        fusion = results.get('final_stage', {})

        with self.db.get_connection() as conn:
            cursor = conn.execute(
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
        logger.info("Saved session for patient %s", patient_id)
        return cursor.lastrowid

    def get_history(self, patient_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        rows = self.db.fetch_all(
            '''SELECT id, patient_id, patient_name, timestamp,
                      mri_stage, mri_confidence,
                      cognitive_score, sentiment_risk, risk_score,
                      final_stage, final_confidence
               FROM sessions
               WHERE patient_id = ?
               ORDER BY timestamp DESC LIMIT ?''',
            (patient_id, limit),
        )
        return rows

    def get_session_detail(self, session_id: int) -> Optional[Dict[str, Any]]:
        row = self.db.fetch_one('SELECT * FROM sessions WHERE id = ?', (session_id,))
        if not row:
            return None
        
        result = dict(row)
        if result.get('results_json'):
            result['full_results'] = json.loads(result['results_json'])
        return result

    def get_trends(self, patient_id: str) -> Dict[str, Any]:
        history = self.get_history(patient_id, limit=50)
        history.reverse()

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
        with self.db.get_connection() as conn:
            cursor = conn.execute('DELETE FROM sessions WHERE patient_id = ?', (patient_id,))
        logger.info("Deleted %d sessions for patient %s", cursor.rowcount, patient_id)
        return cursor.rowcount
