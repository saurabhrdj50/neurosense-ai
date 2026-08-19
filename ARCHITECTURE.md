# Architecture — NeuroSense AI

This document describes the system architecture of NeuroSense AI v1.0.0 in sufficient detail for contributors, reviewers, and teams evaluating the platform for extension.

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Authentication & Security](#authentication--security)
5. [Routing](#routing)
6. [Context Providers](#context-providers)
7. [Services & Data Layer](#services--data-layer)
8. [Demo Dataset](#demo-dataset)
9. [Component Hierarchy](#component-hierarchy)
10. [Theme System](#theme-system)
11. [Clinical Workflow](#clinical-workflow)
12. [AI Pipeline](#ai-pipeline)

---

## High-Level Overview

```
┌────────────────────────────────────────────────────────┐
│                      Browser                           │
│  React 19 SPA (Vite 6)                                │
│  └─ Protected routes behind AuthProvider              │
│     └─ Feature pages → API calls via fetch()          │
└──────────────────┬─────────────────────────────────────┘
                   │ HTTP (dev: Vite proxy / prod: direct)
                   ▼
┌────────────────────────────────────────────────────────┐
│                  Flask 3 REST API                      │
│  Port 5000   ·  Flask-Login sessions  ·  CORS         │
│  ┌──────────┬───────────┬───────────┬───────────────┐ │
│  │ /auth    │ /patients │ /analysis │ /utils        │ │
│  └──────────┴───────────┴───────────┴───────────────┘ │
│               │                 │                      │
│         Repository          Orchestrator               │
│         (SQLite)           (14 modules)                │
│                                 │                      │
│              ┌──────────────────┴─────────────────┐   │
│              │        Analysis Modules             │   │
│              │  MRI · Cognitive · NLP · Speech     │   │
│              │  Handwriting · FER · Risk · Fusion  │   │
│              └─────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Technology

| Layer | Library | Version |
|-------|---------|---------|
| Framework | React | 19.x |
| Build tool | Vite | 6.x |
| Styling | Tailwind CSS | 3.x |
| Animation | Framer Motion | 12.x |
| State (server) | TanStack Query | 5.x |
| State (local) | React Context | built-in |
| Routing | React Router | 7.x |
| Charts | Recharts | 3.x |
| Icons | Lucide React | 1.x |
| Toast notifications | React Hot Toast | 2.x |
| File upload | React Dropzone | 15.x |

### Folder Structure

```
frontend/src/
├── App.jsx                 # Root: router, Suspense, layout guards
├── main.jsx                # ReactDOM.createRoot entry point
├── index.css               # CSS custom properties (design tokens)
├── constants/
│   └── index.js            # Colours, animation variants, thresholds, keys
├── config/
│   └── api.js              # BASE_URL + API_ENDPOINTS object
├── context/
│   ├── ThemeProvider.jsx   # light/dark/system theme + font + motion
│   └── DemoContext.jsx     # Demo mode on/off toggle
├── providers/
│   └── QueryProvider.jsx   # TanStack Query client (staleTime, gcTime)
├── features/               # Route-level modules (each owns its API + UI)
│   ├── auth/
│   │   ├── AuthProvider.jsx     # Auth context (login/register/logout)
│   │   ├── LoginPage.jsx        # 4-step login/register/recovery form
│   │   └── api/authApi.js       # Auth HTTP methods
│   ├── dashboard/DashboardPage.jsx
│   ├── analysis/AnalysisPage.jsx  + step sub-components
│   ├── patients/PatientsPage.jsx
│   ├── history/HistoryPage.jsx
│   ├── results/ResultsPage.jsx
│   └── admin/
│       ├── AdminDashboard.jsx
│       └── AdminPanel.jsx
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx        # Shell: sidebar + topbar + main outlet
│   │   ├── Sidebar.jsx          # Collapsible nav + user profile
│   │   └── TopBar.jsx           # Page title + action buttons + profile menu
│   ├── ui/                      # Atomic design primitives
│   │   ├── Button.jsx
│   │   ├── GlassCard.jsx
│   │   ├── Modal.jsx
│   │   ├── DropZone.jsx
│   │   ├── CircularScore.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── PageLoader.jsx
│   │   └── Skeleton.jsx         # 5 skeleton variants
│   └── cdss/                    # Clinical decision support components
│       ├── AdvancedMRIViewer.jsx
│       ├── ExplainableAIPanel.jsx
│       ├── LongitudinalTimeline.jsx
│       └── ClinicalReportModal.jsx
├── AnimatedBg.jsx               # Decorative orbs (aria-hidden)
├── CommandPalette.jsx           # Ctrl+K global search overlay
├── NotificationCenter.jsx       # Slide-in notification drawer
├── SettingsModal.jsx            # Appearance / notifications / account
├── HelpCenterModal.jsx          # Keyboard shortcuts + platform guide
└── ErrorPage.jsx                # 404 / 500 fallback page
```

### State Management Strategy

```
                     Global State
                     ┌──────────┐
          ┌──────────│ Auth     │──────────┐
          │          │ Provider │          │
          │          └──────────┘          │
          │          ┌──────────┐          │
          ├──────────│ Theme    │──────────┤
          │          │ Provider │          │
          │          └──────────┘          │
          │          ┌──────────┐          │
          ├──────────│ Demo     │──────────┤
          │          │ Context  │          │
          │          └──────────┘          │
          │          ┌──────────┐          │
          └──────────│ Query    │──────────┘
                     │ Provider │
                     └──────────┘
                     (TanStack Query:
                      server cache,
                      background refetch,
                      error states)
```

- **AuthProvider** — single source of truth for `user`, `role`, `isAdmin`, `isDoctor`, and auth actions
- **ThemeProvider** — manages `theme`, `fontSize`, `motion` with `localStorage` persistence
- **DemoContext** — feature flag for demo mode (`isDemoMode`, `launchDemo`, `exitDemo`)
- **QueryProvider** — wraps React app in `QueryClientProvider` with 5-min stale time; used for all server data fetching

---

## Backend Architecture

### Technology

| Layer | Library | Notes |
|-------|---------|-------|
| API framework | Flask 3 | Blueprints for each route group |
| Auth | Flask-Login | Session-based, `@login_required` |
| Passwords | Werkzeug PBKDF2-SHA256 | Industry-standard hash |
| Rate limiting | Flask-Limiter | 5 req/min on login |
| Database | SQLite → SQLAlchemy | Custom repository layer |
| ML inference | PyTorch 2 + timm | EfficientNet-B0 |
| Computer vision | OpenCV, Pillow | Image preprocessing |
| NLP | TextBlob, NLTK | Sentiment + keyword detection |
| Speech | SpeechRecognition | Google STT free tier |
| Explainability | SHAP | Feature importance values |
| PDF reports | ReportLab | Clinical report generation |
| AI chatbot | Google Gemini API | `google-genai` SDK |
| Task queue | Celery (optional) | Long-running jobs |
| Production WSGI | Gunicorn | Multi-worker HTTP server |

### Backend Folder Structure

```
backend/
├── run.py                       # Flask app entry point
├── requirements.txt
└── app/
    ├── __init__.py              # App factory, blueprint registration, CORS
    ├── config.py                # Env-based configuration classes
    ├── models/
    │   ├── user.py              # User SQLAlchemy model + Flask-Login mixin
    │   └── patient.py           # Patient + AnalysisSession models
    ├── repositories/
    │   ├── user_repository.py   # User CRUD
    │   └── patient_repository.py # Patient + session CRUD
    ├── api/routes/
    │   ├── auth.py              # /api/auth/* (login, register, logout…)
    │   ├── patients.py          # /api/patients/* (CRUD, history, export)
    │   ├── analysis.py          # /api/analysis/* (analyze, mri, cognitive…)
    │   └── utilities.py         # /api/utils/* (chat, music, health)
    ├── modules/
    │   ├── mri/classifier.py    # EfficientNet-B0 inference + Grad-CAM
    │   ├── cognitive/evaluator.py # MMSE-style composite scorer
    │   ├── nlp/sentiment.py     # TextBlob polarity + keyword flags
    │   ├── speech/transcriber.py # Audio → text → confidence score
    │   ├── handwriting/analyzer.py # Contour + tremor analysis
    │   ├── facial/emotion.py    # FER library emotion classification
    │   ├── biomarkers/evaluator.py # CSF/blood threshold interpretation
    │   ├── risk/profiler.py     # 12-factor weighted risk scoring
    │   └── fusion/engine.py     # Weighted ensemble → final stage
    └── services/
        ├── orchestrator.py      # Coordinates all modules end-to-end
        ├── report_generator.py  # Formats analysis result as HTML/PDF
        └── chatbot.py           # Gemini API integration
```

---

## Authentication & Security

### Authentication Flow

```
POST /api/auth/login
        │
        ▼
Flask-Login: load_user(username)
        │
        ▼
Werkzeug: check_password_hash(stored, provided)
        │
    ┌───┴────┐
    │ Valid  │ → login_user(user) → Set session cookie → { success, role }
    │Invalid │ → 401 Unauthorized
    └────────┘

All subsequent requests:
    Cookie → Flask-Login: current_user → @login_required check
```

### Password Reset Flow

```
Step 1: POST /api/auth/forgot-password
  (email + date_of_birth → identity verification → reset_token)

Step 2: POST /api/auth/reset-password
  (reset_token + new_password → hash + store)
```

### Role-Based Access Control

| Role | Access |
|------|--------|
| `doctor` | Dashboard, Analysis, Patients, History, Results, Settings |
| `admin` | All doctor routes + Admin Dashboard, Admin Panel |

Roles are enforced at both the **React Router** level (frontend redirect) and the **Flask `@login_required`** level (backend 401).

---

## Routing

### Frontend Routes

```
/                          → LandingPage (public)
/auth                      → LoginPage (public)
/dashboard                 → DashboardPage (protected: doctor + admin)
/analysis                  → AnalysisPage (protected: doctor)
/patients                  → PatientsPage (protected: doctor + admin)
/patients/:id/history      → HistoryPage (protected: doctor + admin)
/results                   → ResultsPage (protected: doctor + admin)
/admin/dashboard           → AdminDashboard (protected: admin only)
/admin/panel               → AdminPanel (protected: admin only)
*                          → ErrorPage (404 fallback)
```

All routes under `/dashboard`, `/analysis`, `/patients`, `/history`, `/results`, `/admin/*` render inside `<AppLayout>` (sidebar + topbar shell).

Route components are **lazy-loaded** with `React.lazy()` + `<Suspense fallback={<PageLoader />}>` for code-splitting.

---

## Context Providers

### ThemeProvider

**File:** `src/context/ThemeProvider.jsx`

| State | Type | Storage | Default |
|-------|------|---------|---------|
| `theme` | `'light' \| 'dark' \| 'system'` | `localStorage` | `'dark'` |
| `fontSize` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `localStorage` | `'md'` |
| `motion` | `'full' \| 'reduced' \| 'none'` | `localStorage` | `'full'` |

Effects:
- Sets `class="dark"` and `data-theme` on `<html>` element
- Listens to `prefers-color-scheme` media query for `'system'` mode
- Adds `.reduce-motion` class when motion ≠ `'full'`

### AuthProvider

**File:** `src/features/auth/AuthProvider.jsx`

| State | Type | Notes |
|-------|------|-------|
| `user` | `object \| null` | Full user record from backend |
| `role` | `'doctor' \| 'admin' \| null` | Derived from user object |
| `loading` | `boolean` | True during session restore |
| `isAdmin` | `boolean` | Derived getter |
| `isDoctor` | `boolean` | Derived getter |

On mount calls `GET /api/auth/current-user` to restore existing sessions.

### DemoContext

**File:** `src/context/DemoContext.jsx`

| State | Type | Notes |
|-------|------|-------|
| `isDemoMode` | `boolean` | When `true`, pages use demo dataset |

---

## Services & Data Layer

### Frontend API Layer

`src/config/api.js` exports:
- `API_URL` — base URL from `import.meta.env.VITE_API_URL`
- `API_ENDPOINTS` — object mapping all 28 endpoint paths

Auth calls go through `src/features/auth/api/authApi.js`.  
Analysis calls go through `src/features/analysis/api/analysisApi.js`.

All calls use native `fetch()`. No Axios dependency.

### Backend Repository Pattern

The backend uses a **Repository Pattern** to decouple route handlers from SQLAlchemy:

```
Route handler
    │
    ▼
Repository (e.g., patient_repository.py)
    │  get_all_patients()
    │  create_patient()
    │  get_session_history()
    ▼
SQLAlchemy ORM → SQLite database
```

This makes it trivial to swap SQLite for PostgreSQL (see v1.1 roadmap) by changing only the connection string.

---

## Demo Dataset

**File:** `src/services/demoDataset.js`

The demo dataset is a module-level constant (`DEMO_PATIENTS`) — a 30-element array generated at import time using `Array.from({ length: 30 }, …)`.

### Generation Logic

Each patient index maps to a predetermined disease stage:

| Index | Stage |
|-------|-------|
| 0–5 | Healthy Control |
| 6–13 | Mild Cognitive Impairment |
| 14–21 | Early AD |
| 22–26 | Moderate AD |
| 27–29 | Advanced AD |

Values are computed deterministically from `index`:
- **Risk score:** linear progression `0.1 + index * 0.028` (capped to stage-appropriate ranges)
- **MMSE:** descends from 29 → 8 across the 30 patients
- **Hippocampal volume:** 3.8 → 1.9 cm³
- **Biomarkers:** amyloid beta, tau, NfL derived from stage thresholds ± index-seeded variance
- **Timeline:** 4 visits spaced 6 months apart with realistic progression deltas

No network calls are made in demo mode. All data is in-memory at bundle time.

---

## Component Hierarchy

```
<App>
├── <ThemeProvider>
├── <QueryProvider>
├── <DemoProvider>
└── <AuthProvider>
    ├── <AnimatedBg />               (z-index 0, aria-hidden)
    │
    ├── <Route path="/">
    │   └── <LandingPage />
    │
    ├── <Route path="/auth">
    │   └── <LoginPage />
    │
    └── <Route element={<AppLayout />}>
        ├── <Sidebar />
        ├── <TopBar>
        │   ├── <NotificationCenter />
        │   ├── <CommandPalette />
        │   ├── <SettingsModal />
        │   └── <HelpCenterModal />
        └── <main>           (React Router <Outlet />)
            ├── <DashboardPage />
            │   ├── <GlassCard />
            │   ├── <CircularScore />
            │   └── <Recharts charts />
            ├── <AnalysisPage />
            │   ├── <DropZone />
            │   ├── <ProgressBar />
            │   └── <Button />
            ├── <ResultsPage />
            │   ├── <AdvancedMRIViewer />
            │   ├── <ExplainableAIPanel />
            │   ├── <LongitudinalTimeline />
            │   └── <ClinicalReportModal />
            ├── <PatientsPage />
            ├── <HistoryPage />
            ├── <AdminDashboard />
            └── <AdminPanel />
```

---

## Theme System

NeuroSense AI uses a **CSS custom properties (variables) architecture** layered with Tailwind CSS utility classes.

**Design tokens** are defined in `src/index.css`:

```css
:root {                           /* — Light mode defaults — */
  --bg: #f8fafc;
  --surface: #ffffff;
  --glass-bg: rgba(255,255,255,0.85);
  --border: rgba(0,0,0,0.08);
  --text-primary: #0f172a;
  --color-primary: #5B5CEB;
  /* … */
}

.dark {                           /* — Dark mode overrides — */
  --bg: #060a14;
  --surface: rgba(15,23,42,0.95);
  --glass-bg: rgba(15,23,42,0.80);
  --border: rgba(255,255,255,0.06);
  --text-primary: #f1f5f9;
  /* … */
}
```

Components consume tokens via `var(--token)`. **No hex values should be hard-coded** in component files — use the constants in `src/constants/index.js` for JavaScript-side colour references.

`ThemeProvider` sets `class="dark"` on `<html>` when dark mode is active, activating all `.dark` overrides via the Tailwind `darkMode: 'class'` strategy.

---

## Clinical Workflow

The end-to-end diagnostic workflow maps to the following frontend → backend flow:

```
1. Authentication
   LoginPage  →  POST /api/auth/login  →  Session cookie set

2. Patient Selection / Creation
   PatientsPage  →  POST /api/patients  →  Patient record created
                    GET  /api/patients  →  Patient list retrieved

3. Analysis Intake (6 steps)
   Step 1 (Demographics)  →  Stored locally in React state
   Step 2 (MRI Upload)    →  FormData assembled
   Step 3 (Cognitive)     →  MMSE answers added to FormData
   Step 4 (Handwriting)   →  File added to FormData
   Step 5 (Speech)        →  Audio file added to FormData
   Step 6 (Biomarkers)    →  Blood values added to FormData

4. Analysis Submission
   POST /api/analysis/analyze  →  AnalysisOrchestrator
        │
        ├── MRIClassifier.infer()
        ├── CognitiveEvaluator.score()
        ├── SentimentAnalyzer.analyze()
        ├── HandwritingAnalyzer.analyze()
        ├── SpeechTranscriber.transcribe()
        ├── RiskProfiler.score()
        ├── BiomarkerEvaluator.interpret()
        └── MultimodalFusionEngine.fuse()
                  │
                  └── { stage, confidence, shap_values, narrative, … }

5. Results Display
   ResultsPage renders:
     • Circular confidence gauge (stage)
     • SHAP bar chart (ExplainableAIPanel)
     • Biomarker panel
     • MRI viewer with Grad-CAM (AdvancedMRIViewer)
     • Clinical narrative
     • Printable report (ClinicalReportModal)

6. Longitudinal Tracking
   GET /api/patients/history/:id  →  Session list
   HistoryPage renders LongitudinalTimeline (4-visit area chart)
```

---

## AI Pipeline

### Module Weights (Multimodal Fusion Engine)

| Module | Weight | Rationale |
|--------|--------|-----------|
| MRI Classification | 30% | Strongest single predictor of AD |
| Cognitive Evaluation | 18% | MMSE is gold-standard clinical tool |
| Blood Biomarkers | 17% | Amyloid/tau CSF markers are diagnostic |
| Risk Profile | 12% | Age, ApoE4, comorbidities |
| Handwriting Analysis | 10% | Motor changes are early AD indicators |
| Speech / NLP | 8% | Word-finding difficulty is early-stage |
| Facial / Behavioural | 5% | Subtle affect changes |

**Fusion formula:**

```python
weighted_score = sum(module_score * weight for module, weight in WEIGHTS.items())
confidence = clamp(weighted_score, 0.0, 1.0)

# Map to clinical stage
if confidence < 0.25:    stage = "Healthy Control"
elif confidence < 0.45:  stage = "MCI"
elif confidence < 0.65:  stage = "Early AD"
elif confidence < 0.82:  stage = "Moderate AD"
else:                    stage = "Advanced AD"
```

### MRI Classification (EfficientNet-B0)

1. Image loaded and resized to 224×224
2. Normalised with ImageNet mean/std
3. Passed through EfficientNet-B0 encoder (pre-trained, fine-tuned on OASIS)
4. Softmax over 5 classes → stage probabilities
5. Grad-CAM computed from final conv layer → spatial attention map
6. Attention map overlaid on original slice (heat-coloured)

### SHAP Explainability

After fusion, SHAP `TreeExplainer` (or `KernelExplainer` for deep models) computes each module's marginal contribution to the final score. These values are returned as `shap_values` in the API response and rendered as a horizontal bar chart in `ExplainableAIPanel`.
