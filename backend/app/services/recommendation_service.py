"""
Smart Recommendation Service
Generates personalized medical and lifestyle recommendations based on 
the Alzheimer's risk assessment results.
"""

from typing import Dict, Any, List


class RecommendationService:
    """Generate personalized recommendations based on analysis results."""

    MEDICAL_REFERRALS = {
        'Non Demented': [
            {'specialist': 'Primary Care Physician', 'reason': 'Regular wellness check', 'urgency': 'routine'},
            {'specialist': 'Neurologist', 'reason': 'Baseline cognitive evaluation', 'urgency': 'optional'}
        ],
        'Very Mild Demented': [
            {'specialist': 'Neurologist', 'reason': 'Early-stage cognitive assessment', 'urgency': 'recommended'},
            {'specialist': 'Memory Clinic', 'reason': 'Comprehensive cognitive evaluation', 'urgency': 'recommended'},
            {'specialist': 'Psychiatrist', 'reason': 'Mood and behavioral assessment', 'urgency': 'optional'}
        ],
        'Mild Demented': [
            {'specialist': 'Neurologist', 'reason': 'Confirm diagnosis and treatment planning', 'urgency': 'important'},
            {'specialist': 'Memory Clinic', 'reason': 'Detailed neuropsychological testing', 'urgency': 'important'},
            {'specialist': 'Geriatric Specialist', 'reason': 'Comprehensive geriatric assessment', 'urgency': 'recommended'},
            {'specialist': 'Psychiatrist', 'reason': 'Address behavioral and emotional changes', 'urgency': 'recommended'}
        ],
        'Moderate Demented': [
            {'specialist': 'Neurologist', 'reason': 'Urgent neurological evaluation', 'urgency': 'urgent'},
            {'specialist': 'Memory Clinic', 'reason': 'Comprehensive assessment and care planning', 'urgency': 'urgent'},
            {'specialist': 'Geriatric Specialist', 'reason': 'Coordinate overall care', 'urgency': 'important'},
            {'specialist': 'Psychiatrist', 'reason': 'Manage behavioral symptoms', 'urgency': 'important'},
            {'specialist': 'Social Worker', 'reason': 'Caregiver support and resources', 'urgency': 'important'}
        ]
    }

    LIFESTYLE_TIPS = {
        'Non Demented': [
            {'category': 'Cognitive', 'tip': 'Engage in regular mental stimulation - puzzles, reading, learning new skills'},
            {'category': 'Physical', 'tip': 'Maintain 150 minutes of moderate exercise per week'},
            {'category': 'Social', 'tip': 'Stay socially active with friends and family'},
            {'category': 'Diet', 'tip': 'Follow a Mediterranean-style diet rich in vegetables and fish'},
            {'category': 'Sleep', 'tip': 'Aim for 7-8 hours of quality sleep each night'}
        ],
        'Very Mild Demented': [
            {'category': 'Cognitive', 'tip': 'Increase cognitive activities - consider brain training apps'},
            {'category': 'Physical', 'tip': 'Regular aerobic exercise (walking, swimming)'},
            {'category': 'Diet', 'tip': 'Adopt MIND diet - leafy greens, berries, nuts, olive oil'},
            {'category': 'Social', 'tip': 'Join a social group or community activity'},
            {'category': 'Memory', 'tip': 'Use memory aids - calendars, notes, phone reminders'}
        ],
        'Mild Demented': [
            {'category': 'Cognitive', 'tip': 'Structured daily routines with meaningful activities'},
            {'category': 'Physical', 'tip': 'Gentle exercise like walking, tai chi, or water aerobics'},
            {'category': 'Diet', 'tip': 'Focus on nutrient-dense foods; consider nutritional supplements'},
            {'category': 'Safety', 'tip': 'Home safety evaluation and modifications'},
            {'category': 'Caregiver', 'tip': 'Involve family in care planning and daily support'}
        ],
        'Moderate Demented': [
            {'category': 'Care', 'tip': 'Consider professional caregiving support'},
            {'category': 'Safety', 'tip': '24-hour supervision may be necessary'},
            {'category': 'Physical', 'tip': 'Assistive devices for mobility; regular gentle movement'},
            {'category': 'Communication', 'tip': 'Use simple, clear communication techniques'},
            {'category': 'Quality of Life', 'tip': 'Focus on comfort, dignity, and meaningful activities'}
        ]
    }

    ADDITIONAL_RESOURCES = [
        {'type': 'Organization', 'name': 'Alzheimer\'s Association', 'resource': 'Helpline: 800-272-3900'},
        {'type': 'Organization', 'name': 'Alzheimer\'s Foundation', 'resource': 'www.alzfdn.org'},
        {'type': 'Support', 'name': 'Caregiver Support Groups', 'resource': 'Local and online options available'},
        {'type': 'Research', 'name': 'Clinical Trials', 'resource': 'Visit clinicaltrials.gov for participation opportunities'}
    ]

    def generate_recommendations(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate comprehensive recommendations based on analysis results.
        
        Parameters
        ----------
        results : dict
            Complete analysis results
        
        Returns
        -------
        dict with medical, lifestyle, and resource recommendations
        """
        final_stage = results.get('final_stage', {})
        risk_profile = results.get('risk_profile', {})
        
        stage = final_stage.get('stage') or 'Non Demented'
        confidence = final_stage.get('confidence', 0)
        
        medical = self._get_medical_recommendations(stage, confidence, risk_profile)
        lifestyle = self._get_lifestyle_recommendations(stage, risk_profile)
        resources = self._get_resources(stage)
        
        return {
            'stage': stage,
            'confidence': confidence,
            'medical_recommendations': medical,
            'lifestyle_recommendations': lifestyle,
            'resources': resources,
            'summary': self._generate_summary(stage, confidence, medical, lifestyle)
        }

    def _get_medical_recommendations(
        self, 
        stage: str, 
        confidence: float,
        risk_profile: Dict
    ) -> Dict[str, Any]:
        """Generate medical referral recommendations."""
        referrals = self.MEDICAL_REFERRALS.get(stage, self.MEDICAL_REFERRALS['Non Dempted'])
        
        adjusted_referrals = []
        for ref in referrals:
            adjusted = ref.copy()
            if confidence < 60:
                adjusted['note'] = 'Confirm with additional testing'
            adjusted_referrals.append(adjusted)
        
        modifiable_risk = risk_profile.get('modifiable_risk', 0)
        if modifiable_risk > 40:
            adjusted_referrals.append({
                'specialist': 'Lifestyle Medicine Physician',
                'reason': 'Risk factor management and prevention strategies',
                'urgency': 'recommended'
            })
        
        return {
            'referrals': adjusted_referrals,
            'urgency_level': self._get_urgency_level(stage),
            'follow_up': self._get_follow_up_schedule(stage)
        }

    def _get_urgency_level(self, stage: str) -> str:
        """Determine urgency level based on stage."""
        urgency_map = {
            'Non Demented': 'Routine (annual)',
            'Very Mild Demented': '6-12 months',
            'Mild Demented': '3-6 months',
            'Moderate Demented': 'Immediate'
        }
        return urgency_map.get(stage, 'Routine')

    def _get_follow_up_schedule(self, stage: str) -> str:
        """Get recommended follow-up schedule."""
        schedule_map = {
            'Non Demented': 'Annual cognitive screening',
            'Very Mild Demented': 'Every 6-12 months',
            'Mild Demented': 'Every 3-6 months',
            'Moderate Demented': 'As needed, or monthly'
        }
        return schedule_map.get(stage, 'As recommended by physician')

    def _get_lifestyle_recommendations(
        self, 
        stage: str,
        risk_profile: Dict
    ) -> Dict[str, Any]:
        """Generate lifestyle recommendations."""
        base_tips = self.LIFESTYLE_TIPS.get(stage, self.LIFESTYLE_TIPS['Non Demented'])
        
        factor_details = risk_profile.get('factor_details', {})
        prioritized_tips = self._prioritize_by_risk_factors(base_tips, factor_details)
        
        return {
            'tips': prioritized_tips,
            'focus_areas': self._identify_focus_areas(stage, risk_profile),
            'goals': self._set_lifestyle_goals(stage)
        }

    def _prioritize_by_risk_factors(
        self, 
        tips: List[Dict],
        factor_details: Dict
    ) -> List[Dict]:
        """Prioritize lifestyle tips based on identified risk factors."""
        high_risk_factors = [
            k for k, v in factor_details.items() 
            if v.get('risk_score', 0) > 50 and v.get('modifiable', False)
        ]
        
        category_priority = {
            'physical_activity': 'Physical',
            'diet_quality': 'Diet',
            'sleep_quality': 'Sleep',
            'social_engagement': 'Social',
            'smoking': 'Physical',
            'alcohol': 'Diet',
            'hypertension': 'Medical',
            'diabetes': 'Diet',
            'depression': 'Mental Health'
        }
        
        priority_categories = set()
        for factor in high_risk_factors:
            if factor in category_priority:
                priority_categories.add(category_priority[factor])
        
        prioritized = []
        for tip in tips:
            tip_copy = tip.copy()
            if tip['category'] in priority_categories:
                tip_copy['priority'] = 'high'
            else:
                tip_copy['priority'] = 'normal'
            prioritized.append(tip_copy)
        
        prioritized.sort(key=lambda x: 0 if x.get('priority') == 'high' else 1)
        
        return prioritized

    def _identify_focus_areas(
        self, 
        stage: str,
        risk_profile: Dict
    ) -> List[str]:
        """Identify key areas to focus on."""
        focus_areas = []
        
        modifiable = risk_profile.get('modifiable_risk', 0)
        
        if modifiable > 50:
            focus_areas.append('Significant lifestyle modifications needed')
        elif modifiable > 30:
            focus_areas.append('Moderate lifestyle changes recommended')
        
        if stage in ['Mild Demented', 'Moderate Demented']:
            focus_areas.append('Caregiver support and planning')
            focus_areas.append('Safety considerations')
        
        if stage == 'Non Demented':
            focus_areas.append('Prevention and maintenance')
        
        return focus_areas if focus_areas else ['General wellness']

    def _set_lifestyle_goals(self, stage: str) -> List[Dict]:
        """Set achievable lifestyle goals."""
        goals_map = {
            'Non Demented': [
                {'goal': 'Maintain cognitive engagement', 'timeline': 'Ongoing'},
                {'goal': 'Regular exercise routine', 'timeline': 'Weekly'},
                {'goal': 'Social activity participation', 'timeline': 'Weekly'}
            ],
            'Very Mild Demented': [
                {'goal': 'Daily cognitive exercises', 'timeline': 'Daily'},
                {'goal': 'Increase physical activity', 'timeline': 'Within 1 month'},
                {'goal': 'Memory aid implementation', 'timeline': 'Within 2 weeks'}
            ],
            'Mild Demented': [
                {'goal': 'Establish daily routine', 'timeline': 'Within 1 week'},
                {'goal': 'Caregiver training', 'timeline': 'Within 1 month'},
                {'goal': 'Home safety assessment', 'timeline': 'Within 2 weeks'}
            ],
            'Moderate Demented': [
                {'goal': 'Care plan implementation', 'timeline': 'Immediate'},
                {'goal': 'Safety modifications', 'timeline': 'Immediate'},
                {'goal': 'Caregiver support network', 'timeline': 'Immediate'}
            ]
        }
        return goals_map.get(stage, goals_map['Non Demented'])

    def _get_resources(self, stage: str) -> List[Dict]:
        """Get helpful resources."""
        resources = self.ADDITIONAL_RESOURCES.copy()
        
        if stage in ['Mild Demented', 'Moderate Demented']:
            resources.append({
                'type': 'Caregiver',
                'name': 'Caregiver Training Programs',
                'resource': 'Available through local health services'
            })
            resources.append({
                'type': 'Financial',
                'name': 'Medicare/Medicaid Information',
                'resource': 'Coverage for dementia care'
            })
        
        return resources

    def _generate_summary(
        self,
        stage: str,
        confidence: float,
        medical: Dict,
        lifestyle: Dict
    ) -> str:
        """Generate a summary of recommendations."""
        urgency = medical.get('urgency_level', 'Routine')
        
        summary = f"Based on {stage} assessment with {confidence:.0f}% confidence. "
        
        if urgency == 'Immediate':
            summary += "Urgently recommended to seek medical consultation. "
        elif urgency == 'Important':
            summary += "Medical follow-up is important within the near future. "
        else:
            summary += "Routine follow-up recommended. "
        
        focus_areas = lifestyle.get('focus_areas', [])
        if focus_areas:
            summary += f"Primary focus: {', '.join(focus_areas[:2])}."
        
        return summary


_recommendation_service = None


def get_recommendation_service() -> RecommendationService:
    """Get singleton instance of recommendation service."""
    global _recommendation_service
    if _recommendation_service is None:
        _recommendation_service = RecommendationService()
    return _recommendation_service


def generate_recommendations(results: Dict[str, Any]) -> Dict[str, Any]:
    """Convenience function to generate recommendations."""
    return get_recommendation_service().generate_recommendations(results)
