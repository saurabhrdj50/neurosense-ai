# NeuroSense AI — Multimodal Alzheimer's Screening & Decision Support

[![CI Status](https://github.com/saurabhrdj50/neurosense-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/saurabhrdj50/neurosense-ai/actions)
[![Backend Tests](https://img.shields.io/badge/backend%20tests-61%20passed-brightgreen.svg)](backend/)
[![Frontend Tests](https://img.shields.io/badge/frontend%20tests-41%20passed-brightgreen.svg)](frontend/)
[![Playwright E2E](https://img.shields.io/badge/Playwright%20E2E-16%20passed-brightgreen.svg)](frontend/e2e/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![WCAG 2.2 AA](https://img.shields.io/badge/Accessibility-WCAG%202.2%20AA-blueviolet.svg)](https://www.w3.org/WAI/standards-guidelines/wcag/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**NeuroSense AI** is a translational research and clinical decision-support workspace designed for multimodal early Alzheimer's disease risk screening. By fusing **3D Brain MRI neuroimaging**, **acoustic vocal biomarkers**, **linguistic speech NLP**, **interactive cognitive testing (MMSE)**, and **structured clinical hazard profiling**, NeuroSense AI generates a unified, explainable consensus evaluation with documented epistemic uncertainty and transparent attribution.

> ### ⚠️ Mandatory Clinical Scope & Non-Diagnostic Disclaimer
> **NeuroSense AI is an investigational decision-support instrument and educational research platform; it is NOT an FDA-cleared, CE-marked, or validated medical diagnostic device.**
> - All predictive models, risk estimates, stage categorizations, and multimodal fusion outputs represent experimental screening signals with statistical confidence bounds.
> - They must never replace independent diagnostic evaluation, clinical judgment, laboratory testing, or care plans by certified medical professionals.
> - Multi-channel EEG waveforms and telemetry indicators rendered in the dashboard workstation are synthetically generated for UI/UX inspection and workflow preview; they do not represent real-time physiological patient telemetry.

---

## 📑 Table of Contents

1. [🌟 Multimodal Screening Streams](#-multimodal-screening-streams)
2. [🏗️ System Architecture & Technology Stack](#️-system-architecture--technology-stack)
3. [🚀 Quickstart with Docker Compose](#-quickstart-with-docker-compose)
4. [💻 Bare-Metal Development Setup](#-bare-metal-development-setup)
5. [🧠 Two-Tier Hybrid Multimodal Fusion Architecture](#-two-tier-hybrid-multimodal-fusion-architecture)
6. [🎨 UI/UX Design System & Dual-Lens Presentation](#-uiux-design-system--dual-lens-presentation)
7. [📂 Repository Structure](#-repository-structure)
8. [🧪 Testing & Quality Assurance](#-testing--quality-assurance)
9. [🔐 Security, Privacy & Compliance (HIPAA Safeguards)](#-security-privacy--compliance-hipaa-safeguards)
10. [⚠️ Known Limitations](#️-known-limitations)
11. [📜 License](#-license)

---

## 🌟 Multimodal Screening Streams

| Modality | Accepted Inputs | Underlying Processing & Model Architecture | Diagnostic Output & Saliency |
|---|---|---|---|
| **Brain MRI** | 2D slices (PNG, JPG) or **3D NIfTI volumes** (`.nii`, `.nii.gz`) | Deep **ResNet-18** CNN fine-tuned on ADNI 3-class lineage (`CN`, `MCI`, `AD`) + **Grad-CAM Saliency** + **NiiVue WebGL 2.0 Multi-Planar Viewer** | Classifies diagnostic stage, activation confidence, and displays interactive orthogonal slices (Axial, Coronal, Sagittal) and 3D raycast rendering with live Grad-CAM opacity sliders. |
| **Acoustic Voice DSP** | Audio recordings (WAV, WebM, MP3) or live microphone | **Autonomous DSP Pipeline** (Librosa / OpenSMILE eGeMAPSv02) extracting Pitch $F_0$, Local Jitter (%), Local Shimmer (%), HNR (dB), Formants ($F_1, F_2$), and Speech Pausometry | Quantifies vocal fold micro-tremors, articulatory centralization, voice breathiness, and outputs a composite **Vocal Risk Index** ($0-100$). |
| **Speech NLP & Language** | Transcribed speech or typed clinical transcript | Local **Whisper ASR** (`faster-whisper` CTranslate2) + **DistilBERT** 768-dim mean-pooled embeddings fed into a balanced Logistic Regression classifier | Vocabulary richness (TTR), pronoun-to-noun ratios, multilingual hesitation detection (`[pause]`, `[um]`, `[ah]`), and $P(\text{dementia})$ screening probability. |
| **Cognitive Battery** | Interactive neuropsychological questionnaire | Itemized digital assessment (Orientation, Immediate Memory, Attention & Calculation, Delayed Recall, Visuospatial/Clock Drawing, Language) | Composite score ($0 - 100$), stage mapping, and domain vulnerability indicators. |
| **Clinical Risk Profiler** | Structured medical questionnaire | Evaluates 18 clinical hazard factors (Age, Sex, APOE4 genotype, Cardiovascular health, Family history, Hypertension, Physical activity) | Weighted health risk index ($0 - 100$) and personalized preventive recommendations. |
| **Two-Tier Hybrid Fusion** | All active modalities from above | **Tier 1**: Feature-level cross-modal speech gating<br>**Tier 2**: Attentive evidential decision fusion with dynamic missing-modality re-normalization | Unified consensus stage, modality agreement index (Full, High, Moderate, Low), epistemic uncertainty variance ($\sigma^2$), and contribution weights. |

---

## 🏗️ System Architecture & Technology Stack

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                      React 19 + Vite 6 Single Page Application                   │
│  - Clinical Dark/Light Theme with Medical Glassmorphism & Framer Motion          │
│  - Dual-Lens Diagnostic Presentation (Patient & Family Summary vs. Clinician CDS)│
│  - NiiVue WebGL 2.0 3D MRI Multi-Planar Viewer (Axial, Coronal, Sagittal, 3D)    │
│  - Live Grad-CAM Saliency Inspector (0% - 100% Opacity Blending & Colormaps)     │
│  - Acoustic Biomarker Visualizer (Vocal Risk Gauges & Annotated Transcript)      │
│  - Longitudinal Patient Directory, Onboarding Tour, and Offline PWA v2.0         │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ HTTP REST / Session Cookies
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            FastAPI Backend Application                           │
│  - Cryptographic Signed Cookies (SessionMiddleware) & Starlette Auth             │
│  - SlowAPI OWASP Rate Limiting & Fernet Protected Health Information Encryption  │
│  - Strict Pydantic v2 Request/Response Validation Contracts                      │
│  - Hybrid Job Dispatcher: In-process ThreadPool OR Celery Queue Dispatch         │
└────────────┬───────────────────────────┬───────────────────────────┬─────────────┘
             │                           │                           │
             ▼                           ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│      PostgreSQL 16      │ │   Celery + Redis Queue  │ │  MinIO S3 Object Store  │
│   (SQLAlchemy 2 ORM)    │ │ (Decoupled ML Workers)  │ │ (Medical Scans & Audio) │
│ - Longitudinal Records  │ │ - Background Inference  │ │ - 3D NIfTI Scans        │
│ - Encrypted Patients    │ │ - Async Job Polling     │ │ - Patient Audio Files   │
│ - Alembic Migrations    │ │ - Non-blocking HTTP loop│ │ - Presigned Access URLs │
│ - SQLite Zero-Config FB │ │ - Redis Result Backend  │ │ - Local Disk Fallback   │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
```

---

## 🚀 Quickstart with Docker Compose

The simplest way to run the entire NeuroSense AI production stack is with Docker Compose. This builds and links the **Web UI**, **FastAPI Backend**, **Celery ML Worker**, **PostgreSQL 16**, **Redis**, and **MinIO S3 Object Storage**:

```bash
# 1. Clone the repository
git clone https://github.com/saurabhrdj50/neurosense-ai.git
cd neurosense-ai

# 2. Copy the sample environment configuration
cp backend/.env.example backend/.env

# 3. Build and launch all services
docker compose up --build
```

### Deployed Services & Ports

| Service | Access URL | Description | Default Credentials |
|---|---|---|---|
| **Web Application** | [http://localhost:3000](http://localhost:3000) | React 19 Frontend (Served via high-performance Nginx) | See Demo Accounts below |
| **API Server & Docs** | [http://localhost:10000](http://localhost:10000) | FastAPI Backend (Interactive OpenAPI docs at `/docs`) | — |
| **MinIO Console** | [http://localhost:9001](http://localhost:9001) | S3 Object Storage Management UI | `minioadmin` / `minioadmin` |
| **PostgreSQL** | `localhost:5432` | Relational Database (`postgres:16-alpine`) | `postgres` / `postgres` |
| **Redis** | `localhost:6379` | Celery Message Broker & Result Store | Internal |
| **Celery Worker** | Internal Worker | Distributed ML background execution worker | — |

### Default Demo Accounts (`SEED_DEMO_USERS=true`)
- **Clinician / Doctor**: `doctor@neurosense.ai` / `Doctor@123`
- **System Administrator**: `admin@neurosense.ai` / `Admin@123`

---

## 💻 Bare-Metal Development Setup

To run services locally without Docker:

### 1. Prerequisites
- **Python**: `3.11` or higher
- **Node.js**: `20.x` or higher (`npm 10+`)
- **Git**

### 2. Backend Setup
```bash
cd backend

# Create and activate Python virtual environment
python3 -m venv venv
source venv/bin/activate       # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start development server (runs with SQLite by default)
python run.py
```
*The backend API will start on [http://localhost:10000](http://localhost:10000).*

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
*The web interface will start on [http://localhost:3000](http://localhost:3000) and automatically proxy `/api` calls to port `10000`.*

---

## 🎨 UI/UX Design System & Dual-Lens Presentation

NeuroSense AI incorporates a clinical design system designed under the **`ui-ux-pro-max`** methodology:

* **Dual-Lens Perspective Switcher**:
  * **Patient & Family Summary**: A compassionate, non-alarmist plain-language explanation of cognitive health patterns with everyday analogies, actionable wellness habits, and check-list questions to ask their doctor.
  * **Clinician Workstation (CDS)**: Comprehensive technical telemetry including individual modality scores, posterior probabilities, epistemic uncertainty variance ($\sigma^2$), feature attributions, and Grad-CAM saliency maps.
* **Clinical Verification Gate**:
  * In the intake wizard's Review Step, the `Run Analysis & Generate Report` button remains gated until the attending clinician explicitly confirms patient identity and entered data accuracy.
* **Simulated Telemetry Workstation**:
  * An interactive multi-channel visualizer (`FP1-F3`, `C3-P3`, `P3-O1`, `T3-T5`) with adjustable sweep windows (5s, 10s, 30s), gain multipliers (1x, 2x, 5x), and play/pause controls (<kbd>Space</kbd>).
  * Unmistakably labeled as `[Simulated Demonstration]` to prevent misinterpretation as live patient BCI acquisition.
* **WCAG 2.2 AA Accessibility Compliance**:
  * Minimum touch targets $\ge 44 \times 44\text{px}$ on all interactive buttons.
  * 2px visible focus indicators (`focus-visible:ring-2 focus-visible:ring-primary`) with zero clipping.
  * Explicit `<label htmlFor={...}>` and `id` bindings across all input elements.
  * Tested and verified responsive containment across 375px, 768px, 1024px, and 1440px viewports with zero horizontal overflow.

---

## 🧠 Two-Tier Hybrid Multimodal Fusion Architecture

NeuroSense AI employs an evidential, fault-tolerant **Two-Tier Hybrid Fusion Architecture** ([`backend/app/ml/fusion/engine.py`](backend/app/ml/fusion/engine.py)):

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      Tier 1: Cross-Modal Speech Gating                          │
│                                                                                 │
│   Acoustic Dysprosody Indicators          DistilBERT Linguistic Semantics       │
│  (Jitter, Shimmer, HNR, Formants)               (768-dim Embeddings)            │
│               │                                          │                      │
│               └──────────────────► GATING ◄──────────────┘                      │
│                                      │                                          │
│                                      ▼                                          │
│                          Contextual Speech Score                                │
└──────────────────────────────────────┬──────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                 Tier 2: Attentive Evidential Decision Fusion                    │
│                                                                                 │
│   Brain MRI      Contextual Speech      Cognitive Battery      Clinical Risk    │
│  (ResNet-18)      (Tier 1 Fusion)            (MMSE)             (18 Hazards)    │
│   W_base=0.40       W_base=0.35            W_base=0.15          W_base=0.10     │
│       │                  │                      │                    │          │
│       └──────────────────┴──────────┬───────────┴────────────────────┘          │
│                                     │                                           │
│                 Dynamic Confidence Attention Scaling:                           │
│                 α_k = W_k * [1.0 + 0.25 * (Confidence_k - 0.5)]                 │
│                                     │                                           │
│                 Dynamic Missing Modality Re-Normalization:                      │
│                 Active weights scaled to sum strictly to 1.0                    │
│                                     │                                           │
│                                     ▼                                           │
│     ┌─────────────────────────────────────────────────────────────────────┐     │
│     │ Consensus Stage (CN / MCI / Mild Dementia / Moderate Dementia)      │     │
│     │ Agreement Index: Full | High | Moderate | Low                       │     │
│     │ Epistemic Uncertainty Variance: σ² across active inputs             │     │
│     └─────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📂 Repository Structure

```
neurosense-ai/
├── backend/                          # FastAPI REST API & Machine Learning Backend
│   ├── alembic/                      # Database schema migrations & version scripts
│   ├── app/                          # Core application package
│   │   ├── api/routes/               # REST routes: auth, patients, analysis, history, admin
│   │   ├── config/settings.py        # Centralized Pydantic application settings
│   │   ├── features/                 # Business domain features & orchestration
│   │   ├── ml/                       # Machine learning inference subsystem:
│   │   │   ├── mri/                  # ResNet-18 model, NIfTI volumetric loader, Grad-CAM
│   │   │   ├── speech/               # Whisper ASR, Acoustic DSP Biomarkers, DistilBERT NLP
│   │   │   ├── cognitive/            # Neuropsychological test scoring & MMSE mapping
│   │   │   ├── risk/                 # 18-hazard cardiovascular & genetic profiler
│   │   │   ├── fusion/               # Two-Tier Hybrid Multimodal Fusion Engine
│   │   │   └── reporting/            # Automated clinical PDF report generator
│   │   ├── shared/                   # Core DB ORM, MinIO storage, Security, Validation
│   │   ├── tasks/                    # Celery asynchronous task definitions
│   │   └── celery_app.py             # Celery Redis application configuration
│   ├── tests/                        # Comprehensive Pytest suite (Auth, API, Audit Fixes)
│   ├── Dockerfile                    # Multi-stage production container build
│   └── requirements.txt              # Backend Python dependencies
├── frontend/                         # React 19 + Vite 6 Single Page Application & PWA
│   ├── e2e/                          # Playwright end-to-end tests (app.spec.js, responsive.spec.js)
│   ├── src/                          # Application source code
│   │   ├── features/analysis/        # 6-step clinical assessment wizard
│   │   ├── features/dashboard/       # Clinical workstation & TelemetryWorkstation component
│   │   ├── features/results/         # Diagnostic workspaces: NiiVue 3D MRI, Speech, XAI
│   │   ├── features/patients/        # Patient directory, registration, search
│   │   ├── features/history/         # Longitudinal timeline & PDF download
│   │   ├── shared/                   # Design system primitives, clinical mappers, motion
│   │   └── providers/                # Theme, authentication, and TanStack query providers
│   ├── public/                       # PWA manifests, icons, static assets
│   ├── Dockerfile                    # Production Nginx frontend container
│   ├── nginx.conf                    # Nginx reverse proxy & caching configuration
│   └── package.json                  # Frontend dependencies and scripts
├── design-system/                    # Design tokens & specifications generated via ui-ux-pro-max
├── app/                              # Next.js exploratory design reference prototypes (non-production)
├── docker-compose.yml                # Multi-service production orchestration
├── UI_UX_TRANSFORMATION.md           # Engineering & clinical QA audit ledger
└── README.md                         # Main repository guide & documentation
```

---

## 🧪 Testing & Quality Assurance

### 1. Playwright End-to-End Suite (16 / 16 Passed)
Executes against the real FastAPI backend + Vite frontend dev server across 4 viewports (Mobile 375px, Tablet 768px, Laptop 1024px, Desktop 1440px):
```bash
cd frontend
npm run e2e
```
*Verifies registration, bad credentials rejection, simulated telemetry demarcation, full clinical walkthrough (intake $\rightarrow$ analysis $\rightarrow$ report), dual-lens perspective switching, PDF export dropdown, and zero horizontal page overflow.*

### 2. Frontend Unit & Integration Tests (Vitest)
```bash
cd frontend
npm test
```
*41 tests passing across clinical mappers, audio DSP merging, sample cases, and XAI feature attributions.*

### 3. Frontend Code Quality (ESLint)
```bash
cd frontend
npm run lint
```
*Clean execution with 0 errors and 0 warnings.*

### 4. Backend Pytest Suite (61 Passed)
```bash
cd backend
source venv/bin/activate
pytest backend/tests/test_api.py backend/tests/test_auth.py backend/tests/test_audit_fixes.py
```
*61 tests passing across authentication tokens, rate limits, audit logging, and deprecated endpoint removals.*

### 5. Production Bundle Build
```bash
cd frontend
npm run build
```
*Compiles in under 5 seconds with zero errors; generates PWA service worker with 70 precache entries.*

---

## 🔐 Security, Privacy & Compliance (HIPAA Safeguards)

1. **Protected Health Information (PHI) Encryption**: Patient identifiers and medical record numbers are encrypted at rest using **Fernet 128-bit AES-CBC** encryption.
2. **Cryptographic Authentication**: Passwords hashed using memory-hard **scrypt** with unique salt derivations.
3. **Signed Session Cookies**: HTTP-only, SameSite cookies signed with HMAC-SHA256 prevent token theft and cross-site scripting (XSS) compromise. Insecure client-side bypasses have been completely removed.
4. **OWASP Rate Limiting**: SlowAPI limits authentication and analysis endpoints to mitigate brute force and denial of service.
5. **Auditable Access Logs**: Immutable audit log records every clinician access, patient creation, and analysis submission.

---

## ⚠️ Known Limitations

1. **Investigational Only**: This platform is an academic research prototype. It has not received FDA clearance, CE mark certification, or health authority validation as a diagnostic medical device.
2. **Synthetic Telemetry**: The EEG waveforms and voxel volumetric indicators displayed on the dashboard are mathematically generated for UI demonstration and workflow simulation; they do not reflect actual live physiological sensor feeds.
3. **Hardware Acceleration**: NiiVue 3D MRI volume rendering relies on WebGL 2.0; in virtualized environments or browsers with hardware acceleration disabled, rendering falls back to 2D orthogonal slice views.
4. **Uncalibrated Posterior**: Softmax confidence scores indicate internal model probability distributions and do not represent calibrated epidemiological risk odds.

---

## 📜 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for full details. Built for academic research, translational medicine evaluation, and clinical AI education.
