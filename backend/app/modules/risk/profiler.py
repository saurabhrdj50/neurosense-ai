from typing import Dict, Any

from .factors import FACTOR_CONFIG, MODIFIABLE_FACTORS


class RiskProfiler:
    def assess(self, factors: Dict[str, Any]) -> Dict[str, Any]:
        factor_details = {}
        category_scores: Dict[str, list] = {}
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

        cat_summary = {}
        for cat, items in category_scores.items():
            w_sum = sum(i['score'] * i['weight'] for i in items)
            w_tot = sum(i['weight'] for i in items)
            cat_summary[cat] = round(w_sum / w_tot, 1) if w_tot else 0

        mod_scores = [d['risk_score'] for d in factor_details.values() if d['modifiable']]
        non_mod_scores = [d['risk_score'] for d in factor_details.values() if not d['modifiable']]

        risk = self._risk_level(overall)

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
            'prevention_recommendations': self._recommendations(factor_details, overall),
        }

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
    def _risk_level(score: float) -> Dict[str, Any]:
        if score >= 65:
            return {
                'label': 'High Risk',
                'color': '#ef4444',
                'description': 'Multiple significant risk factors present.',
            }
        if score >= 40:
            return {
                'label': 'Moderate Risk',
                'color': '#f97316',
                'description': 'Several risk factors identified.',
            }
        if score >= 20:
            return {
                'label': 'Low Risk',
                'color': '#eab308',
                'description': 'Few risk factors present.',
            }
        return {
            'label': 'Minimal Risk',
            'color': '#22c55e',
            'description': 'Risk factor profile is favorable.',
        }

    @staticmethod
    def _recommendations(details: Dict, overall: float) -> list:
        recs = []
        if details.get('physical_activity', {}).get('risk_score', 0) > 50:
            recs.append('Increase physical activity — aim for 150 min/week.')
        if details.get('hypertension', {}).get('risk_score', 0) > 50:
            recs.append('Manage blood pressure — midlife hypertension is a risk factor.')
        if details.get('diabetes', {}).get('risk_score', 0) > 50:
            recs.append('Optimise blood sugar control.')
        if details.get('depression', {}).get('risk_score', 0) > 50:
            recs.append('Treat depression — chronic depression doubles dementia risk.')
        if not recs:
            recs.append('Continue current health practices.')
        recs.append('Schedule regular cognitive screening.')
        return recs

    def _empty_result(self) -> Dict[str, Any]:
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
