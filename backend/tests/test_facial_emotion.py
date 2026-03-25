"""
Tests for FacialEmotionAnalyzer — scoring logic and edge cases.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.facial_emotion import FacialEmotionAnalyzer


class TestScoreProfile:
    def setup_method(self):
        self.analyzer = FacialEmotionAnalyzer()

    def test_high_apathy_score(self):
        """High neutral emotion should produce high risk."""
        emotions = {
            'angry': 0.0, 'disgust': 0.0, 'fear': 0.0,
            'happy': 0.0, 'sad': 0.0, 'surprise': 0.0, 'neutral': 0.9
        }
        result = self.analyzer._score_profile(emotions, 10, ear=0.25, blink_ratio=0.1, saccade_var=0.001)
        assert result['visual_risk_score'] > 20

    def test_normal_emotions(self):
        """Happy dominant emotion should produce low risk."""
        emotions = {
            'angry': 0.0, 'disgust': 0.0, 'fear': 0.0,
            'happy': 0.8, 'sad': 0.0, 'surprise': 0.1, 'neutral': 0.1
        }
        result = self.analyzer._score_profile(emotions, 10, ear=0.3, blink_ratio=0.15, saccade_var=0.01)
        assert result['visual_risk_score'] < 40
        assert result['dominant_emotion'] == 'happy'

    def test_rigid_gaze_flag(self):
        """Very low saccadic variance should flag gaze rigidity."""
        emotions = {
            'angry': 0.0, 'disgust': 0.0, 'fear': 0.0,
            'happy': 0.0, 'sad': 0.0, 'surprise': 0.0, 'neutral': 0.5
        }
        result = self.analyzer._score_profile(emotions, 10, ear=0.2, blink_ratio=0.02, saccade_var=0.00001)
        assert result['ocular_biomarkers']['gaze_rigidity_flag'] is True

    def test_normal_gaze(self):
        """Normal saccadic variance should not flag gaze rigidity."""
        emotions = {
            'angry': 0.0, 'disgust': 0.0, 'fear': 0.0,
            'happy': 0.5, 'sad': 0.0, 'surprise': 0.0, 'neutral': 0.5
        }
        result = self.analyzer._score_profile(emotions, 10, ear=0.3, blink_ratio=0.15, saccade_var=0.01)
        assert result['ocular_biomarkers']['gaze_rigidity_flag'] is False

    def test_staring_blink_ratio(self):
        """Low blink ratio (staring) should add to risk."""
        emotions = {
            'angry': 0.0, 'disgust': 0.0, 'fear': 0.0,
            'happy': 0.0, 'sad': 0.0, 'surprise': 0.0, 'neutral': 0.5
        }
        result_staring = self.analyzer._score_profile(emotions, 10, ear=0.25, blink_ratio=0.02, saccade_var=0.01)
        result_normal = self.analyzer._score_profile(emotions, 10, ear=0.25, blink_ratio=0.15, saccade_var=0.01)
        assert result_staring['visual_risk_score'] > result_normal['visual_risk_score']


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
