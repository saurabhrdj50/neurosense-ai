# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ Active |

---

## Responsible Disclosure

We take security seriously. If you discover a vulnerability in NeuroSense AI, please **do not open a public GitHub issue**. Instead, report it privately so we can address it before disclosure.

### How to Report

**Email:** saurabhrdj50@gmail.com  
**Subject line:** `[SECURITY] NeuroSense AI — <brief description>`

Please include:
- A clear description of the vulnerability
- Steps to reproduce
- Potential impact (CVSS score if known)
- Any proof-of-concept code or screenshots

We will acknowledge receipt within **48 hours** and aim to release a patch within **14 days** for critical issues.

---

## Known Security Limitations (v1.0.0)

### 1. SQLite Session Storage

Sessions are stored in the Flask server's memory / SQLite file and are **not** invalidated on server restart. In production, replace with a Redis-backed session store or a persistent database-backed solution.

### 2. Demo Credentials

The default seeded credentials (`admin` / `admin123`, `doctor` / `doctor123`) are **for demonstration purposes only**. You must rotate all credentials before any production deployment.

### 3. Rate Limiting

Login attempts are rate-limited to 5 requests per minute per IP (configurable via `LOGIN_RATE_LIMIT` in `.env`). This relies on Flask-Limiter with in-memory storage; it does **not** persist across multiple processes or server instances. Use Redis as the storage backend in production.

### 4. CORS Configuration

The `CORS_ORIGINS` variable in `.env` controls which origins may make cross-origin requests. In development it defaults to `http://localhost:5173`. Set this explicitly in production to your domain(s) only.

### 5. API Authentication

All API routes beyond `/api/auth/*` and `/api/health` are protected by Flask-Login's `@login_required` decorator. However, there is currently no API token (JWT/OAuth) system — authentication is session-cookie based only. Do not expose the API publicly without adding token-based auth.

### 6. No HTTPS Enforcement

The Flask development server does not enforce HTTPS. In production, place the application behind a reverse proxy (Nginx / Caddy / Traefik) that terminates TLS and sets appropriate security headers (`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`).

### 7. File Upload Validation

Uploaded files (MRI scans, audio, handwriting images) are validated by MIME type via `python-magic`. However, no virus scanning is performed. Do not store or execute uploaded files in sensitive file-system locations without additional sandboxing.

---

## Data Privacy Notice

> ⚠️ **NeuroSense AI is a research and demonstration platform. It is not a certified medical device and has not been approved by the FDA, CE, or any regulatory body.**

### Demo Dataset

The 30-patient dataset bundled with NeuroSense AI (`frontend/src/services/demoDataset.js`) is **entirely synthetic**. All patient names, MRN numbers, dates of birth, and clinical values are generated programmatically and do not correspond to any real individual living or deceased.

### Real Patient Data

If you deploy NeuroSense AI with a real backend and real patient data:

- You are responsible for compliance with applicable privacy regulations (HIPAA, GDPR, etc.)
- All data must remain on-premises or within a compliant cloud environment
- Patient identifiers must be handled in accordance with your institution's data governance policy
- Audit logs must be enabled and reviewed regularly
- The AI outputs are **decision support tools only** — they must not replace qualified clinical judgement

### Third-Party AI Services

The optional AI chatbot feature sends text prompts to Google Gemini API or Groq API. **Do not include real patient identifiable information (PHI/PII) in chatbot queries.** Review the privacy policies of these services before enabling them in any clinical setting.

---

## Security Checklist for Deployment

Before deploying NeuroSense AI in any real environment, ensure:

- [ ] `SECRET_KEY` and `FLASK_SECRET_KEY` are strong random values (32+ characters)
- [ ] Demo credentials have been changed or removed
- [ ] `FLASK_ENV` is set to `production`
- [ ] CORS origins locked to your production domain
- [ ] TLS/HTTPS enforced via reverse proxy
- [ ] `DEBUG=False` in Flask configuration
- [ ] File upload directory is outside the web root
- [ ] Database backed up and access restricted
- [ ] Rate limiting backed by Redis
- [ ] No real PHI/PII stored without appropriate encryption at rest
