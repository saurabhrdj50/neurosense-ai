from typing import Dict, Any

from .factors import FACTOR_CONFIG

# Factors that are modifiable (lifestyle/medical management)
MODIFIABLE_FACTORS = {
    'physical_inactivity', 'sleep_issues', 'smoking', 'alcohol_excess',
    'social_isolation', 'hypertension', 'diabetes', 'obesity', 'depression',
    'hearing_loss', 'anticholinergic_load', 'benzodiazepines',
    'polypharmacy', 'medication_noncompliance',
    # Legacy keys (used in some tests)
    'physical_activity',
}

# Maps some legacy field names to the new 18-factor system
LEGACY_KEY_MAP = {
    'physical_activity': 'physical_inactivity',  # sedentary/low -> physical_inactivity
    'age': None,          # keep as-is but score separately
    'education_years': None,  # keep as-is
}

# Scoring for legacy/extra demographic fields
LEGACY_FACTOR_CONFIG = {
    'age': {
        'category': 'Demographics',
        'label': 'Age',
        'weight': 10,
        'scoring': lambda v: 0 if v < 50 else 20 if v < 60 else 45 if v < 70 else 70 if v < 80 else 90,
        'modifiable': False,
    },
    'education_years': {
        'category': 'Demographics',
        'label': 'Education Level',
        'weight': 6,
        'scoring': lambda v: 70 if float(v) < 8 else 45 if float(v) < 12 else 20 if float(v) < 16 else 5,
        'modifiable': False,
    },
    'physical_activity': {
        'category': 'Lifestyle',
        'label': 'Physical Activity Level',
        'weight': 8,
        'scoring': lambda v: {'sedentary': 80, 'low': 65, 'light': 55, 'moderate': 25, 'active': 5}.get(str(v).lower(), 50),
        'modifiable': True,
    },
}


# Strings that mean "this factor is NOT present" — without this, 'no'/'false'
# are truthy and get scored as risk-present (60-90 points).
_FALSY_STRINGS = {'no', 'false', '0', 'none', 'off', ''}


def _is_present(val) -> bool:
    """Normalize a factor value to a boolean 'risk present' flag."""
    if val is None:
        return False
    if isinstance(val, str):
        return val.strip().lower() not in _FALSY_STRINGS
    return bool(val)


class RiskProfiler:
    def assess(self, factors: Dict[str, Any]) -> Dict[str, Any]:
        factor_details = {}
        category_scores: Dict[str, list] = {}
        weighted_sum = 0.0
        total_weight = 0.0
        modifiable_scores = []
        non_modifiable_scores = []
        contributing_factors = []

        # Process the 18 core frontend risk factors. An explicitly answered
        # factor (including False/'no') counts as assessed with low risk; only
        # missing keys are skipped.
        for key, cfg in FACTOR_CONFIG.items():
            if key not in factors:
                continue
            val = factors.get(key)
            if val is None:
                continue
            present = _is_present(val)
            raw = cfg['scoring'](present)
            weight = cfg['weight']
            weighted_sum += raw * weight
            total_weight += weight
            cat = cfg['category']
            category_scores.setdefault(cat, [])
            category_scores[cat].append({'score': raw, 'weight': weight})

            is_mod = key in MODIFIABLE_FACTORS
            factor_details[key] = {
                'label': cfg['label'],
                'category': cat,
                'value': val,
                'risk_score': raw,
                'weight': weight,
                'modifiable': is_mod,
            }
            if present:
                contributing_factors.append(cfg['label'])
            if is_mod:
                modifiable_scores.append(raw)
            else:
                non_modifiable_scores.append(raw)

        # Process legacy/additional demographic factors if present
        for key, cfg in LEGACY_FACTOR_CONFIG.items():
            if key in factors and key not in factor_details:
                val = factors[key]
                if val is None:
                    continue
                raw = cfg['scoring'](val)
                weight = cfg['weight']
                weighted_sum += raw * weight
                total_weight += weight
                cat = cfg['category']
                category_scores.setdefault(cat, [])
                category_scores[cat].append({'score': raw, 'weight': weight})
                is_mod = cfg.get('modifiable', False)
                factor_details[key] = {
                    'label': cfg['label'],
                    'category': cat,
                    'value': val,
                    'risk_score': raw,
                    'weight': weight,
                    'modifiable': is_mod,
                }
                if is_mod:
                    modifiable_scores.append(raw)
                else:
                    non_modifiable_scores.append(raw)

        if not factor_details:
            return {
                'overall_risk_score': 0,
                'risk_category': 'No Data',
                'risk_label': 'No Data',
                'contributing_factors': [],
                'factors_assessed': 0,
                'category_scores': {},
                'modifiable_risk': 0,
                'non_modifiable_risk': 0,
            }

        overall = round(weighted_sum / total_weight, 1) if total_weight else 0.0

        # Category averages (for test assertions)
        cat_summary = {}
        for cat, items in category_scores.items():
            w_sum = sum(i['score'] * i['weight'] for i in items)
            w_tot = sum(i['weight'] for i in items)
            cat_summary[cat] = round(w_sum / w_tot, 1) if w_tot else 0.0

        mod_risk = round(sum(modifiable_scores) / max(len(modifiable_scores), 1), 1)
        non_mod_risk = round(sum(non_modifiable_scores) / max(len(non_modifiable_scores), 1), 1)

        if overall >= 65:
            risk_category = 'High Risk'
        elif overall >= 40:
            risk_category = 'Moderate Risk'
        elif overall >= 20:
            risk_category = 'Low Risk'
        else:
            risk_category = 'Minimal Risk'

        return {
            # --- Frontend-facing fields ---
            'overall_risk_score': overall,
            'risk_category': risk_category,
            'contributing_factors': contributing_factors,
            # --- Test-facing fields ---
            'factors_assessed': len(factor_details),
            'category_scores': cat_summary,
            'modifiable_risk': mod_risk,
            'non_modifiable_risk': non_mod_risk,
            'risk_label': risk_category,
        }
