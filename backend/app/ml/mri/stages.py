from dataclasses import dataclass
from typing import Dict, List

from app.ml.stages import STAGE_ORDER, STAGE_INDEX

# MRI CLASS PROVENANCE (verified from training sources, read-only):
# The production checkpoint is a 3-class ResNet18 (classifier [3, 512]) from
# the ADNI CN/MCI/AD lineage (train_mri.py LABEL_MAP, finetuning notebooks,
# 5fold_subject_grouped_metadata.csv): index 0 = CN, 1 = MCI, 2 = AD.
# The display names below are the frozen frontend-contract labels, ordered by
# severity to match that lineage. Index 3 ('Moderate Demented') is unreachable
# from the 3-class MRI head; it exists for the fusion-stage vocabulary, which
# legitimately combines evidence into 4 normalized stages.


@dataclass(frozen=True)
class StageDefinition:
    name: str
    label: str
    color: str
    severity: int
    description: str
    recommendations: List[str]


STAGES: Dict[int, StageDefinition] = {
    0: StageDefinition(
        name='Non-Demented',
        label="No Alzheimer's Detected",
        color='#22c55e',
        severity=0,
        description='No significant cognitive decline detected. Brain structure appears normal for the patient\'s age group.',
        recommendations=[
            'Continue regular cognitive health check-ups',
            'Maintain an active lifestyle and healthy diet',
            'Engage in mentally stimulating activities',
            'Monitor for any changes in memory or behaviour',
        ],
    ),
    1: StageDefinition(
        name='Very Mild Demented',
        label='Very Mild Cognitive Impairment',
        color='#eab308',
        severity=1,
        description='Very subtle cognitive changes detected. Minor memory lapses may be present.',
        recommendations=[
            'Schedule a full neurological evaluation',
            'Start cognitive training exercises',
            'Consider Mediterranean diet',
            'Increase social engagement and physical activity',
        ],
    ),
    2: StageDefinition(
        name='Mild Demented',
        label='Mild Alzheimer\'s Disease',
        color='#f97316',
        severity=2,
        description='Mild cognitive impairment detected. Memory loss and confusion may begin to affect daily activities.',
        recommendations=[
            'Immediate consultation with a neurologist',
            'Consider medication options (cholinesterase inhibitors)',
            'Begin structured cognitive rehabilitation',
            'Establish caregiver support system',
        ],
    ),
    3: StageDefinition(
        name='Moderate Demented',
        label='Moderate Alzheimer\'s Disease',
        color='#ef4444',
        severity=3,
        description='Moderate cognitive decline detected. Significant memory loss and functional impairment are likely present.',
        recommendations=[
            'Urgent specialist referral required',
            'Comprehensive care plan with caregiver training',
            'Evaluate safety at home — wandering risk assessment',
            'Begin music and art therapy programs',
        ],
    ),
}


class StageMapper:
    # Canonical vocabulary lives in app/ml/stages.py; aliased here so the
    # MRI public entry point (ml/mri) stays self-contained.
    STAGE_ORDER = STAGE_ORDER
    STAGE_INDEX = STAGE_INDEX

    @classmethod
    def get_stage(cls, index: int) -> StageDefinition:
        return STAGES.get(index, STAGES[0])

    @classmethod
    def get_index(cls, name: str) -> int:
        return cls.STAGE_INDEX.get(name, 0)

    @classmethod
    def format_probabilities(cls, probs: list) -> Dict[str, float]:
        # Respect the actual number of classes output by the model (e.g. 3 or 4)
        return {
            cls.get_stage(i).name: round(float(probs[i]) * 100, 2)
            for i in range(len(probs)) if i < len(STAGES)
        }
