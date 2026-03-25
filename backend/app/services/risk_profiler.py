"""
Risk Profiler Module
Computes a personalised Alzheimer's risk profile based on
established medical risk factors from epidemiological research.

Categories:
- Demographics (age, sex, education)
- Lifestyle (exercise, diet, sleep, social, smoking, alcohol)
- Medical history (hypertension, diabetes, obesity, trauma, depression)
- Genetics (family history, APOE ε4 status)

Returns a weighted risk score (0–100), category breakdown, and
personalised prevention recommendations.
"""

from typing import Any


# ── Risk factor weights (evidence-based relative weighting) ──────────────────
FACTOR_CONFIG = {
    # ─── Demographics ───
    'age': {
        'category': 'Demographics',
        'label': 'Age',
        'weight': 15,
        'scoring': lambda v: (
            0 if v < 50 else
            20 if v < 60 else
            45 if v < 70 else
            70 if v < 80 else
            95
        ),
    },
    'sex': {
        'category': 'Demographics',
        'label': 'Biological Sex',
        'weight': 5,
        'scoring': lambda v: 60 if str(v).lower() == 'female' else 40,
    },
    'education_years': {
        'category': 'Demographics',
        'label': 'Education Level',
        'weight': 8,
        'scoring': lambda v: (
            80 if v < 8 else
            50 if v < 12 else
            25 if v < 16 else
            10
        ),
    },
    # ─── Lifestyle ───
    'physical_activity': {
        'category': 'Lifestyle',
        'label': 'Physical Activity',
        'weight': 8,
        'scoring': lambda v: {'sedentary': 85, 'light': 55, 'moderate': 25, 'active': 5}.get(str(v).lower(), 50),
    },
    'diet_quality': {
        'category': 'Lifestyle',
        'label': 'Diet Quality (Mediterranean)',
        'weight': 6,
        'scoring': lambda v: {'poor': 80, 'average': 45, 'good': 15, 'excellent': 5}.get(str(v).lower(), 45),
    },
    'sleep_quality': {
        'category': 'Lifestyle',
        'label': 'Sleep Quality',
        'weight': 5,
        'scoring': lambda v: {'poor': 80, 'fair': 50, 'good': 20, 'excellent': 5}.get(str(v).lower(), 40),
    },
    'social_engagement': {
        'category': 'Lifestyle',
        'label': 'Social Engagement',
        'weight': 5,
        'scoring': lambda v: {'isolated': 85, 'low': 55, 'moderate': 25, 'high': 5}.get(str(v).lower(), 40),
    },
    'smoking': {
        'category': 'Lifestyle',
        'label': 'Smoking Status',
        'weight': 4,
        'scoring': lambda v: {'current': 80, 'former': 40, 'never': 5}.get(str(v).lower(), 30),
    },
    'alcohol': {
        'category': 'Lifestyle',
        'label': 'Alcohol Consumption',
        'weight': 3,
        'scoring': lambda v: {'heavy': 85, 'moderate': 30, 'light': 15, 'none': 20}.get(str(v).lower(), 30),
    },
    # ─── Medical History ───
    'hypertension': {
        'category': 'Medical',
        'label': 'Hypertension',
        'weight': 7,
        'scoring': lambda v: 75 if v else 10,
    },
    'diabetes': {
        'category': 'Medical',
        'label': 'Diabetes',
        'weight': 7,
        'scoring': lambda v: 70 if v else 10,
    },
    'obesity': {
        'category': 'Medical',
        'label': 'Obesity (BMI ≥ 30)',
        'weight': 5,
        'scoring': lambda v: 65 if v else 10,
    },
    'head_trauma': {
        'category': 'Medical',
        'label': 'History of Head Trauma',
        'weight': 5,
        'scoring': lambda v: 70 if v else 5,
    },
    'depression': {
        'category': 'Medical',
        'label': 'Depression History',
        'weight': 6,
        'scoring': lambda v: 65 if v else 10,
    },
    # ─── Genetics ───
    'family_history': {
        'category': 'Genetics',
        'label': 'Family History of AD',
        'weight': 8,
        'scoring': lambda v: 80 if v else 10,
    },
    'apoe_e4': {
        'category': 'Genetics',
        'label': 'APOE ε4 Carrier',
        'weight': 10,
        'scoring': lambda v: (
            90 if str(v).lower() == 'homozygous' else
            65 if str(v).lower() in ('heterozygous', 'yes', 'true') else
            15 if str(v).lower() in ('no', 'false', 'negative') else
            40  # unknown
        ),
    },
}

MODIFIABLE_FACTORS = {
    'physical_activity', 'diet_quality', 'sleep_quality',
    'social_engagement', 'smoking', 'alcohol',
    'hypertension', 'diabetes', 'obesity', 'depression',
}


