# NeuroSense AI — Backend API & Inference Service

High-performance, asynchronous REST API and Machine Learning service powering NeuroSense AI. Built with **FastAPI**, **SQLAlchemy 2**, **Pydantic v2**, **Celery + Redis**, **MinIO**, and **PostgreSQL 16**.

> **⚠️ Clinical Disclaimer**: NeuroSense AI is an educational and research decision-support tool, not an FDA-approved diagnostic device. All API outputs provide probabilistic screening signals intended to assist clinicians, not replace professional neurological evaluation.

---

## 🛠️ Architecture & Core Subsystems

```
                                  ┌─────────────────────────┐
                                  │   React 19 Frontend     │
                                  └────────────┬────────────┘
                                               │ HTTP / Signed Cookie Session
                                               ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                  FastAPI Application                                      │
│  - SessionMiddleware (Cryptographic Cookies)        - SlowAPI Rate Limiting              │
│  - Fernet PHI Encryption (HIPAA safeguards)         - Pydantic v2 Validation Contracts   │
└──────┬──────────────────────┬──────────────────────┬──────────────────────┬───────────────┘
       │                      │                      │                      │
       ▼                      ▼                      ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Auth Router  │       │ Patients API │       │ Analysis API │       │ History/Admin│
│ (/api/auth)  │       │(/api/patients│       │(/api/analysis│       │ (/api/...)   │
└──────────────┘       └──────────────┘       └──────┬───────┘       └──────────────┘
                                                     │
                                                     ▼
                         ┌───────────────────────────────────────────────┐
                         │             Hybrid Job Dispatcher             │
                         │   (In-Process ThreadPool OR Celery Queue)     │
                         └───────┬───────────────────────────────┬───────┘
                                 │                               │
                                 ▼                               ▼
                   ┌───────────────────────────┐   ┌───────────────────────────┐
                   │    In-Process Workers     │   │   Celery Worker (Redis)   │
                   │ (Dev / Single-Node Mode)  │   │  (Distributed Production) │
                   └─────────────┬─────────────┘   └─────────────┬─────────────┘
                                 │                               │
                                 └───────────────┬───────────────┘
                                                 │
                                                 ▼
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Machine Learning Engines                                  │
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────────┐  │
│ │   Brain MRI Engine   │  │ Acoustic DSP Engine  │  │      DistilBERT NLP Engine       │  │
│ │ ResNet-18 + Grad-CAM │  │Jitter, Shimmer, HNR, │  │ 768-dim Embeddings + LogReg      │  │
│ │ NIfTI Volumetric 3D  │  │ Formants, Vocal Risk │  │ Local Whisper ASR Transcriber    │  │
│ └──────────────────────┘  └──────────────────────┘  └──────────────────────────────────┘  │
│ ┌──────────────────────────────────────────────────────────────────────────────────────┐  │
│ │                     Two-Tier Hybrid Multimodal Fusion Engine                         │  │
│ │ Tier 1: Cross-Modal Speech Gating  │  Tier 2: Attentive Evidential Decision Fusion   │  │
│ └──────────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Features

1. **Strict Data Validation & Contracts**:
   - Pydantic v2 schemas enforce typed contracts across requests, responses, diagnostic stages, and error payloads.
2. **Two-Tier Hybrid Multimodal Fusion**:
   - Synthesizes MRI, Acoustic DSP, Speech NLP, Cognitive (MMSE), and Clinical Risk factors into an evidential consensus stage with dynamic missing-modality re-normalization and epistemic uncertainty metrics.
3. **Decoupled Asynchronous Processing**:
   - Offloads compute-heavy MRI and audio inference to Celery background workers via Redis, preventing HTTP request blocking.
   - Includes automatic polling endpoints (`/api/analysis/status/{job_id}`) and fallback in-process thread pool.
4. **HIPAA-Grade Security & PHI Encryption**:
   - Patient names, contact details, and medical records are encrypted at rest using **Fernet symmetric encryption**.
   - User passwords protected with memory-hard **scrypt** cryptographic hashing.
5. **Flexible Multi-Backend Storage**:
   - Stores raw MRI volumes (`.nii`, `.nii.gz`) and audio clips in **MinIO S3 object storage** with expiring presigned download URLs.
   - Automatically falls back to local filesystem storage if MinIO is not deployed.
6. **Zero-Configuration Dual-Database Engine**:
   - Runs out-of-the-box on **SQLite** (`patient_data.db`) for rapid local development.
   - Seamlessly upgrades to **PostgreSQL 16** via `DATABASE_URL` with **Alembic** schema migrations.

---

## 🚀 Setup & Execution Guide

### 1. Bare-Metal Development Setup (Python 3.11+)

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Launch FastAPI development server
python run.py
```
*The server starts on port `10000` (or the port defined in `$PORT`).*

