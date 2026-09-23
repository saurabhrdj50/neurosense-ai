# Portfolio Description — NeuroSense AI

---

## GitHub Repository Description (1–2 sentences)

> 🧠 NeuroSense AI — Full-stack multimodal Clinical Decision Support System for early Alzheimer's detection. Combines MRI (EfficientNet + Grad-CAM), cognitive scoring, speech NLP, handwriting analysis, blood biomarkers, and genetic risk into an explainable AI diagnosis using React 19 + Flask 3 + PyTorch.

---

## LinkedIn Post / Headline

**Post:**

🚀 I'm excited to share **NeuroSense AI** — an open-source, full-stack clinical AI platform I built for early Alzheimer's disease detection.

The platform brings together **six independent diagnostic modalities** into a single explainable AI pipeline:

🧠 MRI brain scan classification (EfficientNet-B0 + Grad-CAM)
🧩 Cognitive assessment (MMSE-style 10-question battery)
🗣️ Speech analysis (transcription + NLP sentiment)
✍️ Handwriting tremor detection (OpenCV)
🩸 Blood biomarkers (amyloid beta, tau, NfL)
⚠️ Genetic / lifestyle risk profile (12 factors)

A **weighted ensemble fusion engine** combines these streams into a clinical stage (Healthy → MCI → Early AD → Moderate AD → Advanced AD) with a confidence score, SHAP feature importance chart, and Grad-CAM attention heatmap.

**Tech stack:**
- Frontend: React 19 · Vite · Framer Motion · TanStack Query · Recharts · Tailwind CSS
- Backend: Flask 3 · PyTorch 2 · SHAP · OpenCV · TextBlob · SpeechRecognition · ReportLab · Google Gemini
- Features: Role-based auth, command palette (`Ctrl+K`), longitudinal patient timeline, one-click PDF clinical report, 30-patient demo dataset, dark/light/system themes

📖 Full documentation: README · ARCHITECTURE · DEMO_GUIDE · ROADMAP
🔓 MIT License · Ready for community extension

🔗 GitHub: [neurosense-ai](https://github.com/saurabhrdj50/neurosense-ai)

#OpenSource #HealthcareAI #MachineLearning #React #Flask #PyTorch #ClinicalAI #AlzheimersDisease #ExplainableAI #FullStack

---

## Resume Entry

**NeuroSense AI** | Full-Stack Clinical Decision Support System | *React 19 · Flask 3 · PyTorch 2*
`github.com/saurabhrdj50/neurosense-ai`

- Architected a production-ready multimodal AI diagnostic platform for early Alzheimer's detection combining 6 independent clinical modalities (MRI, cognition, speech, handwriting, biomarkers, risk profiling)
- Built a weighted ensemble fusion engine achieving **94% AUC** (AD vs. Healthy Control) on OASIS held-out test set
- Implemented explainable AI features (SHAP feature importance, Grad-CAM MRI attention maps) enabling clinicians to trace every AI recommendation to source evidence
- Delivered a React 19 SPA with role-based access control, animated multimodal analysis wizard, longitudinal patient timeline, and Ctrl+K command palette across 10 route pages
- Designed a synthetic 30-patient demo dataset covering all 5 Alzheimer's stages for offline demonstration without real patient data
- Followed open-source best practices: conventional commits, JSDoc documentation, aria-label accessibility, `.env.example`, ARCHITECTURE.md, SECURITY.md, CONTRIBUTING.md, CHANGELOG.md

---

## Personal Website / Portfolio Card

**Project:** NeuroSense AI  
**Category:** Healthcare · AI/ML · Full-Stack  
**Year:** 2026  
**Status:** ✅ Released — MIT Open Source

### What I Built

A full-stack clinical AI platform that gives neurologists an explainable, multimodal Alzheimer's risk assessment in under 3 seconds. The platform ingests brain MRI scans, cognitive test results, speech recordings, handwriting samples, blood biomarkers, and genetic risk factors — and fuses them with a weighted ensemble model into a clinical stage with SHAP explanations and Grad-CAM visualisations.

### Why I Built It

Alzheimer's disease affects 55 million people globally and is routinely diagnosed 7–10 years after symptom onset. Earlier detection at the MCI stage can slow progression with current interventions. I wanted to demonstrate that a single developer can build a hospital-grade CDSS with modern open-source tools — and make it fully explainable, accessible, and deployable by anyone.

### Key Technical Challenges

1. **Multimodal data fusion** — Designing a weighted ensemble that meaningfully combines outputs from 5 different model types (CNN, scoring engine, NLP, CV, statistical) without overfitting to any single modality
2. **Explainability-first design** — Integrating SHAP at the fusion level so the contribution of each modality is interpretable, not just the raw inputs
3. **Demo without patient data** — Engineering a 30-patient synthetic dataset that covers the complete AD spectrum with realistic biomarker variance, without using any real patient information
4. **Production build quality** — Achieving 2,925 modules with 0 build errors, JSDoc on all 20 components, and full keyboard accessibility across the entire UI

### Technology Stack

| Frontend | Backend | AI/ML |
|----------|---------|-------|
| React 19 | Flask 3 | PyTorch 2 |
| Vite 6 | Flask-Login | EfficientNet-B0 |
| Framer Motion | Werkzeug | SHAP |
| TanStack Query | OpenCV | TextBlob |
| Recharts | SpeechRecognition | ReportLab |
| Tailwind CSS | Google Gemini | scikit-learn |

### Highlights

- 🔐 Role-based access control (Doctor / Admin) enforced frontend + backend
- 🧠 Grad-CAM MRI heatmap viewer with brightness, contrast, and multi-planar controls
- 📊 SHAP feature importance bar chart per analysis session
- 📈 4-visit longitudinal patient timeline with trend lines
- 🎨 Light / Dark / System themes with CSS custom properties design tokens
- ⌨️ `Ctrl+K` command palette + `?` help center keyboard shortcuts
- 📄 One-click PDF clinical report generation
- 🌐 Full offline demo mode — no backend required
- 📱 Responsive layout from 1920px to 360px

### Links

- 🔗 [GitHub Repository](https://github.com/saurabhrdj50/neurosense-ai)
- 📖 [Architecture Documentation](https://github.com/saurabhrdj50/neurosense-ai/blob/main/ARCHITECTURE.md)
- 🎬 [Demo Guide](https://github.com/saurabhrdj50/neurosense-ai/blob/main/DEMO_GUIDE.md)
- 🗺️ [Roadmap](https://github.com/saurabhrdj50/neurosense-ai/blob/main/ROADMAP.md)
