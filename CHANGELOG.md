# Changelog

All notable changes to **NeuroSense AI** are documented in this file.

This project follows [Semantic Versioning](https://semver.org/) and the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

---

## [1.0.0] — 2026-07-28

### ✨ Added

#### Frontend
- **Enterprise Landing Page** — 9-section marketing page introducing the platform's value proposition, trust indicators, and clinical workflow overview
- **Role-Based Authentication Portal** — Step-by-step login gateway with "Doctor" and "Administrator" role selection, login form, registration form, and forgot-password recovery flow
- **Clinical Dashboard** — Real-time KPI cards (total patients, risk distribution, recent analyses) with Recharts area and pie charts
- **Multimodal Analysis Wizard** — 6-step guided intake form:
  - Step 1: Demographics & patient information
  - Step 2: MRI brain scan upload with simulated classification
  - Step 3: Cognitive battery (MMSE-style 10 questions)
  - Step 4: Handwriting sample upload
  - Step 5: Speech transcription upload
  - Step 6: Blood biomarkers & risk factor profile
- **Advanced MRI Viewer** — Multi-planar (axial / coronal / sagittal) MRI simulation with brightness, contrast, and zoom controls; Grad-CAM attention heatmap overlay
- **Explainable AI Dashboard** — SHAP feature importance horizontal bar chart showing each modality's weighted contribution to the final diagnosis
- **Diagnostic Results Page** — Circular confidence gauge, risk stage badge, biomarker panel, AI narrative, and one-click clinical report modal
- **Longitudinal Progression View** — 4-visit timeline with interactive area charts tracking MMSE, risk score, hippocampal volume, and amyloid beta
- **Patient Registry** — Searchable, sortable, paginated patient list with CRUD actions and CSV export
- **Patient History Page** — Per-patient session history with stage progression indicators
- **Admin Dashboard** — System KPIs, user management panel, session audit table
- **Admin Panel** — Doctor approval/rejection workflow, role assignment, and account management
- **Command Palette** — `Ctrl+K` global search and navigation overlay
- **Notification Center** — Slide-in drawer with clinical alerts, system messages, and read/unread state
- **Settings Center** — Modal with tabs for Appearance (theme, font size, motion), Notifications, Privacy, and Account
- **Help Center** — Keyboard shortcut reference, feature guide, and diagnostic workflow overview
- **Theme System** — Light / Dark / System auto themes with CSS custom properties; font-size and reduce-motion accessibility preferences
- **Synthetic Demo Dataset** — 30 fully synthetic patients stratified across all 5 AD stages (Healthy → MCI → Early → Moderate → Advanced AD) with realistic biomarkers, imaging metrics, and clinical timelines
- **Demo Mode** — One-click demo launch from the landing page; no backend required
- **Floating Action Button** — Mobile-only shortcut to the Analysis Wizard (doctors only)
- **AnimatedBg** — Decorative floating gradient orbs behind all authenticated pages

#### Backend
- **Flask 3 REST API** — 28 endpoints across authentication, patient management, analysis, and utility route groups
- **MRI Classification Module** — EfficientNet-B0 fine-tuned on OASIS dataset with Grad-CAM spatial attention
- **Cognitive Evaluation Engine** — MMSE-style composite scoring mapped to clinical severity bands
- **Speech Transcription & NLP** — SpeechRecognition + TextBlob polarity, confidence scoring, and keyword detection
- **Handwriting Analysis** — OpenCV contour analysis for tremor amplitude, stroke consistency, and pen pressure proxy
- **Facial Emotion Recognition** — `fer` library integration for clinical emotional state assessment
- **Blood Biomarker Evaluator** — Threshold-based CSF/plasma biomarker interpretation (amyloid beta, tau, NfL)
- **Risk Profiler** — 12-factor clinical risk scoring engine (age, ApoE4, education, family history, etc.)
- **Multimodal Fusion Engine** — Weighted ensemble combining all 6 modality scores into a final diagnostic stage and confidence interval
- **SHAP Explainability** — Feature importance values computed per analysis session
- **Clinical Report Generator** — Formatted HTML/PDF report with synopsis, biomarker tables, and treatment suggestions
- **AI Clinical Chatbot** — Google Gemini API–backed assistant for clinical Q&A
- **Patient Repository** — SQLite-backed CRUD layer with session history tracking
- **Authentication System** — Flask-Login, PBKDF2-SHA256 password hashing, session-based auth, rate limiting, and identity verification for password reset

#### Developer Experience
- Centralised `src/constants/index.js` for colour tokens, animation variants, thresholds, and labels
- JSDoc annotations on all 20 components, hooks, services, and context providers
- `aria-label` on every icon-only interactive element
- `role="navigation"` + `aria-label` on `<nav>` elements
- `.env.example` with full environment variable documentation
- Production Vite build: 2,925 modules, 0 errors, 0 warnings

---

### 🔄 Changed

- `package.json` name: `"frontend"` → `"neurosense-ai"`
- `package.json` version: `"0.0.0"` → `"1.0.0"`
- Root `README.md` replaced with a professional open-source README (badges, architecture diagram, full API reference, quick-start guide)

---

### 🐛 Fixed

- Auth session restoration on hard-refresh now correctly calls `/api/auth/current-user` before first render
- Dashboard silently handled API failures without user feedback — now shows an error banner
- Sidebar collapse toggle now respects keyboard accessibility (`aria-label` dynamically bound to open state)
- Modal close button now has `aria-label="Close dialog"` for screen-reader compatibility
- Mobile FAB no longer renders for admin users (doctors-only feature)

---

### ⚠️ Known Limitations

- **No real DICOM support** — The MRI viewer simulates multi-planar views from a 2D reference image. No DICOM parsing is implemented.
- **SQLite only** — The backend uses SQLite for storage. Not suitable for concurrent production workloads; PostgreSQL migration is planned for v1.1.
- **Gemini / Groq dependence** — The AI chatbot requires a valid API key. Without one the component renders a friendly fallback message.
- **Speech-to-text accuracy** — The SpeechRecognition library uses Google's free STT API. Accuracy degrades with medical terminology.
- **No real ML inference in demo mode** — Demo patient data is pre-generated synthetic data, not live model output.
- **No test coverage for frontend** — Unit and integration tests for React components are not yet implemented.
- **No Docker Compose stack** — Containerisation is not included in v1.0. Coming in v1.1.
- **Session not invalidated on server restart** — Current SQLite session storage is not persistent across Flask restarts.

---

## [Unreleased]

See [ROADMAP.md](ROADMAP.md) for planned versions.

---

[1.0.0]: https://github.com/saurabhrdj50/neurosense-ai/releases/tag/v1.0.0
