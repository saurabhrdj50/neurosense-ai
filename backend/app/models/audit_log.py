from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Index, Text
from sqlalchemy.orm import relationship
from app.core.db_orm import Base


class AuditLog(Base):
    """
    Immutable audit trail for administrative and clinical actions.
    Records who performed an action, on what resource, and when.
    """
    __tablename__ = 'audit_log'

    id = Column(Integer, primary_key=True, autoincrement=True)
    # Who performed the action
    actor_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    actor_username = Column(String, nullable=True)
    actor_role = Column(String, nullable=True)
    # What action was taken
    action = Column(String, nullable=False)          # e.g. 'DELETE_PATIENT', 'DELETE_SESSION'
    resource_type = Column(String, nullable=False)    # e.g. 'patient', 'session', 'doctor'
    resource_id = Column(String, nullable=True)       # e.g. "PAT-1001" or "42"
    resource_name = Column(String, nullable=True)     # human-readable label
    details = Column(Text, nullable=True)             # optional JSON metadata
    timestamp = Column(String, nullable=False, default=datetime.now().isoformat)

    actor = relationship('User', lazy='joined', foreign_keys=[actor_id])

    __table_args__ = (
        Index('idx_audit_log_actor_id', 'actor_id'),
        Index('idx_audit_log_action', 'action'),
        Index('idx_audit_log_timestamp', 'timestamp'),
        Index('idx_audit_log_resource', 'resource_type', 'resource_id'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'actor_id': self.actor_id,
            'actor_username': self.actor_username,
            'actor_role': self.actor_role,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'resource_name': self.resource_name,
            'details': self.details,
            'timestamp': self.timestamp,
        }
