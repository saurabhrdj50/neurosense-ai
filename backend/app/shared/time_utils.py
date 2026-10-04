"""Timezone-aware UTC time helpers.

Timestamps are persisted as ISO-8601 strings. Rows written before the
audit fix used naive local-time strings; everything new is aware UTC.
`parse_timestamp` normalizes both so comparisons and arithmetic are correct
regardless of server timezone.
"""
from datetime import datetime, timezone


def utc_now() -> datetime:
    """Current time as a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def utc_now_iso() -> str:
    """Current time as an ISO-8601 string with explicit UTC offset."""
    return utc_now().isoformat()


def parse_timestamp(value) -> datetime:
    """Parse an ISO timestamp string/datetime; naive values are treated as UTC."""
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(str(value))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt
