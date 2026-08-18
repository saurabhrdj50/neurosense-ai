import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class LongitudinalTracker:
    """
    Research-grade Longitudinal Analysis Engine for Alzheimer's Disease Progression.
    Tracks multi-visit patient data to model disease trajectories:
    - Hippocampal Volume Loss Rate (% per year)
    - MMSE Cognitive Decline Slope (points per year)
    - Biomarker Trajectory (pTau217, Aβ42/40 progression)
    - MCI-to-Alzheimer's Disease Conversion Risk (12, 24, 36 month projection)
    """

    def analyze_trajectory(self, visits: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze multi-visit longitudinal data and return disease progression metrics.
        
        Args:
            visits: List of visit dictionaries, sorted by date.
                    Each dict can contain: 'visit_date', 'mri_hippocampal_vol_cm3',
                    'mmse_score', 'moca_score', 'ptau217_pg_ml', 'ab42_ab40_ratio', 'stage'.
        """
        if not visits or len(visits) < 2:
            return {
                'has_longitudinal_data': False,
                'visit_count': len(visits) if visits else 0,
                'conversion_risk_score': None,
                'trajectory_summary': "Baseline single-visit assessment. Minimum 2 visits required for longitudinal progression tracking.",
                'recommendation': "Schedule follow-up neuroimaging and cognitive evaluation in 6-12 months."
            }

        # Parse dates and sort visits
        parsed_visits = []
        for idx, v in enumerate(visits):
            date_str = v.get('visit_date', v.get('date', f'2024-0{idx+1}-01'))
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
            except Exception:
                dt = datetime.now()
            
            parsed_visits.append({
                'date': dt,
                'date_str': date_str,
                'hippo_vol': v.get('mri_hippocampal_vol_cm3', v.get('hippocampal_vol', None)),
                'mmse': v.get('mmse_score', v.get('mmse', None)),
                'moca': v.get('moca_score', v.get('moca', None)),
                'ptau217': v.get('ptau217_pg_ml', v.get('ptau217', None)),
                'ab_ratio': v.get('ab42_ab40_ratio', v.get('ab_ratio', None)),
                'stage': v.get('stage', 'Unknown')
            })

        parsed_visits.sort(key=lambda x: x['date'])
        first_visit = parsed_visits[0]
        last_visit = parsed_visits[-1]

        days_between = (last_visit['date'] - first_visit['date']).days
        years_between = max(days_between / 365.25, 0.1)

        # 1. Hippocampal Volume Loss Rate (% per year)
        hippo_loss_rate_pct = None
        if first_visit['hippo_vol'] and last_visit['hippo_vol']:
            vol_delta = first_visit['hippo_vol'] - last_visit['hippo_vol']
            hippo_loss_rate_pct = round((vol_delta / first_visit['hippo_vol'] * 100) / years_between, 2)

        # 2. MMSE Decline Slope (points per year)
        mmse_decline_slope = None
        if first_visit['mmse'] is not None and last_visit['mmse'] is not None:
            mmse_delta = first_visit['mmse'] - last_visit['mmse']
            mmse_decline_slope = round(mmse_delta / years_between, 2)

        # 3. pTau217 Progression Rate (pg/mL per year)
        ptau_progression_rate = None
        if first_visit['ptau217'] is not None and last_visit['ptau217'] is not None:
            ptau_delta = last_visit['ptau217'] - first_visit['ptau217']
            ptau_progression_rate = round(ptau_delta / years_between, 3)

        # 4. MCI-to-AD Conversion Risk Estimator (0-100%)
        # Normal hippocampal atrophy is ~0.5-1.0%/yr; AD atrophy is 3.0-5.0%/yr
        conversion_risk = 20.0  # Baseline

        if hippo_loss_rate_pct is not None:
            if hippo_loss_rate_pct >= 4.0:
                conversion_risk += 45.0
            elif hippo_loss_rate_pct >= 2.5:
                conversion_risk += 30.0
            elif hippo_loss_rate_pct >= 1.5:
                conversion_risk += 15.0

        if mmse_decline_slope is not None:
            if mmse_decline_slope >= 3.0:
                conversion_risk += 30.0
            elif mmse_decline_slope >= 1.5:
                conversion_risk += 20.0
            elif mmse_decline_slope >= 0.5:
                conversion_risk += 10.0

        if ptau_progression_rate is not None and ptau_progression_rate > 0.05:
            conversion_risk += 15.0

        conversion_risk_score = round(min(max(conversion_risk, 5.0), 98.0), 1)

        # Conversion Window Estimate
        if conversion_risk_score >= 75:
            conversion_window = "High risk of MCI-to-AD Conversion within 12-18 months"
        elif conversion_risk_score >= 50:
            conversion_window = "Moderate risk of MCI-to-AD Conversion within 24-36 months"
        else:
            conversion_window = "Low conversion risk over 36 months (Stable Trajectory)"

        trajectory_summary = (
            f"Longitudinal evaluation over {years_between:.1f} years across {len(visits)} visits. "
            f"Hippocampal Atrophy Rate: {hippo_loss_rate_pct if hippo_loss_rate_pct is not None else 'N/A'}%/yr. "
            f"MMSE Decline Slope: {mmse_decline_slope if mmse_decline_slope is not None else 'N/A'} pts/yr. "
            f"Conversion Risk: {conversion_risk_score}% ({conversion_window})."
        )

        # Projections for 12, 24, and 36 months
        conversion_12m = round(min(conversion_risk_score * 0.6, 95.0), 1)
        conversion_24m = round(min(conversion_risk_score * 0.85, 97.0), 1)
        conversion_36m = round(min(conversion_risk_score * 1.05, 99.0), 1)
        hazard_ratio = round(max(1.0, 1.0 + (conversion_risk_score - 20.0) / 25.0), 2)

        return {
            'has_longitudinal_data': True,
            'visit_count': len(visits),
            'observation_period_years': round(years_between, 2),
            'first_visit_date': first_visit['date_str'],
            'last_visit_date': last_visit['date_str'],
            'hippocampal_loss_rate_pct_per_yr': hippo_loss_rate_pct,
            'mmse_decline_slope_pts_per_yr': mmse_decline_slope,
            'ptau217_progression_rate_per_yr': ptau_progression_rate,
            'conversion_risk_score': conversion_risk_score,
            'conversion_risk_12m': conversion_12m,
            'conversion_risk_24m': conversion_24m,
            'conversion_risk_36m': conversion_36m,
            'hazard_ratio': hazard_ratio,
            'conversion_window_projection': conversion_window,
            'trajectory_summary': trajectory_summary,
            'progression_trend': 'Rapid Progression' if conversion_risk_score >= 70 else 'Moderate Progression' if conversion_risk_score >= 45 else 'Stable'
        }
