"""
API endpoint integration tests.
"""

import pytest


class TestRemovedSingleModalityEndpoints:
    @pytest.mark.parametrize("path", [
        '/api/analysis/mri',
        '/api/analysis/sentiment',
        '/api/analysis/cognitive',
        '/api/analysis/risk',
        '/api/analysis/transcribe',
    ])
    def test_deprecated_endpoints_gone(self, authenticated_client, path):
        """Deprecated single-modality endpoints were removed; full analysis is via /analyze."""
        resp = authenticated_client.post(path, json={'text': 'hello'})
        assert resp.status_code == 404

    def test_analyze_requires_auth(self, client):
        resp = client.post('/api/analysis/analyze')
        assert resp.status_code == 401

    def test_mri_preview_requires_auth(self, client):
        resp = client.post('/api/analysis/mri/preview')
        assert resp.status_code == 401


class TestPatients:
    def test_list_patients(self, authenticated_client):
        """GET /api/patients should return patient list (requires auth)."""
        resp = authenticated_client.get('/api/patients')
        assert resp.status_code == 200
        data = resp.json()
        assert 'patients' in data
        assert len(data['patients']) > 0  # seeded patients

    def test_create_patient_with_avatar_stores_file(self, authenticated_client):
        """POST /api/patients with a base64 photo must write a real PNG under
        the doctor's storage tree and store the relative path, not the data URL."""
        png = (
            'data:image/png;base64,'
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        )
        resp = authenticated_client.post('/api/patients', json={
            'patient_id': 'PAT-AVATAR-1',
            'name': 'Avatar Test',
            'age': 66,
            'sex': 'F',
            'photo': png,
        })
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data['success'] is True

        from app.config.settings import Config
        from app.shared.db_orm import SessionLocal
        from app.shared.models.patient import Patient
        with SessionLocal() as db:
            row = db.query(Patient).filter(Patient.patient_id == 'PAT-AVATAR-1').first()
            assert row is not None
            assert row.photo and row.photo.startswith('doctors/'), row.photo
            stored = Config.UPLOAD_FOLDER / row.photo
            assert stored.exists(), f"avatar missing on disk: {stored}"
            assert stored.read_bytes().startswith(b'\x89PNG')

    def test_create_patient_with_bad_avatar_is_dropped_not_stored(self, authenticated_client):
        """A non-image 'data:image' payload must not be persisted raw."""
        resp = authenticated_client.post('/api/patients', json={
            'patient_id': 'PAT-AVATAR-2',
            'name': 'Bad Avatar Test',
            'sex': 'M',
            'photo': 'data:image/png;base64,not-a-real-image',
        })
        assert resp.status_code == 200
        from app.shared.db_orm import SessionLocal
        from app.shared.models.patient import Patient
        with SessionLocal() as db:
            row = db.query(Patient).filter(Patient.patient_id == 'PAT-AVATAR-2').first()
            assert row is not None
            assert not (row.photo or '').startswith('data:')

    def test_create_patient_null_fields_rejected_not_500(self, authenticated_client):
        """JSON null in required string fields must yield a clean 400, never
        an AttributeError → 500."""
        resp = authenticated_client.post('/api/patients', json={
            'patient_id': None,
            'name': None,
            'sex': 'M',
        })
        assert resp.status_code == 400
        assert resp.json()['success'] is False


class TestDataVersion:
    """The global data-version marker: the mechanism that makes deletes and
    new analyses visible in every other session (poll + invalidate)."""

    def test_version_requires_auth(self, client):
        assert client.get('/api/meta/data-version').status_code == 401

    def test_version_bumps_on_patient_create_and_delete(self, authenticated_client):
        c = authenticated_client
        v0 = c.get('/api/meta/data-version').json()['version']

        resp = c.post('/api/patients', json={
            'patient_id': 'PAT-DV-1', 'name': 'Version Probe', 'age': 70, 'sex': 'M'})
        assert resp.status_code == 200
        v1 = c.get('/api/meta/data-version').json()['version']
        assert v1 > v0, 'patient create must bump the data version'

        resp = c.delete('/api/patients/PAT-DV-1')
        assert resp.status_code == 200
        v2 = c.get('/api/meta/data-version').json()['version']
        assert v2 > v1, 'patient delete must bump the data version'

    def test_version_is_monotonic_across_reads(self, authenticated_client):
        c = authenticated_client
        v1 = c.get('/api/meta/data-version').json()['version']
        v2 = c.get('/api/meta/data-version').json()['version']
        assert v2 >= v1


class TestRootRoute:
    def test_root_returns_api_summary(self, client):
        """GET / should return the API JSON summary."""
        resp = client.get('/')
        assert resp.status_code == 200
        assert 'NeuroSense AI' in resp.json()['message']

