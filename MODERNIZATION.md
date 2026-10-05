# NeuroSense AI — Modernization Roadmap

Status as of 2026-10-05. "Done" items are implemented, tested, and live on `main`.

## ✅ Done

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
- 142 backend tests, 25+ frontend tests, CI runs backend pytest + frontend lint/test/build.

## 🔜 Next (in recommended order)

1. **TypeScript on the data layer** — convert `clinicalMappers`, the API modules, and define a real type for the analysis payload (`results_json`). `allowJs` incremental migration; catches shape-mismatch bugs at compile time (the class that produced `[object Object]` and the dashboard ID bug).
2. **antd → Radix primitives** — replace the remaining antd usage (dialogs, buttons, tabs) with Radix + Tailwind for a single design system and a smaller bundle. Biggest remaining bundle win.
3. **Job queue → shared store** — swap the in-memory `JobManager` registry for Redis (interface is already isolated in `app/shared/jobs.py`) so async jobs survive restarts and work across multiple gunicorn workers; or adopt Celery/RQ when jobs need retries, scheduling, or a dedicated worker box.
4. **FastAPI migration (strangler pattern)** — migrate `/auth` → `/patients` → `/analysis` endpoint-by-endpoint behind a proxy. Wins: Pydantic v2 validation (deletes the hand-rolled schemas), OpenAPI docs, generated TypeScript types shared with the frontend. Do this *after* (3); the job architecture matters more than the framework.
5. **PostgreSQL for production** — SQLite + WAL is demo-grade; `DATABASE_URL` is already supported end-to-end.
6. **PWA** — `vite-plugin-pwa` for installable, offline-tolerant clinic tablets.
7. **Playwright E2E** — the browser-verified flows (wizard, auth, admin) as CI tests.

## Ops notes

- `ML_JOB_WORKERS` — size of the in-process ML thread pool (default 2). Each worker can hold a Whisper model (~1.5 GB) + ResNet (~45 MB).
- `WHISPER_MODEL` — pin the transcription model; default picks `base` on CPU, `turbo` on GPU.
- `WHISPER_MAX_AUDIO_SEC` — transcription duration cap (default 120 s).
