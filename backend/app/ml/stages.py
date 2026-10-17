"""Canonical 3-stage vocabulary for the analysis pipeline.

Single owner for the stage names shared by MRI classification
(``ml/mri/stages.py``), multimodal fusion (``ml/fusion/engine.py``), and the
recommendation/explanation services. Depending on this module keeps features
from importing each other's internals.

The vocabulary mirrors the production MRI checkpoint exactly: a 3-class
ResNet18 head (classifier [3, 512]) from the ADNI CN/MCI/AD lineage —
index 0 = CN, 1 = MCI, 2 = AD. The historical 4-stage labels
('Very Mild Demented', 'Mild Demented', 'Moderate Demented', 'Severe
Demented') persist only as legacy values in old records and are normalized
to the 3 canonical stages on read.
"""

STAGE_ORDER = [
    'Cognitively Normal (CN)',
    'Mild Cognitive Impairment (MCI)',
    "Alzheimer's Disease (AD)",
]

STAGE_INDEX = {s: i for i, s in enumerate(STAGE_ORDER)}

# Legacy (4-stage / free-form) spellings → canonical 3-stage names. Applied
# wherever a stored stage string is interpreted, so pre-existing session rows
# and seeds keep working after the 4→3 vocabulary reduction.
_LEGACY_STAGE_ALIASES = {
    'non demented': 'Cognitively Normal (CN)',
    'non-demented': 'Cognitively Normal (CN)',
    'cognitively normal': 'Cognitively Normal (CN)',
    'normal cognition': 'Cognitively Normal (CN)',
    'cn': 'Cognitively Normal (CN)',
    'very mild demented': 'Mild Cognitive Impairment (MCI)',
    'very mild': 'Mild Cognitive Impairment (MCI)',
    'mild demented': 'Mild Cognitive Impairment (MCI)',
    'mild cognitive impairment': 'Mild Cognitive Impairment (MCI)',
    'mci': 'Mild Cognitive Impairment (MCI)',
    'moderate demented': "Alzheimer's Disease (AD)",
    'severe demented': "Alzheimer's Disease (AD)",
    "alzheimer's disease": "Alzheimer's Disease (AD)",
    'alzheimer': "Alzheimer's Disease (AD)",
    'ad': "Alzheimer's Disease (AD)",
}


def normalize_stage_name(stage):
    """Map legacy spellings to the canonical 3-stage name.

    Rewrites the historical 4-stage labels ('Non Demented', 'Very Mild
    Demented', …) and common free-form variants to the canonical CN/MCI/AD
    vocabulary; unknown values pass through unchanged so lookups keep their
    existing fallback behavior.
    """
    if not isinstance(stage, str):
        return stage
    key = stage.strip().lower().replace('-', ' ')
    key = ' '.join(key.split())
    if key in _LEGACY_STAGE_ALIASES:
        return _LEGACY_STAGE_ALIASES[key]
    if key == 'non demented':
        return STAGE_ORDER[0]
    return stage


def risk_to_stage_index(risk_score: float) -> int:
    """Map a 0-100 risk-factor score to a fusion stage vote.

    Single owner for this policy; the fusion engine and its tests depend on
    this seam rather than a local copy. (Display bands in the risk profiler
    are a separate concern with different cutoffs.)
    """
    if risk_score >= 60:
        return 2
    elif risk_score >= 15:
        return 1
    else:
        return 0


def cog_to_stage_index(composite: float) -> int:
    """Map a 0-100 cognitive composite to a fusion stage vote.

    Single owner for this policy; see :func:`risk_to_stage_index` for why
    display bands live elsewhere.
    """
    if composite >= 80:
        return 0
    elif composite >= 30:
        return 1
    else:
        return 2
