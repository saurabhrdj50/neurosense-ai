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
        data = resp.get_json()
        assert 'patients' in data
        assert len(data['patients']) > 0  # seeded patients


class TestRootRoute:
    def test_root_returns_api_summary(self, client):
        """GET / should return the API JSON summary."""
        resp = client.get('/')
        assert resp.status_code == 200
        assert 'NeuroSense AI' in resp.get_json()['message']

