"""
AI Explanation Service
Generates human-readable explanations for the multimodal AI analysis results.
Combines outputs from MRI, Cognitive scores, Sentiment, and other modalities.
"""

from typing import Dict, Any, List, Optional


class ExplanationService:
    """Generate human-readable explanations for AI predictions."""

    STAGE_DESCRIPTIONS = {
        'Non-Demented': {
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
        genomics = results.get('genomics', {})
        final_stage = results.get('final_stage', {})
        
        stage = self._normalize_stage(final_stage.get('stage') or mri.get('stage') or 'Unknown')
        confidence = final_stage.get('confidence') or mri.get('confidence') or 0
        
        explanations = {
            'summary': self._generate_summary(stage, confidence),
            'mri_explanation': self._explain_mri(mri),
            'cognitive_explanation': self._explain_cognitive(cognitive),
            'sentiment_explanation': self._explain_sentiment(sentiment),
            'handwriting_explanation': self._explain_handwriting(handwriting),
            'genomics_explanation': self._explain_genomics(genomics),
            'risk_factors': self._explain_risk_factors(risk_profile),
            'key_indicators': self._extract_key_indicators(mri, cognitive, sentiment, handwriting, genomics),
            'feature_attribution': self._build_feature_attribution(results),
            'stage_details': self.STAGE_DESCRIPTIONS.get(stage, self.STAGE_DESCRIPTIONS['Non-Demented']),
            'confidence_level': self._get_confidence_level(confidence),
            'fusion_explanation': self._explain_fusion(final_stage),
            'data_quality': self._data_quality(results),
            'uncertainty_factors': final_stage.get('uncertainty_factors', []),
            'overall_explanation': self._generate_overall_explanation(
                stage, mri, cognitive, sentiment, handwriting, genomics, confidence
            )
        }
        
        return explanations

    def _generate_summary(self, stage: str, confidence: float) -> str:
        """Generate a brief summary of the analysis."""
        stage_desc = self.STAGE_DESCRIPTIONS.get(stage, self.STAGE_DESCRIPTIONS['Non-Demented'])
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
            'Non-Demented': 'Brain scan shows normal tissue structure with no significant atrophy patterns.',
            'Very Mild Demented': 'Subtle changes detected in memory-related brain regions.',
            'Mild Demented': 'Visible reduction in brain volume, particularly in hippocampus and temporal regions.',
            'Moderate Demented': 'Significant brain atrophy observed across multiple regions.'
        }
        
        return {
            'status': stage,
            'description': descriptions.get(stage, 'Analysis completed.'),
            'confidence': confidence,
            'impact': 'high',
            'findings': mri.get('gradcam_regions', []) or mri.get('predictions', []),
            'decision_summary': mri.get('decision_summary'),
            'heatmap_available': bool(mri.get('gradcam_image') or mri.get('gradcam_image_base64')),
            'heatmap_explanation': mri.get('heatmap_explanation'),
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
        
        if composite >= 80:
            status = 'Normal'
            description = 'Cognitive performance within healthy range. Memory, attention, and executive functions are intact.'
            impact = 'low'
        elif composite >= 55:
            status = 'Mild Impairment'
            description = 'Slight difficulties in memory or executive tasks. May require monitoring.'
            impact = 'medium'
        elif composite >= 30:
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
        
        if risk_score < 25:
            status = 'Normal'
            description = 'Handwriting characteristics within normal range.'
            impact = 'low'
        elif risk_score < 50:
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

    def _explain_genomics(self, genomics: Dict[str, Any]) -> Dict[str, Any]:
        """Explain genetic risk marker analysis."""
        if not genomics:
            return {
                'status': 'Not Analyzed',
                'description': 'No DNA data was provided for genetic risk marker analysis.',
                'impact': 'low'
            }

        if not genomics.get('success'):
            return {
                'status': 'Not Parsed',
                'description': genomics.get('summary', 'No supported AD risk markers were found.'),
                'impact': 'low',
                'risk_score': genomics.get('genetic_risk_score', 0),
            }

        score = genomics.get('genetic_risk_score', 0)
        impact = 'high' if score >= 65 else 'medium' if score >= 35 else 'low'

        return {
            'status': genomics.get('apoe_e4_status', 'Unknown'),
            'description': genomics.get('summary', 'Genomic markers were analyzed.'),
            'risk_score': score,
            'trem2_status': genomics.get('trem2_status'),
            'impact': impact,
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
        handwriting: Dict,
        genomics: Dict
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
                'value': f'{score}/100',
                'confidence': score,
                'weight': 'high'
            })
        
        if sentiment:
            indicators.append({
                'modality': 'Sentiment',
                'value': sentiment.get('dominant_emotion', 'N/A'),
                'confidence': min(sentiment.get('cognitive_risk_score', 0), 100),
                'weight': 'medium'
            })
        
        if handwriting:
            indicators.append({
                'modality': 'Handwriting',
                'value': f"{handwriting.get('handwriting_risk_score', 0)}/100 risk",
                'confidence': max(0, 100 - handwriting.get('handwriting_risk_score', 0)),
                'weight': 'low'
            })

        if genomics:
            indicators.append({
                'modality': 'Genomics',
                'value': genomics.get('apoe_e4_status', 'Unknown'),
                'confidence': min(genomics.get('genetic_risk_score', 0), 100),
                'weight': 'medium'
            })
        
        return indicators

    def _generate_overall_explanation(
        self,
        stage: str,
        mri: Dict,
        cognitive: Dict,
        sentiment: Dict,
        handwriting: Dict,
        genomics: Dict,
        confidence: float
    ) -> str:
        """Generate a comprehensive overall explanation."""
        parts = []
        
        if mri and mri.get('confidence', 0) > 0:
            mri_desc = self._explain_mri(mri)
            parts.append(f"MRI analysis shows {mri_desc['status'].lower()} status.")
            if mri_desc.get('decision_summary'):
                parts.append(mri_desc['decision_summary'])
            if mri_desc.get('heatmap_available'):
                parts.append(
                    'The Grad-CAM heatmap highlights the image regions that most strongly '
                    'supported the MRI classification.'
                )
        
        if cognitive and cognitive.get('composite_score', 0) > 0:
            cog_desc = self._explain_cognitive(cognitive)
            parts.append(f"Cognitive assessment indicates {cog_desc['status'].lower()}.")
        
        if sentiment and sentiment.get('dominant_emotion'):
            sent_desc = self._explain_sentiment(sentiment)
            parts.append(f"Emotional patterns show {sent_desc['status'].lower()} expression.")
        
        if handwriting and handwriting.get('handwriting_risk_score', 0) > 0:
            hw_desc = self._explain_handwriting(handwriting)
            parts.append(f"Handwriting analysis reveals {hw_desc['status'].lower()} characteristics.")

        if genomics and genomics.get('success'):
            gen_desc = self._explain_genomics(genomics)
            parts.append(f"Genomic analysis shows APOE status as {gen_desc['status'].lower()}.")
        
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

    def _build_feature_attribution(self, results: Dict[str, Any]) -> Dict[str, Any]:
        factors = []
        factors.extend(self._cognitive_factors(results.get('cognitive', {})))
        factors.extend(self._risk_profile_factors(results.get('risk_profile', {})))
        factors.extend(self._sentiment_factors(results.get('sentiment', {})))
        factors.extend(self._handwriting_factors(results.get('handwriting', {})))
        factors.extend(self._genomics_factors(results.get('genomics', {})))
        factors.extend(self._mri_factors(results.get('mri', {})))

        ordered = sorted(factors, key=lambda item: item['importance'], reverse=True)
        top_factors = ordered[:8]

        return {
            'method': 'Deterministic SHAP-style local attribution',
            'note': (
                'This project does not yet have a trained tabular explainer bundled with the '
                'saved multimodal model, so these attributions approximate which inputs most '
                'increased or decreased the final risk assessment.'
            ),
            'factors': top_factors,
        }

    @staticmethod
    def _factor(source: str, feature: str, value: Any, importance: float, direction: str, rationale: str) -> Dict[str, Any]:
        return {
            'source': source,
            'feature': feature,
            'value': value,
            'importance': round(max(0.0, min(float(importance), 100.0)), 1),
            'direction': direction,
            'rationale': rationale,
        }

    def _cognitive_factors(self, cognitive: Dict[str, Any]) -> List[Dict[str, Any]]:
        test_results = cognitive.get('test_results', {})
        factors = []
        for key, result in test_results.items():
            raw = result.get('raw_score', 0)
            max_score = result.get('max_score', 1) or 1
            deficit = max(0.0, 100.0 - float(result.get('percentage', 0)))
            direction = 'increases_risk' if deficit >= 50 else 'mixed'
            factors.append(self._factor(
                'Cognitive',
                result.get('name', key),
                f"{raw}/{max_score}",
                deficit,
                direction,
                f"{result.get('interpretation', 'Result')} on {result.get('name', key)} contributed to the cognitive risk estimate.",
            ))
        return factors

    def _risk_profile_factors(self, risk_profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        details = risk_profile.get('factor_details', {})
        factors = []
        for _, info in details.items():
            weighted = float(info.get('risk_score', 0)) * float(info.get('weight', 0))
            direction = 'increases_risk' if info.get('risk_score', 0) >= 25 else 'decreases_risk'
            factors.append(self._factor(
                'Risk Profile',
                info.get('label', 'Risk Factor'),
                info.get('value'),
                weighted,
                direction,
                f"{info.get('label', 'Risk factor')} was scored in the {info.get('category', 'risk')} category and affected the overall lifestyle risk profile.",
            ))
        return factors

    def _sentiment_factors(self, sentiment: Dict[str, Any]) -> List[Dict[str, Any]]:
        if not sentiment:
            return []

        factors = []
        marker_count = float(sentiment.get('cognitive_marker_count', 0))
        if marker_count > 0:
            factors.append(self._factor(
                'Sentiment',
                'Cognitive Language Markers',
                int(marker_count),
                min(marker_count * 12, 100),
                'increases_risk',
                'Language markers linked to memory, disorientation, or word-finding difficulty increased the speech-based risk estimate.',
            ))

        vocab = float(sentiment.get('vocabulary_richness', 0))
        vocab_risk = max(0.0, 60.0 - vocab)
        if vocab_risk > 0:
            factors.append(self._factor(
                'Sentiment',
                'Vocabulary Richness',
                f"{vocab:.1f}%",
                min(vocab_risk * 1.4, 100),
                'increases_risk',
                'Lower vocabulary richness can reflect simplified language patterns, which raised the linguistic risk estimate.',
            ))

        emotion = sentiment.get('dominant_emotion')
        emotion_risk = {
            'confusion': 75,
            'sadness': 50,
            'anxiety': 45,
            'frustration': 35,
            'neutral': 10,
            'positive': 5,
        }
        if emotion:
            score = emotion_risk.get(str(emotion).lower(), 15)
            factors.append(self._factor(
                'Sentiment',
                'Dominant Emotion',
                emotion,
                score,
                'increases_risk' if score >= 25 else 'decreases_risk',
                'Detected emotional tone contributed to the language-based risk signal.',
            ))
        return factors

    def _handwriting_factors(self, handwriting: Dict[str, Any]) -> List[Dict[str, Any]]:
        risk_score = handwriting.get('handwriting_risk_score')
        if risk_score is None:
            return []
        risk_score = float(risk_score)
        return [self._factor(
            'Handwriting',
            'Motor Pattern Risk',
            f"{risk_score:.1f}/100",
            risk_score,
            'increases_risk' if risk_score >= 25 else 'decreases_risk',
            'Handwriting irregularity contributed to the motor-control portion of the assessment.',
        )]

    def _genomics_factors(self, genomics: Dict[str, Any]) -> List[Dict[str, Any]]:
        if not genomics:
            return []

        factors = []
        genetic_risk = float(genomics.get('genetic_risk_score', 0))
        if genomics.get('success'):
            factors.append(self._factor(
                'Genomics',
                'Genetic Risk Score',
                f"{genetic_risk:.1f}/100",
                genetic_risk,
                'increases_risk' if genetic_risk >= 35 else 'decreases_risk',
                'Parsed APOE/TREM2 markers contributed to the inherited-risk signal.',
            ))

            apoe = genomics.get('apoe_e4_status', 'Unknown')
            apoe_score = {
                'Homozygous': 95,
                'Heterozygous': 70,
                'Negative': 10,
                'Unknown': 20,
            }.get(apoe, 20)
            factors.append(self._factor(
                'Genomics',
                'APOE-e4 Status',
                apoe,
                apoe_score,
                'increases_risk' if apoe_score >= 35 else 'decreases_risk',
                'APOE-e4 status is one of the strongest inherited Alzheimer risk indicators in this pipeline.',
            ))
        return factors

    def _mri_factors(self, mri: Dict[str, Any]) -> List[Dict[str, Any]]:
        if not mri or mri.get('success') is False:
            return []

        confidence = float(mri.get('confidence', 0))
        stage = str(mri.get('stage', 'Unknown'))
        stage_weight = {
            'Non-Demented': 5,
            'Very Mild Demented': 35,
            'Mild Demented': 65,
            'Moderate Demented': 90,
        }.get(stage, 20)
        return [self._factor(
            'MRI',
            'MRI Stage Prediction',
            f"{stage} ({confidence:.1f}%)",
            min((stage_weight * 0.6) + (confidence * 0.4), 100),
            'increases_risk' if stage != 'Non-Demented' else 'decreases_risk',
            'The MRI classifier is the strongest single modality and heavily influenced the final prediction.',
        )]

    @staticmethod
    def _normalize_stage(stage: str) -> str:
        if stage == 'Non Demented':
            return 'Non-Demented'
        return stage

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
            'handwriting': bool(results.get('handwriting')),
            'sentiment': bool(results.get('sentiment')),
            'speech': bool(results.get('audio_sentiment') or results.get('audio_transcription')),
            'genomics': bool(results.get('genomics') and results.get('genomics', {}).get('success')),
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
