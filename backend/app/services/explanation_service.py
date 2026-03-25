"""
AI Explanation Service
Generates human-readable explanations for the multimodal AI analysis results.
Combines outputs from MRI, Cognitive scores, Sentiment, and other modalities.
"""

from typing import Dict, Any, List, Optional


class ExplanationService:
    """Generate human-readable explanations for AI predictions."""

    STAGE_DESCRIPTIONS = {
        'Non Demented': {
            'summary': 'The patient shows no significant signs of Alzheimer\'s-related cognitive decline.',
            'indicators': [
                'Normal brain structure observed in MRI scan',
                'Cognitive test scores within healthy range',
                'Positive emotional expression patterns',
                'No significant risk factors identified'
            ]
        },
        'Very Mild Demented': {
            'summary': 'Minor cognitive changes detected that may be early indicators.',
            'indicators': [
                'Subtle changes visible in brain imaging',
                'Slight variations in memory or executive function tests',
                'Occasional word-finding difficulties reported',
                'Some risk factors present but manageable'
            ]
        },
        'Mild Demented': {
            'summary': 'Clear cognitive changes consistent with early-stage Alzheimer\'s.',
            'indicators': [
                'Observable brain volume changes in MRI',
                'Memory and executive function scores below normal',
                'Noticeable changes in speech patterns',
                'Multiple modifiable risk factors identified'
            ]
        },
        'Moderate Demented': {
            'summary': 'Significant cognitive impairment requiring support.',
            'indicators': [
                'Clear structural changes in brain imaging',
                'Substantial decline in cognitive test performance',
                'Altered emotional processing patterns',
                'Multiple risk factors requiring medical attention'
            ]
        }
    }

    def generate_explanation(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate comprehensive explanation from analysis results.
        
        Parameters
        ----------
        results : dict
            Complete analysis results containing mri, cognitive, sentiment, 
            handwriting, risk_profile, and final_stage data.
        
        Returns
        -------
        dict with explanation components
        """
        mri = results.get('mri', {})
        cognitive = results.get('cognitive', {})
        sentiment = results.get('sentiment', {})
        handwriting = results.get('handwriting', {})
        risk_profile = results.get('risk_profile', {})
        final_stage = results.get('final_stage', {})
        
        stage = final_stage.get('stage') or mri.get('stage') or 'Unknown'
        confidence = final_stage.get('confidence') or mri.get('confidence') or 0
        
        explanations = {
            'summary': self._generate_summary(stage, confidence),
            'mri_explanation': self._explain_mri(mri),
            'cognitive_explanation': self._explain_cognitive(cognitive),
            'sentiment_explanation': self._explain_sentiment(sentiment),
            'handwriting_explanation': self._explain_handwriting(handwriting),
            'risk_factors': self._explain_risk_factors(risk_profile),
            'key_indicators': self._extract_key_indicators(mri, cognitive, sentiment, handwriting),
            'stage_details': self.STAGE_DESCRIPTIONS.get(stage, self.STAGE_DESCRIPTIONS['Non Demented']),
            'confidence_level': self._get_confidence_level(confidence),
            'overall_explanation': self._generate_overall_explanation(
                stage, mri, cognitive, sentiment, handwriting, confidence
            )
        }
        
        return explanations

    def _generate_summary(self, stage: str, confidence: float) -> str:
        """Generate a brief summary of the analysis."""
        stage_desc = self.STAGE_DESCRIPTIONS.get(stage, self.STAGE_DESCRIPTIONS['Non Demented'])
        confidence_text = self._get_confidence_text(confidence)
        
        return f"AI Analysis indicates {stage.lower()} status with {confidence_text}."

    def _get_confidence_text(self, confidence: float) -> str:
        """Convert confidence percentage to human-readable text."""
        if confidence >= 90:
            return "very high confidence"
        elif confidence >= 75:
            return "high confidence"
        elif confidence >= 60:
            return "moderate confidence"
        elif confidence >= 40:
            return "low to moderate confidence"
        else:
            return "limited confidence"

    def _get_confidence_level(self, confidence: float) -> str:
        """Get confidence level category."""
        if confidence >= 80:
            return "Very High"
        elif confidence >= 60:
            return "High"
        elif confidence >= 40:
            return "Moderate"
        else:
            return "Low"

    def _explain_mri(self, mri: Dict[str, Any]) -> Dict[str, Any]:
        """Explain MRI analysis results."""
        if not mri:
            return {
                'status': 'Not Analyzed',
                'description': 'No MRI scan was provided for analysis.',
                'impact': 'low'
            }
        
        stage = mri.get('stage', 'Unknown')
        confidence = mri.get('confidence', 0)
        
        descriptions = {
            'Non Demented': 'Brain scan shows normal tissue structure with no significant atrophy patterns.',
            'Very Mild Demented': 'Subtle changes detected in memory-related brain regions.',
            'Mild Demented': 'Visible reduction in brain volume, particularly in hippocampus and temporal regions.',
            'Moderate Demented': 'Significant brain atrophy observed across multiple regions.'
        }
        
        return {
            'status': stage,
            'description': descriptions.get(stage, 'Analysis completed.'),
            'confidence': confidence,
            'impact': 'high',
            'findings': mri.get('gradcam_regions', []) or mri.get('predictions', [])
        }

    def _explain_cognitive(self, cognitive: Dict[str, Any]) -> Dict[str, Any]:
        """Explain cognitive test results."""
        if not cognitive:
            return {
                'status': 'Not Assessed',
                'description': 'No cognitive test data provided.',
                'impact': 'medium'
            }
        
        composite = cognitive.get('composite_score', 5)
        
        if composite >= 8:
            status = 'Normal'
            description = 'Cognitive performance within healthy range. Memory, attention, and executive functions are intact.'
            impact = 'low'
        elif composite >= 6:
            status = 'Mild Impairment'
            description = 'Slight difficulties in memory or executive tasks. May require monitoring.'
            impact = 'medium'
        elif composite >= 4:
            status = 'Moderate Impairment'
            description = 'Clear cognitive deficits in multiple domains. Further evaluation recommended.'
            impact = 'high'
        else:
            status = 'Significant Impairment'
            description = 'Substantial cognitive decline observed across multiple tests.'
            impact = 'high'
        
        return {
            'status': status,
            'description': description,
            'score': composite,
            'domains': cognitive.get('domain_scores', {}),
            'impact': impact
        }

    def _explain_sentiment(self, sentiment: Dict[str, Any]) -> Dict[str, Any]:
        """Explain sentiment analysis results."""
        if not sentiment:
            return {
                'status': 'Not Analyzed',
                'description': 'No text data provided for sentiment analysis.',
                'impact': 'low'
            }
        
        emotion = sentiment.get('dominant_emotion', 'neutral')
        risk_score = sentiment.get('cognitive_risk_score', 0)
        
        emotion_impact = {
            'positive': {'description': 'Positive emotional expression may indicate good cognitive health.', 'risk': 'low'},
            'neutral': {'description': 'Normal emotional processing observed.', 'risk': 'low'},
            'negative': {'description': 'Negative emotional patterns may correlate with cognitive changes.', 'risk': 'medium'},
            'sadness': {'description': 'Persistent sadness may warrant psychological evaluation.', 'risk': 'medium'},
            'anxiety': {'description': 'Anxiety patterns can affect cognitive performance.', 'risk': 'medium'},
            'confusion': {'description': 'Confusion in expression may indicate cognitive difficulties.', 'risk': 'high'},
            'frustration': {'description': 'Frustration patterns may relate to cognitive challenges.', 'risk': 'medium'}
        }
        
        impact_info = emotion_impact.get(emotion, emotion_impact['neutral'])
        
        return {
            'status': emotion.title(),
            'description': impact_info['description'],
            'risk_indicator': risk_score,
            'emotion': emotion,
            'impact': impact_info['risk']
        }

    def _explain_handwriting(self, handwriting: Dict[str, Any]) -> Dict[str, Any]:
        """Explain handwriting analysis results."""
        if not handwriting:
            return {
                'status': 'Not Analyzed',
                'description': 'No handwriting sample provided.',
                'impact': 'low'
            }
        
        risk_score = handwriting.get('handwriting_risk_score', 0)
        
        if risk_score < 0.3:
            status = 'Normal'
            description = 'Handwriting characteristics within normal range.'
            impact = 'low'
        elif risk_score < 0.6:
            status = 'Mild Changes'
            description = 'Minor variations in handwriting detected.'
            impact = 'medium'
        else:
            status = 'Significant Changes'
            description = 'Notable changes in handwriting consistent with motor control differences.'
            impact = 'high'
        
        return {
            'status': status,
            'description': description,
            'risk_score': risk_score,
            'impact': impact
        }

    def _explain_risk_factors(self, risk_profile: Dict[str, Any]) -> Dict[str, Any]:
        """Explain risk factor assessment."""
        if not risk_profile:
            return {
                'status': 'Not Assessed',
                'description': 'No risk factor data provided.',
                'overall_risk': 0
            }
        
        overall = risk_profile.get('overall_risk_score', 0)
        category = risk_profile.get('risk_label', 'Unknown')
        
        return {
            'status': category,
            'overall_risk': overall,
            'modifiable_risk': risk_profile.get('modifiable_risk', 0),
            'non_modifiable_risk': risk_profile.get('non_modifiable_risk', 0),
            'top_factors': self._get_top_risk_factors(risk_profile.get('factor_details', {}))
        }

    def _get_top_risk_factors(self, factor_details: Dict) -> List[Dict]:
        """Extract top 3 highest risk factors."""
        if not factor_details:
            return []
        
        sorted_factors = sorted(
            factor_details.items(),
            key=lambda x: x[1].get('risk_score', 0),
            reverse=True
        )
        
        return [
            {'name': f[1].get('label', f[0]), 'score': f[1].get('risk_score', 0)}
            for f in sorted_factors[:3]
        ]

    def _extract_key_indicators(
        self, 
        mri: Dict, 
        cognitive: Dict, 
        sentiment: Dict, 
        handwriting: Dict
    ) -> List[Dict]:
        """Extract key indicators from all modalities."""
        indicators = []
        
        if mri:
            indicators.append({
                'modality': 'MRI',
                'value': mri.get('stage', 'Unknown'),
                'confidence': mri.get('confidence', 0),
                'weight': 'high'
            })
        
        if cognitive:
            score = cognitive.get('composite_score', 0)
            indicators.append({
                'modality': 'Cognitive',
                'value': f'{score}/10',
                'confidence': score * 10,
                'weight': 'high'
            })
        
        if sentiment:
            indicators.append({
                'modality': 'Sentiment',
                'value': sentiment.get('dominant_emotion', 'N/A'),
                'confidence': sentiment.get('cognitive_risk_score', 0) * 10,
                'weight': 'medium'
            })
        
        if handwriting:
            indicators.append({
                'modality': 'Handwriting',
                'value': 'Analyzed',
                'confidence': (1 - handwriting.get('handwriting_risk_score', 0)) * 100,
                'weight': 'low'
            })
        
        return indicators

    def _generate_overall_explanation(
        self,
        stage: str,
        mri: Dict,
        cognitive: Dict,
        sentiment: Dict,
        handwriting: Dict,
        confidence: float
    ) -> str:
        """Generate a comprehensive overall explanation."""
        parts = []
        
        if mri and mri.get('confidence', 0) > 0:
            mri_desc = self._explain_mri(mri)
            parts.append(f"MRI analysis shows {mri_desc['status'].lower()} status.")
        
        if cognitive and cognitive.get('composite_score', 0) > 0:
            cog_desc = self._explain_cognitive(cognitive)
            parts.append(f"Cognitive assessment indicates {cog_desc['status'].lower()}.")
        
        if sentiment and sentiment.get('dominant_emotion'):
            sent_desc = self._explain_sentiment(sentiment)
            parts.append(f"Emotional patterns show {sent_desc['status'].lower()} expression.")
        
        if handwriting and handwriting.get('handwriting_risk_score', 0) > 0:
            hw_desc = self._explain_handwriting(handwriting)
            parts.append(f"Handwriting analysis reveals {hw_desc['status'].lower()} characteristics.")
        
        if not parts:
            return "Insufficient data for comprehensive explanation."
        
        explanation = " ".join(parts)
        
        if confidence >= 75:
            explanation += " The AI model has high confidence in this assessment."
        elif confidence >= 50:
            explanation += " Additional data could improve prediction accuracy."
        else:
            explanation += " More comprehensive testing is recommended for accurate diagnosis."
        
        return explanation


_explanation_service = None


def get_explanation_service() -> ExplanationService:
    """Get singleton instance of explanation service."""
    global _explanation_service
    if _explanation_service is None:
        _explanation_service = ExplanationService()
    return _explanation_service


def generate_explanation(results: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function to generate explanation."""
    return get_explanation_service().generate_explanation(results)
