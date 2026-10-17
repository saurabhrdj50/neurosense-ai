# NeuroSense AI — Modernization Roadmap

Status as of 2026-10-05. "Done" items are implemented, tested, and live on `main`.

## ✅ Done

### Backend migration: FastAPI + PostgreSQL + Alembic + Docker (October 2026)
- **FastAPI replaces Flask entirely** — all 36 endpoints ported to `app/main.py` + `app/api/routes/*` with byte-compatible paths, request/response shapes, and error contracts (`{success, message}` bodies, the exact 401 that drives the frontend's global logout, JSON 404/405/413/429). Verified: 142/142 backend tests, live browser E2E (login → dashboard → patients → async analysis job) against the React frontend.
- **Auth parity, zero Flask-family packages** — signed cookie sessions (Starlette SessionMiddleware, 30-day, `REMEMBER_COOKIE_DAYS`-configurable). Password hashing is pure-stdlib (hashlib scrypt/pbkdf2) reading and writing the historical `method$salt$hash` format, so every existing account hash verifies unchanged — proven against the live database. `secure_filename` and the upload `FileLike` protocol were reimplemented in `app/shared/storage.py`. The PHI Fernet KDF is byte-identical, so encrypted data survives. Users re-login once at cutover (cookie format changed). `flask`, `flask-cors`, `flask-login`, `flask-limiter`, `Werkzeug`, and `gunicorn` are uninstalled from the venv and absent from `requirements.txt`.
- **PostgreSQL is the primary store** — the dual raw-sqlite3/SQLAlchemy stack collapsed into one SQLAlchemy engine (locked singleton, pooled sessions, PG pool sizing, SQLite WAL/FK pragmas fallback). Alembic owns the schema (`alembic upgrade head` runs in the container entrypoint); `scripts/migrate_sqlite_to_pg.py` imports legacy `patient_data.db` data (FK-order copy, sequence re-sync, idempotent).
- **Performance fixes folded in**:
  - killed per-request `create_all()` + seed checks (~50 repo construction sites ran DDL before every request) — schema/seed now runs once at startup;
  - singleton `sessionmaker` (previously rebuilt per call);
  - GZip middleware (history `results_json` blobs compress ~10×);
  - `users.reset_token` / `storage_key` indexes restored at the model level (were raw-DDL-only before);
  - single-process uvicorn fixes the real bug where polling `/jobs/<id>` 404'd when gunicorn's second worker received the poll.
- **Docker** — compose now runs postgres:16 (healthcheck) + FastAPI api + a real frontend image (multi-stage node build → nginx serving dist with a same-origin `/api` proxy, gzip, SPA fallback, 100 MB upload passthrough). Backend CMD applies Alembic then execs uvicorn.
- **CI** — backend job runs the suite against a real postgres:16 service (`TEST_DATABASE_URL`); the suite itself chooses SQLite (default) or PG from that one variable.
- **Deleted** — Flask, flask-login/cors/limiter, gunicorn, the raw sqlite3 module, and ~1,400 lines of duplicated HTTP/validation code. Free win: `/docs` OpenAPI (non-production).
- Remaining backend imports of Flask: zero.

### UX & design-system pass (October 2026)
- **antd removed entirely** — LoginPage rewritten on the shared token system (`ui/Button`, custom checkbox/inputs), AdminPanel's `Modal.confirm` and the last `window.confirm` replaced by a shared `ui/ConfirmModal` with async error handling; `AuthThemeConfig.js` deleted. Zero antd chunks in the built bundle; lockfile synced.
- **Landing page overhaul** — scroll-reveal animations on every section (`Reveal` + `whileInView`, honoring reduced-motion), animated aurora hero field, animated "analysis console" product illustration (Grad-CAM tile with scan sweep, modality bars, fused-verdict chip), Lucide icon tiles replacing emoji feature cards, CountUp stats, mobile nav dropdown, scroll-progress hairline, real footer anchors, dead demo-request modal (~100 lines) removed.
- **Motion & polish system-wide** — theme switches crossfade via a scoped `theme-anim` class (replaces the permanent universal `*` transition — a real perf win); sliding active pill in the Sidebar and Tabs via framer-motion `layoutId`; visible `⌘K` search trigger in the TopBar; dashboard greeting header, KPI icon tiles, skeleton loaders (replaces `...`), richer empty states, gradient chart fills; `AnimatedBg`, `ConsoleMock`, and hero reveals collapse to static under reduced motion.
- **Primitive tokenization** — Modal (now portal-rendered with spring animation), Skeleton, Tabs, DropZone, ProgressBar, PageLoader, ErrorBoundary (light mode was broken) all moved from hardcoded slate/blue to semantic tokens.
- **Theme-aware AnalysisLoader** backdrop (light mode no longer gets a dark void), GlassCard `glow` prop implemented (was silently ignored).
- **Dead code removal** — `CLINICAL_PRESETS` in PatientStep, dead `_patientText`/`_onSubmit` props + call sites, unused icon imports across 5 files.
- Verified: ESLint clean, 27/27 frontend tests, production build OK, full app smoke-tested in a real browser in both themes (landing, login, dashboard, patients, wizard).

### Architecture & reliability (backend)
- **Background analysis jobs** — `POST /api/analysis/analyze-async` returns `202 {job_id}` immediately; the analysis runs in a bounded thread pool (`ML_JOB_WORKERS`, default 2). `GET /api/analysis/jobs/<id>` reports real per-stage progress (`mri → notes → speech → cognitive → risk → fusion → explanation → recommendations`) and the completed result. Long Whisper/MRI runs can no longer hold or time out an HTTP worker.
- **Graceful client fallback** — the frontend falls back to the sync endpoint if the job API is unavailable.
- Job registry is memory-backed (single-process deployments). See "Next" for the multi-worker story.

### Frontend
- **Route-level code splitting** — every route lazy-loads; per-route chunks replace the single 473 KB bundle.
- **Dark mode** — real theme state (system default + persisted), CSS-variable token palette, toggle in TopBar/landing, no flash-on-load (class applied pre-React).
- **TanStack Query** — patients list, dashboard, and history surfaces run on queries with cache invalidation after mutations (register/delete) — no more stale lists.
- **Motion system** — shared variants module (`src/shared/motion/`), page transitions, staggered list/KPI entrances, count-up KPI numbers, all honoring the `neurosense_motion` reduced-motion preference.
- **Async analyze UX** — the loader now shows the actual pipeline stage and progress from the job API instead of a fake timeline.
- **Per-route page titles**, scroll restoration, pre-paint theme script.

### Quality
- ESLint: 0 errors with JSX-aware rules (`eslint-plugin-react`), CI lint **blocking**.
- 163 backend tests, 25+ frontend tests, CI runs backend pytest + frontend lint/test/build.

### Phases 2–6: PostgreSQL, DB optimization, Docker, hardening, load testing (October 2026)
- **PostgreSQL live-verified** — schema applied via Alembic, demo data imported with schema-aware type coercion (`migrate_sqlite_to_pg.py` fixed: SQLite stores booleans as INTEGER), **148/148 tests green against real PostgreSQL 16.2**, and the API served from PG with migrated logins working. Locally validated on an embedded PG instance; CI runs the same suite against postgres:16.
- **Database optimization** — models now declare every index (kills autogenerate drift); migration `824854532f1c` adds `idx_sessions_timestamp` (global history ordering), composite `audit_log(action,timestamp)` / `(resource_type,timestamp)` (filtered audit queries), and a partial `users(reset_token_active)` index. `EXPLAIN` on a 20k-row sessions table confirms index-scan selection; PG engine gains `pool_use_lifo` + `application_name`.
- **Docker + nginx** — compose gains `restart: unless-stopped`, `stop_grace_period` (in-flight ML jobs), PG `shm_size`, web healthcheck. nginx hardened: `server_tokens off`, edge rate limits (`auth_zone` 30 r/m, `api_zone` 600 r/m), keepalive upstream, security headers, `/healthz`, gzip vary.
- **Production hardening** — `SecurityHeadersMiddleware` (nosniff / DENY / referrer-policy / HSTS when HTTPS-first), optional `TRUSTED_HOSTS` allowlist, `--no-server-header`, `Cache-Control: private, no-cache` on patient photos (PHI), per-route `30/minute` limits on the analyze surface, `RATELIMIT_DEFAULT_LIMITS` knob for shared-NAT offices, `/docs` auto-disabled in production (verified).
- **Load testing** — `scripts/load_test.py` (async, 25 vusers × 45s, scenario mix incl. PDF generation): **82 RPS sustained, 0 errors**, p50 303ms / p95 521ms at realistic volume; per-endpoint single-request latencies 6–44ms. Stress test at 20k sessions exposed the real scaling limit: unpaginated list endpoints (8.7 MB response, 1.4s) — pre-existing design, flagged as next-step. Sandbox ceiling measured at ~440–730 RPS via a minimal ASGI baseline; the app itself adds ~10–30% overhead.

### UX & performance build-out (October 2026, part 2)

The recommendations set from the review was implemented in three waves. Wave 1 + the full Wave 2 are now done.

**Pagination end-to-end (the biggest perf win).** Every list endpoint now pages server-side — `/api/analyses`, `/api/patients`, `/api/admin/patients`, `/api/admin/sessions`, `/api/admin/audit-log` — with a `{rows, total, limit, offset}` envelope, 200-row cap per page, and offset clamping. The frontend walks pages through one shared accumulator (`shared/utils/paginatedFetch.js`, 200/page, analyses capped at 1,000 rows ≈ 0.5 MB vs the 8.7 MB unpaginated response measured at 20k sessions) while keeping the "whole list" contract for search/enrichment joins. Truncation is honest: tab counts and the dashboard header use server `total`s and the dashboard flags when KPIs cover "the latest 1,000 sessions".

**Per-modality retry (new backend capability).** `POST /api/analysis/sessions/{id}/retry {modality: mri|audio}` re-runs a single failed modality from the **stored raw upload** (`features/analysis/retry.py`), re-runs fusion/explanation/recommendations, updates the session row (`SessionRepository.update_results` keeps the original timeline timestamp) and regenerates the PDF. The results page turns `mri_error`/`audio_error` cards into one-click retries (owner or admin, 10/min limit, cross-tenant 403). 5 new tests.

**Annotated transcript.** The transcriber's `annotated_tokens` (filler / pronoun / pause tags) were computed but never rendered — `SpeechResults` now renders them as highlighted, hover-explained tokens with a legend and a plain-language note that these are observed heuristics, not diagnoses.

**Interactive Grad-CAM.** `GradCAMExtractor.generate` now returns three layers: the pre-blended overlay (unchanged, backward-compatible), a **transparent** jet heat-map (alpha = activation), and the original scan PNG. The XAI panel renders a real opacity slider + Overlay/Heatmap/Original toggle instead of a single frozen image.

**Sample-data mode.** "Sample Case" in the wizard loads a fictional patient (`DEMO-001`), a bundled illustrative MRI (full pipeline incl. Grad-CAM runs), a fully derived 15-item cognitive profile (mirrors CognitiveStep's derivation, unit-tested), a clinical-note sample, and a filler/pause-rich speech transcript that exercises the annotated transcript and speech-NLP signal. A first-session "wow" run needs zero real patient material. Text-only fallback if the sample scan can't be fetched.

**Job-complete notifications.** With the tab hidden, finished/failed analysis jobs fire a system Notification with a deep link (permission requested at submission); visible tabs get the toast. `AnalysisPage` wires it into the submit flow.

**Faster-whisper + dead-code removal.** Transcription runs faster-whisper (CTranslate2) as primary with openai-whisper as fallback — same local-only PHI posture, ~4× faster on CPU. Removed: the Google cloud-speech fallback (it sent PHI to a third party), the legacy `audio_result`/`cognitive_risk_score` fusion branch, the TensorFlow log-suppression shims in `run.py`, and the stray root `node_modules/` cache.

**PWA + brand + caching.** `vite-plugin-pwa` (manifest, installable, prompt-for-update via `PwaUpdater` — clinic tablets never hard-reload mid-assessment); the SW caches static assets only and **never** API responses (PHI stays out of CacheStorage). PWA/apple-touch icons generated from the favicon; OG/twitter meta tags; nginx `no-cache` rules for `sw.js`, `manifest.webmanifest`, and the SPA shell; hashed assets keep `immutable`.

**Bundle & infra hygiene.** `rollup-plugin-visualizer` wired behind `VITE_ANALYZE=1`; vendor chunk split (react/react-dom/router/query → `vendor-core`, cache-stable across deploys — misc vendor left to natural splitting after measuring that a forced misc chunk pushed every page's icons into first paint). Redis-backed job-store mirror in `app/shared/jobs.py` (survives restarts when `REDIS_URL` is set); ETag middleware on GET responses + slow-request warning; stage-colored banner on the PDF report header; nightly `pg_dump` sidecar (`db_backup`, 02:30 UTC, 14-dump retention) in docker-compose; `SECURITY.md` covering PHI posture, consent, and restore-drill responsibilities.

**Playwright E2E (verified locally).** `frontend/e2e/app.spec.js` drives the real stack (uvicorn + vite, both auto-started by `playwright.config.js`): bad-password rejection and the full login → sample-data → analyze → results walkthrough (tolerant of MRI weights being absent). New `e2e` CI job installs backend deps **without** torch/whisper (all ML imports are lazy) and runs the suite headless. Local result: 2/2 passing, walkthrough ≈ 17 s.

**Verified** — 171 backend tests green (+8 new), 30 frontend tests, ESLint clean, production build clean, PWA artifacts emitted, E2E 2/2.

### Research model integration: Speech NLP + MRI lineage (October 2026)



The root-level `Speech/` and `Alzheimer_Training/` folders are research workspaces (training notebooks, checkpoints, result CSVs). Everything integrable from them is now either **live in the product** or **verified as already integrated**; everything not integrable is documented below with the exact blocker. None of the research numbers are presented as clinical validation — all models are screening signals, not diagnostic instruments.

#### Speech NLP dementia classifier — LIVE (from `Speech/NeuroSense_Final/NLP/`)

- **The model**: `distilbert_only_model.joblib` → deployed at `backend/app/models/speech/` (runtime asset, gitignored like the MRI checkpoint). Mean-pooled `distilbert-base-uncased` embeddings (768-dim) → `StandardScaler` → balanced `LogisticRegression`, decision threshold 0.5. Trained on 362 picture-description transcripts (Pitt corpus), zero participant overlap with evaluation sets.
- **Research performance** (from the handoff README + `NEUROSENSE_NLP_MASTER_RESULTS.json`): participant-level validation (n=51) accuracy **0.8235**, ROC-AUC **0.8670**, dementia recall 0.7879; frozen held-out test (n=37) accuracy 0.7838, ROC-AUC 0.8793.
- **New module** `app/ml/speech/nlp_classifier.py` — lazy process-wide singleton; degrades gracefully (missing artefact, failed encoder download, or inference error ⇒ no vote, never an exception into the analysis pipeline). A minimum-word gate (`SPEECH_NLP_MIN_WORDS`, default 15) runs **before** any model construction, so short transcripts never trigger the encoder load.
- **Pipeline wiring** — `run_speech_step` attaches the verdict to `audio_transcription` (both uploaded-audio and manual-text paths); `TranscriptionResult` contract extended with `dementia_probability` / `dementia_prediction` / `nlp_classifier` / `nlp_error`; the orchestrator warmup preloads the classifier. Absent/None always means "no vote available", never zero risk.
- **Fusion vote** — a dedicated `speech_nlp_result` channel in `MultimodalFusion.predict()` (the display-only `sentiment` object still never votes — pinned by `test_production_speech_shape_never_fuses`). P(dementia) maps to a stage vote through the canonical `risk_to_stage_index(P×100)` policy; confidence = distance from the 0.5 decision boundary, clamped to [0.1, 0.9] (a 0.52 vote contributes almost nothing, a 0.9 vote contributes real signal). Speech-vote-only analyses now fuse instead of returning "No Data".
- **Frontend** — `SpeechResults` renders the probability with an explicit "research model — not a diagnosis or calibrated probability" disclaimer; the fusion XAI panel picks up the `Speech NLP: P(dementia)=…` evidence line automatically. Speech is now an active fusion input (weight 0.15, the `sentiment` slot).
- **Config / deps / ops** — `SPEECH_NLP_ENABLED` (default on), `SPEECH_NLP_MIN_WORDS` (default 15) in `Config` + `.env.example`; `transformers` / `scikit-learn` / `joblib` added to `requirements.txt`; new `neuro_hf` Docker volume persists the ~268 MB encoder download (`/home/neuro/.cache/huggingface`), mirroring the Whisper cache.
- **Verified** — 163/163 backend tests (new `tests/test_speech_nlp.py`: word gate before model load, threshold/rounding/clamping with stub heads, all fusion-vote paths, speech-step wiring, failure recording; a live end-to-end test runs only with `NEUROSENSE_SPEECH_NLP_LIVE=1` and **passed** against the real artefact + real encoder). Live sanity check: fluent picture-description transcript → P(dementia)=0.21; vague/hesitant transcript → P(dementia)=1.0. Frontend production build green.
- **Caveat recorded in code**: the original embedding helper (`speech_model.nlp.embeddings`) was not part of the delivered artefacts; standard attention-masked mean pooling is used. Re-validate against `Speech/.../NLP/predictions/*_predictions.csv` once the source transcripts are available.

#### Speech acoustic stream — PARKED (blocked, deliberately not fabricated)

- **What exists**: `best_model.pt` (7.9 MB, PyTorch) — verified by direct inspection: `acoustic_proj` Linear(1024→256) for a Wav2Vec2 front-end + `affective_proj` Linear(768→256) for a DistilRoBERTa front-end → fusion MLP → 2-class head (epoch 15). Validation (recording level, n=92): accuracy 0.663, **dementia recall 0.4615**; the ablation shows the acoustic-only branch detects **zero** dementia cases (recall 0.0) — the affective (text-derived) branch drives what little signal exists.
- **Why it is not integrated**: the `speech_model` feature-extraction package (which front-end checkpoints, pooling, and normalization produced the 1024/768-dim inputs) lived only in a Colab ZIP and is **not in the folder**; the audio dataset and pre-extracted feature caches are absent too. Guessing the front-ends would yield numbers that cannot be validated against anything — for a clinical screening product that is worse than not shipping it. **To unblock**: retrieve the `speech_model` package (and ideally the audio manifests) from the original Google Drive, then reproduce `predictions/epoch15_validation_probabilities.csv` before wiring anything.
- **Research fusion** (`Fusion/` handoff): participant-level late fusion `P = 0.70·P_NLP + 0.30·P_acoustic`, accuracy 0.7568 on 37 participants. Documented only — the production fusion keeps its own weighted-stage design until (and unless) the acoustic stream becomes runnable, and the README itself warns not to present that P as calibrated.

#### MRI model lineage — VERIFIED already integrated (from `Alzheimer_Training/`)

- **Byte-identity**: `backend/app/models/alzheimer_model.pth` == `Alzheimer_Training/best_mri_resnet18_finetuned.pth` (MD5 `f36aa42f…`) — the production MRI model **is** the fine-tuned ResNet18 from this workstream; no swap was needed. Provenance is now recorded in code (`ml/mri/stages.py` header comment).
- **Checkpoint**: bare state_dict, ResNet18 `backbone.*` + `classifier (3, 512)`; class map **0 = CN, 1 = MCI, 2 = AD** (verified from `finetuning_restart.ipynb` `class_names = ["CN", "MCI", "AD"]`). `MRIClassifier` auto-detects this single-backbone ResNet18 shape and loads it `weights_only=True`.
- **Training pipeline** (`Model_Training_02.ipynb`): ADNI NIfTI volumes → SynthStrip skull-stripping → resample/normalize → aspect-preserving 224 px resize → 32 informative axial slices → NPZ volumes (32, 224, 224, 3); **subject-wise stratified 70/15/15 split** (no patient leakage across splits); 5-fold subject-grouped CV artefacts in `CV_ResNet18_Layer4/` and `CV_ResNet50/` + `5fold_subject_grouped_metadata.csv`.
- **Honest performance** (from notebook evaluation outputs): the production fine-tune (classifier-only, frozen backbone) reaches **validation accuracy 0.5895, macro-F1 0.5725, balanced accuracy 0.5660** (n=95: CN 26 / MCI 47 / AD 22; confusion `[[14,11,1],[10,31,6],[3,8,11]]`). The focal-loss variant's held-out test: accuracy 0.5217 (n=92). 3-class ADNI classification is genuinely hard; this is exactly why MRI is one weighted vote (0.40) in fusion with an agreement bonus — not a standalone diagnosis.
- **Not promoted**: the other checkpoints (`best_brain_mri_ssl_resnet50*.pth`, attention/meanmax/focal/augmentation/partial-ft variants, per-fold CV models) are research artefacts with no better held-out evidence than the production fine-tune; all remain in the training folder (gitignored), and `Alzheimer_Dataset/` (~20 GB ADNI NPZ volumes) stays out of the repo entirely.

## 🔜 Next (in recommended order)

1. **TypeScript on the data layer** — convert `clinicalMappers`, the API modules, and define a real type for the analysis payload (`results_json`). `allowJs` incremental migration; catches shape-mismatch bugs at compile time (the class that produced `[object Object]` and the dashboard ID bug). Bonus now available: the FastAPI `/openapi.json` can generate these types.
2. **Pydantic request models** — routers currently reuse the framework-free hand-rolled validators for byte-exact error messages; migrate them to typed pydantic models incrementally with the OpenAPI spec as the regression harness.
3. **timestamptz columns** — timestamps are ISO-8601 TEXT (works correctly in PG, lexically sortable); convert in a later Alembic revision when convenient.
4. **i18n (English + Hindi)** — extract UI strings, start with the wizard and results surfaces; the transcriber already carries Hindi/Marathi filler lists, so the ML side is ready for it.
5. **Dashboard KPI aggregates server-side** — the client now derives KPIs from the paginated feed (capped at 1,000 sessions with an honest truncation flag); a grouped-aggregate endpoint removes the cap for very large deployments.
6. **Redis job store activation** — the Redis mirror in `app/shared/jobs.py` is implemented; set `REDIS_URL` (add a redis service to compose) to make jobs survive restarts, then move to multi-worker if needed.

*(Done from the old list: PWA → shipped with `vite-plugin-pwa`; Playwright E2E → shipped with a CI job; Redis job mirror → implemented, needs only `REDIS_URL`.)*


## Ops notes

- **Run it**: `docker compose up --build` (postgres + api + nginx web). Without Docker: set `DATABASE_URL` (or leave it unset for SQLite), then `python backend/run.py` (port 10000) and `npm run dev` in frontend/.
- **Docker configuration surface**: DB credentials come from the repo-root `.env` (gitignored: `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` — compose composes `DATABASE_URL` from them and initializes `db` with them; dev fallbacks `neuro/neuro` are baked into the compose defaults). App secrets live in `backend/.env` (`SECRET_KEY` must be a real generated value; `APP_ENV=production` only behind HTTPS — it forces Secure cookies and breaks plain-HTTP login). Host port override: `WEB_PORT=3001` in the root `.env` (defaults 3000).
- **CPU-only Docker image**: the backend image installs `torch==2.14.0` / `torchvision==0.29.0` from `https://download.pytorch.org/whl/cpu` (the exact versions the suite and E2E were verified against) before `requirements.txt`, whose floors are then already satisfied — plain PyPI torch would pull ~2–3 GB of CUDA packages this deployment can't use.
- **Model provisioning**: `backend/app/models/` is gitignored AND dockerignored — the MRI checkpoint (`alzheimer_model.pth`, 43 MB) and speech head (`speech/distilbert_only_model.joblib`) must exist on the host before `docker compose up`; compose bind-mounts them read-only. Without them the api container reports unhealthy (`/api/health` → 503 "Missing trained model file") and `web` never starts — by design, never a silent model-less deploy. See `backend/app/models/README.md`.
- **Backups**: the `db_backup` sidecar writes unencrypted `pg_dump` files to `./backups` (02:30 UTC, 14 kept). That directory contains full clinical records — secure/encrypt it at rest like the database. Test restores periodically.
- **API reference**: interactive OpenAPI docs at `/docs` (disabled in production).
- **One-time SQLite → Postgres data import**: `DATABASE_URL=postgresql://… python backend/scripts/migrate_sqlite_to_pg.py`.
- **Migrations**: edit the ORM models in `app/shared/models/`, then `alembic revision --autogenerate -m "..."` and review; containers run `alembic upgrade head` on start.
- **Scaling shape**: one uvicorn process (in-memory job registry + process-singleton ML models); heavy analysis concurrency = `ML_JOB_WORKERS` thread pool; HTTP concurrency = the async loop + FastAPI's threadpool for sync endpoints. Move to Redis-backed jobs (next-steps list) before adding processes.
- `ML_JOB_WORKERS` — size of the in-process ML thread pool (default 2). Each worker can hold a Whisper model (~1.5 GB) + ResNet (~45 MB).
- `WHISPER_MODEL` — pin the transcription model; default picks `base` on CPU, `turbo` on GPU.
- `WHISPER_MAX_AUDIO_SEC` — transcription duration cap (default 120 s).
- **Model artefacts are never versioned** — `backend/app/models/alzheimer_model.pth` (MRI, 43 MB) and `backend/app/models/speech/distilbert_only_model.joblib` (speech NLP head, 26 KB) are runtime assets (gitignored). Docker mounts `./backend/app/models` read-only; bare-metal deploys must copy them into place. Sources: `Alzheimer_Training/best_mri_resnet18_finetuned.pth` and `Speech/NeuroSense_Final/NLP/model/` respectively.
- `SPEECH_NLP_ENABLED` (default `true`) / `SPEECH_NLP_MIN_WORDS` (default 15) — the speech NLP classifier; fully local. First load downloads `distilbert-base-uncased` (~268 MB) into the HuggingFace cache — the `neuro_hf` Docker volume persists it; on bare metal set `HF_HOME` to a durable path.
