import base64
import logging
from typing import List, Dict, Any

import numpy as np

logger = logging.getLogger(__name__)

cv2 = None
HAS_CV2 = False

try:
    import cv2 as cv2_module
    cv2 = cv2_module
    HAS_CV2 = True
except ImportError:
    logger.warning("OpenCV not installed.")

FER = None
HAS_FER = False

try:
    from fer import FER as FER_module
    FER = FER_module
    HAS_FER = True
except ImportError:
    logger.warning("FER not installed.")


class FacialEmotionAnalyzer:
    def __init__(self) -> None:
        self.detector = None
        if HAS_FER and HAS_CV2 and FER is not None:
            try:
                self.detector = FER(mtcnn=False)
            except Exception as e:
                logger.error("FER init error: %s", e)

    def analyze_frames(self, frames_base64: List[str]) -> Dict[str, Any]:
        if not self.detector or not HAS_CV2 or cv2 is None:
            return self._unavailable_result()

        if not frames_base64:
            return self._empty_result()

        aggregated_emotions = {
            'angry': 0.0, 'disgust': 0.0, 'fear': 0.0,
            'happy': 0.0, 'sad': 0.0, 'surprise': 0.0, 'neutral': 0.0
        }
        faces_detected = 0

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
            except Exception as e:
                logger.error("Frame error: %s", e)
                continue

        if faces_detected == 0:
            return self._no_face_result()

        return self._score_profile(aggregated_emotions, faces_detected)

    def _score_profile(self, emotions: Dict[str, float], frame_count: int) -> Dict[str, Any]:
        apathy_score = emotions.get('neutral', 0.0) * 100
        frustration_score = (emotions.get('fear', 0.0) + emotions.get('angry', 0.0) + emotions.get('sad', 0.0)) * 100
        risk_score = (apathy_score * 0.4) + (frustration_score * 0.3)
        risk_score = min(100.0, risk_score)

        if risk_score > 65:
            label, color = "High Risk", "#ef4444"
            stage_idx = 3
        elif risk_score > 40:
            label, color = "Moderate Risk", "#f97316"
            stage_idx = 2
        elif risk_score > 20:
            label, color = "Low Risk", "#eab308"
            stage_idx = 1
        else:
            label, color = "Normal Affect", "#22c55e"
            stage_idx = 0

        dominant = max(emotions.items(), key=lambda x: x[1]) if emotions else ('neutral', 1.0)

        return {
            'visual_risk_score': round(risk_score, 1),
            'risk_label': label,
            'risk_color': color,
            'stage_index': stage_idx,
            'dominant_emotion': dominant[0],
            'dominant_confidence': round(dominant[1] * 100, 1),
            'emotion_distribution': emotions,
            'frames_analyzed': frame_count
        }

    def _unavailable_result(self) -> Dict[str, Any]:
        return {'visual_risk_score': 0, 'risk_label': 'Unavailable', 'risk_color': '#6366f1',
                'emotion_distribution': {}, 'frames_analyzed': 0, 'error': 'FER not installed'}

    def _empty_result(self) -> Dict[str, Any]:
        return {'visual_risk_score': 0, 'risk_label': 'No Video', 'risk_color': '#6366f1',
                'emotion_distribution': {}, 'frames_analyzed': 0}

    def _no_face_result(self) -> Dict[str, Any]:
        return {'visual_risk_score': 0, 'risk_label': 'No Face Detected', 'risk_color': '#6366f1',
                'emotion_distribution': {}, 'frames_analyzed': 0}
