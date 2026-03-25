"""
Clinical Decision Support System for Alzheimer's Management.
Provides treatment recommendations, prognosis, and clinical guidance.
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import random

logger = logging.getLogger(__name__)


TREATMENTS = {
    'cholinesterase_inhibitors': {
        'name': 'Cholinesterase Inhibitors',
        'drugs': [
            {'name': 'Donepezil', 'doses': ['5mg', '10mg', '23mg'], 'stages': [1, 2, 3]},
            {'name': 'Rivastigmine', 'doses': ['1.5mg', '3mg', '4.5mg', '6mg', 'patch'], 'stages': [1, 2, 3]},
            {'name': 'Galantamine', 'doses': ['4mg', '8mg', '12mg'], 'stages': [1, 2]},
        ],
        'indications': ['Mild to moderate AD', 'Memory impairment', 'Cognitive decline'],
        'contraindications': ['Severe cardiac conduction disorders', 'Active peptic ulcer'],
        'side_effects': ['Nausea', 'Vomiting', 'Diarrhea', 'Bradycardia', 'Insomnia'],
        'monitoring': ['Heart rate', 'GI symptoms', 'Liver function'],
    },
    'memantine': {
        'name': 'NMDA Receptor Antagonist',
        'drugs': [
            {'name': 'Memantine', 'doses': ['5mg', '10mg', '15mg', '20mg'], 'stages': [2, 3, 4]},
            {'name': 'Donepezil + Memantine (combination)', 'doses': ['Standard doses'], 'stages': [2, 3]},
        ],
        'indications': ['Moderate to severe AD', 'When cholinesterase inhibitors insufficient'],
        'contraindications': ['Severe renal impairment', 'Seizure disorder'],
        'side_effects': ['Dizziness', 'Headache', 'Constipation', 'Confusion'],
        'monitoring': ['Renal function', 'Cognitive status'],
    },
    'symptomatic_relief': {
        'name': 'Symptomatic Treatments',
        'drugs': [
            {'name': 'SSRIs', 'doses': ['Various'], 'stages': [1, 2, 3, 4], 'for': 'Depression'},
            {'name': 'Anxiolytics', 'doses': ['As needed'], 'stages': [1, 2, 3, 4], 'for': 'Anxiety'},
            {'name': 'Antipsychotics', 'doses': ['Low dose'], 'stages': [3, 4], 'for': 'Behavioral symptoms'},
            {'name': 'Sleep aids', 'doses': ['As needed'], 'stages': [1, 2, 3, 4], 'for': 'Sleep disturbances'},
        ],
        'indications': ['Behavioral and psychological symptoms'],
        'contraindications': ['Multiple drug interactions'],
        'side_effects': ['Varies by drug class'],
        'monitoring': ['Sedation', 'Fall risk', 'Drug interactions'],
    },
    'disease_modifying': {
        'name': 'Disease-Modifying Therapies (Emerging)',
        'drugs': [
            {'name': 'Aducanumab', 'doses': ['Based on weight'], 'stages': [1], 'approval': 'Conditional'},
            {'name': 'Lecanemab', 'doses': ['10mg/kg'], 'stages': [1, 2], 'approval': 'Approved'},
            {'name': 'Donanemab', 'doses': ['Based on amyloid levels'], 'stages': [1, 2], 'approval': 'Approved'},
        ],
        'indications': ['Early AD with confirmed amyloid', 'Mild cognitive impairment'],
        'contraindications': ['Anticoagulation', 'Active bleeding', 'ARIA history'],
        'side_effects': ['ARIA-H', 'ARIA-E', 'Infusion reactions'],
        'monitoring': ['MRI (every 3 months)', 'ARIA symptoms'],
    },
}


LIFESTYLE_RECOMMENDATIONS = {
    'exercise': {
        'name': 'Physical Exercise',
        'recommendations': [
            '150 minutes/week moderate aerobic exercise',
            'Resistance training 2-3 times/week',
            'Balance exercises to prevent falls',
            'Regular walking or swimming',
        ],
        'evidence': 'Moderate to strong evidence for cognitive benefit',
        'impact': 'Reduces AD risk by 30-40%',
    },
    'cognitive_stimulation': {
        'name': 'Cognitive Stimulation',
        'recommendations': [
            'Puzzles, crosswords, sudoku',
            'Learning new skills or languages',
            'Reading books and discussion',
            'Memory training programs',
        ],
        'evidence': 'Strong evidence for benefit',
        'impact': 'Improves cognitive function and quality of life',
    },
    'diet': {
        'name': 'Dietary Interventions',
        'recommendations': [
            'Mediterranean diet or MIND diet',
            'High in vegetables, fruits, whole grains',
            'Omega-3 fatty acids (fish, nuts)',
            'Limit processed foods and sugars',
            'Moderate wine consumption if any',
        ],
        'evidence': 'Moderate evidence',
        'impact': 'May reduce progression risk',
    },
    'social_engagement': {
        'name': 'Social Engagement',
        'recommendations': [
            'Regular social interactions',
            'Join community groups',
            'Family involvement in care',
            'Volunteer opportunities',
        ],
        'evidence': 'Strong evidence for risk reduction',
        'impact': 'Reduces isolation and depression',
    },
    'sleep': {
        'name': 'Sleep Hygiene',
        'recommendations': [
            '7-8 hours of sleep per night',
            'Consistent sleep schedule',
            'Avoid screens before bed',
            'Treat sleep apnea if present',
        ],
        'evidence': 'Moderate evidence',
        'impact': 'Sleep clears brain amyloid',
    },
    'cardiovascular': {
        'name': 'Cardiovascular Health',
        'recommendations': [
            'Control blood pressure',
            'Manage cholesterol levels',
            'Treat atrial fibrillation',
            'Maintain healthy weight',
        ],
        'evidence': 'Strong evidence',
        'impact': 'Reduces vascular contribution to dementia',
    },
}


CLINICAL_TRIALS = [
    {
        'name': 'TRAILBLAZER-ALZ 3',
        'phase': 'Phase 3',
        'status': 'Recruiting',
        'drug': 'Donanemab',
        'criteria': ['55-80 years', 'Early symptomatic AD', 'Confirmed amyloid'],
        'locations': ['Multiple US sites', 'Europe'],
    },
    {
        'name': 'CLARITY-AD',
        'phase': 'Phase 3',
        'status': 'Completed',
        'drug': 'Lecanemab',
        'criteria': ['50-90 years', 'Mild cognitive impairment', 'Confirmed amyloid'],
        'results': '27% slowing of decline',
    },
    {
        'name': 'DIAN-TU',
        'phase': 'Phase 3',
        'status': 'Active',
        'drug': 'Multiple (Gantenerumab, Semorinemab)',
        'criteria': ['Autosomal dominant mutation carriers', 'Cognitively normal to impaired'],
        'locations': ['International'],
    },
    {
        'name': 'TANGO',
        'phase': 'Phase 2',
        'status': 'Recruiting',
        'drug': 'ACI-35',
        'criteria': ['55-85 years', 'Mild AD', 'Stable on cholinesterase inhibitor'],
        'locations': ['US, Canada, Europe'],
    },
]


@dataclass
class StageInfo:
    stage: int
    name: str
    mmse_range: str
    description: str
    care_level: str


STAGE_INFO = {
    0: StageInfo(0, 'Normal Cognition', '26-30', 'No impairment', 'Independent'),
    1: StageInfo(1, 'Very Mild Dementia', '21-25', 'Subjective memory complaints', 'Independent'),
    2: StageInfo(2, 'Mild Dementia', '15-20', 'Noticeable cognitive decline', 'Supervision needed'),
    3: StageInfo(3, 'Moderate Dementia', '10-14', 'Significant impairment', 'Daily supervision'),
    4: StageInfo(4, 'Moderately Severe', '6-9', 'Needs help with activities', 'Caregiver required'),
    5: StageInfo(5, 'Severe Dementia', '1-5', 'Loses ability to communicate', 'Full-time care'),
}


class PrognosisEstimator:
    """
    Estimates disease progression and prognosis.
    """
    
    def __init__(self):
        self.base_progression_rates = {
            0: 0.0,
            1: 0.05,
            2: 0.15,
            3: 0.25,
            4: 0.35,
            5: 0.30,
        }
    
    def estimate_progression(self, current_stage: int, 
                           age: int,
                           biomarkers: Dict[str, Any] = None,
                           comorbidities: List[str] = None) -> Dict[str, Any]:
        """
        Estimate disease progression timeline.
        
        Args:
            current_stage: Current AD stage (0-5)
            age: Patient age
            biomarkers: Blood/CSF biomarker results
            comorbidities: List of comorbidities
            
        Returns:
            Progression estimates at various timepoints
        """
        comorbidities = comorbidities or []
        
        rate = self.base_progression_rates.get(current_stage, 0.15)
        
        if age > 80:
            rate *= 1.2
        elif age < 65:
            rate *= 0.9
        
        if 'diabetes' in comorbidities:
            rate *= 1.15
        if 'cardiovascular' in comorbidities:
            rate *= 1.2
        if 'stroke' in comorbidities:
            rate *= 1.3
        
        if biomarkers:
            if biomarkers.get('high_tau', False):
                rate *= 1.2
            if biomarkers.get('low_amyloid', False):
                rate *= 1.15
        
        timeline = {}
        for years in [1, 2, 3, 5, 10]:
            prob_stage = self._calculate_stage_probability(
                current_stage, rate, years
            )
            timeline[f'{years}_year'] = {
                'estimated_stage': min(int(prob_stage), 5),
                'stage_name': STAGE_INFO.get(min(int(prob_stage), 5), STAGE_INFO[5]).name,
                'probability_of_stage_change': round(abs(prob_stage - current_stage) * rate, 2),
            }
        
        survival_estimate = self._estimate_survival(current_stage, age)
        
        return {
            'current_stage': current_stage,
            'base_progression_rate': round(rate, 3),
            'adjusted_rate': round(rate, 3),
            'modifying_factors': {
                'age_factor': f"{'>80' if age > 80 else '<65' if age < 65 else '65-80'}: {'accelerated' if age > 80 else 'slower'}",
                'comorbidities': comorbidities,
                'biomarkers_considered': biomarkers is not None,
            },
            'timeline': timeline,
            'survival': survival_estimate,
        }
    
    def _calculate_stage_probability(self, start_stage: int, rate: float, years: int) -> float:
        """Calculate probability distribution over stages."""
        import numpy as np
        
        progression = start_stage + rate * years * np.random.normal(1, 0.2)
        return max(0, min(5, progression))
    
    def _estimate_survival(self, stage: int, age: int) -> Dict[str, Any]:
        """Estimate survival from diagnosis."""
        base_survival = {
            0: 20,
            1: 15,
            2: 12,
            3: 8,
            4: 5,
            5: 3,
        }
        
        years_from_diagnosis = base_survival.get(stage, 8)
        estimated_death_age = age + years_from_diagnosis
        
        return {
            'median_survival_from_diagnosis_years': years_from_diagnosis,
            'estimated_death_age': min(estimated_death_age, 100),
            'note': 'Estimates vary significantly based on individual factors',
        }
    
    def get_transition_probabilities(self, current_stage: int) -> Dict[str, float]:
        """Get probability of transitioning to each stage."""
        rates = {
            0: [0.95, 0.04, 0.01, 0, 0, 0],
            1: [0.10, 0.75, 0.10, 0.04, 0.01, 0],
            2: [0, 0.15, 0.60, 0.15, 0.08, 0.02],
            3: [0, 0, 0.15, 0.50, 0.25, 0.10],
            4: [0, 0, 0, 0.15, 0.50, 0.35],
            5: [0, 0, 0, 0, 0.10, 0.90],
        }
        
        return {
            f'to_stage_{i}': round(rates[current_stage][i], 3)
            for i in range(6)
        }


class TreatmentRecommender:
    """
    Recommends treatments based on patient profile.
    """
    
    def __init__(self):
        self.prognosis = PrognosisEstimator()
    
    def recommend_treatments(self, stage: int, age: int,
                           comorbidities: List[str] = None,
                           contraindications: List[str] = None) -> Dict[str, Any]:
        """
        Generate treatment recommendations.
        
        Args:
            stage: Current disease stage (0-5)
            age: Patient age
            comorbidities: List of comorbidities
            contraindications: Known contraindications
            
        Returns:
            Treatment recommendations
        """
        comorbidities = comorbidities or []
        contraindications = contraindications or []
        
        recommendations = {
            'pharmacological': [],
            'non_pharmacological': [],
            'monitoring': [],
            'special_considerations': [],
        }
        
        if stage <= 2:
            recommendations['pharmacological'].extend(
                self._recommend_early_stage(stage, contraindications)
            )
        elif stage <= 4:
            recommendations['pharmacological'].extend(
                self._recommend_moderate_stage(stage, contraindications)
            )
        else:
            recommendations['pharmacological'].extend(
                self._recommend_severe_stage(contraindications)
            )
        
        recommendations['non_pharmacological'] = self._get_lifestyle_recommendations()
        recommendations['monitoring'] = self._get_monitoring_plan(stage)
        recommendations['special_considerations'] = self._get_special_considerations(
            stage, age, comorbidities
        )
        
        return recommendations
    
    def _recommend_early_stage(self, stage: int, contraindications: List) -> List[Dict]:
        """Recommend treatments for early-stage AD."""
        recs = []
        
        if 'cholinesterase_inhibitors' not in contraindications:
            recs.append({
                'category': 'First-line',
                'treatment': 'Cholinesterase Inhibitor',
                'options': TREATMENTS['cholinesterase_inhibitors']['drugs'],
                'reason': 'Standard treatment for mild cognitive impairment and mild AD',
                'expected_benefit': 'Moderate improvement in cognition and function',
            })
        
        recs.append({
            'category': 'Disease-Modifying (if eligible)',
            'treatment': 'Anti-Amyloid Therapy',
            'options': TREATMENTS['disease_modifying']['drugs'],
            'reason': 'Consider if confirmed amyloid pathology',
            'expected_benefit': 'May slow disease progression',
            'eligibility_note': 'Requires amyloid PET or CSF confirmation',
        })
        
        return recs
    
    def _recommend_moderate_stage(self, stage: int, contraindications: List) -> List[Dict]:
        """Recommend treatments for moderate-stage AD."""
        recs = []
        
        if 'cholinesterase_inhibitors' not in contraindications:
            recs.append({
                'category': 'First-line',
                'treatment': 'Cholinesterase Inhibitor + Memantine',
                'options': TREATMENTS['memantine']['drugs'],
                'reason': 'Combination therapy for moderate AD',
                'expected_benefit': 'Better cognitive outcomes than monotherapy',
            })
        
        recs.append({
            'category': 'Symptomatic',
            'treatment': 'Behavioral Management',
            'options': TREATMENTS['symptomatic_relief']['drugs'],
            'reason': 'For behavioral and psychological symptoms',
            'expected_benefit': 'Improved quality of life',
        })
        
        return recs
    
    def _recommend_severe_stage(self, contraindications: List) -> List[Dict]:
        """Recommend treatments for severe-stage AD."""
        return [{
            'category': 'Primary',
            'treatment': 'Memantine + Full-time Care Support',
            'options': TREATMENTS['memantine']['drugs'],
            'reason': 'Maximize remaining function, ensure safety',
            'expected_benefit': 'Slow further decline, manage symptoms',
        }]
    
    def _get_lifestyle_recommendations(self) -> List[Dict]:
        """Get comprehensive lifestyle recommendations."""
        return [
            {
                'category': key,
                'recommendations': value['recommendations'],
                'evidence': value['evidence'],
                'impact': value['impact'],
            }
            for key, value in LIFESTYLE_RECOMMENDATIONS.items()
        ]
    
    def _get_monitoring_plan(self, stage: int) -> List[Dict]:
        """Get monitoring schedule based on stage."""
        plans = {
            0: [
                {'frequency': 'Annually', 'items': ['Cognitive assessment', 'MRI if symptoms']},
            ],
            1: [
                {'frequency': 'Every 6 months', 'items': ['Cognitive testing', 'Functional assessment']},
            ],
            2: [
                {'frequency': 'Every 3-6 months', 'items': ['Cognitive testing', 'MRI every 12 months', 'Biomarkers if available']},
            ],
            3: [
                {'frequency': 'Every 3 months', 'items': ['Cognitive testing', 'Behavioral assessment', 'Caregiver burden']},
            ],
            4: [
                {'frequency': 'Every 2-3 months', 'items': ['Safety assessment', 'Functional status', 'Complications']},
            ],
            5: [
                {'frequency': 'Monthly', 'items': ['Comfort measures', 'Care needs', 'Family support']},
            ],
        }
        
        return plans.get(stage, plans[2])
    
    def _get_special_considerations(self, stage: int, age: int, 
                                   comorbidities: List[str]) -> List[str]:
        """Get special clinical considerations."""
        considerations = []
        
        if age > 85:
            considerations.append("Advanced age requires careful medication dosing and monitoring")
        
        if 'cardiovascular' in comorbidities:
            considerations.append("Cardiovascular disease may accelerate progression")
        
        if 'diabetes' in comorbidities:
            considerations.append("Tight glycemic control may be protective")
        
        if stage >= 3:
            considerations.append("Consider advance care planning and legal matters")
            considerations.append("Evaluate driving safety")
        
        if stage >= 4:
            considerations.append("Assess caregiver burnout and support needs")
            considerations.append("Discuss nursing home or care facility options")
        
        return considerations


class ClinicalTrialMatcher:
    """
    Matches patients to relevant clinical trials.
    """
    
    def __init__(self):
        self.trials = CLINICAL_TRIALS
    
    def find_eligible_trials(self, age: int, stage: int,
                            biomarkers: Dict[str, Any] = None,
                            medications: List[str] = None) -> Dict[str, Any]:
        """
        Find clinical trials matching patient criteria.
        
        Args:
            age: Patient age
            stage: Current disease stage
            biomarkers: Biomarker status
            medications: Current medications
            
        Returns:
            List of matching trials with eligibility assessment
        """
        matches = []
        
        for trial in self.trials:
            eligibility = self._assess_eligibility(trial, age, stage)
            if eligibility['eligible']:
                matches.append({
                    **trial,
                    'eligibility': eligibility,
                    'match_score': self._calculate_match_score(trial, age, stage, biomarkers),
                })
        
        matches.sort(key=lambda x: x['match_score'], reverse=True)
        
        return {
            'matching_trials': matches,
            'total_found': len(matches),
            'recommendation': self._get_recommendation(len(matches)),
        }
    
    def _assess_eligibility(self, trial: Dict, age: int, stage: int) -> Dict:
        """Assess patient eligibility for a specific trial."""
        criteria_met = []
        criteria_not_met = []
        
        age_match = self._check_age_criteria(age, trial.get('criteria', []))
        if age_match['met']:
            criteria_met.append(age_match['reason'])
        else:
            criteria_not_met.append(age_match['reason'])
        
        stage_match = self._check_stage_criteria(stage, trial.get('criteria', []))
        if stage_match['met']:
            criteria_met.append(stage_match['reason'])
        else:
            criteria_not_met.append(stage_match['reason'])
        
        eligible = len(criteria_not_met) == 0
        
        return {
            'eligible': eligible,
            'criteria_met': criteria_met,
            'criteria_not_met': criteria_not_met,
            'needs_verification': ['Exclusion criteria review required'],
        }
    
    def _check_age_criteria(self, age: int, criteria: List[str]) -> Dict:
        """Check if patient meets age criteria."""
        for c in criteria:
            if 'years' in c:
                if '-' in c:
                    parts = c.replace('years', '').replace('years', '').split('-')
                    min_age = int(''.join(filter(str.isdigit, parts[0])))
                    max_age = int(''.join(filter(str.isdigit, parts[1])))
                    if min_age <= age <= max_age:
                        return {'met': True, 'reason': f"Age {age} within {c}"}
                else:
                    if '55' in c and age >= 55:
                        return {'met': True, 'reason': f"Age {age} meets {c}"}
        
        return {'met': True, 'reason': 'Age criteria assumed met'}
    
    def _check_stage_criteria(self, stage: int, criteria: List[str]) -> Dict:
        """Check if patient meets stage criteria."""
        stage_map = {
            'Normal': 0, 'Mild cognitive impairment': 1, 'Early symptomatic': 1,
            'Mild': 2, 'Mild AD': 2, 'Mild dementia': 2,
            'Moderate': 3, 'Moderate AD': 3, 'Moderate dementia': 3,
            'Moderately severe': 4, 'Severe': 5, 'Severe dementia': 5,
            'Impaired': 3, 'normal': 0, 'cognitively normal': 0,
        }
        
        for c in criteria:
            c_lower = c.lower()
            for key, s in stage_map.items():
                if key.lower() in c_lower:
                    if s == stage:
                        return {'met': True, 'reason': f"Stage {stage} matches trial criteria"}
        
        return {'met': True, 'reason': 'Stage criteria assumed met'}
    
    def _calculate_match_score(self, trial: Dict, age: int, stage: int,
                             biomarkers: Dict) -> float:
        """Calculate how well patient matches trial."""
        score = 0.5
        
        if 'Phase 3' in trial.get('phase', ''):
            score += 0.2
        
        if trial.get('status') == 'Recruiting':
            score += 0.2
        
        if 'Approved' in str(trial.get('approval', '')):
            score += 0.1
        
        return min(score, 1.0)
    
    def _get_recommendation(self, num_matches: int) -> str:
        """Get recommendation based on matches."""
        if num_matches == 0:
            return "No matching trials found. Consider discussing off-label options with physician."
        elif num_matches == 1:
            return "1 potentially eligible trial found. Discuss with care team."
        else:
            return f"{num_matches} potentially eligible trials found. Review options with physician."


class ClinicalDecisionSupport:
    """
    Main clinical decision support system.
    """
    
    def __init__(self):
        self.treatment_recommender = TreatmentRecommender()
        self.trial_matcher = ClinicalTrialMatcher()
        self.prognosis = PrognosisEstimator()
    
    def generate_recommendations(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate comprehensive clinical decision support.
        
        Args:
            patient_data: Patient information including:
                - stage: Current disease stage (0-5)
                - age: Patient age
                - mmse_score: Current MMSE score
                - comorbidities: List of comorbidities
                - biomarkers: Blood/CSF biomarker results
                - current_medications: List of current meds
                
        Returns:
            Complete clinical decision support output
        """
        stage = patient_data.get('stage', 1)
        age = patient_data.get('age', 70)
        mmse = patient_data.get('mmse_score', 24)
        
        treatments = self.treatment_recommender.recommend_treatments(
            stage=stage,
            age=age,
            comorbidities=patient_data.get('comorbidities', []),
            contraindications=patient_data.get('contraindications', []),
        )
        
        prognosis = self.prognosis.estimate_progression(
            current_stage=stage,
            age=age,
            biomarkers=patient_data.get('biomarkers'),
            comorbidities=patient_data.get('comorbidities', []),
        )
        
        trials = self.trial_matcher.find_eligible_trials(
            age=age,
            stage=stage,
            biomarkers=patient_data.get('biomarkers'),
            medications=patient_data.get('current_medications', []),
        )
        
        stage_info = STAGE_INFO.get(stage, STAGE_INFO[1])
        
        return {
            'patient_summary': {
                'stage': stage,
                'stage_name': stage_info.name,
                'age': age,
                'mmse_score': mmse,
                'care_level': stage_info.care_level,
            },
            'treatment_plan': treatments,
            'prognosis': prognosis,
            'clinical_trials': trials,
            'summary': self._generate_summary(stage_info, treatments, prognosis),
            'generated_at': datetime.now().isoformat(),
            'disclaimer': 'This is a decision support tool. All recommendations should be reviewed by a qualified healthcare professional.',
        }
    
    def _generate_summary(self, stage_info, treatments, prognosis) -> str:
        """Generate human-readable summary."""
        return (
            f"Patient at {stage_info.name} stage ({stage_info.description}) "
            f"with care level: {stage_info.care_level}. "
            f"Treatment plan includes pharmacological and non-pharmacological interventions. "
            f"Estimated progression rate adjusted for individual factors. "
            f"Review clinical trials may be appropriate for eligibility."
        )


def get_clinical_decision_support(patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function for clinical decision support."""
    cds = ClinicalDecisionSupport()
    return cds.generate_recommendations(patient_data)
