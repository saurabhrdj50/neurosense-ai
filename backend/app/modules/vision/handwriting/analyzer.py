import base64
import numpy as np
import logging

logger = logging.getLogger(__name__)

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False
    logger.warning("OpenCV not installed.")


class HandwritingAnalyzer:
    def __init__(self):
        if not HAS_CV2:
            logger.warning("Install opencv-python-headless for full functionality.")

    def analyze(self, image_path: str = None, image_base64: str = None) -> dict:
        if not HAS_CV2:
            return self._unavailable_result()

        try:
            if image_base64:
                img_data = base64.b64decode(image_base64)
                img_array = np.frombuffer(img_data, dtype=np.uint8)
                img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            elif image_path:
                img = cv2.imread(image_path)
            else:
                return self._empty_result()

            if img is None:
                return self._empty_result()

            return self._process(img)

        except Exception as e:
            return {'error': str(e), 'handwriting_risk_score': 0}

    def _process(self, img: np.ndarray) -> dict:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if len(contours) < 2:
            return self._insufficient_result()

        tremor = self._compute_tremor(contours)
        pressure = self._compute_pressure_variance(gray, binary)
        size_var = self._compute_size_variance(contours)
        straightness = self._compute_straightness(contours, gray.shape[0])
        spacing = self._compute_spacing(contours, gray.shape[1])

        features = {
            'tremor': {'score': tremor, 'weight': 0.25, 'label': 'Tremor / Shakiness'},
            'pressure_variance': {'score': pressure, 'weight': 0.15, 'label': 'Pressure Variance'},
            'size_variance': {'score': size_var, 'weight': 0.20, 'label': 'Letter Size Variance'},
            'straightness': {'score': straightness, 'weight': 0.15, 'label': 'Line Deviation'},
            'spacing': {'score': spacing, 'weight': 0.15, 'label': 'Spacing Irregularity'},
        }

        composite = sum(f['score'] * f['weight'] for f in features.values())
        composite = round(min(composite, 100), 1)

        for f in features.values():
            f['color'] = self._score_color(f['score'])

        risk = self._risk_level(composite)

        return {
            'handwriting_risk_score': composite,
            'risk_label': risk['label'],
            'risk_color': risk['color'],
            'risk_description': risk['description'],
            'features': features,
            'contour_count': len(contours),
            'recommendations': risk['recommendations'],
            'stage_estimate': risk['stage_estimate'],
            'stage_index': risk['stage_index'],
        }

    def _compute_tremor(self, contours) -> float:
        total_deviation = 0
        total_length = 0
        for cnt in contours:
            if len(cnt) < 5:
                continue
            epsilon = 0.02 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            orig_len = cv2.arcLength(cnt, True)
            smooth_len = cv2.arcLength(approx, True)
            if smooth_len > 0:
                ratio = orig_len / smooth_len
                total_deviation += (ratio - 1.0) * orig_len
                total_length += orig_len
        if total_length == 0:
            return 0
        return round(min(total_deviation / total_length * 100 * 15, 100), 1)

    def _compute_pressure_variance(self, gray, binary) -> float:
        stroke_pixels = gray[binary > 0]
        if len(stroke_pixels) < 10:
            return 0
        variance = np.std(stroke_pixels.astype(float))
        return round(min(variance / 60 * 100, 100), 1)

    def _compute_size_variance(self, contours) -> float:
        areas = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 20:
                areas.append(area)
        if len(areas) < 3:
            return 0
        mean_area = np.mean(areas)
        std_area = np.std(areas)
        if mean_area == 0:
            return 0
        cv = std_area / mean_area
        return round(min(cv * 50, 100), 1)

    def _compute_straightness(self, contours, img_height) -> float:
        centers_y = []
        for cnt in contours:
            M = cv2.moments(cnt)
            if M['m00'] > 0:
                cy = int(M['m01'] / M['m00'])
                centers_y.append(cy)
        if len(centers_y) < 3:
            return 0
        std_y = np.std(centers_y)
        return round(min(std_y / img_height * 500, 100), 1)

    def _compute_spacing(self, contours, img_width) -> float:
        bboxes = []
        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            if w > 3 and h > 3:
                bboxes.append((x, x + w))
        if len(bboxes) < 3:
            return 0
        bboxes.sort(key=lambda b: b[0])
        gaps = []
        for i in range(1, len(bboxes)):
            gap = bboxes[i][0] - bboxes[i - 1][1]
            if gap > 0:
                gaps.append(gap)
        if len(gaps) < 2:
            return 0
        mean_gap = np.mean(gaps)
        std_gap = np.std(gaps)
        if mean_gap == 0:
            return 0
        cv = std_gap / mean_gap
        return round(min(cv * 60, 100), 1)

    @staticmethod
    def _score_color(s):
        if s >= 65: return '#ef4444'
        if s >= 40: return '#f97316'
        if s >= 20: return '#eab308'
        return '#22c55e'

    @staticmethod
    def _risk_level(score):
        if score >= 65:
            return {'label': 'High Risk', 'color': '#ef4444',
                    'description': 'Significant handwriting deterioration.',
                    'recommendations': ['Urgent neurological evaluation.'],
                    'stage_estimate': 'Moderate Demented', 'stage_index': 3}
        elif score >= 40:
            return {'label': 'Moderate Risk', 'color': '#f97316',
                    'description': 'Noticeable handwriting irregularities.',
                    'recommendations': ['Follow-up assessment in 3 months.'],
                    'stage_estimate': 'Mild Demented', 'stage_index': 2}
        elif score >= 20:
            return {'label': 'Low Risk', 'color': '#eab308',
                    'description': 'Minor handwriting variations.',
                    'recommendations': ['Routine monitoring.'],
                    'stage_estimate': 'Very Mild Demented', 'stage_index': 1}
        else:
            return {'label': 'Minimal Risk', 'color': '#22c55e',
                    'description': 'Handwriting appears normal.',
                    'recommendations': ['No concerns.'],
                    'stage_estimate': 'Non-Demented', 'stage_index': 0}

    def _empty_result(self):
        return {'handwriting_risk_score': 0, 'risk_label': 'No Data', 'risk_color': '#6366f1',
                'risk_description': 'No handwriting sample provided.', 'features': {},
                'recommendations': ['Provide a handwriting sample.']}

    def _unavailable_result(self):
        return {'handwriting_risk_score': 0, 'risk_label': 'Unavailable', 'risk_color': '#6366f1',
                'risk_description': 'OpenCV not installed.', 'features': {},
                'recommendations': ['Install OpenCV.']}

    def _insufficient_result(self):
        return {'handwriting_risk_score': 0, 'risk_label': 'Insufficient', 'risk_color': '#eab308',
                'risk_description': 'Not enough handwriting content.', 'features': {},
                'recommendations': ['Write more content.']}
