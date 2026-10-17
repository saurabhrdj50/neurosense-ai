"""
Rule-Based Weighted Fusion Engine for Alzheimer's Disease Assessment.
This is a heuristic scoring system, NOT a clinically validated diagnosis tool.
"""

import numpy as np

from app.ml.stages import STAGE_ORDER, STAGE_INDEX, risk_to_stage_index, cog_to_stage_index

# Base heuristic weights — sum to 1.0. The legacy 'audio' slot was removed:
# speech evidence votes through the 'sentiment' key (speech NLP channel).
DEFAULT_WEIGHTS = {
    'mri':       0.40,
    'cognitive': 0.25,
    'sentiment': 0.20,
    'risk':      0.15,
}


class MultimodalFusion:
    def predict(
        self,
        mri_result=None,
        sentiment_result=None,
        cognitive_result=None,
        risk_result=None,
        speech_nlp_result=None,
        **kwargs,
    ) -> dict:
        modalities = {}

        # --- MRI ---
        if mri_result and mri_result.get('stage') and mri_result.get('success') is not False and mri_result.get('stage') != 'Error':
            stage_idx = mri_result.get('stage_index', STAGE_INDEX.get(mri_result['stage'], 0))
            # Confidence from MRI model is 0-100 → normalize to 0-1
            raw_conf = mri_result.get('confidence', 50)
            modalities['mri'] = {
                'stage_index': stage_idx,
                'confidence': raw_conf / 100.0,
                'label': f"MRI: {mri_result['stage']} ({raw_conf:.1f}%)",
            }

        # --- Speech NLP (research classifier over the transcript) ---
        # Dedicated channel: the display-only 'sentiment' object never carries
        # a severity score (pinned by tests); only this explicit input votes.
        # P(dementia) is mapped through the canonical 0-100 risk policy so the
        # vote stays monotonic with the model's probability.
        if speech_nlp_result and speech_nlp_result.get('dementia_probability') is not None:
            p = max(0.0, min(float(speech_nlp_result['dementia_probability']), 1.0))
            # Confidence = distance from the 0.5 decision boundary: a vote
            # near the threshold contributes almost nothing, a decisive one
            # contributes real signal. The model is binary (control vs
            # dementia), so confidence is capped well below the MRI's.
            speech_conf = max(0.1, min(abs(p - 0.5) * 2.0, 0.9))
            modalities['sentiment'] = {
                'stage_index': risk_to_stage_index(p * 100.0),
                'confidence': speech_conf,
                'label': f"Speech NLP: P(dementia)={p:.2f} (research model)",
            }

        # --- Sentiment / Speech (display-only) ---
        # The sentiment parameter is accepted for call-site compatibility but
        # deliberately never votes: the display object carries no severity
        # score (pinned by tests), and the speech model's verdict arrives via
        # the explicit ``speech_nlp_result`` channel above. The former
        # cognitive_risk_score/audio legacy paths were removed — dead code.

        # --- Cognitive ---
        # Gate on actual assessment coverage: composite_score 0 with zero
        # answered questions ("Not Assessed") must never vote — cog_to_stage_index(0)
        # maps to "Alzheimer's Disease (AD)", so an empty questionnaire would
        # otherwise fabricate a severe-dementia vote.
        if cognitive_result and cognitive_result.get('composite_score') is not None:
            tests_completed = cognitive_result.get('tests_completed')
            if tests_completed is not None:
                cog_assessed = tests_completed > 0
            else:
                # Legacy callers without coverage info: treat a zero composite
                # as "not assessed" (a real assessment with every item wrong
                # reports tests_completed > 0 via the evaluator).
                cog_assessed = cognitive_result.get('composite_score', 0) > 0
            if cog_assessed:
                cog_score = cognitive_result['composite_score']
                cog_idx = cognitive_result.get('stage_index')
                if cog_idx is None:
                    cog_idx = self._cog_to_stage_index(cog_score)
                # Confidence: higher composite score (less impaired) = higher confidence in a lower stage
                cog_conf = abs(cog_score - (cog_idx * 33.3)) / 100.0  # rough uncertainty
                modalities['cognitive'] = {
                    'stage_index': cog_idx,
                    'confidence': max(0.3, min(cog_conf + 0.4, 0.9)),
                    'label': f"Cognitive Score: {cog_score}/100",
                }

        # --- Risk ---
        # Same gate as cognitive: the "No Data" profile (no factors assessed)
        # must not drag the fused stage toward Non-Demented.
        if risk_result and risk_result.get('overall_risk_score') is not None:
            factors_assessed = risk_result.get('factors_assessed')
            if factors_assessed is not None:
                risk_assessed = factors_assessed > 0
            else:
                # Legacy callers without coverage info: a zero score means
                # nothing was assessed; RiskProfiler's "No Data" profile
                # always carries factors_assessed=0, so this fallback only
                # applies to hand-built dicts.
                risk_assessed = risk_result.get('overall_risk_score', 0) > 0
            if risk_assessed:
                risk_val = risk_result['overall_risk_score']
                risk_idx = self._risk_to_stage_index(risk_val)
                modalities['risk'] = {
                    'stage_index': risk_idx,
                    'confidence': risk_val / 100.0,
                    'label': f"Risk Score: {risk_val}/100",
                }

        if not modalities:
            return self._empty_result()

        if len(modalities) == 1:
            key, mod = next(iter(modalities.items()))
            # Sanitize single-modality inputs: production domains always emit
            # stage_index 0-2 and confidence 0-100, but clamp defensively so a
            # malformed caller can never produce an out-of-range stage or a
            # confidence like 1000% in the frontend response.
            safe_idx = max(0, min(int(mod['stage_index']), len(STAGE_ORDER) - 1))
            safe_conf = max(0.0, min(float(mod['confidence']) * 100, 100.0))
            return {
                'stage': STAGE_ORDER[safe_idx],
                'stage_index': safe_idx,
                'confidence': round(safe_conf, 1),
                'summary': f"Stage interpreted from {key.upper()} analysis only. Not a clinical diagnosis.",
                'method': f'{key.upper()} Only',
                'modality_contributions': {key: 100},
                'modality_agreement': 'N/A',
                'evidence_summary': [mod['label']],
                'active_modalities': list(modalities.keys()),
                'missing_modalities': [k for k in DEFAULT_WEIGHTS if k not in modalities],
                'uncertainty_factors': ['Only one modality available. Add more evidence before clinical interpretation.'],
                'explanation': f"Stage interpreted from {key.upper()} analysis only. Not a clinical diagnosis.",
            }

        # Base prior heuristic weights
        base_weights = {k: DEFAULT_WEIGHTS.get(k, 0.10) for k in modalities}

        # Tier 2 Attentive Evidential Gating:
        # Modulates base priors with each modality's confidence certainty,
        # adaptively emphasizing high-certainty evidence while softly attenuating noise.
        atten_weights = {}
        for k in modalities:
            conf = float(modalities[k].get('confidence', 0.5))
            certainty_gain = 1.0 + 0.25 * (conf - 0.5)
            atten_weights[k] = base_weights[k] * certainty_gain

        total_atten = sum(atten_weights.values())
        norm_weights = {k: atten_weights[k] / total_atten for k in modalities}

        # Weighted average of stage indices
        fused_raw = sum(norm_weights[k] * modalities[k]['stage_index'] for k in modalities)
        fused_idx = max(0, min(int(round(fused_raw)), len(STAGE_ORDER) - 1))

        # Weighted average of confidence
        fused_conf_raw = sum(norm_weights[k] * modalities[k]['confidence'] for k in modalities)

        # Agreement
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

        epistemic_uncertainty = round(float(np.var(indices)) if len(indices) > 1 else 0.0, 3)

        contributions = {k: round(norm_weights[k] * 100, 1) for k in modalities}
        evidence = [m['label'] for m in modalities.values()]

        method_parts = [k.upper() for k in modalities]
        method = f"Multimodal Fusion ({' + '.join(method_parts)})"

        explanation = (
            f"Hybrid Multimodal Fusion: '{STAGE_ORDER[fused_idx]}' from "
            f"{len(modalities)} modalities. Modality Agreement: {agreement}. "
            + '; '.join(evidence) + '. '
            + 'Note: Heuristic interpretation only, not a medical diagnosis.'
        )

        return {
            'stage': STAGE_ORDER[fused_idx],
            'stage_index': fused_idx,
            'confidence': fused_conf,
            'summary': explanation,
            'epistemic_uncertainty': epistemic_uncertainty,
            'method': method,
            'fusion_architecture': 'hybrid_attentive_evidential',
            'modality_contributions': contributions,
            'modality_agreement': agreement,
            'evidence_summary': evidence,
            'active_modalities': list(modalities.keys()),
            'missing_modalities': [k for k in DEFAULT_WEIGHTS if k not in modalities],
            'uncertainty_factors': self._uncertainty_factors(modalities, agreement),
            'explanation': explanation,
        }

    @staticmethod
    def _risk_to_stage_index(risk_score: float) -> int:
        return risk_to_stage_index(risk_score)

    @staticmethod
    def _cog_to_stage_index(composite: float) -> int:
        return cog_to_stage_index(composite)

    @staticmethod
    def _empty_result() -> dict:
        return {
            'stage': None,
            'stage_index': None,
            'confidence': 0,
            'summary': 'No modality data available for fusion.',
            'method': 'No Data',
            'modality_contributions': {},
            'modality_agreement': 'N/A',
            'evidence_summary': [],
            'active_modalities': [],
            'missing_modalities': list(DEFAULT_WEIGHTS.keys()),
            'uncertainty_factors': ['No modality data available.'],
            'explanation': 'No modality data available for fusion.',
        }

    @staticmethod
    def _uncertainty_factors(modalities: dict, agreement: str) -> list:
        factors = []
        if len(modalities) < 3:
            factors.append('Fewer than three modalities were available.')
        if 'mri' not in modalities:
            factors.append('MRI evidence was not available.')
        if 'cognitive' not in modalities:
            factors.append('Cognitive evidence was not available.')
        if 'risk' not in modalities:
            factors.append('Clinical risk profile was not available.')
        if 'sentiment' not in modalities:
            factors.append('Speech NLP evidence was not available.')
        if agreement in ('Moderate', 'Low'):
            factors.append(f'Modality agreement is {agreement.lower()}.')
        return factors
