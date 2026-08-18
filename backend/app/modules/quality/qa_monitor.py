"""
Quality Assurance and Data Analysis Module.
Monitors model performance, confidence calibration, and data drift.
"""
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import numpy as np
from collections import defaultdict

logger = logging.getLogger(__name__)


@dataclass
class PredictionRecord:
    """Record of a single prediction for quality tracking."""
    timestamp: datetime
    input_features: Dict[str, Any]
    prediction: int
    confidence: float
    actual_outcome: Optional[int] = None
    model_version: str = "1.0.0"
    inference_time_ms: float = 0.0


@dataclass
class QualityMetrics:
    """Quality metrics for model monitoring."""
    accuracy: float = 0.0
    precision: float = 0.0
    recall: float = 0.0
    f1_score: float = 0.0
    auc_roc: float = 0.0
    calibration_error: float = 0.0
    consistency_score: float = 0.0


class ConfidenceCalibrator:
    """
    Analyzes and improves confidence calibration.
    Determines if stated confidence matches actual accuracy.
    """
    
    def __init__(self):
        self.predictions: List[PredictionRecord] = []
        self.calibration_bins: Dict[int, List[float]] = defaultdict(list)
    
    def add_prediction(self, record: PredictionRecord):
        """Add a prediction record."""
        self.predictions.append(record)
        bin_idx = self._get_confidence_bin(record.confidence)
        self.calibration_bins[bin_idx].append(record.confidence)
    
    def add_outcome(self, prediction_idx: int, actual: int):
        """Add actual outcome for a prediction."""
        if 0 <= prediction_idx < len(self.predictions):
            self.predictions[prediction_idx].actual_outcome = actual
    
    def _get_confidence_bin(self, confidence: float) -> int:
        """Convert confidence to bin index (0-9)."""
        return min(int(confidence * 10), 9)
    
    def analyze_calibration(self) -> Dict[str, Any]:
        """
        Analyze confidence calibration.
        
        Returns calibration metrics and recommendations.
        """
        if len(self.predictions) < 10:
            return {
                'status': 'insufficient_data',
                'message': 'Need at least 10 predictions for calibration analysis',
                'predictions_needed': 10 - len(self.predictions)
            }
        
        validated = [p for p in self.predictions if p.actual_outcome is not None]
        
        if len(validated) < 10:
            return {
                'status': 'insufficient_outcomes',
                'message': 'Need at least 10 predictions with known outcomes',
                'validated_count': len(validated)
            }
        
        bin_stats = self._calculate_bin_statistics(validated)
        calibration_error = self._calculate_expected_calibration_error(validated, bin_stats)
        
        return {
            'status': 'complete',
            'calibration_error': calibration_error,
            'expected_calibration_error': self._calculate_ece(validated),
            'bin_statistics': bin_stats,
            'is_calibrated': calibration_error < 0.1,
            'recommendations': self._get_calibration_recommendations(calibration_error),
            'sample_size': len(validated),
        }
    
    def _calculate_bin_statistics(self, predictions: List[PredictionRecord]) -> Dict[int, Dict]:
        """Calculate statistics for each confidence bin."""
        bins: Dict[int, Dict] = {}
        
        for i in range(10):
            bins[i] = {
                'mean_confidence': 0.0,
                'accuracy': 0.0,
                'count': 0,
                'correct': 0,
            }
        
        for p in predictions:
            bin_idx = self._get_confidence_bin(p.confidence)
            bins[bin_idx]['count'] += 1
            bins[bin_idx]['mean_confidence'] += p.confidence
            if p.prediction == p.actual_outcome:
                bins[bin_idx]['correct'] += 1
        
        for bin_idx in bins:
            if bins[bin_idx]['count'] > 0:
                bins[bin_idx]['mean_confidence'] /= bins[bin_idx]['count']
                bins[bin_idx]['accuracy'] = bins[bin_idx]['correct'] / bins[bin_idx]['count']
        
        return bins
    
    def _calculate_expected_calibration_error(self, predictions: List, 
                                            bin_stats: Dict) -> float:
        """Calculate expected calibration error (ECE)."""
        total = len(predictions)
        ece = 0.0
        
        for bin_idx, stats in bin_stats.items():
            if stats['count'] > 0:
                weight = stats['count'] / total
                confidence_diff = abs(stats['mean_confidence'] - stats['accuracy'])
                ece += weight * confidence_diff
        
        return ece
    
    def _calculate_ece(self, predictions: List[PredictionRecord]) -> float:
        """Alternative ECE calculation."""
        if not predictions:
            return 0.0
        
        n = len(predictions)
        ece = 0.0
        
        for bin_idx in range(10):
            bin_preds = [p for p in predictions if self._get_confidence_bin(p.confidence) == bin_idx]
            if bin_preds:
                avg_conf = np.mean([p.confidence for p in bin_preds])
                accuracy = sum(1 for p in bin_preds if p.prediction == p.actual_outcome) / len(bin_preds)
                ece += (len(bin_preds) / n) * abs(avg_conf - accuracy)
        
        return ece
    
    def _get_calibration_recommendations(self, ece: float) -> List[str]:
        """Generate recommendations based on calibration error."""
        if ece < 0.05:
            return [
                "Excellent calibration - confidence estimates are well-calibrated",
                "Continue monitoring for drift",
            ]
        elif ece < 0.1:
            return [
                "Good calibration - minor adjustments may improve performance",
                "Consider fine-tuning on recent data",
            ]
        elif ece < 0.2:
            return [
                "Moderate calibration error - consider retraining",
                "Check for data distribution changes",
                "Consider temperature scaling",
            ]
        else:
            return [
                "Poor calibration - model needs retraining",
                "Investigate data quality and distribution",
                "Consider ensemble methods",
                "Review feature importance",
            ]
    
    def plot_calibration_curve(self) -> Dict[str, Any]:
        """Generate data for calibration curve visualization."""
        validated = [p for p in self.predictions if p.actual_outcome is not None]
        bin_stats = self._calculate_bin_statistics(validated)
        
        curve_data = []
        perfect_calibration = []
        
        for i in range(10):
            if bin_stats[i]['count'] > 0:
                curve_data.append({
                    'bin_center': (i + 0.5) / 10,
                    'accuracy': bin_stats[i]['accuracy'],
                    'count': bin_stats[i]['count'],
                })
            perfect_calibration.append({'x': (i + 0.5) / 10, 'y': (i + 0.5) / 10})
        
        return {
            'actual_curve': curve_data,
            'perfect_calibration': perfect_calibration,
            'diagram_type': 'calibration_curve',
        }


