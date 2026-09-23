import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.db_orm import Base


class Session(Base):
    __tablename__ = 'sessions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey('patients.patient_id', ondelete='CASCADE'), nullable=False)
    patient_name = Column(String, nullable=False)
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    timestamp = Column(String, default=datetime.now().isoformat)
    mri_stage = Column(String, nullable=True)
    mri_confidence = Column(Float, nullable=True)
    cognitive_score = Column(Float, nullable=True)
    sentiment_risk = Column(Float, nullable=True)
    risk_score = Column(Float, nullable=True)
    final_stage = Column(String, nullable=True)
    final_confidence = Column(Float, nullable=True)
    results_json = Column(Text, nullable=False)

    # Relationships
    patient = relationship('Patient', back_populates='sessions', lazy='joined',
                           foreign_keys=[patient_id])
    created_by_user = relationship('User', back_populates='sessions', lazy='joined')

    # Composite indexes for common query patterns
    __table_args__ = (
        Index('idx_sessions_patient_timestamp', 'patient_id', 'timestamp'),
        Index('idx_sessions_created_by_timestamp', 'created_by', 'timestamp'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'session_id': str(self.id),
            'patient_id': self.patient_id,
            'patient_name': self.patient_name,
            'created_by': self.created_by,
            'timestamp': self.timestamp,
            'mri_stage': self.mri_stage,
            'mri_confidence': self.mri_confidence,
            'cognitive_score': self.cognitive_score,
            'sentiment_risk': self.sentiment_risk,
            'risk_score': self.risk_score,
            'final_stage': self.final_stage,
            'final_confidence': self.final_confidence,
            'results_json': self.results_json,
        }


# Alias for backward compatibility
AnalysisSession = Session
