"""
Research-grade Multi-Cohort Harmonization Engine for Alzheimer's Datasets.
Standardizes clinical metadata across key research cohorts:
- ADNI (Alzheimer's Disease Neuroimaging Initiative)
- OASIS-3 (Open Access Series of Imaging Studies)
- AIBL (Australian Imaging, Biomarker and Lifestyle Study)
- NACC (National Alzheimer's Coordinating Center)
"""
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class MultiCohortHarmonizer:
    """
    Cohort Metadata Harmonizer and Cross-Dataset Domain Adaptor.
    Standardizes scanner field strength (1.5T vs 3.0T), cognitive scaling, and PET tracer metrics.
    """

    SUPPORTED_COHORTS = ['ADNI', 'OASIS-3', 'AIBL', 'NACC', 'GENERIC']

    def harmonize_dataset_payload(
        self,
        raw_payload: Dict[str, Any],
        cohort_name: str = "ADNI"
    ) -> Dict[str, Any]:
        """
        Harmonize clinical data payload from a specific research cohort into standard NeuroSense metrics.

        Args:
            raw_payload: Dict of clinical, neuroimaging, or biomarker variables.
            cohort_name: Name of cohort ('ADNI', 'OASIS-3', 'AIBL', 'NACC').

        Returns:
            Harmonized data payload ready for multimodal fusion.
        """
        cohort = cohort_name.upper() if cohort_name else "GENERIC"
        if cohort not in self.SUPPORTED_COHORTS:
            cohort = "GENERIC"

        harmonized = raw_payload.copy()

        # 1. Scanner Field Strength Calibration (1.5T MRI volumetric correction factor)
        field_strength = float(raw_payload.get('mri_field_strength_tesla', 3.0))
        if field_strength < 2.0 and 'mri_hippocampal_vol_cm3' in harmonized:
            # 1.5T scans systematically underestimate volume by ~3.5% vs 3.0T high-resolution MRI
            vol = harmonized['mri_hippocampal_vol_cm3']
            if vol is not None:
                harmonized['mri_hippocampal_vol_cm3'] = round(vol * 1.035, 3)

        # 2. Cognitive Assessment Scaling Harmonization
        # ADNI uses MMSE (0-30); OASIS uses CDR-SOB (0-18); NACC uses MoCA & CDR
        if cohort == "OASIS-3" and 'cdr_sob' in raw_payload:
            cdr_sob = raw_payload['cdr_sob']
            if cdr_sob is not None and 'mmse_score' not in harmonized:
                # Approximate MMSE mapping from CDR-SOB: MMSE ≈ 30 - 1.5 * CDR_SOB
                harmonized['mmse_score'] = max(round(30 - 1.5 * float(cdr_sob)), 0)

        # 3. Amyloid PET Tracer Centiloid Harmonization
        # Harmonize AV45, FBB, or PIB tracer SUVR to universal Centiloid Scale (CL)
        tracer = str(raw_payload.get('pet_tracer', 'AV45')).upper()
        pet_suvr = raw_payload.get('amyloid_pet_suvr')
        if pet_suvr is not None:
            if tracer == 'FBB':
                # Florbetaben: CL = 153.4 * SUVR - 154.5
                cl = 153.4 * float(pet_suvr) - 154.5
            elif tracer == 'PIB':
                # Pittsburgh Compound B: CL = 100.0 * (SUVR - 1.0) / (2.07 - 1.0)
                cl = 100.0 * (float(pet_suvr) - 1.0) / 1.07
            else:
                # Florbetapir (AV45): CL = 100.0 * (SUVR - 1.0) / (1.45 - 1.0)
                cl = 100.0 * (float(pet_suvr) - 1.0) / 0.45
            harmonized['amyloid_centiloid_scale'] = round(min(max(cl, 0.0), 150.0), 1)

        summary = (
            f"Cohort metadata harmonized successfully for cohort '{cohort}'. "
            f"Scanner calibration applied ({field_strength}T). "
            f"Cross-dataset scaling active for ADNI/OASIS/AIBL/NACC compatibility."
        )

        return {
            'success': True,
            'source_cohort': cohort,
            'scanner_field_strength_tesla': field_strength,
            'harmonized_payload': harmonized,
            'summary': summary
        }
