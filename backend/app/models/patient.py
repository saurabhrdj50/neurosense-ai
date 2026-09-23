from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.db_orm import Base


class Patient(Base):
    __tablename__ = 'patients'

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    sex = Column(String, nullable=True)
    education_years = Column(Integer, nullable=True)
    stage = Column(String, nullable=True)
    photo = Column(String, nullable=True)
    notes = Column(String, default='')
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(String, default=datetime.now().isoformat)
    updated_at = Column(String, nullable=True)

    # Relationships
    created_by_user = relationship('User', back_populates='patients', lazy='joined')
    sessions = relationship('Session', back_populates='patient',
                            cascade='all, delete-orphan', lazy='dynamic',
                            primaryjoin='Patient.patient_id == foreign(Session.patient_id)')

    # Composite indexes for common query patterns
    __table_args__ = (
        Index('idx_patients_created_by_name', 'created_by', 'name'),
    )

    def to_dict(self):
        photo_val = self.photo
        if photo_val and photo_val.startswith('doctors/'):
            photo_val = f"/api/patients/photo/{self.patient_id}"

        # Expose doctor username if relationship is loaded
        doctor_username = None
        try:
            if self.created_by_user:
                doctor_username = self.created_by_user.username
        except Exception:
            pass

        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'name': self.name,
            'age': self.age,
            'sex': self.sex,
            'education_years': self.education_years,
            'stage': self.stage,
            'photo': photo_val,
            'notes': self.notes,
            'created_by': self.created_by,
            'doctor_username': doctor_username,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
        }
