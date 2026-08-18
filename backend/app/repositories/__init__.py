from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from app.core.database import Database


class BaseRepository(ABC):
    """Abstract base class for all repositories."""
    
    def __init__(self, db_path: Optional[str] = None):
        self.db = Database.get_instance(db_path)
        self._init_schema()
    
    @abstractmethod
    def _init_schema(self) -> None:
        """Initialize database schema for this repository."""
        pass
    
    def _row_to_dict(self, row) -> Dict[str, Any]:
        if row is None:
            return {}
        if isinstance(row, dict):
            return row
        return dict(row)
