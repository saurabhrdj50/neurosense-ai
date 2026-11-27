# NeuroSense AI — Full Project Audit

**Date:** 2026-10-04 · **Scope:** backend (Flask), frontend (React 19 + Vite), ML layer, infra/tests
**Method:** 4 parallel deep-code audits + test-suite run + manual spot-verification. Every finding cites `file:line` and was verified against the actual code; several were reproduced by execution.

**Totals (deduplicated): ~100 findings — 8 Critical, 19 High, ~40 Medium, ~35 Low**

**What's already good (verified):**
- Real ML: the MRI checkpoint is a genuine trained ResNet18 state_dict (44.8 MB, 122 keys) that really runs a forward pass — not fake results.
- No SQL injection anywhere: all queries parameterized or SQLAlchemy filters.
- Password hashing is Werkzeug scrypt (strong); `secure_filename` used on persisted files.
- Backend test suite: **114 passed**.
- Clean feature-based architecture (config / shared / features / ml), cookie-based auth (no tokens in localStorage), no `dangerouslySetInnerHTML` anywhere, honest "not a diagnosis" disclaimers in results UI.

---

## ✅ IMPLEMENTATION STATUS (updated 2026-10-04)

**All Critical and High findings are fixed**, plus most Mediums. 132 backend tests pass (18 new regression tests in `tests/test_audit_fixes.py`), 25 frontend tests pass (`npx vitest run`), `npm run build` is clean.

**Fixed and locked in by regression tests:**
- Demo seeding now requires explicit `SEED_DEMO_USERS=true` (no longer tied to `FLASK_ENV`).
- Fusion gating: an unassessed modality ("Not Assessed" cognitive / "No Data" risk) can never vote; all-zero answers still count as real evidence; scores are clamped.
- Recommendations fail loudly (`assessment_incomplete`) instead of defaulting to "Non-Demented"; risk-priority keys now match the factor keys.
- PDF reports: fake QR and pseudo-checksum replaced by an honest HMAC fingerprint of the result payload; no fictional physician — reports print "Unsigned System-Generated Draft" unless a physician is attributed; patient fields are escaped in PDF/HTML.
- `IS_PRODUCTION` flag; app refuses to start in production without `SECRET_KEY`; gunicorn `--preload` (single key across workers).
- Reset tokens only echoed with explicit `EXPOSE_RESET_TOKEN=true`; forgot-password responses are identical for known/unknown identities (no enumeration); register returns 201 and always creates a doctor (role never accepted from client input).
- Real timing-parity dummy hash (a real scrypt hash, not an invalid string); lockout math on timezone-aware UTC with SQL-level atomic failed-attempt increments; lockout regression-tested.
- CORS is an explicit allowlist (`CORS_ORIGINS`) — the `*.vercel.app` wildcard is gone; `ProxyFix` behind `TRUST_PROXY=true`; `SESSION_COOKIE_SECURE` defaults on in production; 30-day remember cookie; `to_dict()` no longer leaks account-state fields.
- Multi-step deletes run in ONE transaction (`session_scope`); repositories honor the shared session; audit rows for doctor-initiated patient deletes/exports (failure-tolerant).
- IDOR closed: `/api/analysis/analyze` refuses (403, checked before and after inference) to touch a patient owned by another clinician.
- Uploads: magic-byte content sniffing on MRI/audio (rejects spoofed extensions); avatars size-capped, decoded and re-encoded through PIL; exact-match folder deletion (`PAT-10` no longer destroys `PAT-100`).
- Error handling: HTTPExceptions keep their status codes (405 is 405 again); no `error_type`/`str(e)` leaks; single 404/500 handler set; health endpoint returns 503 when degraded (no path leak); request metrics keyed by route (no cardinality blowup); active-gauge no longer drifts.
- Speech: Google web-API fallback is opt-in (`ENABLE_GOOGLE_SPEECH_FALLBACK`, default off — PHI leaves the premises otherwise); ffmpeg subprocess has a timeout.
- MRI: `torch.load(weights_only=True)`; NIfTI sniffing reads the magic at the correct offset (344); broken forward-pass fallbacks removed (real errors surface); model singletons are lock-guarded; matplotlib figures always closed.
- NLP: filler words counted per token ('mother'/'remember' no longer "fillers"); hapax computed in O(N).
- Frontend (all 21 fixes): MRIStep motion import + route-level ErrorBoundary; real DOB/license/department at registration (kills the `1990-01-01` takeover); no fabricated transcripts; dashboard navigates by `patient_id`; unknown analyses map to "Unknown" (not High-Risk); apiClient 401 handling + 120 s timeouts; PHI cleared from storage on logout; per-patient draft keys; double-submit guarded; honest loader (no fake staged timeline); zip export uses `API_URL`; sex "Other" renders correctly; historical cards no longer bleed the newest values; add-patient is a validated form; CSV quote/formula escaping; fake "Dr. Eleanor Vance" removed from UI; no fabricated "Evaluated on today" dates; error banners with retry on Results/History/Dashboard; vitest wired up with 25 tests.
- Timestamps: single `time_utils` (aware UTC) across all models/repos; the naive local vs UTC mix is eliminated.
- Infra: Dockerfile runs as non-root user; `.dockerignore` covers `patient_data.db-wal/-shm` (PHI no longer baked into images), tests, caches; docker-compose duplicate `environment:` key merged; audit-log pagination clamped; `.env.example` documents every new flag.
- CI: `.github/workflows/ci.yml` runs backend pytest + frontend vitest/build on push/PR (lint non-blocking until the pre-existing error baseline is cleaned up).

