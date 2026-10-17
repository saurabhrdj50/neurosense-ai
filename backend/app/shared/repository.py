from typing import Optional, Dict, Any


class BaseRepository:
    """Base class for all repositories.

    Repositories are cheap, stateless objects: schema creation and demo-data
    seeding live in :mod:`app.shared.bootstrap` and run once at startup, so
    constructing a repository per request does no DDL. ``db_path`` is a legacy
    test hook that must be set before the engine is first created.
    """

    def __init__(self, db_path: Optional[str] = None) -> None:
        if db_path:
            from app.config.settings import Config
            Config.DB_PATH = str(db_path)

    def _row_to_dict(self, row) -> Dict[str, Any]:
        if row is None:
            return {}
        if isinstance(row, dict):
            return row
        return dict(row)
