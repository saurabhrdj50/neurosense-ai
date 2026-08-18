"""
Research-grade PET Imaging Analysis Module for Alzheimer's Disease Biomarkers.
Supports:
- Amyloid PET: Standardized Uptake Value Ratio (SUVR) & Centiloid Scale (0-100)
- Tau PET: Braak Stages I-VI topographic neurofibrillary tangle quantification
- FDG PET: Fluorodeoxyglucose glucose hypometabolism index in temporoparietal regions
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class PETImagingAnalyzer:
    """
    Research-grade PET Imaging Quantification Engine.
    Exposes SUVR, Centiloid units, Braak staging, and FDG hypometabolism index.
    Handles missing PET modality gracefully with optional fallback status.
    """

    # Clinical Centiloid Cutoff (>20 Centiloids indicates Amyloid Positivity)
    CENTILOID_AMYLOID_POSITIVE_CUTOFF = 20.1

    def analyze_pet_scan(
        self,
        amyloid_suvr: Optional[float] = None,
        tau_suvr: Optional[float] = None,
        fdg_suvr: Optional[float] = None,
        tracer: str = "AV45"  # AV45 (Florbetapir), FBB (Florbetaben), or PIB
    ) -> Dict[str, Any]:
        """
        Analyze multi-tracer PET imaging metrics.

        Args:
            amyloid_suvr: Cortical-to-cerebellum SUVR ratio (1.0 - 2.5)
            tau_suvr: Entorhinal/inferior temporal SUVR ratio (1.0 - 3.0)
            fdg_suvr: Temporoparietal metabolic SUVR ratio (0.5 - 1.5)
            tracer: Radiotracer used ('AV45', 'FBB', 'PIB', '18F-AV-1451')

        Returns:
            Dict containing Centiloid score, Amyloid status, Braak Stage, FDG index.
        """
        if amyloid_suvr is None and tau_suvr is None and fdg_suvr is None:
            return {
                'has_pet_data': False,
                'pet_available': False,
                'summary': "No PET imaging scan provided. System operating on MRI, fluid, and clinical modalities.",
                'amyloid_status': 'Unknown',
                'braak_stage': 'Unknown',
            }

        # 1. Amyloid PET: Convert SUVR to Centiloid Scale (100-point standardized scale)
        centiloid_score = None
        amyloid_status = "Unknown"
        if amyloid_suvr is not None:
            # Linear Centiloid Conversion formula: Centiloid = 100 * (SUVR_tracer - SUVR_0) / (SUVR_100 - SUVR_0)
            # Default scaling for 18F-AV45: SUVR 1.0 -> 0 CL, SUVR 1.45 -> 100 CL
            suvr_0, suvr_100 = 1.0, 1.45
            cl = 100.0 * (amyloid_suvr - suvr_0) / (suvr_100 - suvr_0)
            centiloid_score = round(min(max(cl, 0.0), 150.0), 1)
            amyloid_status = "Amyloid Positive (A+)" if centiloid_score >= self.CENTILOID_AMYLOID_POSITIVE_CUTOFF else "Amyloid Negative (A-)"

        # 2. Tau PET: Map SUVR to Braak Stages I-VI
        braak_stage = "Stage 0 (No Tau)"
        tau_positivity = "Tau Negative (T-)"
        if tau_suvr is not None:
            if tau_suvr >= 2.2:
                braak_stage = "Stage V-VI (Neocortical Tau Spreading)"
                tau_positivity = "Tau Positive (T+)"
            elif tau_suvr >= 1.7:
                braak_stage = "Stage III-IV (Limbic / Temporal Tau)"
                tau_positivity = "Tau Positive (T+)"
            elif tau_suvr >= 1.3:
                braak_stage = "Stage I-II (Transentorhinal Tau)"
                tau_positivity = "Equivocal (T?)"
            else:
                braak_stage = "Stage 0 (Normal / Minimal Tau)"
                tau_positivity = "Tau Negative (T-)"

        # 3. FDG PET: Hypometabolism Index
        fdg_status = "Normal Glucose Metabolism"
        hypometabolism_severity = 0.0
        if fdg_suvr is not None:
            # Normal temporoparietal FDG SUVR ~ 1.2 - 1.4; AD hypometabolism < 1.0
            if fdg_suvr < 0.9:
                fdg_status = "Severe Temporoparietal Hypometabolism (N+)"
                hypometabolism_severity = round((1.2 - fdg_suvr) / 1.2 * 100, 1)
            elif fdg_suvr < 1.1:
                fdg_status = "Mild-Moderate Hypometabolism"
                hypometabolism_severity = round((1.2 - fdg_suvr) / 1.2 * 100, 1)

        # Overall ATN (Amyloid / Tau / Neurodegeneration) PET Classification
        atn_pet_profile = f"A{'⁺' if amyloid_status.startswith('Amyloid Positive') else '⁻'} T{'⁺' if tau_positivity.startswith('Tau Positive') else '⁻'} N{'⁺' if hypometabolism_severity > 15 else '⁻'}"

        summary = (
            f"PET imaging parsed ({tracer} tracer). "
            f"Amyloid Centiloids: {centiloid_score if centiloid_score is not None else 'N/A'} ({amyloid_status}). "
            f"Tau Topography: {braak_stage} ({tau_positivity}). "
            f"FDG Hypometabolism: {fdg_status}. ATN Profile: {atn_pet_profile}."
        )

        return {
            'has_pet_data': True,
            'pet_available': True,
            'tracer_used': tracer,
            'amyloid_suvr': amyloid_suvr,
            'centiloid_score': centiloid_score,
            'amyloid_status': amyloid_status,
            'tau_suvr': tau_suvr,
            'braak_stage': braak_stage,
            'tau_status': tau_positivity,
            'fdg_suvr': fdg_suvr,
            'fdg_status': fdg_status,
            'hypometabolism_severity_pct': hypometabolism_severity,
            'atn_pet_profile': atn_pet_profile,
            'summary': summary
        }