class DataDriftDetector:
    """
    Detects data drift in model inputs over time.
    """
    
    def __init__(self, reference_window: int = 100):
        self.reference_window = reference_window
        self.reference_data: List[Dict[str, float]] = []
        self.current_data: List[Dict[str, float]] = []
    
    def add_sample(self, features: Dict[str, float], is_reference: bool = False):
        """Add a sample for drift detection."""
        sample = {'timestamp': datetime.now(), 'features': features}
        
        if is_reference:
            self.reference_data.append(sample)
            if len(self.reference_data) > self.reference_window:
                self.reference_data.pop(0)
        else:
            self.current_data.append(sample)
            if len(self.current_data) > self.reference_window:
                self.current_data.pop(0)
    
    def detect_drift(self) -> Dict[str, Any]:
        """
        Detect data drift between reference and current data.
        
        Returns drift metrics and alerts.
        """
        if len(self.reference_data) < 20:
            return {
                'status': 'insufficient_reference',
                'message': f'Need at least 20 reference samples, have {len(self.reference_data)}',
            }
        
        if len(self.current_data) < 20:
            return {
                'status': 'insufficient_current',
                'message': f'Need at least 20 current samples, have {len(self.current_data)}',
            }
        
        drift_scores = self._calculate_drift_scores()
        overall_drift = np.mean(list(drift_scores.values()))
        
        alerts = []
        for feature, score in drift_scores.items():
            if score > 0.5:
                alerts.append({
                    'feature': feature,
                    'drift_score': score,
                    'severity': 'high' if score > 0.7 else 'moderate',
                    'recommendation': f'Investigate {feature} distribution changes',
                })
        
        return {
            'status': 'analyzed',
            'overall_drift': overall_drift,
            'drift_detected': overall_drift > 0.3,
            'feature_drift_scores': drift_scores,
            'alerts': alerts,
            'recommendations': self._get_drift_recommendations(overall_drift, alerts),
            'sample_sizes': {
                'reference': len(self.reference_data),
                'current': len(self.current_data),
            },
        }
    
    def _calculate_drift_scores(self) -> Dict[str, float]:
        """Calculate drift score for each feature."""
        if not self.reference_data or not self.current_data:
            return {}
        
        feature_names = set()
        for sample in self.reference_data:
            feature_names.update(sample['features'].keys())
        
        drift_scores = {}
        
        for feature in feature_names:
            ref_values = [s['features'].get(feature, 0) for s in self.reference_data]
            curr_values = [s['features'].get(feature, 0) for s in self.current_data]
            
            ref_mean = np.mean(ref_values)
            ref_std = np.std(ref_values) if np.std(ref_values) > 0 else 1
            curr_mean = np.mean(curr_values)
            
            drift_score = abs(curr_mean - ref_mean) / ref_std
            drift_scores[feature] = min(drift_score / 3, 1.0)
        
        return drift_scores
    
    def _get_drift_recommendations(self, overall_drift: float, 
                                   alerts: List[Dict]) -> List[str]:
        """Generate recommendations based on drift analysis."""
        recs = []
        
        if overall_drift < 0.1:
            recs.append("No significant drift detected - model is stable")
        elif overall_drift < 0.3:
            recs.append("Minor drift detected - monitor closely")
            recs.append("Consider retraining model on recent data")
        else:
            recs.append("Significant drift detected - immediate action required")
            recs.append("Retrain model with recent data")
            recs.append("Review data preprocessing pipeline")
        
        if alerts:
            recs.append(f"{len(alerts)} features show significant drift")
        
        return recs


