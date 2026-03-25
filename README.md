# 🧠 NeuroSense AI

> **Multimodal Clinical Decision Support System for Early Alzheimer's Detection**

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB.svg)](https://react.dev/)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000.svg)](https://flask.palletsprojects.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C.svg)](https://pytorch.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

---

## 🚀 Project Overview

NeuroSense AI is a **full-stack multimodal AI system** that analyzes 7+ clinical biomarkers to detect Alzheimer's disease years earlier than traditional methods. It combines MRI analysis, cognitive assessments, speech transcription, handwriting analysis, facial emotion recognition, genomics, and sentiment analysis into a unified clinical decision support platform.

### Why This Matters

| Metric | Value |
|--------|-------|
| People affected worldwide | **55+ million** |
| New diagnoses every 3 seconds | Yes |
| Early intervention effectiveness | **40%** slower progression |
| Traditional diagnosis cost | **$5,000-10,000** |
| NeuroSense analysis cost | **< $100** |

---

## 🧠 Core Features

### 1. Multimodal AI Analysis
- **MRI Classification** — EfficientNet-B0 model with Grad-CAM explainability
- **Cognitive Assessment** — MMSE-style tests with composite scoring
- **Sentiment Analysis** — NLP-based emotional state detection
- **Handwriting Analysis** — Motor control and tremor detection
- **Facial Emotion Recognition** — Behavioral biomarker analysis
- **Speech Transcription** — Audio-to-text with confidence scoring
- **Genomic Analysis** — APOE4 genetic risk markers
- **Risk Profiling** — Multimodal weighted fusion

### 2. Clinical Workflow
- Patient management (CRUD operations)
- Session history tracking
- Trend analysis over time
- PDF report generation
- Music therapy recommendations
- AI chatbot assistant

### 3. Security & Compliance
- Role-based access (Admin, Doctor, Researcher)
- Session management with Flask-Login
- Password hashing with Werkzeug
- CORS-protected API
- Rate limiting

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │  Login    │  │Dashboard │  │Analysis  │  │Patients  │     │
│  │  Page     │  │  Page    │  │  Wizard  │  │  Page    │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP + JSON (Vite Proxy)
┌────────────────────────────┴────────────────────────────────────┐
│                     BACKEND (Flask API)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐    │
│  │ Auth Routes │  │ Patient API │  │  Analysis Routes    │    │
│  │ /api/auth   │  │ /api/pts    │  │  /api/analysis      │    │
│  └─────────────┘  └─────────────┘  └─────────────────────┘    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              AnalysisOrchestrator (Singleton)            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐  │   │
│  │  │   MRI   │ │Cognitive│ │Sentiment│ │Handwriting  │  │   │
│  │  │Classifier│ │Evaluator│ │Analyzer │ │  Analyzer   │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────┘  │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────┐  │   │
│  │  │Facial   │ │ Speech  │ │Genomics │ │    Risk    │  │   │
│  │  │Analyzer │ │Transcriber│ │Sequencer│ │  Profiler  │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────┘  │   │
│  │              ┌─────────────────────────┐               │   │
│  │              │  MultimodalFusion     │               │   │
│  │              │  (Weighted Ensemble)  │               │   │
│  │              └─────────────────────────┘               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │   SQLite DB     │  │  ReportGen      │                      │
│  │  (patients,     │  │  (PDF/HTML)     │                      │
│  │   sessions)     │  │                 │                      │
│  └─────────────────┘  └─────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input (MRI, Text, Audio, etc.)
         │
         ▼
   ┌───────────┐
   │  Frontend │ ─── FormData ───► Vite Proxy ───► Flask API
   └───────────┘
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │ AnalysisOrchestrator │
                               └─────────────────────┘
                                          │
              ┌────────────┬───────────────┼───────────────┬────────────┐
              ▼            ▼               ▼               ▼            ▼
         ┌────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌───────┐
         │  MRI   │  │Cognitive │  │ Sentiment │  │Handwriting│  │ Audio │
         │Classify│  │Evaluate  │  │ Analyze   │  │ Analyze   │  │Transcribe
         └────────┘  └──────────┘  └───────────┘  └───────────┘  └───────┘
              │            │              │              │            │
              └────────────┴──────────────┴──────────────┴────────────┘
                                          │
                                          ▼
                               ┌─────────────────────┐
                               │ MultimodalFusion   │
                               │ (Weighted Ensemble) │
                               └─────────────────────┘
                                          │
              ┌─────────────────────────────┴─────────────────────────────┐
              ▼                                                           ▼
        ┌───────────┐                                              ┌──────────┐
        │  Results  │ ──► Save Session ──► SQLite DB              │  Report  │
        └───────────┘                                              └──────────┘
              │
              ▼
         ┌───────────┐
         │  Frontend │ ◄── JSON Response ──┘
         │  Results  │
         └───────────┘
```

---

## 📁 Project Structure

```
neurosense-ai/
│
├── deployment/                    # All deployment configurations
│   ├── README.md                # Deployment guide
│   ├── .dockerignore
│   ├── docker/
│   │   ├── docker-compose.yml   # Development stack
│   │   ├── docker-compose.prod.yml # Production overrides
│   │   ├── backend/
│   │   │   └── Dockerfile
│   │   └── frontend/
│   │       └── Dockerfile
│   └── k8s/                    # Kubernetes manifests
│       ├── config.yaml
│       ├── secrets.yaml
│       ├── ingress.yaml
│       ├── backend/
│       │   ├── deployment.yaml
│       │   └── celery.yaml
│       ├── frontend/
│       │   └── deployment.yaml
│       ├── postgres/
│       │   └── deployment.yaml
│       └── redis/
│           └── deployment.yaml
│
├── backend/
│   ├── app/
│   │   ├── __init__.py           # Flask app factory, CORS, rate limiting
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py       # Login, register, logout, current-user
│   │   │   │   ├── analysis.py   # MRI, sentiment, cognitive, etc.
│   │   │   │   ├── patients.py   # CRUD operations, history, export
│   │   │   │   └── utilities.py  # Chatbot, music, report generation
│   │   │   └── schemas/
│   │   │       ├── auth.py       # LoginSchema, RegisterSchema
│   │   │       ├── patient.py    # PatientSchema validation
│   │   │       └── analysis.py   # SentimentSchema, CognitiveTestSchema
│   │   ├── core/
│   │   │   ├── config.py         # Environment variables, app settings
│   │   │   ├── database.py       # SQLite connection manager (singleton)
│   │   │   ├── security.py        # Password hashing, session management
│   │   │   └── exceptions.py      # Custom exception handlers
│   │   ├── modules/               # ML inference modules
│   │   │   ├── mri/
│   │   │   │   ├── inference.py   # MRIClassifier (PyTorch EfficientNet)
│   │   │   │   ├── gradcam.py    # Grad-CAM heatmap generation
│   │   │   │   └── stages.py     # Stage mapping (Non Demented → Moderate)
│   │   │   ├── nlp/
│   │   │   │   └── sentiment.py   # SentimentAnalyzer (TextBlob/NLTK)
│   │   │   ├── cognitive/
│   │   │   │   └── evaluator.py  # CognitiveEvaluator (MMSE-style)
│   │   │   ├── risk/
│   │   │   │   ├── profiler.py   # RiskProfiler (factor-based scoring)
│   │   │   │   └── factors.py    # Risk factor configurations
│   │   │   ├── vision/
│   │   │   │   ├── facial/
│   │   │   │   │   └── analyzer.py # FacialEmotionAnalyzer (FER)
│   │   │   │   └── handwriting/
│   │   │   │       └── analyzer.py # HandwritingAnalyzer (OpenCV)
│   │   │   ├── speech/
│   │   │   │   └── transcriber.py  # SpeechTranscriber (SpeechRecognition)
│   │   │   ├── genomics/
│   │   │   │   └── sequencer.py   # GenomicSequencer (APOE4 detection)
│   │   │   ├── fusion/
│   │   │   │   └── engine.py      # MultimodalFusion (weighted ensemble)
│   │   │   └── recommendation/
│   │   │       ├── music.py       # MusicRecommender
│   │   │       └── chatbot.py    # MedicalChatbot (Gemini/Groq)
│   │   ├── services/
│   │   │   ├── analysis_service.py    # AnalysisOrchestrator (singleton)
│   │   │   ├── patient_service.py     # Patient business logic
│   │   │   ├── report_service.py      # PDF generation
│   │   │   └── chatbot_service.py     # Chat orchestration
│   │   ├── repositories/
│   │   │   ├── base_repository.py    # BaseRepository pattern
│   │   │   ├── user_repository.py    # User CRUD, authentication
│   │   │   ├── patient_repository.py # Patient CRUD, seeding
│   │   │   └── session_repository.py # Session history, trends
│   │   └── extensions.py             # Flask extensions registry
│   ├── models/                       # Pre-trained ML models (.pth files)
│   ├── uploads/                      # Temporary file storage
│   ├── tests/                        # pytest unit tests
│   ├── requirements.txt              # Python dependencies
│   └── run.py                       # Backend entry point
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Router, auth provider, layout
│   │   ├── main.jsx                 # React entry point
│   │   ├── index.css                # Tailwind + custom styles
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx    # Login/register UI
│   │   │   │   ├── AuthProvider.jsx  # React context + auth logic
│   │   │   │   └── api/
│   │   │   │       └── authApi.js    # Auth API calls
│   │   │   ├── analysis/
│   │   │   │   ├── AnalysisPage.jsx  # 6-step wizard UI
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useAnalysis.js # Analysis state management
│   │   │   │   ├── api/
│   │   │   │   │   └── analysisApi.js # Analysis API calls
│   │   │   │   └── components/
│   │   │   │       ├── PatientStep.jsx
│   │   │   │       ├── MRIStep.jsx
│   │   │   │       ├── CognitiveStep.jsx
│   │   │   │       ├── HandwritingStep.jsx
│   │   │   │       ├── SpeechStep.jsx
│   │   │   │       └── RiskStep.jsx
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.jsx # Stats, charts, recent analyses
│   │   │   ├── patients/
│   │   │   │   ├── PatientsPage.jsx  # Patient list + CRUD
│   │   │   │   ├── hooks/
│   │   │   │   │   └── usePatients.js
│   │   │   │   └── api/
│   │   │   │       └── patientsApi.js
│   │   │   ├── history/
│   │   │   │   ├── HistoryPage.jsx   # Patient timeline + trends
│   │   │   │   ├── hooks/
│   │   │   │   │   └── useHistory.js
│   │   │   │   └── api/
│   │   │   │       └── historyApi.js
│   │   │   └── results/
│   │   │       ├── ResultsPage.jsx   # Analysis results display
│   │   │       └── api/
│   │   │           └── resultsApi.js
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.jsx    # Sidebar + TopBar shell
│   │   │   │   ├── Sidebar.jsx      # Navigation menu
│   │   │   │   └── TopBar.jsx       # Header with search/notifications
│   │   │   └── ui/                  # Reusable UI components
│   │   │       ├── GlassCard.jsx
│   │   │       ├── Button.jsx
│   │   │       ├── Modal.jsx
│   │   │       ├── DropZone.jsx
│   │   │       ├── ProgressBar.jsx
│   │   │       ├── CircularScore.jsx
│   │   │       └── PageLoader.jsx
│   │   └── context/
│   │       ├── AuthContext.jsx       # Auth re-export
│   │       └── ResultsStore.js       # Global results state
│   ├── package.json                  # Node dependencies
│   ├── vite.config.js                # Vite + proxy config
│   └── tailwind.config.js            # Tailwind customization
│
├── .env                              # Environment variables (gitignored)
├── .env.example                      # Template for .env
└── README.md                         # This file
```

---

## 🔌 API Endpoints

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login (rate-limited: 5/min) |
| `/api/auth/register` | POST | User registration |
| `/api/auth/logout` | POST | End session |
| `/api/auth/current-user` | GET | Get authenticated user |

**Login Request:**
```json
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}
```

**Login Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@neurosense.ai",
    "role": "admin",
    "full_name": "System Admin"
  }
}
```

