"""
API endpoint integration tests.
"""

import pytest


class TestSentimentEndpoint:
    def test_analyze_sentiment_success(self, client):
        """POST /analyze-sentiment with valid text should return results."""
        resp = client.post('/analyze-sentiment', json={
            'text': 'I am feeling very worried and confused today. I forgot where I put my keys.'
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'sentiment_label' in data
        assert 'cognitive_risk_score' in data
        assert data['word_count'] > 0

    def test_analyze_sentiment_empty(self, client):
        """POST /analyze-sentiment with empty text should return 400."""
        resp = client.post('/analyze-sentiment', json={'text': ''})
        assert resp.status_code == 400


class TestCognitiveEndpoint:
    def test_cognitive_test(self, client):
        """POST /cognitive-test with valid data should return scores."""
        resp = client.post('/cognitive-test', json={
            'mini_cog': 3,
            'serial_7s': 4,
            'orientation': 8,
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'composite_score' in data

    def test_cognitive_test_empty(self, client):
        """POST /cognitive-test with no data should return 400."""
        resp = client.post('/cognitive-test',
                           data='',
                           content_type='application/json')
        assert resp.status_code == 400


class TestRiskProfileEndpoint:
    def test_risk_profile(self, client):
        """POST /risk-profile with risk factors should return score."""
        resp = client.post('/risk-profile', json={
            'age': 75,
            'family_history': True,
            'education_years': 8,
            'physical_activity': 'low',
        })
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'overall_risk_score' in data


class TestPatients:
    def test_list_patients(self, client):
        """GET /api/patients should return patient list."""
        resp = client.get('/api/patients')
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'patients' in data
        assert len(data['patients']) >= 10  # seeded patients


class TestRootRedirect:
    def test_unauthenticated_redirect(self, client):
        """GET / without auth should redirect to login."""
        resp = client.get('/')
        assert resp.status_code in (302, 308)
