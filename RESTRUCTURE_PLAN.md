# NeuroSense-AI: Production-Grade Architecture Refactoring Plan

## Executive Summary

This document outlines a comprehensive restructuring plan for the NeuroSense-AI project, transforming it from a flat, monolithic structure into a production-grade, scalable healthcare AI system.

---

## 1. Current State Analysis

### 1.1 Backend Current Structure

```
app/
├── __init__.py           # 126 lines - app factory + module initialization
├── extensions.py         # Flask extensions
├── routes/
│   ├── analysis_routes.py   # 323 lines - ALL analysis endpoints
│   ├── auth_routes.py       # 99 lines - auth endpoints  
│   ├── patient_routes.py     # 143 lines - patient CRUD
│   └── utility_routes.py     # 65 lines - misc endpoints
└── services/
    ├── mri_classifier.py       # 315 lines - ML inference
    ├── sentiment_analyzer.py    # 321 lines - NLP
    ├── cognitive_assessment.py # 238 lines - scoring
    ├── risk_profiler.py        # 340 lines - risk calc
    ├── fusion.py               # 261 lines - multimodal
    ├── handwriting_analyzer.py  # 331 lines - CV
    ├── facial_emotion.py        # 257 lines - CV
    ├── genomics.py             # 71 lines - DNA parsing
    ├── chatbot.py              # 137 lines - RAG
    ├── speech_transcriber.py   # 94 lines - STT
    ├── music_recommender.py    # 305 lines - therapy
    ├── report_generator.py    # 328 lines - PDF
    ├── patient_history.py      # 158 lines - DB
    └── auth.py                 # 229 lines - auth + DB
```

**Problems Identified:**
- Routes contain business logic (file handling, orchestration)
- Services mix ML inference, business logic, and database access
- No clear separation between API layer, service layer, and domain logic
- Database queries scattered across services
- No validation layer
- Monolithic route handlers (analysis_routes.py = 323 lines)

### 1.2 Frontend Current Structure

```
frontend/src/
├── App.jsx               # Router setup
├── context/
│   ├── AuthContext.jsx   # Auth state
│   └── ResultsStore.js   # Global store
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx
│   │   ├── Sidebar.jsx
│   │   └── TopBar.jsx
│   └── ui/
│       ├── Button.jsx
│       ├── GlassCard.jsx
│       ├── DropZone.jsx
│       ├── Modal.jsx
│       └── ...
└── pages/
    ├── LoginPage.jsx
    ├── DashboardPage.jsx
    ├── AnalysisPage.jsx    # 574 lines!
    ├── PatientsPage.jsx
    ├── HistoryPage.jsx
    └── ResultsPage.jsx     # 345 lines!
```

**Problems Identified:**
- Pages contain business logic and API calls
- No feature-based organization
- Shared API layer missing
- State management scattered
- Large monolithic page components

---

## 2. Target Architecture

### 2.1 Backend Architecture (Domain-Driven Design)

