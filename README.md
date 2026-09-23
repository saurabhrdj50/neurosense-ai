<div align="center">

# 🧠 NeuroSense AI

### Multimodal Clinical Decision Support System for Early Alzheimer's Detection

[![React](https://img.shields.io/badge/React-19.x-61DAFB.svg?logo=react&logoColor=white)](https://react.dev/)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000.svg?logo=flask)](https://flask.palletsprojects.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-EE4C2C.svg?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-10B981.svg)](CONTRIBUTING.md)
[![Changelog](https://img.shields.io/badge/Changelog-v1.0.0-8B5CF6.svg)](CHANGELOG.md)

**[🎬 Demo Guide](DEMO_GUIDE.md) · [🏗️ Architecture](ARCHITECTURE.md) · [🗺️ Roadmap](ROADMAP.md) · [🔐 Security](SECURITY.md) · [🤝 Contributing](CONTRIBUTING.md)**

---

> *NeuroSense AI is a research and demonstration platform.*  
> *It is not a certified medical device and should not replace qualified clinical judgement.*

</div>

---

## 📋 Overview

**NeuroSense AI** is a full-stack, enterprise-grade **Clinical Decision Support System (CDSS)** that assists neurologists in the early, multimodal detection of Alzheimer's disease.

The platform fuses **six independent clinical data streams** — MRI brain scans, cognitive assessments, speech transcripts, handwriting samples, blood biomarkers, and genetic risk profiles — through a weighted ensemble model to produce one AI-assisted diagnostic stage, a calibrated confidence score, SHAP feature importance explanations, and Grad-CAM MRI attention maps. All outputs are wrapped in a printable clinical report.

### Why It Matters

| Fact | Source |
|------|--------|
| 55M+ people live with Alzheimer's globally | WHO 2024 |
| Diagnosis is delayed 7–10 years after onset | Alzheimer's Association |
| Early-stage intervention slows progression \~40% | NEJM 2023 |
| Traditional specialist diagnosis costs $5,000–$10,000 | Medicare data |

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Multimodal Analysis Wizard** | 6-step guided intake: demographics → MRI → cognition → handwriting → speech → biomarkers |
| **Advanced MRI Viewer** | Multi-planar (Axial/Coronal/Sagittal) with Grad-CAM heatmap overlay, brightness/contrast/zoom |
| **Explainable AI Dashboard** | SHAP feature importance bar chart showing each modality's contribution |
| **Longitudinal Timeline** | 4-visit progression charts (MMSE, risk score, hippocampal volume, biomarkers) |
| **Clinical Report PDF** | One-click formatted diagnostic report with biomarker tables and recommendations |
| **Role-Based Access Control** | Doctor and Administrator portals with separate navigation and permissions |
| **30-Patient Demo Dataset** | Fully synthetic cohort covering all 5 AD stages — no backend required |
| **Command Palette** | `Ctrl+K` global search and navigation |
| **Notification Center** | Clinical alerts and system messages slide-in drawer |
| **Settings Center** | Theme, font size, motion, and accessibility preferences |
| **Help Center** | Keyboard shortcut reference and guided walkthrough |
| **Light / Dark / System Themes** | CSS custom properties design system with full dark mode support |

---

## 🖥️ Screenshots

> **Live screenshots**: After running `npm run dev`, visit `http://localhost:3000` to see all screens.

| Screen | Description |
|--------|-------------|
| Landing Page | 9-section enterprise landing with clinical workflow overview |
| Auth Portal | Role-selection gateway → login/register forms |
| Dashboard | KPI cards, risk distribution chart, recent analyses |
| Analysis Wizard | Step 2 — MRI upload with DropZone component |
| MRI Viewer | Multi-planar view with Grad-CAM overlay |
| Results Page | Confidence gauge + SHAP chart + biomarker panel |
| Longitudinal Timeline | 4-visit area chart with trend indicators |
| Admin Dashboard | System metrics and user management table |

---

## 🎬 GIF Demo

> Run `npm run dev` and open `http://localhost:3000`. Click **"Try Demo"** on the landing page for a fully offline demo experience with all 30 synthetic patients. See [DEMO_GUIDE.md](DEMO_GUIDE.md) for the complete 5-minute walkthrough script.

---

## 🛠️ Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.x | Component framework |
| Vite | 6.x | Build tool + dev server |
| Tailwind CSS | 3.x | Utility-first styling |
| Framer Motion | 12.x | Animations + transitions |
| TanStack Query | 5.x | Server state management |
| React Router | 7.x | Client-side routing |
| Recharts | 3.x | Clinical data visualisation |
| Lucide React | 1.x | Icon library |
| React Hot Toast | 2.x | Toast notifications |
| React Dropzone | 15.x | File upload component |

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Flask | 3.x | REST API framework |
| Flask-Login | 0.6+ | Session-based authentication |
| Werkzeug | 3.x | Password hashing (PBKDF2-SHA256) |
| Flask-Limiter | 3.5+ | Rate limiting |
| PyTorch | 2.x | Deep learning inference |
| timm | 1.x | EfficientNet-B0 model zoo |
| OpenCV | 4.8+ | Computer vision (handwriting) |
| TextBlob / NLTK | — | NLP sentiment analysis |
| SpeechRecognition | 3.10+ | Audio transcription |
| SHAP | 0.44+ | Explainability values |
| ReportLab | 4.x | PDF clinical report generation |
| Google Gemini | 1.x | AI clinical chatbot |
| SQLAlchemy | 2.x | ORM (SQLite dev / PostgreSQL prod) |
| scikit-learn | 1.3+ | Risk scoring utilities |

---

## 📁 Folder Structure

```
neurosense-ai/
├── README.md                    # This file
├── ARCHITECTURE.md              # System architecture deep-dive
├── CHANGELOG.md                 # Version history
├── CONTRIBUTING.md              # Contribution guidelines
├── CODE_OF_CONDUCT.md           # Community standards
├── SECURITY.md                  # Security policy & disclosure
├── ROADMAP.md                   # Planned future versions
├── DEMO_GUIDE.md                # 5-minute demo walkthrough
├── PRESENTATION.md              # 12-slide deck outline
├── PORTFOLIO_DESCRIPTION.md     # GitHub/LinkedIn/Resume text
├── LICENSE                      # MIT License
├── .env.example                 # Environment variable template
│
├── frontend/                    # React 19 + Vite SPA
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx              # Router, auth guards, lazy loading
│       ├── constants/           # Colours, variants, thresholds
│       ├── config/              # API base URL + endpoints
│       ├── context/             # ThemeProvider, DemoContext
│       ├── providers/           # QueryProvider (React Query)
│       ├── features/            # Route-level modules
│       │   ├── auth/            # Login, register, password reset
│       │   ├── dashboard/       # Clinical workstation
│       │   ├── analysis/        # 6-step analysis wizard
│       │   ├── patients/        # Patient registry
│       │   ├── history/         # Longitudinal view
│       │   ├── results/         # Diagnostic report
│       │   └── admin/           # Admin dashboard + panel
│       ├── components/
│       │   ├── layout/          # AppLayout, Sidebar, TopBar
│       │   ├── ui/              # Button, GlassCard, Modal, DropZone…
│       │   └── cdss/            # MRI viewer, SHAP panel, timeline…
│       └── services/            # demoDataset.js
│
└── backend/                     # Flask 3 REST API
    ├── run.py                   # Entry point
    ├── requirements.txt
    └── app/
        ├── api/routes/          # auth, patients, analysis, utilities
        ├── modules/             # MRI, cognitive, NLP, speech, handwriting…
        ├── services/            # Orchestrator, report, chatbot
        └── repositories/       # SQLite-backed data access
```

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (React 19 + Vite)                                           │
│  Protected routes → TanStack Query → fetch() API calls               │
└──────────────────────────────┬───────────────────────────────────────┘
                               │  HTTP (Vite proxy in dev)
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Flask 3 REST API  ·  Port 10000  ·  Flask-Login  ·  CORS           │
│  ┌────────────┬─────────────┬────────────────┬──────────────────┐   │
│  │ /api/auth  │ /api/patients│ /api/analysis │ /api/utils       │   │
│  └────────────┴─────────────┴────────┬───────┴──────────────────┘   │
│                                AnalysisOrchestrator                  │
│               ┌──────────────────────┴───────────────────────┐      │
│               │           Analysis Modules (×7)              │      │
│               │  MRI · Cognitive · NLP · Speech · Writing    │      │
│               │  Biomarkers · Risk  ─→  FusionEngine         │      │
│               └──────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
```

→ Full architecture: **[ARCHITECTURE.md](ARCHITECTURE.md)**

---

## 🚀 Quick Start

### Prerequisites

| Tool | Min Version |
|------|------------|
| Node.js | 18+ |
| npm | 9+ |
| Python | 3.11+ |
| pip | 23+ |

### 1. Clone

```bash
git clone https://github.com/saurabhrdj50/neurosense-ai.git
cd neurosense-ai
```

### 2. Configure Environment

```bash
# Open frontend/.env.development or backend/.env.example:
#   SECRET_KEY      — strong random string (32+ chars)
#   VITE_API_URL    — http://localhost:5000
#   GEMINI_API_KEY  — optional, for AI chatbot
```

### 3. Run the Backend

```bash
cd backend

# Windows
python -m venv venv && venv\Scripts\activate

# macOS / Linux
# python -m venv venv && source venv/bin/activate

pip install -r requirements.txt
python run.py
# → API available at http://localhost:5000
```

### 4. Run the Frontend

```bash
cd frontend
npm install
npm run dev
# → App available at http://localhost:3000
```

---

## ⚙️ Configuration

All configuration is environment-variable based. Copy `.env.example` to `.env` and fill in the values.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ | Flask server session signing key |
| `FLASK_SECRET_KEY` | ✅ | Same as SECRET_KEY (alias) |
| `FLASK_ENV` | ✅ | `development` or `production` |
| `FLASK_HOST` | ❌ | Default: `0.0.0.0` |
| `FLASK_PORT` | ❌ | Default: `5000` |
| `VITE_API_URL` | ✅ | Backend API base URL from browser |
| `GEMINI_API_KEY` | ❌ | Google Gemini API key for chatbot |
| `GROQ_API_KEY` | ❌ | Groq alternative for chatbot |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins |
| `LOGIN_RATE_LIMIT` | ❌ | Default: `5` (req/min/IP) |
| `SESSION_LIFETIME_SECONDS` | ❌ | Default: `86400` (24 hours) |

---

## 🎬 Demo Mode

NeuroSense AI includes a **fully self-contained demo mode** that works with **zero backend setup**.

### Demo Dataset Coverage

| Stage | Patients |
|-------|----------|
| Healthy Control | 6 |
| Mild Cognitive Impairment (MCI) | 8 |
| Early AD | 8 |
| Moderate AD | 5 |
| Advanced AD | 3 |
| **Total** | **30** |

**To activate:** Click **"Try Demo"** on the landing page. No login, no backend, no API keys required.

All 30 patients have complete synthetic records including demographics, imaging metrics, MMSE scores, blood biomarkers, SHAP feature values, and 4-visit longitudinal timelines.

> See **[DEMO_GUIDE.md](DEMO_GUIDE.md)** for the complete 5-minute walkthrough script with timing and presenter tips.

---

## 🏥 Clinical Workflow

```
Patient Selection / Creation
        ↓
 6-Step Analysis Wizard
  │ Step 1 — Demographics & comorbidities
  │ Step 2 — MRI brain scan upload
  │ Step 3 — Cognitive battery (MMSE-style)
  │ Step 4 — Handwriting sample upload
  │ Step 5 — Speech recording upload
  └ Step 6 — Blood biomarkers & risk factors
        ↓
 Multimodal Fusion Engine
  (MRI 30% + Cognitive 18% + Biomarkers 17% +
   Risk 12% + Handwriting 10% + Speech 8% + Facial 5%)
        ↓
 Diagnostic Stage + Confidence Score
        ↓
 Results Page
  ├─ Circular Confidence Gauge
  ├─ SHAP Feature Importance Chart
  ├─ MRI Viewer + Grad-CAM Heatmap
  ├─ Biomarker Panel + Key Findings
  └─ One-Click PDF Clinical Report
        ↓
 Longitudinal Patient Timeline
 (4-visit progression tracking)
```

---

## 🔬 Explainable AI

NeuroSense AI is built around the principle that **AI in clinical settings must be explainable**:

### SHAP Feature Importance
After each analysis, SHAP values are computed showing the marginal contribution of each modality to the final diagnostic stage. These are rendered as a horizontal bar chart in the **Explainability** tab of the Results page.

### Grad-CAM MRI Attention
The EfficientNet-B0 backbone generates a Grad-CAM spatial attention map highlighting which regions of the brain contributed most to the classification. The heatmap is overlaid on the uploaded MRI slice in the **MRI Viewer** tab with adjustable opacity.

---

## 🧠 MRI Viewer

The **Advanced MRI Viewer** (`components/cdss/AdvancedMRIViewer.jsx`) provides:

- **Multi-planar toggle** — switch between Axial, Coronal, and Sagittal views
- **Grad-CAM overlay** — toggle attention heatmap on/off
- **Brightness / Contrast sliders** — adjust display window level
- **Zoom controls** — fit, zoom-in, zoom-out, and 1:1 pixel
- **Region annotations** — labelled overlays for hippocampus, entorhinal cortex, temporal lobe

> DICOM and NIfTI format support is planned for [v1.1](ROADMAP.md).

---

## 📈 Longitudinal Tracking

The **Longitudinal Timeline** (`components/cdss/LongitudinalTimeline.jsx`) renders:

- An interactive Recharts area chart with 4 clinical visits spaced 6 months apart
- Four tracked metrics: MMSE score, risk confidence, hippocampal volume (cm³), amyloid beta (pg/mL)
- Trend indicators (↑/↓/→) between consecutive visits
- Visit detail sidebar on click — showing full biomarker snapshot

---

## 🔌 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login (rate limited: 5 req/min) |
| POST | `/api/auth/register` | Doctor registration |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/current-user` | Restore existing session |
| POST | `/api/auth/forgot-password` | Identity verification (step 1) |
| POST | `/api/auth/reset-password` | Set new password (step 2) |

### Patients

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/patients` | List all patients (paginated) |
| POST | `/api/patients` | Create patient record |
| GET | `/api/patients/<id>` | Retrieve patient |
| PUT | `/api/patients/<id>` | Update patient |
| DELETE | `/api/patients/<id>` | Remove patient |
| GET | `/api/patients/history/<id>` | Session history list |
| GET | `/api/patients/export/<id>` | CSV export |

### Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analysis/analyze` | **Full multimodal analysis** |
| POST | `/api/analysis/mri` | MRI classification only |
| POST | `/api/analysis/cognitive` | Cognitive evaluation only |
| POST | `/api/analysis/sentiment` | Text / NLP only |
| POST | `/api/analysis/handwriting` | Handwriting analysis only |
| POST | `/api/analysis/transcribe` | Audio transcription |
| POST | `/api/analysis/risk` | Risk factor scoring |
| POST | `/api/analysis/explain` | SHAP values |
| POST | `/api/analysis/report` | Clinical report (HTML/PDF) |

### Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/utils/chat` | AI clinical chatbot (Gemini/Groq) |
| POST | `/api/utils/music` | Music therapy recommendations |
| GET | `/api/health` | Service health check |

---

## 📦 Available Scripts

```bash
# ── Frontend (from /frontend) ──────────────────────────────────────
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build → /dist
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint

# ── Backend (from /backend) ────────────────────────────────────────
python run.py                  # Start Flask API server
python -m pytest tests/ -v     # Run test suite
python -m pytest tests/ --cov  # Run with coverage report
```

---

## 🔐 Security

- **RBAC** — Doctor / Administrator roles enforced at both frontend route guard and backend `@login_required`
- **Passwords** — PBKDF2-SHA256 via Werkzeug
- **Rate limiting** — 5 login attempts/minute/IP via Flask-Limiter
- **CORS** — Configurable origin whitelist via `CORS_ORIGINS` env var
- **No real PHI** — Demo dataset is 100% synthetic; no real patient data is used or stored
- **Secrets** — All credentials stored in `.env` (never committed)

→ Full security policy: **[SECURITY.md](SECURITY.md)**

---

## 🗺️ Future Improvements

| Version | Planned Features |
|---------|----------------|
| **v1.1** | DICOM/NIfTI, FHIR R4, HL7, PostgreSQL, Docker Compose, JWT auth, Audit logs, TOTP 2FA |
| **v1.2** | 3D CNN MRI, LIME explanations, Counterfactuals, MLflow versioning, Full test suite |
| **v2.0** | Cloud-native (AWS/GCP/Azure), Kubernetes, Live Whisper STT, Epic/Cerner EHR integration, PWA |

→ Full roadmap: **[ROADMAP.md](ROADMAP.md)**

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`feat/your-feature-name`)
3. Follow [Conventional Commits](https://www.conventionalcommits.org/)
4. Update `CHANGELOG.md` under `[Unreleased]`
5. Submit a Pull Request

→ Full guide: **[CONTRIBUTING.md](CONTRIBUTING.md)**

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

## 👥 Author

**Saurabh Gupta**  
📧 saurabhrdj50@gmail.com  
🐙 [github.com/saurabhrdj50](https://github.com/saurabhrdj50)

---

## 🙏 Acknowledgements

- [OASIS Brain Dataset](https://www.oasis-brains.org/) — MRI training data
- [Alzheimer's Disease Neuroimaging Initiative (ADNI)](https://adni.loni.usc.edu/) — Clinical biomarker standards
- [Lucide Icons](https://lucide.dev/) — Open-source icon library
- [Framer Motion](https://www.framer.com/motion/) — Animation library
- [Recharts](https://recharts.org/) — React chart library
- [TanStack Query](https://tanstack.com/query) — Server state management

---

<div align="center">

**Built with ❤️ for the clinical AI community**

*NeuroSense AI — Empowering early diagnosis, one scan at a time.*

</div>
