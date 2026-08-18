"""
API endpoint integration tests.
"""

import pytest


class TestSentimentEndpoint:
    def test_analyze_sentiment_success(self, client):
        """POST /api/analysis/sentiment with valid text should return results."""
        resp = client.post('/api/analysis/sentiment', json={
            'text': 'I am feeling very worried and confused today. I forgot where I put my keys.'
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'sentiment_label' in data
        assert 'cognitive_risk_score' in data
        assert data['word_count'] > 0

    def test_analyze_sentiment_empty(self, client):
        """POST /api/analysis/sentiment with empty text should return 400."""
        resp = client.post('/api/analysis/sentiment', json={'text': ''})
        assert resp.status_code == 400


class TestCognitiveEndpoint:
    def test_cognitive_test(self, client):
        """POST /api/analysis/cognitive with valid data should return scores."""
        resp = client.post('/api/analysis/cognitive', json={
            'mini_cog': 3,
            'serial_7s': 4,
            'orientation': 8,
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'composite_score' in data

    def test_cognitive_test_empty(self, client):
        """POST /api/analysis/cognitive with no data should return 400."""
        resp = client.post('/api/analysis/cognitive', json={})
        assert resp.status_code == 400


class TestRiskProfileEndpoint:
    def test_risk_profile(self, client):
        """POST /api/analysis/risk with risk factors should return score."""
        resp = client.post('/api/analysis/risk', json={
            'age': 75,
            'family_history': True,
            'education_years': 8,
            'physical_activity': 'low',
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'overall_risk_score' in data


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


class TestCDSRecommendations:
    def test_get_cds_recommendations_with_stage_string(self):
        from app.services.analysis_service import AnalysisOrchestrator
        orchestrator = AnalysisOrchestrator()
        res = orchestrator.get_cds_recommendations(
            stage='Mild Demented',
            patient_info={'age': 75, 'patient_id': 'P100'},
            risk_factors={'comorbidities': ['diabetes']}
        )
        assert 'treatment_plan' in res
        assert 'prognosis' in res
        assert 'patient_summary' in res
        assert res['patient_summary']['stage'] == 2

    def test_get_cds_recommendations_with_stage_int(self):
        from app.services.analysis_service import AnalysisOrchestrator
        orchestrator = AnalysisOrchestrator()
        res = orchestrator.get_cds_recommendations(stage=1)
        assert 'treatment_plan' in res
        assert res['patient_summary']['stage'] == 1