class RiskProfiler:
    """Compute a personalised Alzheimer's risk profile."""

    def assess(self, factors: dict[str, Any]) -> dict:
        """
        Parameters
        ----------
        factors : dict with keys matching FACTOR_CONFIG keys.
                  All optional; missing factors are skipped.

        Returns
        -------
        dict with overall_risk_score, category_scores, factor_details,
             modifiable_risk, prevention_recommendations.
        """
        factor_details = {}
        category_scores: dict[str, list] = {}
        weighted_sum = 0.0
        total_weight = 0.0

        for key, cfg in FACTOR_CONFIG.items():
            val = factors.get(key)
            if val is None:
                continue

            raw = cfg['scoring'](val)
            weight = cfg['weight']
            weighted_sum += raw * weight
            total_weight += weight

            cat = cfg['category']
            category_scores.setdefault(cat, [])
            category_scores[cat].append({'score': raw, 'weight': weight})

            factor_details[key] = {
                'label': cfg['label'],
                'category': cat,
                'value': val,
                'risk_score': raw,
                'weight': weight,
                'modifiable': key in MODIFIABLE_FACTORS,
                'color': self._score_color(raw),
            }

        if not factor_details:
            return self._empty_result()

        overall = round(weighted_sum / total_weight, 1) if total_weight else 0

        # Category aggregates
        cat_summary = {}
        for cat, items in category_scores.items():
            w_sum = sum(i['score'] * i['weight'] for i in items)
            w_tot = sum(i['weight'] for i in items)
            cat_summary[cat] = round(w_sum / w_tot, 1) if w_tot else 0

        # Modifiable vs non-modifiable
        mod_scores = [d['risk_score'] for d in factor_details.values() if d['modifiable']]
        non_mod_scores = [d['risk_score'] for d in factor_details.values() if not d['modifiable']]

        risk = self._risk_level(overall)
        recs = self._recommendations(factor_details, overall)

        return {
            'overall_risk_score': overall,
            'risk_label': risk['label'],
            'risk_color': risk['color'],
            'risk_description': risk['description'],
            'category_scores': cat_summary,
            'factor_details': factor_details,
            'factors_assessed': len(factor_details),
            'factors_total': len(FACTOR_CONFIG),
            'modifiable_risk': round(sum(mod_scores) / max(len(mod_scores), 1), 1),
            'non_modifiable_risk': round(sum(non_mod_scores) / max(len(non_mod_scores), 1), 1),
            'prevention_recommendations': recs,
        }

    # ── Helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _score_color(score: float) -> str:
        if score >= 70:
            return '#ef4444'
        if score >= 45:
            return '#f97316'
        if score >= 25:
            return '#eab308'
        return '#22c55e'

    @staticmethod
    def _risk_level(score: float) -> dict:
        if score >= 65:
            return {
                'label': 'High Risk',
                'color': '#ef4444',
                'description': (
                    'Multiple significant risk factors present. '
                    'Proactive monitoring and risk reduction strongly recommended.'
                ),
            }
        if score >= 40:
            return {
                'label': 'Moderate Risk',
                'color': '#f97316',
                'description': (
                    'Several risk factors identified. '
                    'Lifestyle modifications and regular screening can reduce risk.'
                ),
            }
        if score >= 20:
            return {
                'label': 'Low Risk',
                'color': '#eab308',
                'description': (
                    'Few risk factors present. '
                    'Continue healthy lifestyle practices and routine check-ups.'
                ),
            }
        return {
            'label': 'Minimal Risk',
            'color': '#22c55e',
            'description': 'Risk factor profile is favorable. Maintain current health practices.',
        }

    @staticmethod
    def _recommendations(details: dict, overall: float) -> list[str]:
        recs = []

        if details.get('physical_activity', {}).get('risk_score', 0) > 50:
            recs.append(
                '🏃 Increase physical activity — aim for 150 min/week of '
                'moderate exercise. This can reduce AD risk by up to 30%.'
            )
        if details.get('diet_quality', {}).get('risk_score', 0) > 40:
            recs.append(
                '🥗 Adopt a Mediterranean or MIND diet — rich in vegetables, '
                'berries, fish, and olive oil.'
            )
        if details.get('sleep_quality', {}).get('risk_score', 0) > 50:
            recs.append(
                '😴 Improve sleep hygiene — target 7–8 hours of quality sleep. '
                'Poor sleep accelerates amyloid-β accumulation.'
            )
        if details.get('social_engagement', {}).get('risk_score', 0) > 50:
            recs.append(
                '👥 Increase social interaction — regular engagement reduces '
                'cognitive decline risk by up to 26%.'
            )
        if details.get('smoking', {}).get('risk_score', 0) > 40:
            recs.append(
                '🚭 Quit smoking — former smokers see risk reduction within 5 years.'
            )
        if details.get('hypertension', {}).get('risk_score', 0) > 50:
            recs.append(
                '💊 Manage blood pressure — midlife hypertension is one of '
                'the strongest modifiable risk factors for AD.'
            )
        if details.get('diabetes', {}).get('risk_score', 0) > 50:
            recs.append(
                '🩺 Optimise blood sugar control — Type 2 diabetes increases '
                'AD risk by 60–100%.'
            )
        if details.get('depression', {}).get('risk_score', 0) > 50:
            recs.append(
                '🧠 Treat depression — chronic depression doubles dementia risk. '
                'Consider therapy and/or medication.'
            )

        if not recs:
            recs.append(
                '✅ Continue current health practices — your risk factor profile '
                'is favorable. Maintain regular check-ups.'
            )

        recs.append(
            '📋 Schedule regular cognitive screening — early detection enables '
            'better outcomes.'
        )

        return recs

    def _empty_result(self) -> dict:
        return {
            'overall_risk_score': 0,
            'risk_label': 'No Data',
            'risk_color': '#6366f1',
            'risk_description': 'No risk factors provided for assessment.',
            'category_scores': {},
            'factor_details': {},
            'factors_assessed': 0,
            'factors_total': len(FACTOR_CONFIG),
            'modifiable_risk': 0,
            'non_modifiable_risk': 0,
            'prevention_recommendations': ['Provide risk factor data for personalised assessment.'],
        }
