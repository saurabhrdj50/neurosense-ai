"""
Neuropsychological Assessment Module.
Comprehensive cognitive testing including MMSE, MoCA, CDR, and other standardized tests.
"""
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class TestResult:
    name: str
    raw_score: float
    max_score: float
    percentile: float
    classification: str
    interpretation: str


class MMSEAssessor:
    """
    Mini-Mental State Examination (MMSE) assessor.
    Standard screening tool for cognitive impairment.
    """
    
    DOMAINS = {
        'orientation': {'max': 10, 'items': [
            'Year', 'Season', 'Month', 'Day', 'Date',
            'Country', 'State', 'City', 'Hospital', 'Floor'
        ]},
        'registration': {'max': 3, 'items': ['Word 1', 'Word 2', 'Word 3']},
        'attention': {'max': 5, 'items': ['Serial 7s']},
        'recall': {'max': 3, 'items': ['Word 1', 'Word 2', 'Word 3']},
        'language': {'max': 8, 'items': [
            'Naming (2 items)', 'Repetition', '3-Stage Command',
            'Reading', 'Writing', 'Copying'
        ]},
    }
    
    CUTOFF_SCORES = {
        'normal': 24,
        'mild': 18,
        'moderate': 12,
        'severe': 0,
    }
    
    EDUCATION_ADJUSTMENTS = {
        'illiterate': -2,
        'primary': -1,
        'secondary': 0,
        'tertiary': 1,
    }
    
    def __init__(self):
        self.name = 'MMSE'
        self.max_score = 30
    
    def assess(self, responses: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess MMSE responses.
        
        Args:
            responses: Dict with domain scores
            
        Returns:
            Complete MMSE assessment
        """
        domain_scores = {}
        total_score = 0
        
        for domain, info in self.DOMAINS.items():
            score = responses.get(domain, 0)
            domain_scores[domain] = {
                'score': score,
                'max': info['max'],
                'percentage': round(score / info['max'] * 100, 1) if info['max'] > 0 else 0,
            }
            total_score += score
        
        education = responses.get('education_level', 'secondary')
        adjusted_score = total_score + self.EDUCATION_ADJUSTMENTS.get(education, 0)
        adjusted_score = max(0, min(30, adjusted_score))
        
        classification = self._classify_score(adjusted_score)
        
        return {
            'test_name': 'Mini-Mental State Examination',
            'abbreviation': 'MMSE',
            'total_score': total_score,
            'adjusted_score': adjusted_score,
            'max_score': self.max_score,
            'domain_scores': domain_scores,
            'classification': classification,
            'percentile': self._calculate_percentile(adjusted_score),
            'interpretation': self._generate_interpretation(adjusted_score, classification),
            'recommendations': self._get_recommendations(adjusted_score),
            'norms': {
                'normal': f'>= {self.CUTOFF_SCORES["normal"]}',
                'education_adjusted': True,
            },
        }
    
    def _classify_score(self, score: float) -> str:
        """Classify MMSE score."""
        if score >= 24:
            return 'Normal Cognition'
        elif score >= 18:
            return 'Mild Cognitive Impairment'
        elif score >= 12:
            return 'Moderate Cognitive Impairment'
        else:
            return 'Severe Cognitive Impairment'
    
    def _calculate_percentile(self, score: float) -> float:
        """Calculate percentile based on score."""
        percentiles = {
            30: 99, 29: 97, 28: 95, 27: 90, 26: 85,
            25: 80, 24: 75, 23: 65, 22: 60, 21: 55,
            20: 50, 19: 45, 18: 40, 17: 35, 16: 30,
            15: 25, 14: 22, 13: 18, 12: 15, 11: 12,
            10: 10, 9: 8, 8: 6, 7: 5, 6: 4,
            5: 3, 4: 2, 3: 1, 2: 1, 1: 0, 0: 0
        }
        return percentiles.get(int(score), 50)
    
    def _generate_interpretation(self, score: float, classification: str) -> str:
        """Generate clinical interpretation."""
        interpretations = {
            'Normal Cognition': (
                f'Score of {int(score)}/30 is within normal limits. '
                'No significant cognitive impairment detected. '
                'Continue routine health monitoring.'
            ),
            'Mild Cognitive Impairment': (
                f'Score of {int(score)}/30 indicates mild cognitive impairment. '
                'Further evaluation recommended. '
                'Consider neuropsychological testing and follow-up.'
            ),
            'Moderate Cognitive Impairment': (
                f'Score of {int(score)}/30 indicates moderate cognitive impairment. '
                'Comprehensive dementia workup recommended. '
                'Consider brain imaging and laboratory studies.'
            ),
            'Severe Cognitive Impairment': (
                f'Score of {int(score)}/30 indicates severe cognitive impairment. '
                'Urgent dementia evaluation needed. '
                'Comprehensive care planning should be initiated.'
            ),
        }
        return interpretations.get(classification, '')
    
    def _get_recommendations(self, score: float) -> List[str]:
        """Get recommendations based on score."""
        if score >= 24:
            return [
                'Reassure patient',
                'Continue annual cognitive screening',
                'Encourage brain-healthy lifestyle'
            ]
        elif score >= 18:
            return [
                'Refer for neuropsychological evaluation',
                'Consider brain imaging (MRI)',
                'Review medications for cognitive effects',
                'Follow-up in 6 months'
            ]
        elif score >= 12:
            return [
                'Comprehensive dementia evaluation',
                'Brain MRI/CT',
                'Laboratory workup (B12, TSH)',
                'Caregiver education',
                'Safety assessment'
            ]
        else:
            return [
                'Urgent neurology referral',
                'Full dementia workup',
                'Caregiver support services',
                'Advance care planning',
                'Consider driving evaluation'
            ]


class MoCAAssessor:
    """
    Montreal Cognitive Assessment (MoCA) assessor.
    More sensitive than MMSE for mild cognitive impairment.
    """
    
    DOMAINS = {
        'visuospatial': {'max': 4, 'items': ['Clock drawing', 'Cube copy']},
        'executive': {'max': 4, 'items': ['Trail making', 'Cube copy', 'Clock command']},
        'attention': {'max': 6, 'items': ['Serial 7s', 'Digit span', 'Vigilance']},
        'language': {'max': 5, 'items': ['Naming', 'Repetition', 'Fluency']},
        'abstract': {'max': 2, 'items': ['Similarities']},
        'delayed_recall': {'max': 5, 'items': ['5 words after delay']},
        'orientation': {'max': 6, 'items': ['Date', 'Place']},
    }
    
    def __init__(self):
        self.name = 'MoCA'
        self.max_score = 30
    
    def assess(self, responses: Dict[str, Any]) -> Dict[str, Any]:
        """Assess MoCA responses."""
        domain_scores = {}
        total_score = 0
        
        for domain, info in self.DOMAINS.items():
            score = responses.get(domain, 0)
            domain_scores[domain] = {
                'score': score,
                'max': info['max'],
                'percentage': round(score / info['max'] * 100, 1) if info['max'] > 0 else 0,
            }
            total_score += score
        
        education = responses.get('education_years', 12)
        if education < 12:
            total_score += 1
        
        classification = self._classify_score(total_score)
        
        return {
            'test_name': 'Montreal Cognitive Assessment',
            'abbreviation': 'MoCA',
            'total_score': total_score,
            'max_score': self.max_score,
            'domain_scores': domain_scores,
            'classification': classification,
            'percentile': self._calculate_percentile(total_score),
            'interpretation': self._generate_interpretation(total_score, classification),
            'sensitivity': 'Higher sensitivity for MCI than MMSE',
            'recommendations': self._get_recommendations(total_score),
        }
    
    def _classify_score(self, score: float) -> str:
        if score >= 26:
            return 'Normal'
        elif score >= 18:
            return 'Mild Cognitive Impairment'
        elif score >= 10:
            return 'Moderate Cognitive Impairment'
        else:
            return 'Severe Cognitive Impairment'
    
    def _calculate_percentile(self, score: float) -> float:
        percentiles = {
            30: 99, 29: 98, 28: 96, 27: 93, 26: 88,
            25: 82, 24: 75, 23: 68, 22: 60, 21: 52,
            20: 45, 19: 38, 18: 32, 17: 26, 16: 22,
            15: 18, 14: 14, 13: 11, 12: 8, 11: 6,
            10: 4, 9: 3, 8: 2, 7: 1, 6: 1, 5: 0,
            4: 0, 3: 0, 2: 0, 1: 0, 0: 0
        }
        return percentiles.get(int(score), 50)
    
    def _generate_interpretation(self, score: float, classification: str) -> str:
        if classification == 'Normal':
            return f'Score of {int(score)}/30 is normal. No significant cognitive impairment detected.'
        else:
            return f'Score of {int(score)}/30 indicates {classification}. Further evaluation recommended.'
    
    def _get_recommendations(self, score: float) -> List[str]:
        if score >= 26:
            return ['Reassure patient', 'Continue monitoring']
        elif score >= 18:
            return ['Refer for neuropsychological testing', 'Follow-up in 6 months']
        else:
            return ['Comprehensive dementia evaluation', 'Neurology referral', 'Caregiver support']


class CDRAssessor:
    """
    Clinical Dementia Rating (CDR) assessor.
    Global assessment of dementia severity.
    """
    
    DOMAINS = [
        'memory', 'orientation', 'judgment', 'community_affairs',
        'home_hobbies', 'personal_care'
    ]
    
    STAGE_DESCRIPTIONS = {
        0: 'Normal',
        0.5: 'Questionable Dementia',
        1: 'Mild Dementia',
        2: 'Moderate Dementia',
        3: 'Severe Dementia',
    }
    
    def __init__(self):
        self.name = 'CDR'
    
    def assess(self, responses: Dict[str, Any]) -> Dict[str, Any]:
        """Assess CDR responses."""
        domain_scores = {}
        for domain in self.DOMAINS:
            domain_scores[domain] = responses.get(domain, 0)
        
        cdr_score = self._calculate_cdr_score(domain_scores)
        stage = self.STAGE_DESCRIPTIONS.get(cdr_score, 'Unknown')
        
        return {
            'test_name': 'Clinical Dementia Rating',
            'abbreviation': 'CDR',
            'score': cdr_score,
            'stage': stage,
            'domain_scores': domain_scores,
            'interpretation': self._generate_interpretation(cdr_score, domain_scores),
            'functional_assessment': self._get_functional_status(cdr_score),
            'recommendations': self._get_recommendations(cdr_score),
        }
    
    def _calculate_cdr_score(self, domain_scores: Dict) -> float:
        """Calculate overall CDR score from domain scores."""
        memory_score = domain_scores.get('memory', 0) * 2
        other_sum = sum(domain_scores.get(d, 0) for d in self.DOMAINS if d != 'memory')
        
        total = memory_score + other_sum
        num_domains = len(self.DOMAINS)
        
        avg = total / num_domains if num_domains > 0 else 0
        
        if avg <= 0.5:
            return 0.5 if avg > 0 else 0
        elif avg <= 1.5:
            return 1.0
        elif avg <= 2.5:
            return 2.0
        else:
            return 3.0
    
    def _generate_interpretation(self, score: float, domain_scores: Dict) -> str:
        desc = self.STAGE_DESCRIPTIONS.get(score, '')
        worst_domains = sorted(domain_scores.items(), key=lambda x: x[1], reverse=True)[:3]
        
        return (
            f'CDR score of {score} indicates {desc}. '
            f'Most affected domains: {", ".join([d[0] for d in worst_domains if d[1] > 0])}.'
        )
    
    def _get_functional_status(self, score: float) -> Dict[str, str]:
        status = {
            0: {'driving': 'Normal', 'finances': 'Normal', 'medications': 'Normal', 'meals': 'Normal'},
            0.5: {'driving': 'Possibly impaired', 'finances': 'Slight difficulty', 'medications': 'Slight difficulty', 'meals': 'Normal'},
            1: {'driving': 'Impaired', 'finances': 'Needs help', 'medications': 'Needs help', 'meals': 'Slight difficulty'},
            2: {'driving': 'Not recommended', 'finances': 'Unable', 'medications': 'Unable', 'meals': 'Needs help'},
            3: {'driving': 'Not possible', 'finances': 'Unable', 'medications': 'Unable', 'meals': 'Needs total help'},
        }
        return status.get(score, status[0])
    
    def _get_recommendations(self, score: float) -> List[str]:
        recs = {
            0: ['No intervention needed'],
            0.5: ['Monitor closely', 'Consider further testing'],
            1: ['Safety assessment', 'Caregiver education', 'Legal planning'],
            2: ['Full-time care may be needed', 'Home safety evaluation'],
            3: ['Total care required', 'Nursing home consideration', 'Palliative care discussion'],
        }
        return recs.get(score, [])


class NeuropsychologicalBattery:
    """
    Complete neuropsychological assessment battery.
    Combines multiple tests for comprehensive evaluation.
    """
    
    def __init__(self):
        self.mmse = MMSEAssessor()
        self.moca = MoCAAssessor()
        self.cdr = CDRAssessor()
    
    def run_complete_battery(self, responses: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run complete neuropsychological battery.
        
        Args:
            responses: Dict with MMSE, MoCA, CDR responses
            
        Returns:
            Complete battery results
        """
        results = {
            'mmse': self.mmse.assess(responses.get('mmse', {})),
            'moca': self.moca.assess(responses.get('moca', {})),
            'cdr': self.cdr.assess(responses.get('cdr', {})),
            'battery_summary': {},
        }
        
        results['battery_summary'] = self._generate_summary(results)
        
        return results
    
    def _generate_summary(self, results: Dict) -> Dict[str, Any]:
        """Generate overall battery summary."""
        mmse_score = results['mmse']['adjusted_score']
        moca_score = results['moca']['total_score']
        cdr_score = results['cdr']['score']
        
        cognitive_index = self._calculate_cognitive_index(mmse_score, moca_score)
        
        return {
            'cognitive_index': cognitive_index,
            'overall_impression': self._get_overall_impression(cognitive_index),
            'test_consistency': self._check_consistency(mmse_score, moca_score),
            'domain_patterns': self._identify_domain_patterns(results),
            'testing_impression': self._get_testing_impression(results),
        }
    
    def _calculate_cognitive_index(self, mmse: float, moca: float) -> float:
        """Calculate overall cognitive index (0-100)."""
        mmse_percent = (mmse / 30) * 100
        moca_percent = (moca / 30) * 100
        return round((mmse_percent + moca_percent) / 2, 1)
    
    def _get_overall_impression(self, index: float) -> str:
        if index >= 80:
            return 'Normal cognitive function'
        elif index >= 60:
            return 'Mild cognitive impairment - recommend monitoring'
        elif index >= 40:
            return 'Moderate cognitive impairment - comprehensive evaluation needed'
        else:
            return 'Severe cognitive impairment - urgent intervention needed'
    
    def _check_consistency(self, mmse: float, moca: float) -> Dict[str, Any]:
        """Check if test results are consistent."""
        diff = abs(mmse - moca)
        
        if diff <= 4:
            return {
                'consistent': True,
                'note': 'MMSE and MoCA scores are consistent',
            }
        else:
            return {
                'consistent': False,
                'note': f'Discrepancy between MMSE ({mmse}) and MoCA ({moca}). '
                       f'MoCA is more sensitive to subtle deficits.',
            }
    
    def _identify_domain_patterns(self, results: Dict) -> List[str]:
        """Identify patterns across domains."""
        patterns = []
        
        mmse_domains = results['mmse']['domain_scores']
        moca_domains = results['moca']['domain_scores']
        
        weak_domains = []
        
        for domain, score in mmse_domains.items():
            if score.get('percentage', 0) < 50:
                weak_domains.append(f"MMSE: {domain}")
        
        for domain, score in moca_domains.items():
            if score.get('percentage', 0) < 50:
                weak_domains.append(f"MoCA: {domain}")
        
        if weak_domains:
            patterns.append(f"Weak domains identified: {', '.join(weak_domains)}")
        
        return patterns
    
    def _get_testing_impression(self, results: Dict) -> str:
        """Generate overall testing impression."""
        cognitive_index = results['battery_summary']['cognitive_index']
        cdr_score = results['cdr']['score']
        
        return (
            f"Cognitive testing reveals {results['battery_summary']['overall_impression'].lower()}. "
            f"CDR staging at {cdr_score} ({results['cdr']['stage']}) is {'consistent' if results['battery_summary']['test_consistency']['consistent'] else 'somewhat discrepant'} "
            f"with standardized testing. "
            f"{'Comprehensive neuropsychological evaluation recommended for detailed profile.' if cognitive_index < 80 else 'Routine follow-up recommended.'}"
        )


def assess_neuropsychological(responses: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function for complete neuropsychological assessment."""
    battery = NeuropsychologicalBattery()
    return battery.run_complete_battery(responses)
