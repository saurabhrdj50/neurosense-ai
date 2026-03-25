from dataclasses import dataclass
from typing import Dict, List


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
    STAGE_ORDER = ['Non-Demented', 'Very Mild Demented', 'Mild Demented', 'Moderate Demented']
    STAGE_INDEX = {s: i for i, s in enumerate(STAGE_ORDER)}

    @classmethod
    def get_stage(cls, index: int) -> StageDefinition:
        return STAGES.get(index, STAGES[0])

    @classmethod
    def get_index(cls, name: str) -> int:
        return cls.STAGE_INDEX.get(name, 0)

    @classmethod
    def format_probabilities(cls, probs: list) -> Dict[str, float]:
        return {
            cls.get_stage(i).name: round(float(probs[i]) * 100, 2)
            for i in range(4)
        }
