"""
Multimodal Fusion Module (Advanced)
Combines up to 4 modalities for Alzheimer's stage prediction:

1. MRI Classification (primary clinical indicator)
2. Sentiment / Cognitive Linguistic Analysis
3. Cognitive Assessment Test Scores
4. Risk Factor Profile

Fusion strategy: Adaptive evidence-weighted combination with
confidence-proportional weighting and modality agreement scoring.
"""

STAGE_ORDER = [
    'Non-Demented',
    'Very Mild Demented',
    'Mild Demented',
    'Moderate Demented',
]

STAGE_INDEX = {s: i for i, s in enumerate(STAGE_ORDER)}


class MultimodalFusion:
    """
    Combines multiple modality results into a final prediction.

    Default weights (adjusted when modalities are missing):
      MRI:          0.30
      Sentiment:    0.15
      Cognitive:    0.20
      Risk:         0.12
      Handwriting:  0.13
      Audio:        0.10
    """

    DEFAULT_WEIGHTS = {
        'mri': 0.30,
        'sentiment': 0.13,
        'cognitive': 0.18,
        'risk': 0.10,
        'handwriting': 0.11,
        'audio': 0.08,
        'visual': 0.10,
    }

    def predict(
        self,
        mri_result: dict | None = None,
        sentiment_result: dict | None = None,
        cognitive_result: dict | None = None,
        risk_result: dict | None = None,
        handwriting_result: dict | None = None,
        audio_result: dict | None = None,
        visual_result: dict | None = None,
    ) -> dict:
        """
        Returns
        -------
        dict with keys:
            stage, stage_index, confidence, method,
            modality_contributions, modality_agreement,
            evidence_summary, explanation
        """
        modalities = {}

        # ── Extract stage index + confidence from each modality ──
        if mri_result and mri_result.get('stage'):
            modalities['mri'] = {
                'stage_index': mri_result.get('stage_index', STAGE_INDEX.get(mri_result['stage'], 0)),
                'confidence': mri_result.get('confidence', 50) / 100.0,
                'label': f"MRI: {mri_result['stage']} ({mri_result.get('confidence', 0):.1f}%)",
            }

        if sentiment_result and sentiment_result.get('cognitive_risk_score') is not None:
            risk_score = sentiment_result['cognitive_risk_score']
            sent_idx = self._risk_to_stage_index(risk_score)
            modalities['sentiment'] = {
                'stage_index': sent_idx,
                'confidence': min(risk_score / 100.0, 0.95),
                'label': f"Sentiment: {STAGE_ORDER[sent_idx]} (risk: {risk_score}/100)",
            }

        if cognitive_result and cognitive_result.get('composite_score') is not None:
            cog_score = cognitive_result['composite_score']
            cog_idx = cognitive_result.get('stage_index')
            if cog_idx is None:
                cog_idx = self._cog_to_stage_index(cog_score)
            modalities['cognitive'] = {
                'stage_index': cog_idx,
                'confidence': (100 - cog_score) / 100.0,  # lower score = higher severity
                'label': f"Cognitive: {STAGE_ORDER[cog_idx]} (score: {cog_score}/100)",
            }

        if risk_result and risk_result.get('overall_risk_score') is not None:
            risk_val = risk_result['overall_risk_score']
            risk_idx = self._risk_to_stage_index(risk_val)
            modalities['risk'] = {
                'stage_index': risk_idx,
                'confidence': risk_val / 100.0,
                'label': f"Risk: {STAGE_ORDER[risk_idx]} (score: {risk_val}/100)",
            }

        if handwriting_result and handwriting_result.get('handwriting_risk_score') is not None:
            hw_score = handwriting_result['handwriting_risk_score']
            hw_idx = handwriting_result.get('stage_index', self._risk_to_stage_index(hw_score))
            modalities['handwriting'] = {
                'stage_index': hw_idx,
                'confidence': hw_score / 100.0,
                'label': f"Handwriting: {STAGE_ORDER[hw_idx]} (score: {hw_score}/100)",
            }

        if audio_result and audio_result.get('cognitive_risk_score') is not None:
            au_score = audio_result['cognitive_risk_score']
            au_idx = self._risk_to_stage_index(au_score)
            modalities['audio'] = {
                'stage_index': au_idx,
                'confidence': min(au_score / 100.0, 0.95),
                'label': f"Audio: {STAGE_ORDER[au_idx]} (risk: {au_score}/100)",
            }

        if visual_result and visual_result.get('visual_risk_score') is not None:
            vi_score = visual_result['visual_risk_score']
            vi_idx = visual_result.get('stage_index', self._risk_to_stage_index(vi_score))
            modalities['visual'] = {
                'stage_index': vi_idx,
                'confidence': vi_score / 100.0,
                'label': f"Facial Emotion: {STAGE_ORDER[vi_idx]} (risk: {vi_score}/100)",
            }

        if not modalities:
            return self._empty_result()

        # ── Single modality shortcut ──
        if len(modalities) == 1:
            key, mod = next(iter(modalities.items()))
            return {
                'stage': STAGE_ORDER[mod['stage_index']],
                'stage_index': mod['stage_index'],
                'confidence': round(mod['confidence'] * 100, 1),
                'method': f'{key.upper()} Only',
                'modality_contributions': {key: 100},
                'modality_agreement': 'N/A',
                'evidence_summary': [mod['label']],
                'explanation': (
                    f"Final stage determined from {key.upper()} analysis only. "
                    "Adding more modalities improves accuracy."
                ),
            }

        # ── Multi-modality fusion ──
        # Redistribute weights to present modalities
        active_weights = {k: self.DEFAULT_WEIGHTS[k] for k in modalities}
        total_w = sum(active_weights.values())
        norm_weights = {k: w / total_w for k, w in active_weights.items()}

        # Confidence-adjusted weighted average of stage indices
        fused_raw = 0.0
        fused_conf_raw = 0.0
        for key, mod in modalities.items():
            w = norm_weights[key]
            # Higher confidence modalities get proportionally more influence
            adj_w = w * (0.5 + 0.5 * mod['confidence'])
            fused_raw += adj_w * mod['stage_index']
            fused_conf_raw += adj_w * mod['confidence']

        # Normalise
        adj_total = sum(
            norm_weights[k] * (0.5 + 0.5 * modalities[k]['confidence'])
            for k in modalities
        )
        fused_raw /= max(adj_total, 0.01)
        fused_idx = min(round(fused_raw), 3)

        # ── Modality agreement ──
        indices = [m['stage_index'] for m in modalities.values()]
        max_spread = max(indices) - min(indices)
        if max_spread == 0:
            agreement = 'Full'
            agreement_bonus = 1.0
        elif max_spread == 1:
            agreement = 'High'
            agreement_bonus = 0.9
        elif max_spread == 2:
            agreement = 'Moderate'
            agreement_bonus = 0.75
        else:
            agreement = 'Low'
            agreement_bonus = 0.6

        fused_conf = round(
            (fused_conf_raw / max(adj_total, 0.01)) * agreement_bonus * 100, 1
        )
        fused_conf = max(10.0, min(fused_conf, 99.0))

        # Contributions (percentage)
        contributions = {
            k: round(norm_weights[k] * 100, 1) for k in modalities
        }

        evidence = [m['label'] for m in modalities.values()]

        explanation = (
            f"Fused result: '{STAGE_ORDER[fused_idx]}' from "
            f"{len(modalities)} modalities. "
            f"Agreement: {agreement}. "
            + '; '.join(evidence) + '.'
        )

        method_parts = [k.upper() for k in modalities]
        method = f"Multimodal Fusion ({' + '.join(method_parts)})"

        return {
            'stage': STAGE_ORDER[fused_idx],
            'stage_index': fused_idx,
            'confidence': fused_conf,
            'method': method,
            'modality_contributions': contributions,
            'modality_agreement': agreement,
            'evidence_summary': evidence,
            'explanation': explanation,
        }

    # ── Mapping helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _risk_to_stage_index(risk_score: float) -> int:
        """Map 0–100 cognitive risk / overall risk to stage index 0–3."""
        if risk_score >= 60:
            return 3
        elif risk_score >= 35:
            return 2
        elif risk_score >= 15:
            return 1
        else:
            return 0

    @staticmethod
    def _cog_to_stage_index(composite: float) -> int:
        """Map cognitive composite score (0–100, higher=better) to stage."""
        if composite >= 80:
            return 0
        elif composite >= 55:
            return 1
        elif composite >= 30:
            return 2
        else:
            return 3

    @staticmethod
    def _empty_result() -> dict:
        return {
            'stage': None,
            'stage_index': None,
            'confidence': 0,
            'method': 'No Data',
            'modality_contributions': {},
            'modality_agreement': 'N/A',
            'evidence_summary': [],
            'explanation': 'No modality data available for fusion.',
        }