class HumanAIAgreement:
    """
    Tracks and analyzes agreement between AI predictions and human judgments.
    """
    
    def __init__(self):
        self.agreements: List[Dict] = []
    
    def add_judgment(self, ai_prediction: int, human_judgment: int,
                    confidence: float, case_id: str = None):
        """Add a human-AI comparison."""
        agreement = {
            'timestamp': datetime.now(),
            'ai_prediction': ai_prediction,
            'human_judgment': human_judgment,
            'confidence': confidence,
            'case_id': case_id,
            'agreed': ai_prediction == human_judgment,
        }
        self.agreements.append(agreement)
    
    def analyze_agreement(self) -> Dict[str, Any]:
        """
        Analyze human-AI agreement patterns.
        
        Returns agreement statistics and insights.
        """
        if len(self.agreements) < 10:
            return {
                'status': 'insufficient_data',
                'message': 'Need at least 10 comparisons for analysis',
                'current_count': len(self.agreements),
            }
        
        total = len(self.agreements)
        agreed = sum(1 for a in self.agreements if a['agreed'])
        
        agreement_rate = agreed / total if total > 0 else 0
        
        high_conf_agreements = [a for a in self.agreements if a['confidence'] > 0.8]
        high_conf_rate = len(high_conf_agreements) / total
        
        if high_conf_agreements:
            high_conf_agreement = sum(1 for a in high_conf_agreements if a['agreed']) / len(high_conf_agreements)
        else:
            high_conf_agreement = 0
        
        low_conf_agreements = [a for a in self.agreements if a['confidence'] < 0.5]
        low_conf_disagreements = [a for a in low_conf_agreements if not a['agreed']]
        
        disagreement_patterns = self._analyze_disagreements()
        
        return {
            'status': 'complete',
            'agreement_rate': agreement_rate,
            'total_comparisons': total,
            'high_confidence_cases': {
                'count': len(high_conf_agreements),
                'agreement_rate': high_conf_agreement,
            },
            'low_confidence_cases': {
                'count': len(low_conf_agreements),
                'disagreement_count': len(low_conf_disagreements),
            },
            'disagreement_analysis': disagreement_patterns,
            'insights': self._generate_insights(agreement_rate, high_conf_agreement),
            'recommendations': self._get_recommendations(agreement_rate, disagreement_patterns),
        }
    
    def _analyze_disagreements(self) -> Dict[str, Any]:
        """Analyze patterns in disagreements."""
        disagreements = [a for a in self.agreements if not a['agreed']]
        
        if not disagreements:
            return {'total_disagreements': 0}
        
        patterns = defaultdict(int)
        for d in disagreements:
            key = f"AI_pred_{d['ai_prediction']}_vs_Human_{d['human_judgment']}"
            patterns[key] += 1
        
        most_common = sorted(patterns.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            'total_disagreements': len(disagreements),
            'disagreement_rate': len(disagreements) / len(self.agreements),
            'common_patterns': [{'pattern': p[0], 'count': p[1]} for p in most_common],
        }
    
    def _generate_insights(self, agreement_rate: float, 
                          high_conf_agreement: float) -> List[str]:
        """Generate insights from agreement analysis."""
        insights = []
        
        if agreement_rate > 0.9:
            insights.append("Excellent human-AI agreement - model aligns well with expert judgment")
        elif agreement_rate > 0.7:
            insights.append("Good human-AI agreement - model provides valuable assistance")
        else:
            insights.append("Moderate human-AI disagreement - model may need improvement")
        
        if high_conf_agreement > agreement_rate + 0.1:
            insights.append("Model is more accurate when confident - good calibration")
        elif high_conf_agreement < agreement_rate - 0.1:
            insights.append("Model confidence doesn't predict accuracy - calibration issue")
        
        return insights
    
    def _get_recommendations(self, agreement_rate: float,
                            disagreement_patterns: Dict) -> List[str]:
        """Generate recommendations based on agreement analysis."""
        recs = []
        
        if agreement_rate < 0.8:
            recs.append("Consider reviewing model training data")
            recs.append("Add more diverse training examples")
        
        if disagreement_patterns.get('total_disagreements', 0) > 5:
            recs.append("Investigate specific disagreement patterns")
            recs.append("Consider human-in-the-loop approach for uncertain cases")
        
        recs.append("Continue tracking human feedback for ongoing improvement")
        
        return recs