### Patients

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/patients` | GET | List all patients |
| `/api/patients` | POST | Create new patient |
| `/api/patients/<id>` | GET | Get patient details |
| `/api/patients/<id>` | PUT | Update patient |
| `/api/patients/<id>` | DELETE | Remove patient |
| `/api/patients/history/<id>` | GET | Patient session history |
| `/api/patients/export/<id>` | GET | Download CSV |

### Analysis

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analysis/analyze` | POST | **Full multimodal analysis** |
| `/api/analysis/mri` | POST | MRI classification only |
| `/api/analysis/sentiment` | POST | Text sentiment analysis |
| `/api/analysis/cognitive` | POST | Cognitive evaluation |
| `/api/analysis/risk` | POST | Risk profile assessment |
| `/api/analysis/handwriting` | POST | Handwriting analysis |
| `/api/analysis/genomics` | POST | DNA/genomic analysis |
| `/api/analysis/transcribe` | POST | Audio transcription |

**Full Analysis Request (multipart/form-data):**
```
POST /api/analysis/analyze

Form Fields:
- name: "John Doe"
- age: "72"
- sex: "M"
- patient_id: "P001"
- mri_image: <file>
- patient_text: "I sometimes forget where I put my keys..."
- cognitive_tests: {"mini_cog": 3, "digit_span": 10, ...}
- handwriting_canvas: <base64>
- audio_text: "The quick brown fox..."
- risk_factors: {"family_history": true, "age": 72, ...}
```

