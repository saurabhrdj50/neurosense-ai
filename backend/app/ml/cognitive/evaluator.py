from typing import Dict, Any


# 15-item multi-domain cognitive screening battery (frontend question IDs)
SCREENING_META = {
    'orient_date':       {'max': 4, 'domain': 'orientation'},
    'orient_place':      {'max': 4, 'domain': 'orientation'},
    'register_3words':   {'max': 4, 'domain': 'immediate_memory'},
    'delay_recall':      {'max': 4, 'domain': 'delayed_memory'},
    'digit_span_fwd':    {'max': 4, 'domain': 'working_memory'},
    'serial_7':          {'max': 4, 'domain': 'attention'},
    'animal_fluency':    {'max': 4, 'domain': 'verbal_fluency'},
    'object_naming':     {'max': 4, 'domain': 'language'},
    'sentence_compreh':  {'max': 4, 'domain': 'language'},
    'multi_step_cmd':    {'max': 4, 'domain': 'executive_function'},
    'logical_reason':    {'max': 4, 'domain': 'reasoning'},
    'abstraction':       {'max': 4, 'domain': 'reasoning'},
    'months_reverse':    {'max': 4, 'domain': 'executive_function'},
    'problem_solve':     {'max': 4, 'domain': 'problem_solving'},
    'auto_memory':       {'max': 4, 'domain': 'episodic_memory'},
}

DOMAIN_LABELS = {
    'orientation':        'Orientation',
    'immediate_memory':   'Immediate Memory',
    'delayed_memory':     'Delayed Memory',
    'working_memory':     'Working Memory',
    'attention':          'Attention',
    'verbal_fluency':     'Verbal Fluency',
    'language':           'Language',
    'executive_function': 'Executive Function',
    'reasoning':          'Reasoning',
    'problem_solving':    'Problem Solving',
    'episodic_memory':    'Episodic Memory',
}

# Reverse mapping: domain -> its screening question IDs
DOMAIN_QUESTIONS = {}
for _qid, _meta in SCREENING_META.items():
    DOMAIN_QUESTIONS.setdefault(_meta['domain'], []).append(_qid)

# Legacy test names used by automated tests (test_modules.py, test_api.py)
LEGACY_TESTS = {
    'mini_cog': {'max': 5},
    'serial_7s': {'max': 5},
    'category_fluency': {'max': 20},
    'digit_span': {'max': 14},
    'orientation': {'max': 10},
}


