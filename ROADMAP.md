# Roadmap

This document describes the planned evolution of NeuroSense AI across future versions. Items are organised by release milestone and may shift based on community feedback and research priorities.

> **Current stable release:** [v1.0.0](CHANGELOG.md)

---

## v1.1 — Clinical Infrastructure (Q3 2026)

*Focus: Production-grade deployment, interoperability standards, and enhanced security.*

### 🏥 Medical Imaging
- [ ] **DICOM file format support** — Direct import and parsing of DICOM files from hospital imaging archives
- [ ] **PACS integration** — Query and retrieve studies from a hospital Picture Archiving and Communication System via DICOM C-FIND / C-MOVE
- [ ] **Real multi-planar reconstruction** — Generate true axial, coronal, and sagittal views from a 3D DICOM volume rather than simulated multi-planar overlays
- [ ] **NIFTI support** — Import and display NIfTI-formatted MRI volumes (common in research datasets)

### 🔌 Interoperability
- [ ] **HL7 v2 message parsing** — Receive and send ADT, ORU, and ORM HL7 messages for EHR event integration
- [ ] **HL7 FHIR R4 REST API** — Expose patient records, observations, and diagnostic reports as FHIR resources (`Patient`, `Observation`, `DiagnosticReport`)
- [ ] **SMART on FHIR launch** — Enable NeuroSense AI to be launched from within Epic, Cerner, and other FHIR-compliant EHRs as a SMART app

### 🔐 Security & Access Control
- [ ] **JWT / OAuth 2.0 token-based API auth** — Replace session cookies with stateless JWT tokens for API consumers
- [ ] **Granular RBAC** — Configurable permission sets per user beyond the binary Doctor/Admin model (e.g., Read-Only Resident, Head Neurologist, Radiologist)
- [ ] **Audit log viewer** — Searchable, exportable audit trail for all patient data access events (HIPAA requirement)
- [ ] **Two-factor authentication (TOTP)** — Time-based OTP support via authenticator apps

### 🛠️ Infrastructure
- [ ] **Docker Compose stack** — Single-command `docker compose up` for local development and on-premises deployment
- [ ] **PostgreSQL migration** — Replace SQLite with PostgreSQL for concurrent, production-grade workloads
- [ ] **Redis session store** — Persistent, scalable session management
- [ ] **Redis-backed rate limiting** — Distributed rate limiting across multiple API server instances
- [ ] **Automated database migrations** — Alembic-based schema migration management
- [ ] **Nginx production configuration** — Reference Nginx config with TLS termination, gzip, and security headers

### 🧪 Testing
- [ ] **React component unit tests** — Vitest + React Testing Library coverage for all UI components
- [ ] **Playwright end-to-end tests** — Automated browser tests for full user journeys (login → analysis → results)
- [ ] **Backend API integration tests** — Expand pytest suite to cover all 28 endpoints with fixtures

---

## v1.2 — AI & Explainability (Q4 2026)

*Focus: More accurate models, richer explanations, and federated learning groundwork.*

- [ ] **3D CNN MRI classification** — Replace EfficientNet-B0 with a 3D volumetric model (e.g., Med3D or nnU-Net) for whole-volume analysis
- [ ] **LIME explanations** — Add LIME-based perturbation explanations as an alternative to SHAP
- [ ] **Counterfactual explanations** — Show clinicians the minimal change needed to cross a diagnostic threshold ("If tau dropped by 15%, risk would be Mild")
- [ ] **Model versioning** — Track model checkpoint versions, evaluation metrics, and per-patient inference history with MLflow
- [ ] **Federated learning prototype** — Privacy-preserving aggregated model training across multiple hospital sites without sharing patient data
- [ ] **Live Grad-CAM on upload** — Real-time saliency map generation when a new MRI file is uploaded

---

## v2.0 — Enterprise & Cloud (2027)

*Focus: Hospital-scale deployment, live AI services, and commercial-grade infrastructure.*

### ☁️ Cloud & Scale
- [ ] **Cloud-native deployment** — Reference architectures for AWS (ECS/RDS/S3), Azure (App Service/PostgreSQL), and GCP (Cloud Run/Cloud SQL)
- [ ] **Kubernetes Helm chart** — Production-grade Kubernetes deployment with horizontal pod autoscaling
- [ ] **CDN-backed static assets** — Frontend served via CloudFront / Cloudflare for global low-latency access
- [ ] **Async analysis pipeline** — Celery + Redis task queue for long-running analysis jobs (replaces synchronous HTTP response)

### 🤖 Live AI
- [ ] **Real-time speech transcription** — WebSocket-based streaming transcription via Deepgram or Whisper API (replacing batch SpeechRecognition)
- [ ] **GPT-4 / Claude clinical reports** — High-quality narrative report generation using frontier LLMs with clinical prompt engineering
- [ ] **Biomarker trend prediction** — Longitudinal progression forecasting using transformer-based time-series models

### 🏥 Hospital Integration
- [ ] **Epic MyChart integration** — Deep-link to patient chart from NeuroSense AI results page
- [ ] **Cerner PowerChart integration** — NeuroSense AI diagnostic report pushed to Cerner as a clinical note
- [ ] **Automated appointment scheduling** — Trigger follow-up neurology appointment from within the results page
- [ ] **ICD-10 code suggestion** — Suggest relevant ICD-10 codes (G30.x, F02.x) based on diagnostic stage for billing and coding

### 📱 Mobile
- [ ] **Progressive Web App (PWA)** — Installable on iPad / Android tablets for bedside rounds
- [ ] **React Native companion app** — Native iOS and Android app for field assessments
- [ ] **Offline mode** — Full offline functionality with local demo dataset for connectivity-limited environments

---

## Community Proposals

Have an idea not on this roadmap? Open a [GitHub Discussion](https://github.com/saurabhrdj50/neurosense-ai/discussions) tagged `enhancement` and describe the clinical use case and technical approach. Ideas with strong community support will be prioritised for upcoming milestones.

---

*Last updated: July 2026*