**Full Analysis Response:**
```json
{
  "patient_info": {"name": "John Doe", "age": 72, "sex": "M"},
  "mri": {
    "stage": "Mild Demented",
    "confidence": 87.5,
    "probabilities": {"Non Demented": 5.2, "Very Mild": 15.3, ...}
  },
  "sentiment": {
    "cognitive_risk_score": 42,
    "dominant_emotion": "anxious"
  },
  "cognitive": {
    "composite_score": 65,
    "stage_index": 2
  },
  "final_stage": {
    "stage": "Mild Demented",
    "confidence": 82.3,
    "method": "Multimodal Fusion (MRI + SENTIMENT + COGNITIVE)",
    "modality_contributions": {"mri": 30, "sentiment": 13, "cognitive": 18},
    "modality_agreement": "High"
  },
  "music": {...},
  "session_id": 42
}
```

### Utilities

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/utils/chat` | POST | AI chatbot (Gemini/Groq) |
| `/api/utils/music` | POST | Music therapy recommendations |
| `/api/utils/report` | POST | Generate PDF report |

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Service health check |

---

## 🤖 AI/ML Modules

### 1. MRI Classification (`modules/mri/`)

**Model:** EfficientNet-B0 fine-tuned on OASIS dataset

**Classes:**
| Index | Stage | Color |
|-------|-------|-------|
| 0 | Non Demented | Green |
| 1 | Very Mild Demented | Indigo |
| 2 | Mild Demented | Amber |
| 3 | Moderate Demented | Red |

**Output:**
```python
{
    "stage": "Mild Demented",
    "confidence": 87.5,
    "stage_index": 2,
    "probabilities": {
        "Non Demented": 5.2,
        "Very Mild Demented": 12.8,
        "Mild Demented": 72.5,
        "Moderate Demented": 9.5
    },
    "gradcam_image_base64": "..."  # Optional heatmap
}
```

### 2. Multimodal Fusion (`modules/fusion/engine.py`)

**Method:** Weighted confidence ensemble

**Default Weights:**
| Modality | Weight | Rationale |
|----------|--------|----------|
| MRI | 30% | Gold standard |
| Cognitive | 18% | Direct assessment |
| Sentiment | 13% | Behavioral marker |
| Handwriting | 11% | Motor control |
| Visual | 10% | Facial emotion |
| Risk | 10% | Clinical factors |
| Audio | 8% | Speech patterns |

**Fusion Algorithm:**
```python
# 1. Normalize each modality to 0-3 stage index
# 2. Weight by modality importance
# 3. Apply confidence adjustment
# 4. Check modality agreement (full/high/moderate/low)
# 5. Output final stage with confidence
```

### 3. Cognitive Evaluation (`modules/cognitive/evaluator.py`)

**Tests:**
- Mini-Cog (0-5 scale)
- Digit Span Forward/Backward
- Serial 7 Subtraction
- Word Recall
- Orientation (time, place)

**Output:**
```python
{
    "composite_score": 65,
    "stage_index": 2,
    "subscores": {
        "mini_cog": 3,
        "digit_span": 10,
        "serial_7": 3,
        "word_recall": 4,
        "orientation": 8
    }
}
```

### 4. Risk Profiler (`modules/risk/profiler.py`)

**Factors:**
- Age, sex, education
- Family history
- Cardiovascular conditions
- Diabetes, hypertension
- Lifestyle factors

### 5. Sentiment Analysis (`modules/nlp/sentiment.py`)

**Method:** TextBlob polarity + custom markers

**Output:**
```python
{
    "polarity": -0.3,
    "subjectivity": 0.6,
    "cognitive_risk_score": 42,
    "dominant_emotion": "anxious",
    "markers_detected": ["worry", "forget"]
}
```

---

## ⚙️ Setup Instructions

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |

### Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create environment file
cp ../.env.example .env
# Edit .env and add your GEMINI_API_KEY

# 6. Run the server
python run.py

# Backend runs at: http://localhost:5000
```

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev

