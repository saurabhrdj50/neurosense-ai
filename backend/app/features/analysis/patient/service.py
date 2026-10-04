"""Patient step of the analysis workflow (mirrors analysis/patient/).

Owns HTTP form parsing for patient fields. Persistence (avatar storage and
create-or-update) lives in ``app/features/patients/service.py``.
"""

_PATIENT_ID_CHARS = set(
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'
)


def parse_patient_info(form) -> dict:
    """Extract and validate patient fields from multipart form data.

    Raises ValueError on malformed input so the route can return 400 instead
    of persisting corrupted values.
    """
    patient_info = {}
    for field in ('name', 'age', 'sex', 'patient_id', 'education_years'):
        val = (form.get(field) or '').strip()
        if not val:
            continue
        if field in ('age', 'education_years'):
            # Numeric fields must be real integers — a string like "70.5"
            # would previously be stored verbatim and crash Postgres inserts.
            try:
                num = int(float(val))
            except (TypeError, ValueError):
                raise ValueError(f"'{field}' must be a whole number, got '{val}'")
            if field == 'age' and not (0 <= num <= 150):
                raise ValueError(f"'age' must be between 0 and 150, got {num}")
            if field == 'education_years' and not (0 <= num <= 50):
                raise ValueError(f"'education_years' must be between 0 and 50, got {num}")
            patient_info[field] = num
        else:
            patient_info[field] = val

    pid = patient_info.get('patient_id')
    if pid and (len(pid) > 64 or not set(pid) <= _PATIENT_ID_CHARS):
        raise ValueError(
            "'patient_id' may only contain letters, numbers, hyphens and "
            "underscores (max 64 characters)"
        )

    photo_data = (form.get('photo') or '').strip()
    if photo_data and photo_data.startswith('data:image'):
        patient_info['photo'] = photo_data

    patient_notes = (form.get('patient_text') or '').strip()
    if patient_notes:
        patient_info['notes'] = patient_notes

    return patient_info
