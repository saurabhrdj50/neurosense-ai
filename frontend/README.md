# NeuroSense AI — Clinical Frontend & Medical Diagnostic Workspace

Modern, research-grade medical decision-support dashboard built with **React 19**, **Vite 6**, **Tailwind CSS**, **NiiVue (WebGL 2.0)**, **TanStack Query v5**, and **Framer Motion**.

> **⚠️ Clinical Scope**: NeuroSense AI is an educational and translational research interface designed to assist clinicians in evaluating multimodal dementia screening data. It is not an FDA-approved diagnostic tool.

---

## 🌟 Workspace Features & Diagnostic Modules

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                NeuroSense AI Web Client                                │
├────────────────────────────┬────────────────────────────┬──────────────────────────────┤
│    Assessment Wizard       │    Diagnostic Viewers      │    Clinical Operations       │
├────────────────────────────┼────────────────────────────┼──────────────────────────────┤
│ • 6-Step Clinical Flow     │ • NiiVue 3D WebGL Viewer   │ • Longitudinal Timeline      │
│ • Patient Demographics     │ • Axial/Coronal/Sagittal   │ • Patient Registry (PHI Safe)│
│ • 2D / 3D NIfTI Upload     │ • Live Grad-CAM Blending   │ • Clinical PDF Reports       │
│ • Microphone Voice Capture │ • Acoustic Biomarker Panel │ • Doctor Credentialing Admin │
│ • Cognitive Battery (MMSE) │ • Annotated Transcripts    │ • Dark / Light Theme System  │
│ • 18-Hazard Risk Profiler  │ • XAI Consensus Fusion     │ • Offline-Ready PWA v2.0     │
└────────────────────────────┴────────────────────────────┴──────────────────────────────┘
```

### 1. NiiVue 3D WebGL Multi-Planar Neuroimaging Viewer
- **Synchronous Multi-Planar Orthogonal Slicing**: Inspects Axial, Coronal, and Sagittal planes simultaneously with synchronous millimetric crosshair tracking.
- **3D Volume Raycasting Render**: Native WebGL 2.0 volume rendering mode (`SLICE_TYPE.RENDER`) allowing arbitrary rotation and 3D exploration of brain anatomy.
- **Dynamic Saliency Layer (Grad-CAM)**: Interactive opacity slider ($0\% - 100\%$) blending model activation heatmaps onto underlying structural scans.
- **Medical Colormaps & Contrast**: Real-time window/level contrast adjustment and multi-colormap support (Grayscale, Viridis, Magma, Turbo, Warm, Bone).

### 2. Acoustic Voice Biomarkers & Speech Visualizer
- **Vocal Risk Gauge**: Visual indicator summarizing dysprosodic vocal perturbations (Jitter %, Shimmer %, HNR dB, and Formants $F_1, F_2$).
- **Interactive Annotated Transcript**: Formatted speech transcript with highlighted hesitation chips (`[pause]`, `[um]`, `[ah]`), pronoun-to-noun distribution, and vocabulary richness (TTR) indicators.
- **In-Browser Audio Recording & Assembly**: Micro-recorder supporting live microphone input and audio file concatenation with lossless 16-bit PCM WAV encoding.

### 3. Two-Tier Multimodal Fusion & Explainability (XAI)
- **Consensus Diagnostic Radar**: Visual breakdown of stage agreements across MRI, Speech, Cognitive, and Risk streams.
- **Epistemic Uncertainty Metric**: Gauge measuring statistical variance across modalities to alert clinicians when test findings diverge.
- **Transparent Modality Weights**: Dynamic weight breakdown showing exact percentage contribution of each diagnostic test to the final consensus.

### 4. Longitudinal Patient Records & PDF Generation
- Historical tracking across successive appointments with progression graphs.
- One-click generation and streaming download of cryptographically timestamped clinical PDF consultation summaries.

---

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/) (fast HMR and route-level code splitting).
- **Medical Imaging Engine**: `@niivue/niivue` (High-performance WebGL 2.0 neuroimaging renderer).
- **Styling & UI**: [Tailwind CSS](https://tailwindcss.com/) with custom medical glassmorphism tokens, accessible contrast, and adaptive dark/light themes.
- **State Management & Caching**: [TanStack Query v5](https://tanstack.com/query/latest) for server state caching, optimistic UI updates, and background polling.
- **Micro-Animations**: [Framer Motion](https://www.framer.com/motion/) with support for `prefers-reduced-motion`.
- **Data Visualization**: [Recharts](https://recharts.org/) for radar distributions and class probability bars.
- **Progressive Web App (PWA)**: `vite-plugin-pwa` + Workbox service workers for offline caching and instant load times.

---

## 🚀 Setup & Execution Guide

### Prerequisites
- **Node.js**: `20.x` or higher
- **npm**: `10.x` or higher

### 1. Installation & Local Development

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The application will launch at [http://localhost:3000](http://localhost:3000).

> **API Proxy Configuration**: During development, `vite.config.js` automatically proxies `/api` requests to `http://localhost:10000` (FastAPI backend), providing seamless cookie transmission and eliminating CORS friction.

