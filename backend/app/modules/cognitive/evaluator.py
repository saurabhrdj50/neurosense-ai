from typing import Dict, Any, Optional


# Maps frontend question IDs to their scoring metadata for test-level detail
QUESTION_META = {
    # MMSE (Basic) questions
    'orientation_time': {'max': 5, 'category': 'orientation'},
    'orientation_place': {'max': 5, 'category': 'orientation'},
    'registration': {'max': 3, 'category': 'memory'},
    'attention_calc': {'max': 5, 'category': 'attention'},
    'recall': {'max': 3, 'category': 'memory'},
    'naming': {'max': 2, 'category': 'language'},
    'animal_fluency': {'max': 3, 'category': 'language'},
    'repetition': {'max': 1, 'category': 'language'},
    'three_stage_cmd': {'max': 3, 'category': 'language'},
    'reading_exec': {'max': 1, 'category': 'language'},
    # MoCA (Advanced) questions
    'clock_drawing': {'max': 3, 'category': 'visuospatial'},
    'moca_visuospatial': {'max': 5, 'category': 'visuospatial'},
    'moca_abstraction': {'max': 2, 'category': 'visuospatial'},
}

# Legacy test names used by automated tests (test_modules.py)
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
         - Frontend payload: {mmse, moca, domains, mmse_breakdown, moca_breakdown, ...}
         - Legacy payload: {mini_cog, serial_7s, category_fluency, digit_span, orientation}
        Returns fields expected by both the frontend and automated tests.
        """
        mmse = int(data.get('mmse', 0))
        moca = int(data.get('moca', 0))

        # Check for legacy test format (used in automated tests)
        test_results = {}
        legacy_keys = set(data.keys()) & set(LEGACY_TESTS.keys())

        if legacy_keys:
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

        # Impairment level based on MMSE cutoffs
        if mmse >= 24:
            impairment_level = 'Normal'
        elif mmse >= 18:
            impairment_level = 'Mild'
        elif mmse >= 10:
            impairment_level = 'Moderate'
        elif mmse > 0:
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

        # Memory recall from domain scores (frontend payload)
        domains = data.get('domains', {})
        memory_data = domains.get('memory', {})
        memory_recall = memory_data.get('score', 0)

        return {
            # --- Frontend-facing fields ---
            'mmse': mmse,
            'moca': moca,
            'composite_score': composite_score,
            'impairment_level': impairment_level,
            'memory_recall': memory_recall,
            # --- Test-facing fields ---
            'tests_completed': tests_completed,
            'test_results': test_results,
            'risk_label': risk_label,
        }