# Frontend runs at: http://localhost:3000
```

### Combined Start

```bash
# Terminal 1: Backend
cd backend && python run.py

# Terminal 2: Frontend
cd frontend && npm run dev
```

---

## 🐳 Docker Setup

```bash
# Navigate to deployment folder
cd deployment/docker

# 1. Build and start all services
docker-compose up --build

# 2. Run in background
docker-compose up -d

# 3. View logs
docker-compose logs -f

# 4. Stop services
docker-compose down

# Access:
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
# Health:   http://localhost:5000/api/health
```

---

## 🔐 Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
# ==========================================
# NeuroSense AI Configuration
# ==========================================

# Flask Settings
SECRET_KEY=your-secure-random-key-min-32-chars
FLASK_SECRET_KEY=your-secure-random-key-min-32-chars

# AI Services (Required for chatbot)
GEMINI_API_KEY=your-google-gemini-api-key

# Optional: Groq alternative
GROQ_API_KEY=your-groq-api-key
```

**Get API Keys:**
- Gemini: https://aistudio.google.com/app/apikey
- Groq: https://console.groq.com/keys

---

## 📊 Data Flow: Complete Walkthrough

### 1. User Authentication
```
Login Form → authApi.login() → POST /api/auth/login
         → Validate credentials
         → Create Flask session
         → Return user + set cookie
```

