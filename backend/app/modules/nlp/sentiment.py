import re
import logging
from typing import Dict, Any, Optional

from .markers import COGNITIVE_MARKERS, EMOTION_LABELS, MarkerDetector

logger = logging.getLogger(__name__)


class SentimentAnalyzer:
    def __init__(self) -> None:
        self._nlp_available = False
        self._TextBlob = None
        try:
            from textblob import TextBlob
            self._TextBlob = TextBlob
            self._nlp_available = True
            logger.info("TextBlob loaded.")
        except ImportError:
            logger.warning("TextBlob not found — using rule-based fallback.")

    def analyze(self, text: str) -> Dict[str, Any]:
        text = text.strip()
        if not text:
            return self._empty_result()

        sentiment = self._get_sentiment(text)
        emotions = self._detect_emotions(text)
        markers = MarkerDetector.detect(text)
        marker_count = MarkerDetector.count(markers)
        linguistics = self._linguistic_features(text)
        risk = self._cognitive_risk(marker_count, linguistics)

        return {
            'sentiment_score': sentiment['score'],
            'sentiment_label': sentiment['label'],
            'polarity': sentiment['polarity'],
            'dominant_emotion': emotions['dominant'],
            'emotion_scores': emotions['scores'],
            'cognitive_markers_found': markers,
            'cognitive_marker_count': marker_count,
            'cognitive_risk_score': risk['score'],
            'cognitive_risk_label': risk['label'],
            'cognitive_risk_color': risk['color'],
            'word_count': linguistics['word_count'],
            'avg_sentence_length': linguistics['avg_sentence_length'],
            'vocabulary_richness': linguistics['vocabulary_richness'],
            'speech_complexity': {
                'type_token_ratio': linguistics['type_token_ratio'],
                'brunets_w_index': linguistics['brunets_w_index'],
                'honores_h_statistic': linguistics['honores_h_statistic'],
                'filler_word_count': linguistics['filler_word_count'],
                'sentence_complexity': linguistics['sentence_complexity'],
                'hapax_legomena': linguistics['hapax_legomena'],
            },
            'insights': self._generate_insights(sentiment, emotions, markers, risk),
        }

    def _get_sentiment(self, text: str) -> Dict[str, Any]:
        polarity = 0.0
        if self._nlp_available and self._TextBlob is not None:
            blob = self._TextBlob(text)
            polarity = float(blob.sentiment.polarity)
        else:
            polarity = self._rule_sentiment(text)

        score = round((polarity + 1) / 2 * 100, 1)

        if polarity > 0.15:
            label = 'Positive'
        elif polarity < -0.15:
            label = 'Negative'
        else:
            label = 'Neutral'

        return {'polarity': round(polarity, 4), 'score': score, 'label': label}

    def _rule_sentiment(self, text: str) -> float:
        pos = sum(1 for w in COGNITIVE_MARKERS['positive_affect'] if w in text.lower())
        neg = sum(1 for w in COGNITIVE_MARKERS['emotional_distress'] if w in text.lower())
        total = pos + neg
        if total == 0:
            return 0.0
        return (pos - neg) / total

    def _detect_emotions(self, text: str) -> Dict[str, Any]:
        lower = text.lower()
        scores: Dict[str, float] = {}
        for emotion, keywords in EMOTION_LABELS.items():
            if emotion == 'neutral':
                continue
            count = sum(1 for kw in keywords if kw in lower)
            scores[emotion] = float(count)

        dominant = 'neutral'
        if scores:
            try:
                dominant = max(scores.keys(), key=lambda k: scores[k])
            except (ValueError, TypeError):
                dominant = 'neutral'

        total = sum(scores.values()) or 1
        normalised = {e: round(v / total * 100, 1) for e, v in scores.items()}

        return {'dominant': dominant, 'scores': normalised}

    def _linguistic_features(self, text: str) -> Dict[str, Any]:
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        words = re.findall(r'\b\w+\b', text.lower())

        word_count = len(words)
        avg_len = round(word_count / max(len(sentences), 1), 1)
        unique_words = set(words)
        unique_ratio = round(len(unique_words) / max(word_count, 1) * 100, 1)

        ttr = round(len(unique_words) / max(word_count, 1), 4)

        import math
        brunets_w = 0.0
        if word_count > 0 and len(unique_words) > 0:
            try:
                brunets_w = round(word_count ** (len(unique_words) ** -0.172), 4)
            except (ValueError, ZeroDivisionError):
                brunets_w = 0.0

        hapax = sum(1 for w in unique_words if words.count(w) == 1)
        honores_h = 0.0
        if hapax > 0 and hapax != len(unique_words) and word_count > 0:
            try:
                honores_h = round(
                    100 * math.log(word_count) / (1 - hapax / max(len(unique_words), 1)), 2
                )
            except (ValueError, ZeroDivisionError):
                honores_h = 0.0

        filler_words = ['um', 'uh', 'er', 'ah', 'like', 'you know', 'sort of', 'kind of', 'i mean', 'well']
        filler_count = sum(lower_text.count(fw) for fw in filler_words if fw in text.lower())

        clause_markers = [',', ' and ', ' but ', ' or ', ' because ', ' although ', ' while ', ' when ', ' if ', ' that ']
        lower_text = text.lower()
        clause_count = max(len(sentences), 1)
        for marker in clause_markers:
            clause_count += lower_text.count(marker)
        sentence_complexity = round(word_count / max(clause_count, 1), 2)

        return {
            'word_count': word_count,
            'sentence_count': len(sentences),
            'avg_sentence_length': avg_len,
            'vocabulary_richness': unique_ratio,
            'type_token_ratio': ttr,
            'brunets_w_index': brunets_w,
            'honores_h_statistic': honores_h,
            'filler_word_count': filler_count,
            'sentence_complexity': sentence_complexity,
            'hapax_legomena': hapax,
        }

    def _cognitive_risk(self, marker_count: int, linguistics: Dict[str, Any]) -> Dict[str, Any]:
        score = 0
        score += marker_count * 8

        richness = float(linguistics['vocabulary_richness'])
        if richness < 40:
            score += 20
        elif richness < 60:
            score += 10

        avg_sentence_len = float(linguistics['avg_sentence_length'])
        if avg_sentence_len < 5:
            score += 10

        score = min(score, 100)

        if score >= 60:
            label, color = 'High Risk', '#ef4444'
        elif score >= 30:
            label, color = 'Moderate Risk', '#f97316'
        elif score >= 10:
            label, color = 'Low Risk', '#eab308'
        else:
            label, color = 'Minimal Risk', '#22c55e'

        return {'score': score, 'label': label, 'color': color}

    def _generate_insights(
        self,
        sentiment: Dict[str, Any],
        emotions: Dict[str, Any],
        markers: Dict[str, list],
        risk: Dict[str, Any]
    ) -> list:
        insights = []

        if sentiment['label'] == 'Negative':
            insights.append("Negative emotional tone detected — patient may be experiencing distress.")
        elif sentiment['label'] == 'Positive':
            insights.append("Patient shows positive emotional expression.")

        em = emotions['dominant']
        if em == 'anxiety':
            insights.append("Anxiety indicators present — consider relaxation therapy.")
        elif em == 'confusion':
            insights.append("Confusion markers detected in speech patterns.")
        elif em == 'sadness':
            insights.append("Signs of depression detected — mental health support recommended.")

        if 'memory_loss' in markers:
            insights.append("Memory-related language patterns identified.")
        if 'word_finding' in markers:
            insights.append("Word-finding difficulty indicators present.")
        if 'disorientation' in markers:
            insights.append("Disorientation markers detected in patient speech.")

        if not insights:
            insights.append("No significant cognitive linguistic markers detected.")

        return insights

    def _empty_result(self) -> Dict[str, Any]:
        return {
            'sentiment_score': 50,
            'sentiment_label': 'Neutral',
            'polarity': 0.0,
            'dominant_emotion': 'neutral',
            'emotion_scores': {},
            'cognitive_markers_found': {},
            'cognitive_marker_count': 0,
            'cognitive_risk_score': 0,
            'cognitive_risk_label': 'Minimal Risk',
            'cognitive_risk_color': '#22c55e',
            'word_count': 0,
            'avg_sentence_length': 0,
            'vocabulary_richness': 0,
            'speech_complexity': {
                'type_token_ratio': 0,
                'brunets_w_index': 0,
                'honores_h_statistic': 0,
                'filler_word_count': 0,
                'sentence_complexity': 0,
                'hapax_legomena': 0,
            },
            'insights': ['No text provided for analysis.'],
        }
