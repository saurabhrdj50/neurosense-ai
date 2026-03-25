from typing import Dict, Any


TEST_META = {
    'mini_cog': {
        'name': 'Mini-Cog',
        'max_score': 5,
        'weight': 0.25,
        'description': 'Clock drawing (0–2) + 3-word recall (0–3)',
        'interpretation': {
            (0, 2): ('High Risk', '#ef4444'),
            (3, 3): ('Moderate Risk', '#f97316'),
            (4, 5): ('Low Risk', '#22c55e'),
        },
    },
    'serial_7s': {
        'name': 'Serial 7s',
        'max_score': 5,
        'weight': 0.15,
        'description': 'Count backwards from 100 by 7 (max 5 correct)',
        'interpretation': {
            (0, 1): ('Severe Impairment', '#ef4444'),
            (2, 3): ('Moderate Impairment', '#f97316'),
            (4, 5): ('Normal', '#22c55e'),
        },
    },
    'category_fluency': {
        'name': 'Category Fluency',
        'max_score': 20,
        'weight': 0.20,
        'description': 'Number of animals named in 60 seconds',
        'interpretation': {
            (0, 7): ('Below Normal', '#ef4444'),
            (8, 11): ('Borderline', '#f97316'),
            (12, 14): ('Low Normal', '#eab308'),
            (15, 20): ('Normal', '#22c55e'),
        },
    },
    'digit_span': {
        'name': 'Digit Span',
        'max_score': 14,
        'weight': 0.15,
        'description': 'Forward (0–8) + Backward (0–6) digit recall',
        'interpretation': {
            (0, 5): ('Impaired', '#ef4444'),
            (6, 8): ('Borderline', '#f97316'),
            (9, 14): ('Normal', '#22c55e'),
        },
    },
    'orientation': {
        'name': 'Orientation',
        'max_score': 10,
        'weight': 0.25,
        'description': 'Time (5 pts) + Place (5 pts) awareness',
        'interpretation': {
            (0, 3): ('Severe Disorientation', '#ef4444'),
            (4, 6): ('Moderate Disorientation', '#f97316'),
            (7, 8): ('Mild Disorientation', '#eab308'),
            (9, 10): ('Fully Oriented', '#22c55e'),
        },
    },
}


class CognitiveEvaluator:
    def evaluate(self, answers: Dict[str, Any]) -> Dict[str, Any]:
        test_results = {}
        weighted_sum = 0.0
        total_weight = 0.0

        for test_key, meta in TEST_META.items():
            raw = answers.get(test_key)
            if raw is None:
                continue

            raw = max(0, min(int(raw), meta['max_score']))
            pct = round(raw / meta['max_score'] * 100, 1)

            interp_label, interp_color = self._interpret(test_key, raw)

            test_results[test_key] = {
                'name': meta['name'],
                'raw_score': raw,
                'max_score': meta['max_score'],
                'percentage': pct,
                'description': meta['description'],
                'interpretation': interp_label,
                'color': interp_color,
            }

            weighted_sum += pct * meta['weight']
            total_weight += meta['weight']

        if not test_results:
            return self._empty_result()

        composite = round(weighted_sum / total_weight, 1) if total_weight else 0
        risk = self._overall_risk(composite)

        return {
            'composite_score': composite,
            'tests_completed': len(test_results),
            'tests_total': len(TEST_META),
            'test_results': test_results,
            'risk_label': risk['label'],
            'risk_color': risk['color'],
            'risk_description': risk['description'],
            'recommendations': risk['recommendations'],
            'stage_estimate': risk['stage_estimate'],
            'stage_index': risk['stage_index'],
        }

    def _interpret(self, test_key: str, raw: int) -> tuple:
        ranges = TEST_META[test_key]['interpretation']
        for (lo, hi), (label, color) in ranges.items():
            if lo <= raw <= hi:
                return label, color
        return 'Unknown', '#6366f1'

    def _overall_risk(self, composite: float) -> Dict[str, Any]:
        if composite >= 80:
            return {
                'label': 'Low Risk',
                'color': '#22c55e',
                'description': 'Cognitive performance is within normal range.',
                'recommendations': ['Continue routine cognitive health monitoring'],
                'stage_estimate': 'Non-Demented',
                'stage_index': 0,
            }
        elif composite >= 55:
            return {
                'label': 'Moderate Risk',
                'color': '#f97316',
                'description': 'Some cognitive domains show below-normal performance.',
                'recommendations': ['Detailed neuropsychological evaluation recommended'],
                'stage_estimate': 'Very Mild Demented',
                'stage_index': 1,
            }
        elif composite >= 30:
            return {
                'label': 'High Risk',
                'color': '#ef4444',
                'description': 'Significant cognitive impairment detected across multiple domains.',
                'recommendations': ['Urgent neurological referral'],
                'stage_estimate': 'Mild Demented',
                'stage_index': 2,
            }
        else:
            return {
                'label': 'Very High Risk',
                'color': '#dc2626',
                'description': 'Severe cognitive impairment across all tested domains.',
                'recommendations': ['Immediate specialist intervention required'],
                'stage_estimate': 'Moderate Demented',
                'stage_index': 3,
            }

    def _empty_result(self) -> Dict[str, Any]:
        return {
            'composite_score': 0,
            'tests_completed': 0,
            'tests_total': len(TEST_META),
            'test_results': {},
            'risk_label': 'No Data',
            'risk_color': '#6366f1',
            'risk_description': 'No cognitive test data provided.',
            'recommendations': ['Complete at least one cognitive test for assessment.'],
            'stage_estimate': None,
            'stage_index': None,
        }