### 2. Patient Analysis
```
AnalysisPage (6-step wizard)
    │
    ├── Step 1: Patient Info
    │   └── name, age, sex, patient_id
    │
    ├── Step 2: MRI Upload
    │   └── DropZone → mri_image file
    │
    ├── Step 3: Cognitive Tests
    │   └── JSON with test answers
    │
    ├── Step 4: Handwriting
    │   └── Canvas drawing or image upload
    │
    ├── Step 5: Speech
    │   └── Text input or audio file
    │
    └── Step 6: Risk Factors
        └── Family history, conditions, etc.
```

### 3. Backend Processing
```
POST /api/analysis/analyze (multipart/form-data)
    │
    ▼
AnalysisOrchestrator.analyze()
    │
    ├── Patient Info → Extract & validate
    │
    ├── MRI Image → MRIClassifier.predict()
    │           └── EfficientNet → Stage + Confidence
    │
    ├── Text Input → SentimentAnalyzer.analyze()
    │            └── TextBlob → Risk Score
    │
    ├── Cognitive → CognitiveEvaluator.evaluate()
    │           └── MMSE scoring → Composite Score
    │
    ├── Handwriting → HandwritingAnalyzer.analyze()
    │             └── OpenCV contours → Risk Score
    │
    ├── Audio → SpeechTranscriber.transcribe()
    │       └── SpeechRecognition → Text + Sentiment
    │
    ├── Risk Factors → RiskProfiler.assess()
    │              └── Clinical factors → Risk Score
    │
    ▼
MultimodalFusion.predict()
    │
    ├── Normalize all scores to stage index (0-3)
    ├── Apply weighted ensemble
    ├── Check modality agreement
    │
    ▼
Final Result
    │
    ├── Final Stage (e.g., "Mild Demented")
    ├── Confidence (e.g., 82.3%)
    ├── Method (e.g., "Multimodal Fusion")
    └── Recommendations
```

