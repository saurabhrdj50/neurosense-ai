from typing import Dict, Any


TEST_META = {
    'mini_cog': {
        'name': 'Mini-Cog',
        'max_score': 5,
        'weight': 0.15,
        'description': 'Clock drawing (0–2) + 3-word recall (0–3)',
        'interpretation': {
            (0, 2): ('High Risk', '#ef4444'),
            (3, 3): ('Moderate Risk', '#f97316'),
            (4, 5): ('Low Risk', '#22c55e'),
        },
    },
    'mmse': {
        'name': 'MMSE (Mini-Mental State Exam)',
        'max_score': 30,
        'weight': 0.20,
        'description': '30-point questionnaire measuring orientation, memory, and attention',
        'interpretation': {
            (0, 17): ('Severe Cognitive Impairment', '#ef4444'),
            (18, 23): ('Mild Cognitive Impairment', '#f97316'),
            (24, 30): ('Normal Cognition', '#22c55e'),
        },
    },
    'moca': {
        'name': 'MoCA (Montreal Cognitive Assessment)',
        'max_score': 30,
        'weight': 0.20,
        'description': 'Visuospatial, executive function, naming, memory, attention screening',
        'interpretation': {
            (0, 17): ('Severe Impairment', '#ef4444'),
            (18, 25): ('Mild Cognitive Impairment (MCI)', '#f97316'),
            (26, 30): ('Normal Cognition', '#22c55e'),
        },
    },
    'cdr': {
        'name': 'CDR (Clinical Dementia Rating)',
        'max_score': 3,
        'weight': 0.15,
        'description': 'Staging scale: 0=None, 0.5=Very Mild, 1=Mild, 2=Moderate, 3=Severe',
        'interpretation': {
            (3, 3): ('Severe Dementia', '#dc2626'),
            (2, 2): ('Moderate Dementia', '#ef4444'),
            (1, 1): ('Mild Dementia', '#f97316'),
            (0, 0): ('Non-Demented', '#22c55e'),
        },
    },
    'clock_drawing': {
        'name': 'Clock Drawing Test',
        'max_score': 10,
        'weight': 0.10,
        'description': 'Visuospatial and executive functioning clock contour/numbers test',
        'interpretation': {
            (0, 5): ('Abnormal / Impaired', '#ef4444'),
            (6, 8): ('Borderline', '#f97316'),
            (9, 10): ('Normal Contour & Time', '#22c55e'),
        },
    },
    'serial_7s': {
        'name': 'Serial 7s',
        'max_score': 5,
        'weight': 0.05,
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
        'weight': 0.05,
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
        'weight': 0.05,
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
        'weight': 0.05,
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
        scores = {}

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
            scores[test_key] = raw

        if not test_results:
            return self._empty_result()

        composite = round(weighted_sum / total_weight, 1) if total_weight else 0
        risk = self._overall_risk(composite)
        domain_indices = self._compute_domain_indices(scores)

        return {
            'composite_score': composite,
            'tests_completed': len(test_results),
            'tests_total': len(TEST_META),
            'test_results': test_results,
            'domain_indices': domain_indices,
            'risk_label': risk['label'],
            'risk_color': risk['color'],
            'risk_description': risk['description'],
            'recommendations': risk['recommendations'],
            'stage_estimate': risk['stage_estimate'],
            'stage_index': risk['stage_index'],
        }

    def _compute_domain_indices(self, scores: dict) -> dict:
        """
        Compute 5 research-grade neuropsychological composite domain indices from raw test scores.
        Each index is normalized 0-100 (100 = best performance).
        Returns composite domain score, estimated population percentile, and clinical domain status.
        """
        def norm(value, min_val, max_val):
            if value is None:
                return None
            return round(max(0.0, min((value - min_val) / (max_val - min_val), 1.0)) * 100, 1)

        # Memory Index: word recall, MMSE memory items, orientation
        mem_parts = []
        if 'mmse' in scores:          mem_parts.append(norm(scores['mmse'], 0, 30))
        if 'digit_span' in scores:    mem_parts.append(norm(scores['digit_span'], 0, 14))
        if 'orientation' in scores:   mem_parts.append(norm(scores['orientation'], 0, 10))
        if 'mini_cog' in scores:      mem_parts.append(norm(scores['mini_cog'], 0, 5))

        # Executive Function Index: clock drawing, serial 7s, MoCA executive items
        exec_parts = []
        if 'clock_drawing' in scores: exec_parts.append(norm(scores['clock_drawing'], 0, 10))
        if 'serial_7s' in scores:     exec_parts.append(norm(scores['serial_7s'], 0, 5))
        if 'moca' in scores:          exec_parts.append(norm(scores['moca'], 0, 30))

        # Language Index: category fluency, naming, orientation
        lang_parts = []
        if 'category_fluency' in scores: lang_parts.append(norm(scores['category_fluency'], 0, 20))
        if 'mmse' in scores:             lang_parts.append(norm(scores['mmse'], 0, 30))

        # Attention Index: digit span, serial 7s
        att_parts = []
        if 'digit_span' in scores:    att_parts.append(norm(scores['digit_span'], 0, 14))
        if 'serial_7s' in scores:     att_parts.append(norm(scores['serial_7s'], 0, 5))

        # Visuospatial Index: clock drawing, MoCA visuospatial
        vis_parts = []
        if 'clock_drawing' in scores: vis_parts.append(norm(scores['clock_drawing'], 0, 10))
        if 'moca' in scores:          vis_parts.append(norm(scores['moca'], 0, 30))

        def format_domain(lst):
            if not lst:
                val = 50.0
            else:
                val = round(sum(lst) / len(lst), 1)
            percentile = max(1, min(99, int(val * 0.95)))
            status = 'Normal' if val >= 75 else 'Mild Decline' if val >= 50 else 'Impaired'
            return {'score': val, 'percentile': percentile, 'status': status}

        mem_res = format_domain(mem_parts)
        exec_res = format_domain(exec_parts)
        lang_res = format_domain(lang_parts)
        att_res = format_domain(att_parts)
        vis_res = format_domain(vis_parts)

        return {
            'memory': mem_res,
            'executive_function': exec_res,
            'language': lang_res,
            'attention': att_res,
            'visuospatial': vis_res,
            'memory_index': mem_res['score'],
            'executive_function_index': exec_res['score'],
            'language_index': lang_res['score'],
            'attention_index': att_res['score'],
            'visuospatial_index': vis_res['score'],
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
