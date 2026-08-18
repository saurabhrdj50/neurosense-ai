"""
Tests for FacialEmotionAnalyzer — scoring logic and edge cases.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.modules.vision.facial.analyzer import FacialEmotionAnalyzer


class TestScoreProfile:
    def setup_method(self):
        self.analyzer = FacialEmotionAnalyzer()

    def test_high_apathy_score(self):
        """High neutral emotion should produce high risk."""
        emotions = {
            'angry': 0.0, 'disgust': 0.0, 'fear': 0.0,
            'happy': 0.0, 'sad': 0.0, 'surprise': 0.0, 'neutral': 0.9
        }
        result = self.analyzer._score_profile(emotions, 10)
        assert result['visual_risk_score'] > 20

    def test_normal_emotions(self):
        """Happy dominant emotion should produce low risk."""
        emotions = {
            'angry': 0.0, 'disgust': 0.0, 'fear': 0.0,
            'happy': 0.8, 'sad': 0.0, 'surprise': 0.1, 'neutral': 0.1
        }
        result = self.analyzer._score_profile(emotions, 10)
        assert result['visual_risk_score'] < 40
        assert result['dominant_emotion'] == 'happy'


class TestErrorResults:
    def setup_method(self):
        self.analyzer = FacialEmotionAnalyzer()

    def test_unavailable_result(self):
        """Unavailable result should have zero risk."""
        result = self.analyzer._unavailable_result()
        assert result['visual_risk_score'] == 0
        assert result['risk_label'] == 'Unavailable'

    def test_empty_result(self):
        """Empty result should have zero risk."""
        result = self.analyzer._empty_result()
        assert result['visual_risk_score'] == 0

    def test_no_face_result(self):
        """No face result should have zero risk."""
        result = self.analyzer._no_face_result()
        assert result['risk_label'] == 'No Face Detected'