### 2. Available NPM Scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `npm run dev` | Starts the local development server on port 3000 with HMR. |
| `build` | `npm run build` | Compiles optimized production bundle into `dist/`. |
| `preview` | `npm run preview` | Locally serves and previews the production build. |
| `lint` | `npm run lint` | Runs ESLint to verify code quality and style conventions. |
| `test` | `npm test` | Runs the Vitest test suite in single-run mode. |
| `test:watch` | `npm run test:watch` | Runs Vitest in interactive file-watching mode. |

---

## 📂 Frontend Directory Structure

```
frontend/
├── src/
│   ├── app/                      # Application root, routing, and global layout
│   │   ├── App.jsx               # Route definitions and navigation guards
│   │   └── AppLayout.jsx         # Persistent sidebar, topbar, and frame
│   ├── features/                 # Modular feature domains
│   │   ├── auth/                 # Sign-in, registration, credentials
│   │   ├── patients/             # Patient registry, search, profile creation
│   │   ├── analysis/             # 6-step assessment wizard:
│   │   │   ├── patient/          # Step 1: Patient selection & demographics
│   │   │   ├── mri/              # Step 2: MRI scan upload & preview
│   │   │   ├── speech/           # Step 3: Voice recording & audio merger
│   │   │   ├── cognitive/        # Step 4: MMSE & neuropsychological battery
│   │   │   ├── risk/             # Step 5: 18-hazard clinical risk questionnaire
│   │   │   └── review/           # Step 6: Modality review & submission
│   │   ├── results/              # Diagnostic consensus workspaces:
│   │   │   ├── mri/              # NiiVue 3D WebGL viewer & Grad-CAM controls
│   │   │   ├── speech/           # Acoustic biomarker gauges & transcript
│   │   │   ├── cognitive/        # Cognitive subscale radar & scoring
│   │   │   ├── risk/             # Clinical risk hazard breakdown
│   │   │   └── fusion/           # Two-Tier XAIPanel & evidential metrics
│   │   ├── history/              # Longitudinal progression timeline & PDF downloads
│   │   ├── dashboard/            # Clinical activity overview & statistics
│   │   ├── admin/                # Doctor credentialing & system administration
│   │   └── landing/              # Clinical landing page & technology showcase
│   ├── shared/                   # Shared UI primitives, hooks, and helpers
│   │   ├── components/ui/        # Button, Modal, Tabs, DropZone, Skeleton, GlassCard
│   │   ├── components/layout/    # Sidebar, TopBar, Breadcrumbs
│   │   ├── motion/               # Framer Motion animation variants
│   │   └── utils/                # Clinical mappers, mathematical scalers, audio helpers
│   ├── providers/                # ThemeProvider, AuthContext, QueryProvider
│   ├── index.css                 # Global CSS design tokens & Tailwind directives
│   └── main.jsx                  # React DOM root entry point
├── public/                       # Static assets, PWA icons, web manifest
├── vite.config.js                # Vite configuration & proxy settings
├── tailwind.config.js            # Tailwind theme tokens & color palettes
└── package.json                  # Dependencies and build scripts
```

---

## 🧪 Testing & Code Quality

The frontend is covered by automated unit tests using **Vitest** and **React Testing Library**:

```bash
cd frontend

# Run all 40 unit tests
npm test

# Verify linting hygiene (0 errors, 0 warnings enforced)
npm run lint
```

### Key Test Coverage:
- `SpeechResults.test.jsx`: Acoustic biomarker rendering (Jitter, Shimmer, HNR, Formants, Vocal Risk gauge) and text-only fallbacks.
- `MRIResults.test.jsx`: 2D slice fallback rendering, NiiVue 3D WebGL mode toggles, and Grad-CAM layer controls.
- `audioMerger.test.js`: In-browser 16-bit PCM WAV concatenation and audio chunk header alignment.
- `clinicalMappers.test.js`: Clinical stage translations, color mappings, and risk category bounds.
- `analysisApi.test.js`: Error envelope handling and network retry strategies.
