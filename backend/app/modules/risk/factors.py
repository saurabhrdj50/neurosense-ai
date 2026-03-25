from typing import Any, Dict, Callable


FACTOR_CONFIG: Dict[str, Dict[str, Any]] = {
    'age': {
        'category': 'Demographics',
        'label': 'Age',
        'weight': 15,
        'scoring': lambda v: 0 if v < 50 else 20 if v < 60 else 45 if v < 70 else 70 if v < 80 else 95,
    },
    'sex': {
        'category': 'Demographics',
        'label': 'Biological Sex',
        'weight': 5,
        'scoring': lambda v: 60 if str(v).lower() == 'female' else 40,
    },
    'education_years': {
        'category': 'Demographics',
        'label': 'Education Level',
        'weight': 8,
        'scoring': lambda v: 80 if v < 8 else 50 if v < 12 else 25 if v < 16 else 10,
    },
    'physical_activity': {
        'category': 'Lifestyle',
        'label': 'Physical Activity',
        'weight': 8,
        'scoring': lambda v: {'sedentary': 85, 'light': 55, 'moderate': 25, 'active': 5}.get(str(v).lower(), 50),
    },
    'hypertension': {
        'category': 'Medical',
        'label': 'Hypertension',
        'weight': 7,
        'scoring': lambda v: 75 if v else 10,
    },
    'diabetes': {
        'category': 'Medical',
        'label': 'Diabetes',
        'weight': 7,
        'scoring': lambda v: 70 if v else 10,
    },
    'depression': {
        'category': 'Medical',
        'label': 'Depression History',
        'weight': 6,
        'scoring': lambda v: 65 if v else 10,
    },
    'family_history': {
        'category': 'Genetics',
        'label': 'Family History of AD',
        'weight': 8,
        'scoring': lambda v: 80 if v else 10,
    },
    'apoe_e4': {
        'category': 'Genetics',
        'label': 'APOE ε4 Carrier',
        'weight': 10,
        'scoring': lambda v: 90 if str(v).lower() == 'homozygous' else 65 if str(v).lower() in ('heterozygous', 'yes', 'true') else 15 if str(v).lower() in ('no', 'false', 'negative') else 40,
    },
}


MODIFIABLE_FACTORS = {
    'physical_activity', 'hypertension', 'diabetes', 'depression',
}
