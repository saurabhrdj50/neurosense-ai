import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.repositories import BaseRepository
from app.core.db_orm import SessionLocal, init_db
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


class AuditRepository(BaseRepository):
    def _init_schema(self) -> None:
        init_db()

    def log(
        self,
        action: str,
        resource_type: str,
        actor_id: Optional[int] = None,
        actor_username: Optional[str] = None,
        actor_role: Optional[str] = None,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> int:
        with SessionLocal() as db:
            entry = AuditLog(
                actor_id=actor_id,
                actor_username=actor_username,
                actor_role=actor_role,
                action=action,
                resource_type=resource_type,
                resource_id=str(resource_id) if resource_id is not None else None,
                resource_name=resource_name,
                details=json.dumps(details, default=str) if details else None,
                timestamp=datetime.now().isoformat(),
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)
            logger.info("Audit: %s %s [%s] by %s", action, resource_type, resource_id, actor_username)
            return entry.id

    def get_logs(
        self,
        limit: int = 50,
        offset: int = 0,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        with SessionLocal() as db:
            query = db.query(AuditLog)
            if action:
                query = query.filter(AuditLog.action == action)
            if resource_type:
                query = query.filter(AuditLog.resource_type == resource_type)

            entries = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
            return [e.to_dict() for e in entries]

    def count(self, action: Optional[str] = None, resource_type: Optional[str] = None) -> int:
        with SessionLocal() as db:
            query = db.query(AuditLog)
            if action:
                query = query.filter(AuditLog.action == action)
            if resource_type:
                query = query.filter(AuditLog.resource_type == resource_type)
            return query.count()