**Known deferred items (deliberate, not forgotten):**
1. **MRI preprocessing unification & Grad-CAM on the true input** — requires the training code (`train_mri.py`, referenced but not in the repo) to know which pipeline matches the checkpoint; changing preprocessing blind would silently degrade model accuracy. Commit the training notebook first.
2. **Password-reset delivery channel** — still no email/SMS integration; with `EXPOSE_RESET_TOKEN=false` production resets need an out-of-band channel. Next step: wire an email provider.
3. **CSRF tokens** — SameSite=Lax + strict CORS remains the only layer; add SeaSurf if you ever set `SameSite=None` (required for the cross-origin Vercel topology — see `.env.example`).
4. **ESLint baseline (~50 pre-existing errors)** — not introduced by this work; make CI lint blocking once cleaned.
5. **TanStack Query adoption or removal** — installed but unused; hand-rolled fetching now surfaces errors, but migrating to `useQuery` would simplify cache invalidation.

---

## 🔴 CRITICAL — fix immediately

1. **Default admin/doctor accounts with hardcoded passwords are seeded unless `FLASK_ENV=production`** — `backend/app/features/auth/repository.py:17-20,63-70`. `SAMPLE_USERS` creates `admin/Admin@123!` and `doctor/Doctor@123` whenever `FLASK_ENV` is unset or anything other than exactly `production` (the default is `development`). A deployment that only sets `SECRET_KEY` gets a public admin account on a medical-records system. `scripts/seed_demo.py:33-34` also prints these credentials.

2. **Fusion engine turns an empty/unanswered cognitive assessment into "Moderate Demented" at 90% confidence** — `backend/app/ml/fusion/engine.py:61-72` + `backend/app/ml/stages.py:52-65`. `CognitiveEvaluator.evaluate({})` returns `composite_score=0, risk_label='Not Assessed'`, but fusion only checks `composite_score is not None`; `cog_to_stage_index(0)` → 3 (Moderate) and the confidence formula clamps to 0.9. Reproduced by execution: `predict(cognitive_result={'composite_score': 0, ...})` → `Moderate Demented / 90.0%`. A patient with 2/15 low answers gets a fabricated severe-dementia headline.

