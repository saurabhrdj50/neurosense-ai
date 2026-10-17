from sqlalchemy import Column, String
from app.shared.db_orm import Base
from app.shared.time_utils import utc_now_iso


class AppMeta(Base):
    """Key/value table for one-time bookkeeping flags (e.g. demo seeding)."""
    __tablename__ = 'app_meta'

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)
    updated_at = Column(String, nullable=False, default=utc_now_iso)
