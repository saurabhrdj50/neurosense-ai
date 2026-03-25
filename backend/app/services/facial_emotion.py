"""
Webcam Facial Emotion Recognition Module
Detects facial micro-expressions to track emotional state during the audio speech test.
Crucial indicators for Alzheimer's:
- High Apathy (Neutral)
- Confusion/Frustration (Fear/Angry)
"""

from __future__ import annotations

import base64
import logging
from typing import Optional, List, Dict, Any, TYPE_CHECKING

import numpy as np

logger = logging.getLogger(__name__)

# Optional imports with graceful fallback
cv2 = None
HAS_CV2 = False

try:
    import cv2 as cv2_module
    cv2 = cv2_module
    HAS_CV2 = True
except ImportError:
    logger.warning("OpenCV not installed — computer vision features disabled.")

FER = None
HAS_FER = False

try:
    from fer import FER as FER_module
    FER = FER_module
    HAS_FER = True
except ImportError:
    logger.warning("FER library not installed — emotion detection disabled.")

mp = None
mp_face_mesh = None
HAS_MP = False

try:
    import mediapipe as mp_module
    mp = mp_module
    if hasattr(mp, 'solutions'):
        mp_face_mesh = mp.solutions.face_mesh
        HAS_MP = True
    else:
        try:
            from mediapipe.python.solutions import face_mesh as face_mesh_module
            mp_face_mesh = face_mesh_module
            HAS_MP = True
        except ImportError:
            pass
except Exception as e:
    logger.warning("MediaPipe init error: %s — eye tracking disabled.", e)

# MediaPipe Eye landmarks for EAR calculation
RIGHT_EYE = [33, 160, 158, 133, 153, 144]
LEFT_EYE = [362, 385, 387, 263, 373, 380]