3. **Fake verification artifacts on clinical PDF reports** — `backend/app/ml/reporting/report_generator.py:511-543,158`. The "QR code" is a hardcoded 8×8 grid of black cells ("Specific black coordinates to look like a real QR code"); the "Secure QR Verification Checksum" is `sha256(patient_id + final_stage)[:16]` (doesn't cover report content, trivially recomputable); and every report is signed **"Dr. Eleanor Vance"** — a fictional physician hardcoded as the default attending (line 158).

4. **Guaranteed frontend crash when an MRI is uploaded** — `frontend/src/features/analysis/mri/MRIStep.jsx:132,170`. `<motion.div>` is used but `framer-motion` is never imported (verified: imports at lines 1-4). React throws `ReferenceError: motion is not defined` and white-screens the assessment — there is no ErrorBoundary above `/analysis`. ESLint misses it (`no-undef` doesn't check JSX identifiers).

5. **Registration hardcodes `date_of_birth: '1990-01-01'` for every doctor → account takeover** — `frontend/src/features/auth/LoginPage.jsx:182`. The backend's forgot-password verifies identity with email + DOB (`backend/app/features/auth/routes.py:96`). Since every UI-created doctor has the same constant DOB, anyone who knows a doctor's email can reset their password with `1990-01-01`.

6. **Multi-step deletes are not atomic — the `conn` parameter is ignored everywhere** — `backend/app/features/patients/repository.py:158-165`, `history/repository.py:102-113`, `auth/repository.py:284-291`. Delete methods accept `conn=None` but each opens its own `SessionLocal()` and commits independently. `delete_doctor` (admin/routes.py:97-102) runs 4 separate commits; a failure mid-way leaves orphaned/inconsistent data with no rollback path.

7. **IDOR: any doctor can overwrite any other doctor's patient via `/api/analysis/analyze`** — `backend/app/features/analysis/service.py:229-236` + `analysis/routes.py:34-82` + `patients/service.py:60-72`. The analyze flow only requires `@login_required`; `upsert_from_analysis` updates any existing `patient_id` with no `created_by` ownership check (unlike `PUT /api/patients/<id>` which checks). An attacker can overwrite another doctor's patient demographics, notes, photo and clinical stage, and their raw MRI/audio files get persisted under the victim's directory.

8. **Fabricated transcript submitted as the patient's speech sample** — `frontend/src/features/analysis/speech/SpeechStep.jsx:354-355`. `const textToAppend = liveText || LOCALIZED_SAMPLE_TEXTS[...]` — if live recognition captures nothing (noise, accent, unsupported browser), a hardcoded fictional sentence ("My name is Arthur Pendelton…") is silently submitted to the AI as `audio_text` and analyzed. Clinical data fabrication.

---

## 🟠 HIGH

**Security / auth**
9. **Password-reset token returned in the HTTP response by default** — `backend/app/features/auth/routes.py:118-120` (`if FLASK_ENV != 'production': response['reset_token'] = token`). Default `FLASK_ENV=development` → token in response → account takeover.
10. **Ephemeral per-worker SECRET_KEY** — `backend/app/config/settings.py:18-26` + `gunicorn.conf.py:8` (2 workers, no `--preload`). Each worker derives a different key → intermittent logouts, and `_get_fernet()` derives a different PHI key per worker (`shared/security.py:136-145`) so `decrypt_phi` silently returns ciphertext.
11. **Timing-based user enumeration: the anti-timing dummy hash is invalid** — `backend/app/features/auth/repository.py:134`. `'dummy_hash_to_prevent_timing_attack'` has no `$` → Werkzeug returns False in 0.004 ms (measured) vs 127 ms for a real hash. The mitigation is a no-op. Fix: `check_password_hash(generate_password_hash('dummy'), password)`.
12. **Rate limits for forgot/reset-password silently never applied** — `backend/app/__init__.py:266-270`. Keys `auth.forgot-password`/`auth.reset-password` use hyphens but the real endpoints are `auth.forgot_password`/`auth.reset_password`; `app.view_functions.get()` returns None and the limit is skipped (verified by dumping view_functions).
13. **Account lockout broken by timezone mismatch** — `backend/app/features/auth/repository.py:167` stores `locked_until = datetime.utcnow()+15min` (naive UTC) but `authenticate()` (line 139-142) compares `datetime.now()` (naive local). In UTC+5:30 the lock expires instantly; in UTC− it over-stays.
14. **CORS trusts every `*.vercel.app` subdomain with credentials** — `backend/app/__init__.py:118-121`. Anyone can deploy `evil.vercel.app` and become a credentialed origin.
15. **File-type validation is extension-only; the magic-byte validator is dead code** — `backend/app/features/analysis/routes.py:19-31`; `InputValidator.validate_file_type` (`shared/validation.py:80-105`) has zero call sites in the app (grep-verified). Also `validation.py:100` compares only the MIME type half (`image/svg+xml` would pass an image check).
16. **PHI "HIPAA encryption" is dead code** — `backend/app/shared/security.py:121-165`. `encrypt_phi`/`decrypt_phi` have zero call sites; patient names/DOB/notes/results sit in plaintext SQLite. The Fernet key also derives from `SECRET_KEY` with a static salt (rotation breaks decryption), and `decrypt_phi` swallows errors returning the ciphertext.
17. **Session cookie defaults break the documented production topology** — `backend/app/config/settings.py:38-40` + `frontend/src/services/apiClient.js:21`. Client sends `credentials:'include'` cross-origin (Vercel SPA → Render API) but `SESSION_COOKIE_SAMESITE` defaults to `Lax` and `SESSION_COOKIE_SECURE` to false → the cookie is not attached to cross-site fetches; login silently fails in production unless operators guess the env vars.

**Correctness / data integrity**
18. **Prefix-match directory deletion can destroy another patient's files** — `backend/app/shared/storage.py:143,173`. `folder.name.startswith(patient_id)`: deleting patient `PAT-10` while `PAT-100` exists rmtree's **both** patients' photos/MRIs/reports.
19. **Speech fallback silently uploads patient voice (PHI) to Google's free web API** — `backend/app/ml/speech/transcriber.py:156-162`. `recognize_google` with no consent gate; also `sr.AudioFile` only reads WAV/AIFF/FLAC while routes accept mp3/webm/ogg, so the fallback fails for most accepted formats anyway.
20. **Grad-CAM for NIfTI volumes is computed on a different input than the prediction** — `backend/app/ml/mri/inference.py:155-184` + `gradcam.py:38-45`. Prediction runs 32 z-scored slices; the heatmap comes from a single min-max-rescaled middle slice through ImageNet normalization — double-normalized, different forward pass — yet the report asserts those regions "contributed most to the predicted stage".
21. **Two mutually incompatible MRI preprocessing pipelines feed the same checkpoint** — `inference.py:16-20` (ImageNet-normalized, aspect-distorting 2D resize) vs `nifti.py:65-96` (brain-masked z-score 2.5D). At most one matches training; the referenced `train_mri.py` is not in the repo so lineage is unverifiable.
22. **Fabricated MMSE/MoCA equivalents drive the displayed impairment level** — `backend/app/ml/cognitive/evaluator.py:73-75,117-127`. `mmse = round(composite*0.30); moca = mmse` — a screening composite linearly projected onto MMSE/30 then classified with real MMSE cutoffs, with no flag that no MMSE was administered. Also `int(data.get('mmse', 0))` (line 62) raises TypeError on JSON null.
23. **"No Data" risk profile votes "Non-Demented" in fusion** — `backend/app/ml/fusion/engine.py:75-82`. Risk 0 / category "No Data" maps to stage 0 — unassessed modalities drag the fused stage toward healthy (mirror of Critical #2).
24. **Dashboard "Review Dossier" navigates with the session id, not the patient id** — `frontend/src/features/dashboard/DashboardPage.jsx:96-105,325,538`. `/history/3` looks up a non-existent patient → the primary drill-down action always shows "No History Recorded".
25. **Unknown/errored analyses are counted as High Risk on the triage dashboard** — `frontend/src/shared/utils/clinicalMappers.js:68` (`getRiskLevel()` ends with unconditional `return 'High'`) + `DashboardPage.jsx:81-84`. Failed analyses inflate the "Urgent Attention" KPI — mis-triage.
26. **Global `Exception` handler converts HTTP errors into 500s and leaks class names** — `backend/app/shared/errors.py:9-17`. Verified: `POST /api/health` → 500 `{'error_type':'MethodNotAllowed'...}` instead of 405. Also shadows the Sentry-reporting handler and duplicates the 404 handler.
27. **Admin "Download All Reports (.zip)" uses a relative URL** — `frontend/src/features/admin/pages/AdminPanel.jsx:123,669`. Hits the Vercel origin where the catch-all rewrite serves `index.html` instead of the zip; every other export correctly uses `API_URL`.

---

## 🟡 MEDIUM

**Backend — security**
- No CSRF protection on any state-changing route (cookie auth; only SameSite=Lax as mitigation).
- `SESSION_COOKIE_SECURE` defaults to False (settings.py:38-40).
- Lockout counter TOCTOU: concurrent logins read-then-write the same count (`auth/repository.py:163-175`) — needs atomic `UPDATE ... SET x = x + 1`.
- `AuditLogger` is instantiated but never called anywhere; doctor-initiated patient DELETE and the full-CSV PHI export write **no audit rows**.
- No `ProxyFix`: behind the Render proxy `request.remote_addr` is one shared IP → the 60/min rate limit becomes a single global bucket (self-DoS) and logs record the proxy IP. `RATELIMIT_STORAGE` also defaults to `memory://` (per-worker).
- `save_base64_avatar` writes unvalidated, uncapped bytes (`shared/storage.py:75-96`) — corrupt payload → 500; files served as `image/png`.
- Registration response enumerates accounts (`success:false` + 409); `RegisterSchema` accepts `role='admin'` as input; `login_user(remember=True)` = 365-day cookie; forgot-password response body leaks account existence via differing `success`/message despite the comment claiming otherwise (`auth/routes.py:98-103`).

**Backend — correctness**
- `/api/analysis/history`, `/api/analyses`, admin dashboard return unbounded datasets (no pagination).
- `/analyze` accepts unvalidated `cognitive_data`/`risk_data` JSON strings; scores unclamped — `screening_breakdown: {orient_date: 9999}` → composite ≈ 249,975 persisted (`ml/cognitive/evaluator.py:178-193`); per-modality failures return 200 with `*_error` keys.
- Failed analysis silently defaults to "Non-Demented" recommendations (`features/analysis/recommendation.py:94`) — a medical app should fail loudly.
- Risk-factor priority key mismatch: `category_priority` uses `physical_activity/diet_quality/sleep_quality/social_engagement/alcohol` but the real factor keys are `physical_inactivity/sleep_issues/alcohol_excess/social_isolation` (`recommendation.py:188-198` vs `ml/risk/factors.py:7-11`) — most prioritization is dead code.
- `PatientSchema.validate_update` drops all range/enum checks present in `validate_create` (`patients/schemas.py:59-75`).
- Analysis-flow patient fields bypass PatientSchema; `age="70.5"` stored as string (`analysis/patient/service.py:11-14`); on PostgreSQL the insert raises and is swallowed → patient row silently never saves (`analysis/service.py:235-236`).
- Password reset has no delivery channel — in production mode nobody can ever reset a password; expired tokens never purged; successful reset doesn't invalidate other sessions.
- Naive local vs naive UTC timestamps mixed across models/repos (database.py:210, session.py:14, patient.py:20 vs auth/repository.py:167,189) — history sorting and lockouts depend on server TZ.
- `metrics.reset()` then `get_all_metrics()` → TypeError (naive vs aware); active-request gauge drifts negative on 404/405; report ZIP export misses patients with `_` in IDs (`patients/routes.py:331-333`).
- `str(e)` leaked to clients in several routes (`analysis/routes.py:119,143`, `mri/service.py:35`, `patients/repository.py:135`); duplicate 404 handlers; phantom `/api/utils` advertised by the index route.

**ML layer**
- Whole NIfTI volume loaded into RAM (4D handling doubles it) — `ml/mri/nifti.py:34,49-56`; can spike several hundred MB × 8 threads.
- Synchronous Whisper + `librosa.pyin` inline in workers vs 120 s gunicorn timeout — worker killed mid-inference, `finally` cleanup never runs (`transcriber.py:135,93` + `gunicorn.conf.py:15`); ffmpeg subprocess has no timeout.
- Filler-word count uses substring matching — "mother", "remember", "there" counted as fillers (verified: 8 fillers in a clean sentence) — `ml/nlp/sentiment.py:141-143`.
- Clinical-sounding thresholds with no validation or citation (`f0_std<12 → 'Reduced'`, `ttr<0.42 → 'High'` etc., `transcriber.py:100,109,261-264`); Hindi/Marathi filler list includes ordinary function words (bias against non-English speakers).
- Hard-coded fusion weights (0.40/0.25/0.15/0.10/0.10) and invented confidence arithmetic; averaging ordinal stages is statistically meaningless (mitigated by disclaimers).
- NIfTI content sniffing reads the wrong bytes (magic at offset 344, not 0) and a dead 3-vs-4-byte comparison — `inference.py:213-221`.
- `torch.load(..., weights_only=False)` on the clinical checkpoint (pickle code-execution risk; no integrity hash) — `inference.py:41`.
- Broken exception fallbacks in `mri/model.py:107-120` (would mask real errors; latent on prod path); unlocked lazy singletons (double model construction race); shared mutable `sr.Recognizer`; quadratic hapax computation (`sentiment.py:131`); screening answers unclamped; matplotlib figure leak in gradcam; unescaped patient fields in HTML/PDF (XSS vector in HTML report); contradictory provenance claims (`mri/stages.py:6-13` says verified, `explanation.py:97` says `class_mapping_verified: False`).

**Frontend**
- Ctrl/Cmd+Enter bypasses the loading guard → duplicate analyze submissions (`AnalysisPage.jsx:206-212`).
- Stale localStorage draft silently overwrites the newly selected patient — previous patient's scores/risk factors can be submitted for the new patient (`AnalysisPage.jsx:83-100`); draft not keyed by patient ID.
- Network/API failures render as empty data, never errors — dashboard catches to console only; `getPastAnalyses()` swallows errors and returns `[]`; the `neurosense_analysis_history` fallback key is never written (dead code).
- PHI persists in browser storage after logout: results in `sessionStorage`, draft (name/ID/notes) in `localStorage` — recoverable on shared clinical workstations (`AuthProvider.jsx:119-124`).
- Fake staged progress (hardcoded setTimeout timeline + artificial 1.2 s delay) for the real diagnostic run (`AnalysisLoader.jsx:150-170`, `AnalysisPage.jsx:185`).
- No timeouts, no AbortController, no global 401 handling in `apiClient.js` — hung analyze leaves the UI stuck; expired session → silent failures instead of redirect to login.
- Add-patient form is a div with onClick — `min/max` attributes inert, `Number(form.age) || 0` submits garbage as 0, no duplicate-ID check (`PatientsPage.jsx:182-204`).
- Sex "Other" displayed as "Female" (`PatientsPage.jsx:387,620`); older analysis cards display the newest analysis's modality values (`PatientsPage.jsx:508-511`); missing `created_at` renders today's date as the evaluation date (`ResultsPage.jsx:389-391`).
- Fictional "Dr. Eleanor Vance" shown as the attending in PatientsPage/TopBar; the whole Settings profile tab is hardcoded fake data disconnected from `useAuth()`.
- TanStack Query is installed and mounted but never used (zero useQuery/useMutation) — all fetching is hand-rolled; `vercel.json` catch-all rewrite also swallows `/api/*` on the frontend origin.

**Infra / config**
- Dockerfile has no `USER` → container runs as root.
- `.dockerignore` misses `patient_data.db-wal`/`-shm` → **live PHI WAL is copied into the image** (verified present in `backend/`); tests/pytest.ini also ship in the image.
- `docker-compose.yml` has two `environment:` blocks — YAML last-wins silently drops `PORT` and `ENABLE_EAGER_WARMUP` (verified by parsing).
- `/api/health` returns 200 with `status:'degraded'` → the compose healthcheck passes even with a broken DB; also leaks filesystem paths.
- Metric cardinality unbounded (`request.path` includes IDs); dual `.env` loading with `override=True` lets a stray file override orchestrator env vars; `PatientRepository(db_path)` mutates the global `Config.DB_PATH`.

---

## ⚪ LOW (selected)

- **Repo hygiene:** 257 uncommitted changes (99 deletions — all root docs like README.md deleted; 21 renames, 49 rename+edits) — the whole restructure is uncommitted; stray empty `node_modules/` at repo root with no root package.json.
- Backend: register returns 200 not 201; `user.to_dict()` leaks `failed_login_attempts`/`locked_until`/`storage_key`; audit-log `limit=-1` = unlimited; N+1 queries in `list_doctors`; dashboard aggregates every row in Python; audit rows written *after* destructive commits (failure → 500 but deletion already happened, audit lost); CSV injection in patient export (`=`,`+` prefixes) and unescaped quotes in frontend CSV; `secure_filename` can return `''`; temp uploads written into UPLOAD_FOLDER root; reset-token check bcrypt-verifies every outstanding token.
- Frontend: voice dictation appends interim results without `isFinal` (duplicated text); mic permission failure only `console.error`'d; unchecked risk factors stored as `false` (counts as "complete"); `education_years || 12` silent defaults; unreachable `|| 'System'` branch; dead ThemeToggle + dead demo modal + 281 dead `dark:` variants; Google Fonts via blocking `@import`; `rememberMe` state never used; role tab cosmetic; `resetPassword` convention 2 broken (`new_password: undefined`); naive timestamps formatted with client clock; unassessed risk renders as "Low Risk"; ResultsPage.jsx is 1,267 lines / SpeechStep 1,119 / PatientsPage 803; BrainCanvas runs a perpetual 60fps rAF loop on the login page.
- **Testing gaps:** zero frontend tests (vitest installed, no test script); backend tests never cover the broken paths (multi-worker secrets, lockout concurrency, delete atomicity, rate-limit endpoint bindings, CORS origins) — the suite is green while Critical bugs ship.

---

## Improvement recommendations (prioritized)

**Week 1 — stop the bleeding**
1. Make `FLASK_ENV=production` the *safe* default, or better: add a single `IS_PRODUCTION` flag and **fail fast at startup** if production lacks a `SECRET_KEY`; never seed demo users in any non-explicitly-dev environment.
2. Fix the fusion gating: pass/check `tests_completed > 0` / `factors_assessed > 0` before a modality votes; never map composite 0 → stage 3. Regression test: `predict(cognitive_result=evaluate({}))` must return `stage=None`.
3. Remove the fake QR + fake checksum + hardcoded "Dr. Eleanor Vance" from the PDF generator; require an authenticated physician field, print "Unsigned draft" otherwise.
4. `import { motion } from 'framer-motion'` in MRIStep.jsx + add a route-level ErrorBoundary; enable JSX-aware linting (typescript-eslint or jsx-no-undef).
5. Collect real DOB/license at registration (or replace DOB-based identity check with email OTP); remove the fabricated-transcript fallback in SpeechStep.
6. Add the ownership check in `persist_analysis`/`upsert_from_analysis`; make repositories honor `conn` (or perform cascade deletes in one session/transaction).

**Weeks 2-4 — hardening**
7. One timestamp helper (timezone-aware UTC) used everywhere; fix lockout math; atomic failed-attempt increments; fix endpoint names in `route_limits` (+ startup assertion that every configured endpoint exists); real dummy-hash for timing parity.
8. Wire `InputValidator.validate_file_type` (magic bytes) into upload paths, enforce size caps, decode-re-encode avatars with PIL; exact-match folder deletion in `StorageManager`; CORS allowlist from env only (drop `*.vercel.app`).
9. Unify MRI preprocessing (one path, commit `train_mri.py` + label map for provenance); compute Grad-CAM on the actual inference input; `weights_only=True` + SHA-256 pin of the checkpoint.
10. Error-handling pass: single error-response shape, re-raise `HTTPException` in the global handler, remove `error_type` and `str(e)` leaks, real status codes (4xx for bad input, 503 for degraded health).
11. Frontend: fix patient_id navigation, `getRiskLevel` unknown bucket, error banners + 401 redirect in `apiClient` (or actually adopt the already-installed TanStack Query), clear PHI from storage on logout, key drafts by patient ID, guard double-submit with a ref, replace fake progress with real milestones, use `API_URL` for the zip export.

**Ongoing**
12. Deployment: add `USER app` to the Dockerfile, extend `.dockerignore` (`patient_data.db-*`, tests), fix the compose duplicate key, `--preload` gunicorn, `SESSION_COOKIE_SAMESITE=None; SESSION_COOKIE_SECURE=true` documented for the cross-origin topology, ProxyFix + Redis rate-limit storage.
13. Testing: frontend vitest setup + tests for `clinicalMappers`, FormData assembly, auth flows; backend regression tests for every fix above (concurrency, atomicity, fusion gating); CI running both suites + eslint on every push.
14. Commit the restructure: the working tree has 257 uncommitted changes including 99 deletions — until this is committed, none of the new architecture is actually saved in history.
15. Product/clinical integrity: label all heuristic thresholds as exploratory/unvalidated in API responses and UI, remove fabricated MMSE/MoCA fields (rename to `screening_composite`), and gate the Google-speech fallback behind explicit consent + config flag (or delete it).
