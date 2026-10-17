from dataclasses import dataclass
from typing import Dict, List

from app.ml.stages import STAGE_ORDER, STAGE_INDEX, normalize_stage_name

# MRI CLASS PROVENANCE (verified from training sources, read-only):
# The production checkpoint is a 3-class ResNet18 (classifier [3, 512]) from
# the ADNI CN/MCI/AD lineage (finetuning_restart.ipynb MRIResNet18_32Slice,
# 5fold_subject_grouped_metadata.csv): index 0 = CN, 1 = MCI, 2 = AD.
# Byte-identity verified 2026-10-05: backend/app/models/alzheimer_model.pth
# == Alzheimer_Training/best_mri_resnet18_finetuned.pth (MD5 f36aa42f...),
# i.e. the classifier-only fine-tune of the SSL-pretrained ResNet18
# (validation n=95: accuracy 0.5895, macro-F1 0.5725, balanced 0.5660).
# The display names below are the frozen frontend-contract labels and mirror
# the model's classes one-to-one: the pipeline is a 3-stage vocabulary.


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
        name='Cognitively Normal (CN)',
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
        name='Mild Cognitive Impairment (MCI)',
        label='Mild Cognitive Impairment',
        color='#f59e0b',
        severity=1,
        description='Mild cognitive changes detected. Noticeable memory lapses may be present and warrant monitoring and follow-up.',
        recommendations=[
            'Schedule a full neurological evaluation',
            'Start cognitive training exercises',
            'Consider Mediterranean or MIND diet',
            'Increase social engagement and physical activity',
        ],
    ),
    2: StageDefinition(
        name="Alzheimer's Disease (AD)",
        label="Alzheimer's Disease Detected",
        color='#ef4444',
        severity=2,
        description='Patterns consistent with Alzheimer\'s disease detected. Significant memory loss and functional impairment are likely present.',
        recommendations=[
            'Urgent specialist referral required',
            'Comprehensive care plan with caregiver training',
            'Evaluate safety at home — wandering risk assessment',
            'Begin structured cognitive support programs',
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
        """Resolve a stage name (canonical or legacy) to its model index."""
        normalized = normalize_stage_name(name)
        if normalized in cls.STAGE_INDEX:
            return cls.STAGE_INDEX[normalized]
        return cls.STAGE_INDEX.get(name, 0)

    @classmethod
    def format_probabilities(cls, probs: list) -> Dict[str, float]:
        # Respect the actual number of classes output by the model (3)
        return {
            cls.get_stage(i).name: round(float(probs[i]) * 100, 2)
            for i in range(len(probs)) if i < len(STAGES)
        }