class CognitiveEvaluator:
    def evaluate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Accepts either:
         - Screening payload: {screening_breakdown: {qid: score, ...}, domains, composite_score, ...}
         - Frontend payload:  {mmse, moca, domains, mmse_breakdown, moca_breakdown, ...}
         - Legacy payload:    {mini_cog, serial_7s, category_fluency, digit_span, orientation}
        Returns fields expected by the frontend, automated tests, and the new
        multi-domain cognitive screening profile.
        """
        # `or 0` guards against an explicit JSON null crashing int(None).
        mmse = int(data.get('mmse') or 0)
        moca = int(data.get('moca') or 0)
        # True when mmse/moca are the caller's own administered test scores
        # (legacy/frontend payload), False when they are derived values.
        admin_scores_provided = bool(data.get('mmse')) or bool(data.get('moca'))

        test_results = {}
        legacy_keys = set(data.keys()) & set(LEGACY_TESTS.keys())
        screening = data.get('screening_breakdown', {}) or {}

        if screening:
            profile, composite_score, questions_answered, total_max = self._score_screening(screening)
            tests_completed = questions_answered
            domains = self._domains_to_payload(profile)
        elif legacy_keys:
            # Legacy payload: compute composite from individual test scores
            total_score = 0.0
            total_max = 0.0

            for key in LEGACY_TESTS:
                if key in data:
                    raw = float(data[key])
                    max_val = float(LEGACY_TESTS[key]['max'])
                    normalized = raw / max_val if max_val > 0 else 0.0
                    test_results[key] = {
                        'raw_score': raw,
                        'max_score': max_val,
                        'normalized': round(normalized, 3),
                    }
                    total_score += raw
                    total_max += max_val

            composite_score = round((total_score / total_max) * 100, 1) if total_max > 0 else 0.0
            tests_completed = len(test_results)
            profile = None
            domains = data.get('domains', {})

            # Derive MMSE/MoCA estimates from composite for frontend compatibility
            if mmse == 0 and moca == 0 and composite_score > 0:
                mmse = int(round(composite_score * 0.30))  # /30 scale approximation
                moca = mmse
        else:
            # Frontend payload: use mmse/moca directly
            composite_score = 0.0
            if mmse > 0 or moca > 0:
                mmse_pct = (mmse / 30.0) * 100 if mmse > 0 else 0.0
                moca_pct = (moca / 30.0) * 100 if moca > 0 else 0.0
                if mmse > 0 and moca > 0:
                    composite_score = round((mmse_pct + moca_pct) / 2.0, 1)
                else:
                    composite_score = round(mmse_pct or moca_pct, 1)
            tests_completed = 1 if (mmse > 0 or moca > 0) else 0
            profile = None
            domains = data.get('domains', {})

        # Impairment level. When only the screening battery was answered, the
        # level is derived directly from the composite percentage using bands
        # equivalent to the classic MMSE cutoffs — no synthetic "MMSE/MoCA
        # equivalent" score is fabricated or reported.
        if admin_scores_provided:
            if mmse >= 24:
                impairment_level = 'Normal'
            elif mmse >= 18:
                impairment_level = 'Mild'
            elif mmse >= 10:
                impairment_level = 'Moderate'
            else:
                impairment_level = 'Severe'
        elif tests_completed > 0:
            if composite_score >= 80:     # ≈ MMSE ≥ 24
                impairment_level = 'Normal'
            elif composite_score >= 60:   # ≈ MMSE ≥ 18
                impairment_level = 'Mild'
            elif composite_score >= 33:   # ≈ MMSE ≥ 10
                impairment_level = 'Moderate'
            else:
                impairment_level = 'Severe'
        else:
            impairment_level = 'Not Assessed'

        # Risk label based on composite (for tests and display)
        if composite_score >= 75:
            risk_label = 'Low Risk'
        elif composite_score >= 50:
            risk_label = 'Moderate Risk'
        elif composite_score >= 25:
            risk_label = 'High Risk'
        elif tests_completed > 0:
            risk_label = 'Very High Risk'
        else:
            risk_label = 'Not Assessed'

        # Memory recall from domain scores
        memory_data = domains.get('memory', {})
        memory_recall = memory_data.get('score', 0)
        if not memory_recall and profile:
            if profile.get('delayed_memory'):
                memory_recall = profile['delayed_memory']['score']
            elif profile.get('immediate_memory'):
                memory_recall = profile['immediate_memory']['score']

        return {
            # --- Frontend-facing fields ---
            'composite_score': composite_score,
            'impairment_level': impairment_level,
            'memory_recall': memory_recall,
            # --- Cognitive screening profile (multi-domain) ---
            'profile': profile,
            'domains': domains,
            'total_questions': len(SCREENING_META),
            'questions_completed': tests_completed,
            # --- Test-facing fields ---
            'tests_completed': tests_completed,
            'test_results': test_results,
            'risk_label': risk_label,
        }

    @staticmethod
    def _score_screening(screening: Dict[str, Any]) -> tuple:
        """Score the 15-item screening battery into a per-domain profile.

        Returns (profile, composite_score, answered_count, answered_max).
        profile: {domain: {score, max, pct, label, questions}}
        """
        domain_scores = {}   # domain -> {score, max}
        answered_count = 0
        answered_max = 0
        answered_total = 0.0
        answered_ids = []

        for qid, meta in SCREENING_META.items():
            raw = screening.get(qid)
            if raw is None or raw == '':
                continue
            try:
                val = float(raw)
            except (TypeError, ValueError):
                continue
            # Clamp to the item's valid range so an out-of-range answer can
            # never inflate the composite (e.g. 9999/4 → composite 249975).
            val = max(0.0, min(val, float(meta['max'])))

            domain = meta['domain']
            entry = domain_scores.setdefault(domain, {'score': 0.0, 'max': 0.0})
            entry['score'] += val
            entry['max'] += float(meta['max'])
            answered_count += 1
            answered_max += float(meta['max'])
            answered_total += val
            answered_ids.append(qid)

        profile = {}
        for domain, entry in domain_scores.items():
            pct = round((entry['score'] / entry['max']) * 100, 1) if entry['max'] > 0 else 0.0
            qids = DOMAIN_QUESTIONS.get(domain, [])
            questions = {
                qid: {'max': SCREENING_META[qid]['max'], 'score': screening.get(qid)}
                for qid in qids if screening.get(qid) is not None and screening.get(qid) != ''
            }
            profile[domain] = {
                'label': DOMAIN_LABELS.get(domain, domain.replace('_', ' ').title()),
                'score': entry['score'],
                'max': entry['max'],
                'pct': pct,
                'questions': questions,
            }

        # Composite = flat normalized average across answered items (matches frontend)
        if answered_count > 0 and answered_max > 0:
            composite_score = int(round((answered_total / answered_max) * 100))
        else:
            composite_score = 0

        return profile, composite_score, answered_count, answered_max

    @staticmethod
    def _domains_to_payload(profile: Dict[str, Any]) -> Dict[str, Any]:
        """Shape the profile into the lightweight domains payload the frontend expects."""
        return {
            domain: {'score': info['score'], 'max': info['max'], 'pct': info['pct']}
            for domain, info in profile.items()
        }
