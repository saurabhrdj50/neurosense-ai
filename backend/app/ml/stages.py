"""Canonical 4-stage vocabulary for the analysis pipeline.

Single owner for the stage names shared by MRI classification
(``ml/mri/stages.py``), multimodal fusion (``ml/fusion/engine.py``), and the
recommendation/explanation services. Depending on this module keeps features
from importing each other's internals.

The index<->label mapping of the MRI checkpoint itself is still UNVERIFIED;
this module only fixes the spelling/order of the labels, not what the model
outputs mean.
"""

STAGE_ORDER = [
    'Non-Demented',
    'Very Mild Demented',
    'Mild Demented',
    'Moderate Demented',
]

STAGE_INDEX = {s: i for i, s in enumerate(STAGE_ORDER)}


def normalize_stage_name(stage):
    """Map legacy spellings to the canonical stage name.

    Only the known legacy variant (``'Non Demented'`` with a space) is
    rewritten; every other value passes through unchanged so lookups keep
    their existing fallback behavior.
    """
    if isinstance(stage, str) and stage.strip().lower() == 'non demented':
        return 'Non-Demented'
    return stage


def risk_to_stage_index(risk_score: float) -> int:
    """Map a 0-100 risk-factor score to a fusion stage vote.

    Single owner for this policy; the fusion engine and its tests depend on
    this seam rather than a local copy. (Display bands in the risk profiler
    are a separate concern with different cutoffs.)
    """
    if risk_score >= 60:
        return 3
    elif risk_score >= 35:
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
    elif composite >= 55:
        return 1
    elif composite >= 30:
        return 2
    else:
        return 3
