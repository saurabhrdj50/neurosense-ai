"""
AI Explanation Service
Generates human-readable explanations for the multimodal AI analysis results.
Combines outputs from MRI, Cognitive scores, Sentiment, and other modalities.
"""

from typing import Dict, Any, List

from app.ml.stages import normalize_stage_name


class ExplanationService:
    """Generate human-readable explanations for AI predictions."""

    STAGE_DESCRIPTIONS = {
        stage: {
            'summary': 'Backend output label only; not a clinical diagnosis.',
            'indicators': [],
        }
        for stage in (
            'Non-Demented',
            'Very Mild Demented',
            'Mild Demented',
            'Moderate Demented',
        )
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
        risk_profile = results.get('risk_profile', {})
        final_stage = results.get('final_stage', {})
        
        stage = self._normalize_stage(final_stage.get('stage') or mri.get('stage') or 'Unknown')
        confidence = final_stage.get('confidence') or mri.get('confidence') or 0
        
        explanations = {
            'summary': self._generate_summary(stage, confidence),
            'mri_explanation': self._explain_mri(mri),
            'cognitive_explanation': self._explain_cognitive(cognitive),
            'sentiment_explanation': self._explain_sentiment(sentiment),
            'risk_factors': self._explain_risk_factors(risk_profile),
            'key_indicators': self._extract_key_indicators(mri, cognitive, sentiment, risk_profile),
            'stage_details': self.STAGE_DESCRIPTIONS.get(
                stage,
                {'summary': 'Backend output label only; not a clinical diagnosis.', 'indicators': []},
            ),
            'fusion_explanation': self._explain_fusion(final_stage),
            'data_quality': self._data_quality(results),
            'uncertainty_factors': final_stage.get('uncertainty_factors', []),
            'overall_explanation': self._generate_overall_explanation(
                stage, mri, cognitive, sentiment, risk_profile, confidence
            )
        }
        
        return explanations

    def _generate_summary(self, stage: str, confidence: float) -> str:
        """Summarize backend outputs without presenting them as a diagnosis."""
        return f"Backend output label: {stage}. Reported confidence score: {confidence:.1f}%. Not a clinical diagnosis."

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
        
        return {
            'status': stage,
            'description': mri.get('decision_summary') or (
                'MRI classifier output received. This model does not calculate volumetric measurements or segmentation.'
            ),
            'confidence': confidence,
            'decision_summary': mri.get('decision_summary'),
            'heatmap_available': bool(mri.get('gradcam_image') or mri.get('gradcam_image_base64')),
            'heatmap_explanation': mri.get('heatmap_explanation'),
            'class_mapping_verified': False,
            'model_available': mri.get('model_available', True),
            'error': mri.get('error'),
        }

    def _explain_cognitive(self, cognitive: Dict[str, Any]) -> Dict[str, Any]:
        """Explain cognitive test results."""
        if not cognitive:
            return {
                'status': 'Not Assessed',
                'description': 'No cognitive test data provided.',
                'impact': 'medium'
            }
        
        composite = cognitive.get('composite_score', 0)
        
        status = 'Questionnaire composite'
        description = (
            f"Rule-based screening composite: {composite}/100. "
            'This is not an administered MMSE or MoCA and is not a diagnosis.'
        )
        
        return {
            'status': status,
            'description': description,
            'score': composite,
            'domains': cognitive.get('profile') or cognitive.get('domains', {}),
        }

    def _explain_sentiment(self, sentiment: Dict[str, Any]) -> Dict[str, Any]:
        """Explain sentiment analysis results."""
        if not sentiment:
            return {
                'status': 'Not Analyzed',
                'description': 'No text data provided for sentiment analysis.',
                'impact': 'low'
            }
        
        emotion = sentiment.get('dominant_emotion')
        if not emotion:
            return {
                'status': 'Not Assessed',
                'description': 'No emotion classifier is configured for the speech pipeline.',
            }
        
        return {
            'status': emotion.title(),
            'description': 'Text tone and lexical markers are heuristic summaries, not a cognitive or emotional-health assessment.',
            'emotion': emotion,
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
            'description': 'Rule-based risk-factor score; not a validated Lancet or Hachinski assessment.',
            'modifiable_risk': risk_profile.get('modifiable_risk', 0),
            'non_modifiable_risk': risk_profile.get('non_modifiable_risk', 0),
            'contributing_factors': risk_profile.get('contributing_factors', [])[:3],
        }

    def _extract_key_indicators(
        self, 
        mri: Dict, 
        cognitive: Dict, 
        sentiment: Dict, 
        risk_profile: Dict,
    ) -> List[Dict]:
        """Describe returned outputs without inventing attribution or confidence weights."""
        indicators = []
        
        if mri:
            indicators.append({
                'modality': 'MRI classifier',
                'value': mri.get('stage', 'Unknown'),
            })
        
        if cognitive and cognitive.get('composite_score') is not None:
            indicators.append({
                'modality': 'Questionnaire composite',
                'value': f"{cognitive['composite_score']}/100; rule-based, not MMSE/MoCA",
            })
        
        if sentiment:
            indicators.append({
                'modality': 'Speech summary',
                'value': 'Reported separately; not included in active fusion',
            })

        if risk_profile and risk_profile.get('overall_risk_score') is not None:
            indicators.append({
                'modality': 'Risk-factor score',
                'value': f"{risk_profile['overall_risk_score']}/100; rule-based heuristic",
            })
        
        return indicators

    def _generate_overall_explanation(
        self,
        stage: str,
        mri: Dict,
        cognitive: Dict,
        sentiment: Dict,
        risk_profile: Dict,
        confidence: float
    ) -> str:
        """Generate a comprehensive overall explanation."""
        parts = []
        
        if mri and mri.get('confidence', 0) > 0:
            mri_desc = self._explain_mri(mri)
            parts.append(
                f"MRI classifier returned {mri_desc['status']}; training class mapping is unverified."
            )
            if mri_desc.get('decision_summary'):
                parts.append(mri_desc['decision_summary'])
            if mri_desc.get('heatmap_available'):
                parts.append(
                    'The Grad-CAM heatmap highlights the image regions that most strongly '
                    'supported the MRI classification.'
                )
        
        if cognitive and cognitive.get('composite_score', 0) > 0:
            cog_desc = self._explain_cognitive(cognitive)
            parts.append(cog_desc['description'])
        
        if sentiment and sentiment.get('dominant_emotion'):
            parts.append(self._explain_sentiment(sentiment)['description'])

        if risk_profile and risk_profile.get('overall_risk_score') is not None:
            parts.append(self._explain_risk_factors(risk_profile)['description'])
        
        if not parts:
            return "Insufficient data for comprehensive explanation."
        
        explanation = " ".join(parts)
        
        return f"{explanation} Reported confidence value: {confidence:.1f}%. Not a clinical diagnosis."

    @staticmethod
    def _normalize_stage(stage: str) -> str:
        return normalize_stage_name(stage)

    @staticmethod
    def _explain_fusion(final_stage: Dict[str, Any]) -> Dict[str, Any]:
        if not final_stage:
            return {
                'method': 'No fusion',
                'active_modalities': [],
                'missing_modalities': [],
                'modality_agreement': 'N/A',
                'contributions': {},
            }
        return {
            'method': final_stage.get('method', 'Unknown'),
            'active_modalities': final_stage.get('active_modalities', []),
            'missing_modalities': final_stage.get('missing_modalities', []),
            'modality_agreement': final_stage.get('modality_agreement', 'N/A'),
            'contributions': final_stage.get('modality_contributions', {}),
            'evidence_summary': final_stage.get('evidence_summary', []),
        }

    @staticmethod
    def _data_quality(results: Dict[str, Any]) -> Dict[str, Any]:
        expected = {
            'mri': bool(results.get('mri') and results.get('mri', {}).get('success') is not False),
            'cognitive': bool(results.get('cognitive')),
            'risk_profile': bool(results.get('risk_profile')),
            'speech_audio': bool(results.get('audio_transcription')),
            'clinical_notes': bool(results.get('clinical_notes_nlp')),
        }
        completed = [key for key, ok in expected.items() if ok]
        missing = [key for key, ok in expected.items() if not ok]
        return {
            'completed_modalities': completed,
            'missing_modalities': missing,
            'completeness_score': round(len(completed) / len(expected) * 100, 1),
        }


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