class ModelMonitor:
    """
    Comprehensive model monitoring system.
    Combines calibration, drift detection, and human feedback.
    """
    
    def __init__(self):
        self.calibrator = ConfidenceCalibrator()
        self.drift_detector = DataDriftDetector()
        self.agreement_tracker = HumanAIAgreement()
        self.prediction_history: List[PredictionRecord] = []
        self.model_versions: Dict[str, datetime] = {}
    
    def log_prediction(self, features: Dict[str, float], prediction: int,
                      confidence: float, inference_time_ms: float = 0.0,
                      model_version: str = "1.0.0"):
        """Log a prediction for monitoring."""
        record = PredictionRecord(
            timestamp=datetime.now(),
            input_features=features,
            prediction=prediction,
            confidence=confidence,
            model_version=model_version,
            inference_time_ms=inference_time_ms,
        )
        
        self.prediction_history.append(record)
        self.calibrator.add_prediction(record)
        
        if model_version not in self.model_versions:
            self.model_versions[model_version] = datetime.now()
        
        features_for_drift = {k: float(v) for k, v in features.items() if isinstance(v, (int, float))}
        self.drift_detector.add_sample(features_for_drift)
    
    def log_human_feedback(self, prediction_idx: int, human_outcome: int):
        """Log human correction/feedback."""
        if prediction_idx < len(self.prediction_history):
            self.prediction_history[prediction_idx].actual_outcome = human_outcome
            self.calibrator.add_outcome(prediction_idx, human_outcome)
            
            record = self.prediction_history[prediction_idx]
            self.agreement_tracker.add_judgment(
                record.prediction,
                human_outcome,
                record.confidence,
                str(prediction_idx)
            )
    
    def get_comprehensive_report(self) -> Dict[str, Any]:
        """Generate comprehensive quality report."""
        return {
            'report_timestamp': datetime.now().isoformat(),
            'summary': {
                'total_predictions': len(self.prediction_history),
                'predictions_with_outcomes': sum(1 for p in self.prediction_history if p.actual_outcome is not None),
                'unique_model_versions': len(self.model_versions),
            },
            'calibration': self.calibrator.analyze_calibration(),
            'data_drift': self.drift_detector.detect_drift(),
            'human_ai_agreement': self.agreement_tracker.analyze_agreement(),
            'inference_stats': self._get_inference_stats(),
            'overall_health': self._assess_overall_health(),
        }
    
    def _get_inference_stats(self) -> Dict[str, Any]:
        """Get inference statistics."""
        if not self.prediction_history:
            return {}
        
        inference_times = [p.inference_time_ms for p in self.prediction_history]
        confidences = [p.confidence for p in self.prediction_history]
        
        return {
            'mean_inference_time_ms': float(np.mean(inference_times)) if inference_times else 0,
            'median_inference_time_ms': float(np.median(inference_times)) if inference_times else 0,
            'p95_inference_time_ms': float(np.percentile(inference_times, 95)) if inference_times else 0,
            'mean_confidence': float(np.mean(confidences)) if confidences else 0,
            'low_confidence_count': sum(1 for c in confidences if c < 0.5),
        }
    
    def _assess_overall_health(self) -> Dict[str, Any]:
        """Assess overall model health."""
        calibration = self.calibrator.analyze_calibration()
        drift = self.drift_detector.detect_drift()
        agreement = self.agreement_tracker.analyze_agreement()
        
        health_score = 100
        
        if calibration.get('status') == 'complete':
            health_score -= calibration.get('calibration_error', 0) * 50
        
        if drift.get('status') == 'analyzed':
            health_score -= drift.get('overall_drift', 0) * 30
        
        if agreement.get('status') == 'complete':
            health_score = agreement.get('agreement_rate', 0.8) * 100
        
        health_score = max(0, min(100, health_score))
        
        if health_score >= 80:
            status = 'excellent'
        elif health_score >= 60:
            status = 'good'
        elif health_score >= 40:
            status = 'fair'
        else:
            status = 'poor'
        
        return {
            'health_score': round(health_score, 1),
            'status': status,
            'action_required': health_score < 60,
            'recommendations': self._get_health_recommendations(health_score, calibration, drift, agreement),
        }
    
    def _get_health_recommendations(self, health_score: float,
                                   calibration: Dict,
                                   drift: Dict,
                                   agreement: Dict) -> List[str]:
        """Generate health-based recommendations."""
        recs = []
        
        if health_score >= 80:
            recs.append("Model health is excellent - continue monitoring")
        elif health_score >= 60:
            recs.append("Model health is acceptable - monitor for changes")
        else:
            recs.append("Model health needs attention - investigate issues")
        
        if calibration.get('calibration_error', 0) > 0.1:
            recs.append("Consider retraining for better calibration")
        
        if drift.get('drift_detected', False):
            recs.append("Update model with recent data to address drift")
        
        if agreement.get('agreement_rate', 1) < 0.8:
            recs.append("Review disagreement patterns with domain experts")
        
        return recs


# Global monitor instance
_global_monitor: Optional[ModelMonitor] = None


def get_model_monitor() -> ModelMonitor:
    """Get or create the global model monitor."""
    global _global_monitor
    if _global_monitor is None:
        _global_monitor = ModelMonitor()
    return _global_monitor


def log_prediction(features: Dict, prediction: int, confidence: float, 
                 inference_time: float = 0.0, model_version: str = "1.0.0"):
    """Convenience function to log a prediction."""
    monitor = get_model_monitor()
    monitor.log_prediction(features, prediction, confidence, inference_time, model_version)


def log_human_feedback(prediction_idx: int, human_outcome: int):
    """Convenience function to log human feedback."""
    monitor = get_model_monitor()
    monitor.log_human_feedback(prediction_idx, human_outcome)


def get_quality_report() -> Dict:
    """Convenience function to get quality report."""
    monitor = get_model_monitor()
    return monitor.get_comprehensive_report()
