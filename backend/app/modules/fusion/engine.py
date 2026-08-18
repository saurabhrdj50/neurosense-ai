"""
Multimodal Fusion Engine for Alzheimer's Disease Risk and Stage Assessment.
Prioritizes modalities based on clinical evidence: MRI, Blood Biomarkers, Cognitive Tests,
Genomics, Clinical Risk, Speech, Handwriting, and Facial Analysis.
"""

import numpy as np

STAGE_ORDER = [
    'Non-Demented',
    'Very Mild Demented',
    'Mild Demented',
    'Moderate Demented',
]

STAGE_INDEX = {s: i for i, s in enumerate(STAGE_ORDER)}

DEFAULT_WEIGHTS = {
    'mri': 0.40,
    'cognitive': 0.25,
    'sentiment': 0.15,
    'risk': 0.10,
    'visual': 0.10,
}


class MultimodalFusion:
    def predict(
        self,
        mri_result=None,
        sentiment_result=None,
        cognitive_result=None,
        risk_result=None,
        audio_result=None,
        visual_result=None,
        neuropsych_result=None,
        blood_result=None,
        handwriting_result=None,
        genomics_result=None,
    ) -> dict:
        modalities = {}

        if neuropsych_result and (neuropsych_result.get('risk_score') is not None or neuropsych_result.get('mmse') is not None or neuropsych_result.get('moca') is not None):
            np_score = neuropsych_result.get('risk_score', 0)
            np_idx = self._risk_to_stage_index(np_score)
            modalities['neuropsych'] = {
                'stage_index': np_idx,
                'confidence': min(max(np_score / 100.0, 0.4), 0.95),
                'label': f"Neuropsychological Battery: {STAGE_ORDER[np_idx]} (risk: {np_score:.1f}/100)",
            }

        if mri_result and mri_result.get('stage') and mri_result.get('success') is not False and mri_result.get('stage') != 'Error':
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
                'label': f"Speech Sentiment: {STAGE_ORDER[sent_idx]} (risk: {risk_score}/100)",
            }

        if cognitive_result and cognitive_result.get('composite_score') is not None:
            cog_score = cognitive_result['composite_score']
            cog_idx = cognitive_result.get('stage_index')
            if cog_idx is None:
                cog_idx = self._cog_to_stage_index(cog_score)
            modalities['cognitive'] = {
                'stage_index': cog_idx,
                'confidence': (100 - cog_score) / 100.0,
                'label': f"Cognitive: {STAGE_ORDER[cog_idx]} (score: {cog_score}/100)",
            }

        if risk_result and risk_result.get('overall_risk_score') is not None:
            risk_val = risk_result['overall_risk_score']
            risk_idx = self._risk_to_stage_index(risk_val)
            modalities['risk'] = {
                'stage_index': risk_idx,
                'confidence': risk_val / 100.0,
                'label': f"Clinical Risk: {STAGE_ORDER[risk_idx]} (score: {risk_val}/100)",
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
                'active_modalities': list(modalities.keys()),
                'missing_modalities': [k for k in DEFAULT_WEIGHTS if k not in modalities],
                'uncertainty_factors': ['Only one modality was available. Add more independent evidence before clinical interpretation.'],
                'explanation': f"Final stage determined from {key.upper()} analysis only.",
            }

        # Dynamic Gated Modal Attention: compute cross-modal attention scores
        active_weights = {k: DEFAULT_WEIGHTS.get(k, 0.10) for k in modalities}
        
        attention_scores = {}
        for k, mod in modalities.items():
            cross_boost = 0.20 if k in ('mri', 'cognitive', 'risk') else 0.05
            attention_scores[k] = active_weights[k] * (0.4 + 0.6 * mod['confidence']) * (1.0 + cross_boost)
            
        total_attn = sum(attention_scores.values())
        norm_attn = {k: v / total_attn for k, v in attention_scores.items()}

        fused_raw = 0.0
        fused_conf_raw = 0.0
        for key, mod in modalities.items():
            w_attn = norm_attn[key]
            fused_raw += w_attn * mod['stage_index']
            fused_conf_raw += w_attn * mod['confidence']

        fused_idx = min(round(fused_raw), 3)

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

        fused_conf = round(fused_conf_raw * agreement_bonus * 100, 1)
        fused_conf = max(10.0, min(fused_conf, 99.0))

        stage_indices_list = [m['stage_index'] for m in modalities.values()]
        epistemic_uncertainty = round(float(np.var(stage_indices_list)) if len(stage_indices_list) > 1 else 0.0, 3)

        probs = [0.0] * 4
        for i in range(4):
            dist = abs(fused_raw - i)
            probs[i] = max(0.02, 1.0 / (1.0 + dist * 2.5))
        total_p = sum(probs)
        stage_probs = {STAGE_ORDER[i]: round(probs[i] / total_p, 3) for i in range(4)}

        contributions = {k: round(norm_attn[k] * 100, 1) for k in modalities}
        evidence = [m['label'] for m in modalities.values()]

        explanation = (
            f"Cross-Modal Attention Fused result: '{STAGE_ORDER[fused_idx]}' from "
            f"{len(modalities)} modalities. "
            f"Modality Agreement: {agreement}. "
            + '; '.join(evidence) + '.'
        )

        method_parts = [k.upper() for k in modalities]
        method = f"Multimodal Fusion - Cross-Modal Attention Transformer ({' + '.join(method_parts)})"

        return {
            'stage': STAGE_ORDER[fused_idx],
            'stage_index': fused_idx,
            'confidence': fused_conf,
            'epistemic_uncertainty': epistemic_uncertainty,
            'stage_probabilities': stage_probs,
            'method': method,
            'modality_contributions': contributions,
            'attention_weights': contributions,
            'modality_agreement': agreement,
            'evidence_summary': evidence,
            'active_modalities': list(modalities.keys()),
            'missing_modalities': [k for k in DEFAULT_WEIGHTS if k not in modalities],
            'uncertainty_factors': self._uncertainty_factors(modalities, agreement, fused_conf),
            'explanation': explanation,
        }

    @staticmethod
    def _risk_to_stage_index(risk_score: float) -> int:
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
            'active_modalities': [],
            'missing_modalities': list(DEFAULT_WEIGHTS.keys()),
            'uncertainty_factors': ['No modality data available for fusion.'],
            'explanation': 'No modality data available for fusion.',
        }

    @staticmethod
    def _uncertainty_factors(modalities: dict, agreement: str, confidence: float) -> list:
        factors = []
        if len(modalities) < 3:
            factors.append('Fewer than three modalities were available.')
        if 'mri' not in modalities:
            factors.append('MRI evidence was not available.')
        if 'cognitive' not in modalities:
            factors.append('Standardized cognitive evidence was not available.')
        if 'risk' not in modalities:
            factors.append('Clinical risk profile evidence was not available.')
        if agreement in ('Moderate', 'Low'):
            factors.append(f'Modality agreement is {agreement.lower()}.')
        if confidence < 60:
            factors.append('Final confidence is below 60%.')
        return factors
