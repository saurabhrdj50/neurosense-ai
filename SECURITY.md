# Security & Privacy Posture

NeuroSense AI processes clinical data (patient demographics, MRI uploads,
speech recordings, assessment results). This document describes the controls
in place and the operational responsibilities that remain with the deployer.
It is written for two audiences: contributors assessing a proposed change, and
clinic operators evaluating the platform.

## What the system stores, and where

| Data | Location | Notes |
|---|---|---|
| Patient demographics, assessment results | PostgreSQL (`neuro_pg` volume) | Results also denormalized into `sessions.results_json` |
| Raw MRI / audio uploads | `neuro_uploads` volume, per-doctor/per-patient directories | Deleted alongside their patient (cascade on patient/doctor delete) |
| Generated PDF reports | Same patient directories | Regenerated on per-modality retry |
| Speech transcripts, linguistic biomarkers | `sessions.results_json` | Derived from audio; persists even if audio is deleted |

## Consent & lawful basis (deployer responsibility)

The platform does not capture patient consent — that must happen in the
clinical workflow before data entry. Deployers must ensure:

- Patients are informed that MRI/audio/data are processed by software,
  including a locally-running AI model.
- A lawful basis (consent or other) is recorded in the clinical record.
- Retention/deletion obligations are honored — the app's delete operations
  (patient, session, doctor) permanently remove records **and** file
  artifacts; use them when a deletion request arrives.

## Data flow & third parties

- **Everything clinical stays local.** MRI classification, speech
  transcription (faster-whisper / openai-whisper), speech NLP, and report
  generation run inside the deployment. No PHI is sent to external services.
  The Google cloud-speech fallback was deliberately removed for this reason.
- **Frontend telemetry:** none. Google Fonts is the only third-party origin
  the browser touches (stylesheet/font fetch); remove the `fonts.googleapis.com`
  preconnect from `frontend/index.html` if that is unacceptable.
- **Docker images:** pin and review before deploying into a clinical network.

## Application controls

- **Authentication:** session cookies (`HttpOnly`, `SameSite=Lax`), Argon2/bcrypt
  password hashing, account lockout on repeated failures. Login is rate-limited
  at both the app (slowapi) and nginx edge (`auth_zone`).
- **Authorization:** doctor-scoped access — every patient/session read and
  write checks ownership server-side; admins are a distinct role with their
  own audit trail. Cross-tenant writes are blocked at persistence time.
- **CSRF:** the API is same-origin behind nginx; cookies require `SameSite`
  and the frontend never posts `FormData` cross-origin. If you deploy the API
  cross-origin, switch to `SameSite=None; Secure` with a strict `CORS_ORIGINS`
  allowlist and re-evaluate CSRF protection.
- **Audit log:** destructive and export actions (deletes, exports, admin
  operations) are recorded with actor, target, and timestamp; the audit trail
  is surfaced in the admin panel.
- **Rate limits:** analysis endpoints are limited (30/min) and the retry
  endpoint (10/min) more tightly; nginx adds edge limits on `/api/` routes.
- **Upload handling:** MIME/extension validation on MRI/audio uploads,
  size caps enforced at nginx (`client_max_body_size`), randomized temp-file
  storage, `secure_filename` on persisted artifacts.
- **Exports:** CSV cells are formula-injection-neutralized; file downloads
  are `Content-Disposition: attachment`.
- **Security headers:** `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, restrictive `Permissions-Policy` (camera/mic/geolocation
  disabled at the browser), HSTS slot ready for TLS termination.
- **PDF / print:** reports are generated server-side (reportlab) — no PHI is
  rendered through third-party fonts or remote assets.

## PWA / service worker considerations

The app is installable (clinic tablets). The service worker caches **static
app assets only** — API responses and anything containing PHI are never
written to CacheStorage, and `/api/*` is excluded from navigation fallback.
Service-worker/manifest files are served with `no-cache` so updates roll out.

## Backups & recovery

A `db_backup` sidecar in `docker-compose.yml` runs a nightly `pg_dump` (02:30
UTC) into `./backups` with 14-generation retention. Responsibilities:

- The `backups/` directory contains full clinical records — encrypt at rest
  and restrict access like the database itself.
- **Test restores.** A backup that has never been restored is a hope, not a
  plan: periodically run
  `pg_restore -h <host> -U neuro -d scratch_test <backup>.dump` into a
  scratch database and verify row counts.
- File artifacts (uploads, reports) live on the `neuro_uploads` volume —
  include that volume in your backup strategy for a complete restore.

## Reporting vulnerabilities

Please report security issues privately to the maintainers (see the GitHub
repository's contact information) rather than opening a public issue. Include
reproduction steps and affected components; you'll get an acknowledgment
within one week.

## Known limitations (honest list)

- Single-node deployment. Redis-backed job persistence is on the roadmap;
  until then, in-flight analysis jobs are lost on API restart.
- No per-record encryption at rest beyond the volume/disk layer — rely on
  encrypted volumes (LUKS / cloud-provider disk encryption) for PHI.
- The AI outputs are screening signals, not diagnoses; the UI states this,
  and the PDF report carries the same disclaimer.