class FacialEmotionAnalyzer:
    """Analyzes a series of facial frames to determine average emotional state."""

    def __init__(self) -> None:
        self.detector = None
        
        if HAS_FER and HAS_CV2 and FER is not None:
            try:
                self.detector = FER(mtcnn=False)
                logger.info("FER loaded successfully.")
            except Exception as e:
                logger.error("FER init error: %s", e)
                self.detector = None
                
        self.face_mesh = None
        if HAS_MP and mp_face_mesh is not None:
            try:
                self.face_mesh = mp_face_mesh.FaceMesh(
                    static_image_mode=False,
                    max_num_faces=1,
                    refine_landmarks=True,
                    min_detection_confidence=0.5
                )
            except Exception as e:
                logger.error("MediaPipe FaceMesh init error: %s", e)
                self.face_mesh = None

    def analyze_frames(self, frames_base64: List[str]) -> Dict[str, Any]:
        """
        Analyze a list of base64-encoded JPEG/PNG frames.
        Returns aggregated emotion scores and a risk profile.
        """
        if not self.detector or not HAS_CV2 or cv2 is None:
            return self._unavailable_result()

        if not frames_base64:
            return self._empty_result()

        aggregated_emotions: Dict[str, float] = {
            'angry': 0.0, 'disgust': 0.0, 'fear': 0.0,
            'happy': 0.0, 'sad': 0.0, 'surprise': 0.0, 'neutral': 0.0
        }
        faces_detected = 0
        total_ear = 0.0
        blink_frames = 0
        saccade_variance: List[float] = []

        for b64 in frames_base64:
            try:
                if ',' in b64:
                    b64 = b64.split(',', 1)[1]
                img_data = base64.b64decode(b64)
                img_array = np.frombuffer(img_data, dtype=np.uint8)
                img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

                if img is None:
                    continue

                if self.detector:
                    result = self.detector.detect_emotions(img)
                    if result:
                        face = max(result, key=lambda x: x['box'][2] * x['box'][3])
                        for k, v in face['emotions'].items():
                            aggregated_emotions[k] = aggregated_emotions.get(k, 0.0) + v
                        faces_detected += 1
                
                if self.face_mesh is not None and cv2 is not None:
                    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                    mesh_res = self.face_mesh.process(rgb_img)
                    if mesh_res.multi_face_landmarks:
                        landmarks = mesh_res.multi_face_landmarks[0].landmark
                        
                        def calculate_ear(eye_indices: List[int]) -> float:
                            v1 = np.linalg.norm(np.array([landmarks[eye_indices[1]].x, landmarks[eye_indices[1]].y]) - 
                                                np.array([landmarks[eye_indices[5]].x, landmarks[eye_indices[5]].y]))
                            v2 = np.linalg.norm(np.array([landmarks[eye_indices[2]].x, landmarks[eye_indices[2]].y]) - 
                                                np.array([landmarks[eye_indices[4]].x, landmarks[eye_indices[4]].y]))
                            h_dist = np.linalg.norm(np.array([landmarks[eye_indices[0]].x, landmarks[eye_indices[0]].y]) - 
                                                    np.array([landmarks[eye_indices[3]].x, landmarks[eye_indices[3]].y]))
                            return (v1 + v2) / (2.0 * h_dist) if h_dist > 0 else 0.0

                        left_ear = calculate_ear(LEFT_EYE)
                        right_ear = calculate_ear(RIGHT_EYE)
                        avg_ear = (left_ear + right_ear) / 2.0
                        total_ear += avg_ear
                        
                        if avg_ear < 0.21:
                            blink_frames += 1
                        
                        if len(landmarks) > 473:
                            left_iris_x = landmarks[468].x
                            saccade_variance.append(float(left_iris_x))

            except Exception as e:
                logger.error("Frame processing error: %s", e)
                continue

        if faces_detected == 0 and total_ear == 0.0:
            return self._no_face_result()

        avg_ear_val = float(total_ear / len(frames_base64)) if frames_base64 else 0.0
        blink_ratio = float(blink_frames / len(frames_base64)) if frames_base64 else 0.0
        saccade_var = float(np.var(saccade_variance)) if saccade_variance else 0.0

        return self._score_profile(aggregated_emotions, faces_detected, avg_ear_val, blink_ratio, saccade_var)

    def _score_profile(
        self,
        emotions: Dict[str, float],
        frame_count: int,
        ear: float,
        blink_ratio: float,
        saccade_var: float
    ) -> Dict[str, Any]:
        """Calculate risk profile from emotion and ocular metrics."""
        apathy_score = emotions.get('neutral', 0.0) * 100
        frustration_score = (emotions.get('fear', 0.0) + emotions.get('angry', 0.0) + emotions.get('sad', 0.0)) * 100
        
        ocular_risk_pts = 0.0
        if blink_ratio < 0.05:
            ocular_risk_pts += 15.0
        if saccade_var < 0.0001:
            ocular_risk_pts += 15.0

        risk_score = (apathy_score * 0.4) + (frustration_score * 0.3) + ocular_risk_pts
        risk_score = min(100.0, risk_score) 
        
        if risk_score > 65:
            label, color = "High Risk (Apathy & Rigid Gaze)", "#ef4444"
            stage_idx = 3
        elif risk_score > 40:
            label, color = "Moderate Risk (Blunted Affect)", "#f97316"
            stage_idx = 2
        elif risk_score > 20:
            label, color = "Low Risk", "#eab308"
            stage_idx = 1
        else:
            label, color = "Normal Affect & Saccades", "#22c55e"
            stage_idx = 0

        dominant = ('neutral', 1.0)
        if emotions:
            try:
                dominant = max(emotions.items(), key=lambda x: x[1])
            except (ValueError, TypeError):
                pass

        ocular_stats = {
            'avg_ear': round(ear, 3),
            'blink_ratio': round(blink_ratio, 3),
            'saccadic_variance': round(saccade_var, 6),
            'gaze_rigidity_flag': saccade_var < 0.0001
        }

        return {
            'visual_risk_score': round(risk_score, 1),
            'risk_label': label,
            'risk_color': color,
            'stage_index': stage_idx,
            'dominant_emotion': dominant[0],
            'dominant_confidence': round(dominant[1] * 100, 1),
            'emotion_distribution': emotions,
            'ocular_biomarkers': ocular_stats,
            'frames_analyzed': frame_count
        }

    def _unavailable_result(self) -> Dict[str, Any]:
        return {
            'visual_risk_score': 0,
            'risk_label': 'Unavailable',
            'risk_color': '#6366f1',
            'emotion_distribution': {},
            'frames_analyzed': 0,
            'error': 'FER library not installed'
        }

    def _empty_result(self) -> Dict[str, Any]:
        return {
            'visual_risk_score': 0,
            'risk_label': 'No Video',
            'risk_color': '#6366f1',
            'emotion_distribution': {},
            'frames_analyzed': 0
        }

    def _no_face_result(self) -> Dict[str, Any]:
        return {
            'visual_risk_score': 0,
            'risk_label': 'No Face Detected',
            'risk_color': '#6366f1',
            'emotion_distribution': {},
            'frames_analyzed': 0
        }
