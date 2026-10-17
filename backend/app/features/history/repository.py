import json
import logging
from typing import Optional, List, Dict, Any

from app.shared.repository import BaseRepository
from app.shared.db_orm import SessionLocal
from app.shared.models.session import Session
from app.shared.models.patient import Patient
from app.shared.time_utils import utc_now_iso

logger = logging.getLogger(__name__)


class SessionRepository(BaseRepository):
    """Analysis-session persistence. Schema lives in app.shared.bootstrap."""

    def save(
        self,
        patient_id: str,
        results: Dict[str, Any],
        patient_name: str = 'Anonymous',
        created_by: Optional[int] = None,
    ) -> int:
        mri = results.get('mri', {})
        cog = results.get('cognitive', {})
        sent = results.get('sentiment', {})
        risk = results.get('risk_profile', {})
        fusion = results.get('final_stage', {})

        with SessionLocal() as db:
            new_sess = Session(
                patient_id=patient_id,
                patient_name=patient_name,
                created_by=created_by,
                timestamp=utc_now_iso(),
                mri_stage=mri.get('stage'),
                mri_confidence=mri.get('confidence'),
                cognitive_score=cog.get('composite_score'),
                sentiment_risk=sent.get('cognitive_risk_score'),
                risk_score=risk.get('overall_risk_score'),
                final_stage=fusion.get('stage'),
                final_confidence=fusion.get('confidence'),
                results_json=json.dumps(results, default=str)
            )
            db.add(new_sess)
            db.commit()
            db.refresh(new_sess)
            
            logger.info("Saved session for patient %s by user %s", patient_id, created_by)
            return new_sess.id

    def update_results(self, session_id: int, results: Dict[str, Any]) -> bool:
        """Overwrite a session's stored results (per-modality retry).

        Column extraction mirrors :meth:`save` so list views, trends and the
        dashboard stay consistent with the updated full_results JSON. The
        original timestamp is kept — a retry corrects the same assessment,
        it does not create a new point in the longitudinal timeline.
        """
        mri = results.get('mri', {})
        cog = results.get('cognitive', {})
        sent = results.get('sentiment', {})
        risk = results.get('risk_profile', {})
        fusion = results.get('final_stage', {})

        with SessionLocal() as db:
            sess = db.query(Session).filter(Session.id == session_id).first()
            if not sess:
                return False
            sess.mri_stage = mri.get('stage')
            sess.mri_confidence = mri.get('confidence')
            sess.cognitive_score = cog.get('composite_score')
            sess.sentiment_risk = sent.get('cognitive_risk_score')
            sess.risk_score = risk.get('overall_risk_score')
            sess.final_stage = fusion.get('stage')
            sess.final_confidence = fusion.get('confidence')
            sess.results_json = json.dumps(results, default=str)
            db.commit()
            logger.info("Updated stored results for session %d", session_id)
            return True

    def get_history(self, patient_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        with SessionLocal() as db:
            sessions = db.query(Session).filter(
                Session.patient_id == patient_id
            ).order_by(Session.timestamp.desc()).limit(limit).all()
            return [self._format_session(s.to_dict(), include_results=True) for s in sessions]

    def get_all(self, limit: Optional[int] = None, offset: int = 0) -> List[Dict[str, Any]]:
        with SessionLocal() as db:
            query = db.query(Session).order_by(Session.timestamp.desc())
            if limit is not None:
                sessions = query.offset(max(offset, 0)).limit(limit).all()
            else:
                sessions = query.all()
            return [self._format_session(s.to_dict()) for s in sessions]

    def get_for_doctor(self, doctor_id: int, limit: Optional[int] = None,
                       offset: int = 0) -> List[Dict[str, Any]]:
        with SessionLocal() as db:
            query = db.query(Session).outerjoin(
                Patient, Session.patient_id == Patient.patient_id
            ).filter(
                (Session.created_by == doctor_id) | (Patient.created_by == doctor_id)
            ).order_by(Session.timestamp.desc())
            if limit is not None:
                sessions = query.offset(max(offset, 0)).limit(limit).all()
            else:
                sessions = query.all()
            return [self._format_session(s.to_dict()) for s in sessions]

    def count_all(self) -> int:
        with SessionLocal() as db:
            return int(db.query(Session).count())

    def count_for_doctor(self, doctor_id: int) -> int:
        with SessionLocal() as db:
            return int(db.query(Session).outerjoin(
                Patient, Session.patient_id == Patient.patient_id
            ).filter(
                (Session.created_by == doctor_id) | (Patient.created_by == doctor_id)
            ).count())

    def get_session_detail(self, session_id: int) -> Optional[Dict[str, Any]]:
        with SessionLocal() as db:
            sess = db.query(Session).filter(Session.id == session_id).first()
            if not sess:
                return None
            result = sess.to_dict()
            if result.get('results_json'):
                result['full_results'] = self._safe_json_loads(result['results_json'])
            return self._format_session(result, include_results=True)

    def get_by_id(self, session_id: int) -> Optional[Dict[str, Any]]:
        return self.get_session_detail(session_id)

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

    def delete_patient(self, patient_id: str, session=None, conn=None) -> int:
        # `conn` is a legacy no-op parameter kept for call-site compatibility;
        # pass `session` (from db_orm.session_scope) for transactional deletes.
        if session is not None:
            return session.query(Session).filter(Session.patient_id == patient_id).delete()
        with SessionLocal() as db:
            deleted = db.query(Session).filter(Session.patient_id == patient_id).delete()
            db.commit()
            logger.info("Deleted %d sessions for patient %s", deleted, patient_id)
            return deleted

    def delete_created_by(self, user_id: int, session=None, conn=None) -> int:
        if session is not None:
            return session.query(Session).filter(Session.created_by == user_id).delete()
        with SessionLocal() as db:
            deleted = db.query(Session).filter(Session.created_by == user_id).delete()
            db.commit()
            return deleted

    def _format_session(self, data: Dict[str, Any], include_results: bool = False) -> Dict[str, Any]:
        stage = data.get('final_stage') or data.get('mri_stage')
        confidence = data.get('final_confidence')
        if confidence is None:
            confidence = data.get('mri_confidence')

        data['session_id'] = data.get('id')
        data['created_at'] = data.get('timestamp')
        data['stage'] = stage
        data['confidence'] = confidence or 0
        data['patient_info'] = {
            'patient_id': data.get('patient_id'),
            'name': data.get('patient_name'),
        }

        if include_results:
            results = data.get('full_results')
            if results is None and data.get('results_json'):
                results = self._safe_json_loads(data.get('results_json'))
            data['results'] = results or {}

        data.pop('results_json', None)
        data.pop('full_results', None)
        return data

    @staticmethod
    def _safe_json_loads(value: Optional[str]) -> Dict[str, Any]:
        if not value:
            return {}
        try:
            return json.loads(value)
        except Exception:
            return {}