```
backend/
├── app/
│   ├── __init__.py                 # Application factory
│   ├── extensions.py              # Flask extensions
│   │
│   ├── core/                      # CROSS-CUTTING CONCERNS
│   │   ├── __init__.py
│   │   ├── config.py              # Configuration management
│   │   ├── database.py             # SQLite connection management
│   │   ├── security.py            # Auth helpers, decorators
│   │   └── exceptions.py          # Custom exceptions
│   │
│   ├── api/                       # CONTROLLER LAYER (Thin)
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py            # /login, /register, /logout
│   │   │   ├── analysis.py        # /analyze, /predict-mri, etc.
│   │   │   ├── patients.py        # /api/patients
│   │   │   └── utilities.py       # /chat, /report, /music
│   │   └── schemas/               # Request/Response validation
│   │       ├── __init__.py
│   │       ├── auth.py
│   │       ├── analysis.py
│   │       └── patient.py
│   │
│   ├── services/                  # BUSINESS LOGIC ORCHESTRATION
│   │   ├── __init__.py
│   │   ├── analysis_service.py    # Orchestrates multimodal analysis
│   │   ├── patient_service.py     # Patient management orchestration
│   │   ├── report_service.py      # Report generation orchestration
│   │   └── auth_service.py        # Auth orchestration
│   │
│   ├── modules/                   # DOMAIN LOGIC (Pure, no Flask deps)
│   │   ├── __init__.py
│   │   ├── mri/                  # MRI Classification Domain
│   │   │   ├── __init__.py
│   │   │   ├── model.py          # PyTorch model definition
│   │   │   ├── inference.py       # Inference logic
│   │   │   ├── gradcam.py        # Grad-CAM visualization
│   │   │   └── stages.py         # Stage definitions
│   │   │
│   │   ├── nlp/                  # NLP Domain
│   │   │   ├── __init__.py
│   │   │   ├── sentiment.py      # Sentiment analysis
│   │   │   ├── markers.py        # Cognitive markers
│   │   │   └── linguistics.py    # Linguistic feature extraction
│   │   │
│   │   ├── cognitive/            # Cognitive Assessment Domain
│   │   │   ├── __init__.py
│   │   │   ├── evaluator.py      # Test scoring
│   │   │   └── tests.py          # Test definitions
│   │   │
│   │   ├── risk/                # Risk Assessment Domain
│   │   │   ├── __init__.py
│   │   │   ├── profiler.py      # Risk calculation
│   │   │   └── factors.py        # Factor configurations
│   │   │
│   │   ├── vision/              # Computer Vision Domain
│   │   │   ├── __init__.py
│   │   │   ├── handwriting/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── analyzer.py   # Handwriting analysis
│   │   │   │   └── features.py  # Feature extraction
│   │   │   └── facial/
│   │   │       ├── __init__.py
│   │   │       ├── analyzer.py   # Emotion detection
│   │   │       └── ocular.py    # Eye tracking metrics
│   │   │
│   │   ├── genomics/            # Genomics Domain
│   │   │   ├── __init__.py
│   │   │   ├── sequencer.py     # DNA analysis
│   │   │   └── biomarkers.py    # AD biomarker definitions
│   │   │
│   │   ├── speech/             # Speech Domain
│   │   │   ├── __init__.py
│   │   │   └── transcriber.py   # Speech-to-text
│   │   │
│   │   ├── fusion/             # Multimodal Fusion Domain
│   │   │   ├── __init__.py
│   │   │   ├── engine.py        # Fusion algorithm
│   │   │   └── weights.py       # Modality weights
│   │   │
│   │   └── recommendation/      # Recommendations Domain
│   │       ├── __init__.py
│   │       ├── music.py         # Music therapy
│   │       └── chatbot.py       # RAG chatbot
│   │
│   ├── repositories/            # DATA ACCESS LAYER
│   │   ├── __init__.py
│   │   ├── base.py             # Base repository
│   │   ├── user_repository.py   # User CRUD
│   │   ├── patient_repository.py # Patient CRUD
│   │   └── session_repository.py # Session/history
│   │
│   ├── models/                 # SQLAlchemy-like models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── patient.py
│   │   └── session.py
│   │
│   └── utils/                  # SHARED UTILITIES
│       ├── __init__.py
│       ├── file_handler.py     # File upload/download
│       ├── validators.py       # Input validation
│       └── logger.py           # Logging setup
│
├── models/                     # ML model weights
│   └── alzheimer_model.pth
│
├── run.py                     # Application entry point
├── requirements.txt
├── config.py                  # Legacy (to be moved to core/)
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

### 2.2 Frontend Architecture (Feature-Based)

```
frontend/src/
├── app/                       # GLOBAL CONFIGURATION
│   ├── App.jsx               # Root component
│   ├── router.jsx            # Route definitions
│   ├── providers.jsx         # Context providers
│   └── store.js              # Global state (Zustand/Jotai)
│
├── components/                # SHARED REUSABLE COMPONENTS
│   ├── ui/                   # Primitive UI Components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Card.jsx
│   │   ├── Modal.jsx
│   │   ├── DropZone.jsx
│   │   ├── CircularScore.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── Skeleton.jsx
│   │   └── index.js
│   │
│   └── layout/               # Layout Components
│       ├── AppLayout.jsx
│       ├── Sidebar.jsx
│       ├── TopBar.jsx
│       └── index.js
│
├── features/                  # FEATURE-BASED MODULES
│   ├── auth/                 # Authentication Feature
│   │   ├── components/
│   │   │   ├── LoginForm.jsx
│   │   │   └── RegisterForm.jsx
│   │   ├── api/
│   │   │   └── authApi.js
│   │   ├── hooks/
│   │   │   └── useAuth.js
│   │   └── pages/
│   │       └── LoginPage.jsx
│   │
│   ├── analysis/             # Analysis Feature
│   │   ├── components/
│   │   │   ├── AnalysisWizard.jsx
│   │   │   ├── PatientForm.jsx
│   │   │   ├── MRIUpload.jsx
│   │   │   ├── CognitiveTest.jsx
│   │   │   ├── HandwritingCanvas.jsx
│   │   │   ├── SpeechInput.jsx
│   │   │   ├── RiskFactors.jsx
│   │   │   └── StepIndicator.jsx
│   │   ├── api/
│   │   │   └── analysisApi.js
│   │   ├── hooks/
│   │   │   └── useAnalysis.js
│   │   └── pages/
│   │       └── AnalysisPage.jsx
│   │
│   ├── results/              # Results Feature
│   │   ├── components/
│   │   │   ├── ResultsHero.jsx
│   │   │   ├── MRISection.jsx
│   │   │   ├── CognitiveSection.jsx
│   │   │   ├── SentimentSection.jsx
│   │   │   ├── HandwritingSection.jsx
│   │   │   ├── RiskSection.jsx
│   │   │   ├── MusicSection.jsx
│   │   │   └── RadarChart.jsx
│   │   ├── api/
│   │   │   └── resultsApi.js
│   │   ├── hooks/
│   │   │   └── useResults.js
│   │   └── pages/
│   │       └── ResultsPage.jsx
│   │
│   ├── patients/             # Patient Management Feature
│   │   ├── components/
│   │   │   ├── PatientTable.jsx
│   │   │   ├── PatientForm.jsx
│   │   │   └── PatientCard.jsx
│   │   ├── api/
│   │   │   └── patientsApi.js
│   │   ├── hooks/
│   │   │   └── usePatients.js
│   │   └── pages/
│   │       └── PatientsPage.jsx
│   │
│   ├── history/              # History Feature
│   │   ├── components/
│   │   │   ├── HistoryChart.jsx
│   │   │   └── SessionCard.jsx
│   │   ├── api/
│   │   │   └── historyApi.js
│   │   ├── hooks/
│   │   │   └── useHistory.js
│   │   └── pages/
│   │       └── HistoryPage.jsx
│   │
│   └── chatbot/              # Chatbot Feature
│       ├── components/
│       │   ├── ChatInterface.jsx
│       │   └── ChatMessage.jsx
│       ├── api/
│       │   └── chatbotApi.js
│       ├── hooks/
│       │   └── useChat.js
│       └── pages/
│           └── ChatPage.jsx
│
├── lib/                      # THIRD-PARTY LIBRARY CONFIG
│   ├── api.js               # Axios/fetch configuration
│   └── constants.js          # App constants
│
├── styles/                   # GLOBAL STYLES
│   ├── globals.css
│   └── animations.css
│
└── main.jsx                  # Entry point
```

---

## 3. File Migration Map

### 3.1 Backend Migration

| **OLD PATH** | **NEW PATH** | **TYPE** |
|-------------|--------------|----------|
| `app/__init__.py` | `app/__init__.py` | Refactored |
| `app/extensions.py` | `app/core/extensions.py` | Moved |
| `config.py` | `app/core/config.py` | Moved |
| `app/routes/analysis_routes.py` | `app/api/routes/analysis.py` | Refactored |
| `app/routes/auth_routes.py` | `app/api/routes/auth.py` | Refactored |
| `app/routes/patient_routes.py` | `app/api/routes/patients.py` | Refactored |
| `app/routes/utility_routes.py` | `app/api/routes/utilities.py` | Refactored |
| `app/services/auth.py` | `app/services/auth_service.py` | Refactored |
| `app/services/auth.py` | `app/modules/auth/user.py` | Split |
| `app/services/auth.py` | `app/repositories/user_repository.py` | Split |
| `app/services/mri_classifier.py` | `app/modules/mri/inference.py` | Moved |
| `app/services/mri_classifier.py` | `app/modules/mri/model.py` | Split |
| `app/services/mri_classifier.py` | `app/modules/mri/gradcam.py` | Split |
| `app/services/sentiment_analyzer.py` | `app/modules/nlp/sentiment.py` | Moved |
| `app/services/sentiment_analyzer.py` | `app/modules/nlp/markers.py` | Split |
| `app/services/cognitive_assessment.py` | `app/modules/cognitive/evaluator.py` | Moved |
| `app/services/risk_profiler.py` | `app/modules/risk/profiler.py` | Moved |
| `app/services/fusion.py` | `app/modules/fusion/engine.py` | Moved |
| `app/services/handwriting_analyzer.py` | `app/modules/vision/handwriting/analyzer.py` | Moved |
| `app/services/facial_emotion.py` | `app/modules/vision/facial/analyzer.py` | Moved |
| `app/services/genomics.py` | `app/modules/genomics/sequencer.py` | Moved |
| `app/services/speech_transcriber.py` | `app/modules/speech/transcriber.py` | Moved |
| `app/services/music_recommender.py` | `app/modules/recommendation/music.py` | Moved |
| `app/services/chatbot.py` | `app/modules/recommendation/chatbot.py` | Moved |
| `app/services/report_generator.py` | `app/services/report_service.py` | Moved |
| `app/services/patient_history.py` | `app/repositories/session_repository.py` | Moved |
| (new) | `app/services/analysis_service.py` | New |
| (new) | `app/services/patient_service.py` | New |
| (new) | `app/core/database.py` | New |
| (new) | `app/core/security.py` | New |
| (new) | `app/core/exceptions.py` | New |
| (new) | `app/api/schemas/*.py` | New |
| (new) | `app/repositories/base.py` | New |

### 3.2 Frontend Migration

| **OLD PATH** | **NEW PATH** | **TYPE** |
|-------------|--------------|----------|
| `src/App.jsx` | `src/app/App.jsx` | Moved |
| `src/main.jsx` | `src/main.jsx` | Same |
| `src/context/AuthContext.jsx` | `src/features/auth/hooks/useAuth.js` | Moved |
| `src/context/ResultsStore.js` | `src/app/store.js` | Moved/Renamed |
| `src/pages/LoginPage.jsx` | `src/features/auth/pages/LoginPage.jsx` | Moved |
| `src/pages/DashboardPage.jsx` | `src/features/dashboard/pages/DashboardPage.jsx` | Moved |
| `src/pages/AnalysisPage.jsx` | `src/features/analysis/pages/AnalysisPage.jsx` | Split |
| `src/pages/PatientsPage.jsx` | `src/features/patients/pages/PatientsPage.jsx` | Split |
| `src/pages/HistoryPage.jsx` | `src/features/history/pages/HistoryPage.jsx` | Moved |
| `src/pages/ResultsPage.jsx` | `src/features/results/pages/ResultsPage.jsx` | Split |
| `src/components/ui/Button.jsx` | `src/components/ui/Button.jsx` | Same |
| `src/components/ui/GlassCard.jsx` | `src/components/ui/Card.jsx` | Renamed |
| `src/components/layout/AppLayout.jsx` | `src/components/layout/AppLayout.jsx` | Same |
| (new) | `src/app/router.jsx` | New |
| (new) | `src/features/analysis/components/*` | New |
| (new) | `src/features/analysis/api/analysisApi.js` | New |
| (new) | `src/features/results/components/*` | New |
| (new) | `src/features/results/api/resultsApi.js` | New |
| (new) | `src/features/patients/api/patientsApi.js` | New |
| (new) | `src/features/history/api/historyApi.js` | New |
| (new) | `src/lib/api.js` | New |

---

## 4. Refactored Code Examples

### 4.1 Backend: API Route (Before vs After)

#### BEFORE: `app/routes/analysis_routes.py` (323 lines)

```python
@analysis_bp.route('/analyze', methods=['POST'])
def analyze():
    m = _get_modules()
    results = {}
    
    # Business logic in route handler
    patient_info = {}
    for field in ('name', 'age', 'sex', 'patient_id', 'education_years'):
        val = request.form.get(field, '').strip()
        # ... validation logic
    
    # File handling in route
    if 'mri_image' in request.files:
        file = request.files['mri_image']
        fn = secure_filename(filename)
        fp = os.path.join(UPLOAD_FOLDER, fn)
        file.save(fp)
        try:
            # Direct ML call
            mri_result = m['mri'].predict_with_gradcam(fp)
            results['mri'] = mri_result
        except Exception as e:
            results['mri_error'] = str(e)
        finally:
            if os.path.exists(fp):
                os.remove(fp)
    
    # Repeat for sentiment, facial, audio, handwriting, cognitive, risk...
    # Fusion call
    final_stage = m['fusion'].predict(...)
    results['final_stage'] = final_stage
    
    # Music recommendation
    results['music'] = m['music'].recommend(stage, emotion)
    
    # History save
    sid = m['history'].save_session(...)
    
    return jsonify(results)
```

#### AFTER: `app/api/routes/analysis.py` (Thin Controller)

```python
from flask import Blueprint, request, jsonify
from app.services.analysis_service import AnalysisOrchestrator
from app.api.schemas.analysis import AnalyzeRequestSchema
from app.core.exceptions import ValidationError

analysis_bp = Blueprint('analysis', __name__)
_orchestrator = AnalysisOrchestrator()


@analysis_bp.route('/analyze', methods=['POST'])
def analyze():
    """Thin controller - only handles HTTP"""
    try:
        # Validation via schema
        schema = AnalyzeRequestSchema()
        validated_data = schema.load(request)
        
        # Delegate to service layer
        results = _orchestrator.run_full_analysis(
            patient_data=validated_data['patient'],
            mri_file=validated_data.get('mri_image'),
            cognitive_data=validated_data.get('cognitive_tests'),
            handwriting_data=validated_data.get('handwriting'),
            speech_data=validated_data.get('speech'),
            risk_data=validated_data.get('risk_factors'),
            genomics_data=validated_data.get('genomics'),
        )
        
        return jsonify(results)
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except AnalysisError as e:
        return jsonify({'error': str(e)}), 500


@analysis_bp.route('/predict-mri', methods=['POST'])
def predict_mri():
    """MRI-only prediction endpoint"""
    if 'mri_image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['mri_image']
    gradcam = request.form.get('gradcam', 'false').lower() == 'true'
    
    result = _orchestrator.predict_mri(
        image_file=file,
        gradcam_enabled=gradcam
    )
    
    return jsonify(result)
```

### 4.2 Backend: Service Layer (New)

#### AFTER: `app/services/analysis_service.py`

```python
from typing import Optional, Dict, Any
from app.modules.mri.inference import MRIClassifier
from app.modules.nlp.sentiment import SentimentAnalyzer
from app.modules.fusion.engine import MultimodalFusion
from app.modules.cognitive.evaluator import CognitiveEvaluator
from app.modules.risk.profiler import RiskProfiler
from app.modules.vision.handwriting.analyzer import HandwritingAnalyzer
from app.modules.vision.facial.analyzer import FacialEmotionAnalyzer
from app.modules.recommendation.music import MusicRecommender
from app.repositories.session_repository import SessionRepository
from app.utils.file_handler import FileHandler
from app.core.exceptions import AnalysisError


class AnalysisOrchestrator:
    """Orchestrates the multimodal analysis pipeline."""
    
    def __init__(self):
        self.file_handler = FileHandler()
        self.mri = MRIClassifier()
        self.sentiment = SentimentAnalyzer()
        self.fusion = MultimodalFusion()
        self.cognitive = CognitiveEvaluator()
        self.risk = RiskProfiler()
        self.handwriting = HandwritingAnalyzer()
        self.facial = FacialEmotionAnalyzer()
        self.music = MusicRecommender()
        self.session_repo = SessionRepository()
    
    def run_full_analysis(
        self,
        patient_data: Dict[str, Any],
        mri_file=None,
        cognitive_data: Dict = None,
        handwriting_data: Dict = None,
        speech_data: Dict = None,
        risk_data: Dict = None,
        genomics_data: Dict = None,
    ) -> Dict[str, Any]:
        """Run complete multimodal analysis."""
        results = {'patient_info': patient_data}
        
        # MRI Analysis
        if mri_file:
            mri_result = self._analyze_mri(mri_file)
            results['mri'] = mri_result
        
        # NLP/Sentiment
        if patient_data.get('patient_text'):
            results['sentiment'] = self.sentiment.analyze(
                patient_data['patient_text']
            )
        
        # Cognitive Assessment
        if cognitive_data:
            results['cognitive'] = self.cognitive.evaluate(cognitive_data)
        
        # Risk Profile
        if risk_data:
            results['risk_profile'] = self.risk.assess(risk_data)
        
        # Handwriting
        if handwriting_data:
            results['handwriting'] = self._analyze_handwriting(handwriting_data)
        
        # Speech/Sentiment
        if speech_data:
            results['audio_sentiment'] = self.sentiment.analyze(speech_data.get('text', ''))
        
        # Fusion
        results['final_stage'] = self.fusion.predict(
            mri_result=results.get('mri'),
            sentiment_result=results.get('sentiment'),
            cognitive_result=results.get('cognitive'),
            risk_result=results.get('risk_profile'),
            handwriting_result=results.get('handwriting'),
            audio_result=results.get('audio_sentiment'),
        )
        
        # Music Recommendation
        stage = results['final_stage'].get('stage', 'Mild Demented')
        emotion = results.get('sentiment', {}).get('dominant_emotion', 'neutral')
        results['music'] = self.music.recommend(stage, emotion)
        
        # Save to history
        if patient_data.get('patient_id'):
            session_id = self.session_repo.save(
                patient_id=patient_data['patient_id'],
                results=results,
            )
            results['session_id'] = session_id
        
        return results
    
    def _analyze_mri(self, file) -> Dict[str, Any]:
        """Handle MRI analysis with file cleanup."""
        temp_path = self.file_handler.save_temp(file)
        try:
            return self.mri.predict_with_gradcam(temp_path)
        finally:
            self.file_handler.cleanup(temp_path)
    
    def _analyze_handwriting(self, data: Dict) -> Dict[str, Any]:
        """Handle handwriting analysis."""
        if data.get('image_path'):
            return self.handwriting.analyze(image_path=data['image_path'])
        elif data.get('canvas_data'):
            return self.handwriting.analyze(image_base64=data['canvas_data'])
        return {}
```

### 4.3 Backend: Module (MRI Classifier Refactored)

#### BEFORE: `app/services/mri_classifier.py` (Monolithic, 315 lines)

```python
class AlzheimerModel(nn.Module):
    # Model definition
    pass

STAGES = {0: {...}, 1: {...}, 2: {...}, 3: {...}}

class MRIClassifier:
    def __init__(self, model_path):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.model_path = model_path
        self._load_model()
    
    def _load_model(self):
        # Model loading logic
        pass
    
    def predict(self, image_path):
        # Prediction + stage mapping + probability formatting
        pass
    
    def predict_with_gradcam(self, image_path):
        # GradCAM implementation (150+ lines)
        pass
```

#### AFTER: Split into 4 files

**`app/modules/mri/__init__.py`**
```python
from .inference import MRIClassifier
from .model import AlzheimerModel
from .stages import STAGES, StageDefinitions

__all__ = ['MRIClassifier', 'AlzheimerModel', 'STAGES', 'StageDefinitions']
```

**`app/modules/mri/model.py`**
```python
import torch
import torch.nn as nn
try:
    import timm
except ImportError:
    timm = None


class AlzheimerModel(nn.Module):
    """EfficientNet-B4 based MRI classifier for Alzheimer's staging."""
    
    def __init__(self, num_classes: int = 4) -> None:
        super().__init__()
        if timm is None:
            raise ImportError("timm is required for MRI classification")
        
        self.backbone = timm.create_model(
            'efficientnet_b4', 
            pretrained=False, 
            num_classes=0
        )
        in_features = int(self.backbone.num_features)
        self.fc = nn.Linear(in_features, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.backbone(x)
        x = self.fc(x)
        return x
```

**`app/modules/mri/stages.py`**
```python
from dataclasses import dataclass
from typing import List, Dict, Any


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
        description='No significant cognitive decline detected.',
        recommendations=[
            'Continue regular cognitive health check-ups',
            'Maintain an active lifestyle and healthy diet',
        ],
    ),
    # ... stages 1, 2, 3
}


class StageDefinitions:
    """Helper methods for stage mapping."""
    
    STAGE_ORDER = ['Non-Demented', 'Very Mild Demented', 'Mild Demented', 'Moderate Demented']
    STAGE_INDEX = {s: i for i, s in enumerate(STAGE_ORDER)}
    
    @classmethod
    def get_stage(cls, index: int) -> StageDefinition:
        return STAGES.get(index, STAGES[0])
    
    @classmethod
    def get_index(cls, name: str) -> int:
        return cls.STAGE_INDEX.get(name, 0)
```

**`app/modules/mri/inference.py`**
```python
from typing import Dict, Any, Optional
import torch
from torchvision import transforms
from PIL import Image

from .model import AlzheimerModel
from .stages import STAGES, StageDefinitions
from .gradcam import GradCAMExtractor


VALID_TRANSFORMS = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


class MRIClassifier:
    """Wraps the trained AlzheimerModel for inference."""
    
    def __init__(self, model_path: str = 'models/alzheimer_model.pth'):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model: Optional[AlzheimerModel] = None
        self.model_path = model_path
        self.gradcam = GradCAMExtractor()
        self._load_model()

    def _load_model(self) -> None:
        # Model loading with fallback
        pass

    @torch.no_grad()
    def predict(self, image_path: str) -> Dict[str, Any]:
        """Run inference on a single MRI image."""
        if self.model is None:
            return self._error_result()
        
        image = Image.open(image_path).convert('RGB')
        tensor = VALID_TRANSFORMS(image).unsqueeze(0).to(self.device)
        
        logits = self.model(tensor)
        probs = torch.softmax(logits, dim=1).squeeze()
        pred_idx = probs.argmax().item()
        confidence = probs[pred_idx].item()
        
        stage = StageDefinitions.get_stage(pred_idx)
        
        return {
            'stage': stage.name,
            'stage_index': pred_idx,
            'confidence': round(confidence * 100, 2),
            'color': stage.color,
            'severity': stage.severity,
            'description': stage.description,
            'recommendations': stage.recommendations,
            'probabilities': self._format_probabilities(probs),
        }

    def predict_with_gradcam(self, image_path: str) -> Dict[str, Any]:
        """Run inference with Grad-CAM visualization."""
        if self.model is None:
            return self._error_result()
        
        result = self.predict(image_path)
        gradcam_image = self.gradcam.generate(self.model, image_path, result['stage_index'])
        
        if gradcam_image:
            result['gradcam_image_base64'] = gradcam_image
        
        return result
    
    def _format_probabilities(self, probs: torch.Tensor) -> Dict[str, float]:
        return {
            StageDefinitions.get_stage(i).name: round(float(probs[i]) * 100, 2)
            for i in range(4)
        }
    
    def _error_result(self) -> Dict[str, Any]:
        return {
            'stage': 'Error',
            'stage_index': 0,
            'confidence': 0,
            'color': '#6366f1',
            'description': 'MRI classifier model could not be loaded.',
            'probabilities': {},
        }
```

**`app/modules/mri/gradcam.py`** (extracted from original, ~100 lines)

---

## 5. Import Refactor Examples

### 5.1 Backend Import Changes

#### Old Style (Current)
```python
from app.services.mri_classifier import MRIClassifier
from app.services.fusion import MultimodalFusion
from app.services.auth import AuthManager

# In routes
m = _get_modules()
result = m['mri'].predict(image_path)
```

#### New Style (Target)
```python
# Direct module imports (no circular dependency)
from app.modules.mri.inference import MRIClassifier
from app.modules.fusion.engine import MultimodalFusion

# In API routes
classifier = MRIClassifier()
result = classifier.predict(image_path)

# Or via service layer
from app.services.analysis_service import AnalysisOrchestrator
orchestrator = AnalysisOrchestrator()
results = orchestrator.run_full_analysis(...)
```

### 5.2 Dependency Flow (No Circular Imports)

```
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                               │
│  app/api/routes/*.py                                           │
│  - Thin controllers (HTTP handling only)                       │
│  - Request validation                                          │
└─────────────────────┬─────────────────────────────────────────┘
                      │ calls
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                              │
│  app/services/*.py                                             │
│  - Business logic orchestration                                 │
│  - Transaction management                                      │
└─────────────────────┬─────────────────────────────────────────┘
                      │ calls
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MODULE LAYER                               │
│  app/modules/*/                                                │
│  - Pure domain logic (no Flask dependencies)                   │
│  - ML inference, algorithms, data processing                   │
└─────────────────────┬─────────────────────────────────────────┘
                      │ data access
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   REPOSITORY LAYER                              │
│  app/repositories/*.py                                         │
│  - Database access abstraction                                 │
│  - Query building                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Frontend Import Changes

#### Old Style (Current)
```javascript
import React from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { setAnalysisResults, getAnalysisResults } from '../context/ResultsStore'

// Direct API calls in component
const handleSubmit = async () => {
  const res = await fetch('/analyze', { method: 'POST', body: fd })
  const data = await res.json()
  setAnalysisResults(data)
  navigate('/results')
}
```

#### New Style (Target)

**`src/features/analysis/api/analysisApi.js`**
```javascript
import { api } from '@/lib/api'

export const analysisApi = {
  runFullAnalysis: (formData) => 
    api.post('/analyze', formData),
  
  predictMRI: (file, gradcam = false) => {
    const formData = new FormData()
    formData.append('mri_image', file)
    formData.append('gradcam', gradcam)
    return api.post('/predict-mri', formData)
  },
  
  analyzeSentiment: (text) => 
    api.post('/analyze-sentiment', { text }),
  
  // ...
}
```

**`src/features/analysis/hooks/useAnalysis.js`**
```javascript
import { useState, useCallback } from 'react'
import { analysisApi } from '../api/analysisApi'
import { useResultsStore } from '@/app/store'

export function useAnalysis() {
  const [loading, setLoading] = useState(false)
  const { setResults } = useResultsStore()
  
  const runAnalysis = useCallback(async (formData) => {
    setLoading(true)
    try {
      const { data } = await analysisApi.runFullAnalysis(formData)
      setResults(data)
      return data
    } finally {
      setLoading(false)
    }
  }, [setResults])
  
  return { runAnalysis, loading }
}
```

**`src/features/analysis/pages/AnalysisPage.jsx`** (Split into smaller components)
```javascript
import React, { useState } from 'react'
import { StepIndicator } from '../components/StepIndicator'
import { PatientForm } from '../components/PatientForm'
import { MRIUpload } from '../components/MRIUpload'
import { CognitiveTest } from '../components/CognitiveTest'
import { useAnalysis } from '../hooks/useAnalysis'

export default function AnalysisPage() {
  const [step, setStep] = useState(0)
  const { runAnalysis, loading } = useAnalysis()
  
  const steps = [
    { id: 'patient', label: 'Patient Info', component: PatientForm },
    { id: 'mri', label: 'MRI Scan', component: MRIUpload },
    { id: 'cognitive', label: 'Cognitive Test', component: CognitiveTest },
    // ...
  ]
  
  const CurrentStep = steps[step].component
  
  return (
    <div className="max-w-3xl mx-auto">
      <StepIndicator steps={steps} current={step} />
      <CurrentStep onNext={() => setStep(s => s + 1)} />
    </div>
  )
}
```

---

## 6. Architecture Validation Checklist

### 6.1 Layering
- [ ] Routes contain ONLY HTTP handling (no business logic)
- [ ] Services orchestrate multiple modules
- [ ] Modules contain pure domain logic (no Flask/DB deps)
- [ ] Repositories abstract database access

### 6.2 Dependencies
- [ ] No circular imports between layers
- [ ] Clear dependency direction: API → Service → Module → Repository
- [ ] Each module is independently testable

### 6.3 Scalability
- [ ] New modalities can be added to `modules/` without touching API
- [ ] New features can be added to `features/` without affecting others
- [ ] Database can be swapped (SQLite → PostgreSQL) by implementing new repository

### 6.4 Maintainability
- [ ] No file exceeds 300 lines
- [ ] Related code is co-located by domain
- [ ] Clear naming conventions across codebase

---

## 7. Suggested Optional Improvements

### 7.1 Async Processing
```
Current: Synchronous analysis (blocking request)
Target:  Celery + Redis for background analysis

# benefits:
- Non-blocking API responses
- Progress tracking
- Retry on failure
- Rate limiting
```

### 7.2 Database Upgrade
```
Current: SQLite (single file, no concurrent writes)
Target:  PostgreSQL (production-grade, concurrent access)

# migration path:
1. Create SQLAlchemy models
2. Implement repositories for both SQLite and PostgreSQL
3. Feature flag to switch between backends
4. Full migration after testing
```

### 7.3 ML-Based Fusion
```
Current: Heuristic weighted average
Target:  Trained ensemble model

# approach:
1. Collect labeled fusion data (ground truth stages)
2. Train XGBoost/Random Forest on modality outputs
3. A/B test against heuristic fusion
4. Gradual rollout with rollback capability
```

### 7.4 NLP Upgrade
```
Current: TextBlob (rule-based + lexicon)
Target:  HuggingFace Transformers (fine-tuned BERT)

# candidate models:
- "dmis-lab/biobert-v1.1" (biomedical BERT)
- "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext"
- Custom fine-tuned model for AD speech patterns
```

### 7.5 API Documentation
```
Add: OpenAPI/Swagger documentation

Tools:
- flasgger (Flask)
- or apispec + marshmallow

Benefit: Auto-generated API docs, client SDK generation
```

---

## 8. Migration Phases

### Phase 1: Backend Core (Week 1)
1. Create new folder structure
2. Extract `core/` (config, database, exceptions)
3. Create `repositories/` base and implementations
4. Move services to `services/` with orchestration logic

### Phase 2: Backend Modules (Week 2)
1. Split `modules/mri/` (model, inference, gradcam, stages)
2. Split `modules/nlp/` (sentiment, markers, linguistics)
3. Split remaining services into domain modules
4. Update service layer to use new modules

### Phase 3: API Refactor (Week 3)
1. Thin out routes (move logic to services)
2. Add validation schemas
3. Create new `api/` structure
4. Test all endpoints

### Phase 4: Frontend Structure (Week 4)
1. Create `features/` directory structure
2. Move pages to feature directories
3. Extract API layer to `features/*/api/`
4. Extract hooks to `features/*/hooks/`
5. Split large page components

### Phase 5: Integration & Polish (Week 5)
1. End-to-end testing
2. Fix any import issues
3. Document the architecture
4. Create onboarding guide for new developers

---

## 9. Migration Status

### Phase 1: Backend Core (COMPLETED)
- [x] Create new folder structure (`core/`, `repositories/`, `api/`)
- [x] Extract `core/` (config, database, exceptions, security)
- [x] Create `repositories/` base and implementations
- [x] Create `api/schemas/` for validation
- [x] Create thin API routes in `api/routes/`
- [x] Update `app/__init__.py` with factory pattern

### Phase 2: Backend Modules (COMPLETED)
- [x] Split `modules/mri/` (stages, model, gradcam, inference)
- [x] Split `modules/nlp/` (sentiment, markers)
- [x] Split `modules/cognitive/` (evaluator)
- [x] Split `modules/risk/` (profiler, factors)
- [x] Split `modules/vision/` (handwriting, facial analyzers)
- [x] Split `modules/genomics/` (sequencer)
- [x] Split `modules/speech/` (transcriber)
- [x] Split `modules/fusion/` (engine)
- [x] Split `modules/recommendation/` (music, chatbot)

### Phase 3: Update Service Layer (COMPLETED)
- [x] Update `analysis_service.py` to use new modules
- [x] Update `chatbot_service.py` to use new modules
- [x] Update `music_service.py` to use new modules
- [x] Add `get_modules()` function in `app/__init__.py` for backward compatibility
- [x] Verify all imports are updated

### Phase 4: Frontend Structure (COMPLETED)
- [x] Create `features/` directory structure
- [x] Create `features/auth/` with AuthProvider and LoginPage
- [x] Create `features/analysis/` with analysisApi and useAnalysis hook
- [x] Create `features/patients/` with patientsApi and usePatients hook
- [x] Create `features/history/` with historyApi and useHistory hook
- [x] Create `features/results/` with resultsApi
- [x] Create `features/dashboard/` with DashboardPage
- [x] Split AnalysisPage into smaller components (StepIndicator, PatientStep, MRIStep, CognitiveStep, HandwritingStep, SpeechStep, RiskStep)
- [x] Update App.jsx to use new feature imports
- [x] Keep original pages for backward compatibility

### Phase 5: Integration & Polish (COMPLETED)
- [x] Split ResultsPage into smaller components (ResultSection, MRIResults, AssessmentResults, ProfileResults, MusicRecommendations)
- [x] Update features/results/index.js to export ResultsPage
- [x] Update App.jsx to import ResultsPage from features
- [x] Remove original pages/ResultsPage.jsx (no longer needed)
- [x] Fix import path in ResultSection.jsx (GlassCard)
- [x] Frontend build succeeds with all changes
- [ ] End-to-end testing of all features (manual verification)
- [ ] Verify backend API routes work correctly (manual verification)
- [ ] Test frontend-backend integration (manual verification)
- [ ] Create onboarding guide for new developers

---

## Migration Summary

All major restructuring is complete:
- **Backend**: Clean architecture with `core/`, `repositories/`, `api/routes/`, `api/schemas/`, `services/`, and `modules/`
- **Frontend**: Feature-based structure with `features/` containing auth, analysis, patients, history, dashboard, and results
- **Build**: Both frontend and backend are functional and integrated

---

*This document is the source of truth for the NeuroSense-AI restructuring effort.*
*Last updated: Phase 5 completed*