### 2. Running with PostgreSQL, Redis, and MinIO

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/neurosense \
REDIS_URL=redis://localhost:6379/0 \
STORAGE_BACKEND=minio \
MINIO_ENDPOINT=localhost:9000 \
python run.py
```

### 3. Starting the Dedicated Celery Worker

To process inference jobs asynchronously in a separate process:

```bash
cd backend
source venv/bin/activate
celery -A app.celery_app.celery_app worker --loglevel=info -c 2
```

### 4. Interactive OpenAPI Documentation

When running in `development` mode (`APP_ENV=development`), interactive documentation is available at:
- **Swagger UI**: [http://localhost:10000/docs](http://localhost:10000/docs)
- **ReDoc**: [http://localhost:10000/redoc](http://localhost:10000/redoc)

---

## ⚙️ Configuration Reference (`.env`)

Configuration settings are loaded from `backend/.env` or system environment variables:

| Variable | Default Value | Description |
|---|---|---|
| `APP_ENV` | `development` | Set to `production` in production (disables `/docs`, enforces HTTPS cookies). |
| `PORT` | `10000` | Port for the Uvicorn web server. |
| `SECRET_KEY` | Autogenerated dev key | Secret key for cryptographic session cookie signing. |
| `DATABASE_URL` | SQLite fallback | Database connection URI (`postgresql://...` or `sqlite:///...`). |
| `STORAGE_BACKEND` | `local` | Storage engine: `minio` (S3 object storage) or `local` (filesystem). |
| `MINIO_ENDPOINT` | `""` | MinIO server host and port (e.g., `localhost:9000` or `minio:9000`). |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO administrative access key. |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key. |
| `MINIO_BUCKET` | `neurosense-uploads` | S3 bucket for scans and audio recordings. |
| `REDIS_URL` | `redis://localhost:6379/0` | Connection string for Redis broker and cache. |
| `USE_CELERY` | `false` (dev) / `true` (prod)| When `true`, dispatches inference tasks to Celery workers. |
| `ML_JOB_WORKERS` | `2` | Number of worker threads when running in-process. |
| `WHISPER_MODEL` | `base` | Whisper checkpoint size (`tiny`, `base`, `small`, `turbo`). |
| `SPEECH_NLP_ENABLED` | `true` | Enables the DistilBERT linguistic dementia classifier. |
| `SEED_DEMO_USERS` | `true` | Automatically provisions default demo accounts on startup. |

---

## 👥 Default Demo Credentials

When `SEED_DEMO_USERS=true`:

| Role | Email | Password |
|---|---|---|
| **Doctor / Clinician** | `doctor@neurosense.ai` | `Doctor@123` |
| **System Administrator** | `admin@neurosense.ai` | `Admin@123` |

---

## 📂 Backend Directory Structure

```
backend/
├── app/
│   ├── api/routes/           # Modular REST API route handlers
│   │   ├── auth.py           # Login, registration, session management
│   │   ├── patients.py       # Patient directory, longitudinal records, PHI
│   │   ├── analysis.py       # Assessment submission, job polling, results
│   │   ├── history.py        # Longitudinal screening history & clinical reports
│   │   └── admin.py          # Doctor credentialing & system administration
│   ├── features/             # Business domain feature services
│   │   ├── analysis/         # Analysis orchestration, recommendations, retry logic
│   │   └── patients/         # Patient repository and validation services
│   ├── ml/                   # Machine learning inference subsystem
│   │   ├── mri/              # ResNet models, NIfTI volumetric pipeline, Grad-CAM
│   │   ├── speech/           # Whisper ASR, Acoustic DSP Biomarkers, DistilBERT NLP
│   │   ├── cognitive/        # Neuropsychological test scoring & MMSE mapping
│   │   ├── risk/             # Cardiovascular, genetic (APOE4), & lifestyle profiler
│   │   ├── fusion/           # Two-Tier Hybrid Multimodal Fusion Engine
│   │   └── reporting/        # Automated clinical PDF report generator (ReportLab)
│   ├── shared/               # Shared infrastructure and utilities
│   │   ├── db_orm.py         # SQLAlchemy 2 engine, sessions, declarative base
│   │   ├── storage.py        # MinIO S3 client & local disk storage fallback
│   │   ├── jobs.py           # Hybrid job manager (ThreadPool & Celery bridge)
│   │   ├── security.py       # scrypt hashing, Fernet encryption, session cookies
│   │   └── validation.py     # Pydantic v2 validation contracts & schemas
│   ├── models/               # Model checkpoint storage (see README.md in directory)
│   ├── tasks/                # Celery task definitions (analysis_tasks.py)
│   └── celery_app.py         # Celery Redis application configuration
├── alembic/                  # Database migration scripts & environment
├── tests/                    # Exhaustive Pytest test suite (200 test cases)
├── scripts/                  # Utilities (seed_demo.py, migrate_sqlite_to_pg.py)
├── Dockerfile                # Multi-stage production container build
├── requirements.txt          # Python dependency specifications
└── run.py                    # Server entry point
```

---

## 🧪 Testing & Quality Assurance

The backend includes a comprehensive, network-isolated test suite of **200 test cases**:

```bash
cd backend
source venv/bin/activate

# Execute all backend tests
pytest

# Execute specific test suites
pytest tests/test_hybrid_fusion.py          # Tier 1 & 2 Multimodal Fusion
pytest tests/test_acoustic_biomarkers.py    # Voice Jitter, Shimmer, HNR, Formants
pytest tests/test_speech_nlp.py             # DistilBERT NLP Transcript Classifier
pytest tests/test_celery_integration.py     # Celery dispatch & Redis status checks
pytest tests/test_minio_storage.py          # MinIO S3 upload & presigned URLs
pytest tests/test_auth.py                   # Authentication, sessions, & rate limits
pytest tests/test_security.py               # Fernet PHI encryption & password hashing
```

All tests pass cleanly without requiring external cloud connections.
