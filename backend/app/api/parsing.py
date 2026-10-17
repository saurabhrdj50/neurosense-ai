"""Shared request-parsing helpers for the FastAPI port.

The Flask routes accepted JSON or form bodies interchangeably on the auth
endpoints; these helpers keep that behavior (some admin tooling and tests
post form-encoded bodies).
"""
import json
from typing import Any, Dict, Optional

from fastapi import Request


async def parse_json_or_form(request: Request, form_keys: tuple = ()) -> Dict[str, Any]:
    """Return a dict from a JSON body, falling back to form fields.

    Mirrors Flask routes: ``request.get_json() if request.is_json else {...form}``.
    """
    content_type = request.headers.get('content-type', '')
    if content_type.startswith('application/json'):
        try:
            data = await request.json()
        except Exception:
            return {}
        return data if isinstance(data, dict) else {}

    if form_keys:
        form = await request.form()
        return {k: form.get(k) for k in form_keys}

    # Some clients post JSON with a wrong/missing content-type: try JSON first.
    body = await request.body()
    if body:
        try:
            data = json.loads(body)
            if isinstance(data, dict):
                return data
        except Exception:
            pass
        form = await request.form()
        return dict(form)
    return {}


def parse_bool_str(value: Any) -> bool:
    """Multipart booleans arrive as strings ('true'/'false'/'1')."""
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')