### 4. Results Display
```
JSON Response → ResultsPage.jsx
    │
    ├── CircularScore (overall risk)
    ├── RadarChart (modality comparison)
    ├── MRIResults
    ├── CognitiveResults
    ├── SentimentResults
    ├── HandwritingResults
    ├── RiskProfileResults
    └── MusicRecommendations
```

---

## 🧪 Testing & Debugging

### Test Backend API

```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt

# List patients (with auth)
curl http://localhost:5000/api/patients \
  -b cookies.txt

# Full analysis
curl -X POST http://localhost:5000/api/analysis/analyze \
  -F "name=Test Patient" \
  -F "age=70" \
  -F "patient_text=I sometimes forget things"
```

### Common Issues

| Issue | Solution |
|-------|----------|
| CORS error after login | Clear browser cookies, restart both servers |
| MRI model not found | Add `models/alzheimer_model.pth` to backend |
| Blank page after login | Check browser console for errors |
| API returns 401 | Re-login, session expired |

---

## 🚀 Future Improvements

### High Priority
- [ ] **Async Task Queue** — Celery + Redis for long-running ML inference
- [ ] **PostgreSQL Migration** — Scale beyond SQLite
- [ ] **WebSocket Updates** — Real-time progress during analysis
- [ ] **Model Versioning** — MLflow integration

### Medium Priority
- [ ] **Additional Modalities** — Eye tracking, gait analysis
- [ ] **FHIR Integration** — Hospital EHR connectivity
- [ ] **Mobile App** — React Native companion
- [ ] **Multi-language Support** — i18n for international use

### Nice to Have
- [ ] **Federated Learning** — Privacy-preserving model training
- [ ] **Blockchain Audit Trail** — Immutable analysis logs
- [ ] **Voice Interface** — Alexa/Google Assistant integration

---

## 🤝 Contribution Guide

### Coding Standards

**Python (Backend):**
- Follow PEP 8
- Type hints for function signatures
- docstrings for modules and classes
- Unit tests for new features

**JavaScript (Frontend):**
- React functional components with hooks
- PropTypes or TypeScript interfaces
- ESLint + Prettier formatting
- Component-per-file pattern

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

MIT License - See LICENSE file for details.

---

## ⚠️ Medical Disclaimer

> **IMPORTANT:** NeuroSense AI is a **research prototype** and **clinical decision support tool**.
>
> It is NOT intended to:
> - Replace professional medical diagnosis
> - Provide treatment recommendations without physician oversight
> - Be used as the sole basis for clinical decisions
>
> Always verify results with standard clinical procedures and qualified healthcare professionals.
>
> This software is provided "AS IS" without warranty of any kind.

---

## 🙏 Acknowledgments

- OASIS Dataset for MRI model training data
- Google Gemini for medical chatbot capabilities
- PyTorch team for deep learning framework
- React + Vite teams for modern frontend tooling

---

**Built with ❤️ for early Alzheimer's detection**
