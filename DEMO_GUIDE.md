# Demo Guide — NeuroSense AI

A complete 5-minute walkthrough of the NeuroSense AI platform from landing to longitudinal report.

---

## Prerequisites

| If running live backend | If using demo mode only |
|------------------------|------------------------|
| Backend running on `http://localhost:10000` | No setup required |
| Frontend running on `http://localhost:3000` | No setup required |
| Login: `doctor` / `doctor123` | Click **"Try Demo"** |

---

## 🗺️ Complete Walkthrough

---

### Step 1 — Landing Page (30 seconds)

**Navigate to:** `http://localhost:3000`

1. Scroll through the 9-section landing page:
   - **Hero** — Platform headline and call-to-action buttons
   - **Problem Statement** — Global burden of Alzheimer's disease
   - **Solution** — NeuroSense AI's six-modality approach
   - **Key Features** — Grid of capability cards
   - **Clinical Workflow** — Step-by-step intake illustration
   - **AI / Explainability** — SHAP and Grad-CAM explanation
   - **Statistics** — Detection accuracy metrics
   - **Team** — Contributor credits
   - **Footer** — Links and disclaimer

2. Click **"Try Demo"** (blue button, hero section) — this activates demo mode and redirects to the login page.

---

### Step 2 — Authentication (30 seconds)

**Route:** `/auth`

1. The page opens on the **Role Selection Gateway**:
   - Large "Doctor" tile (stethoscope icon)
   - Large "Administrator" tile (shield icon)

2. Click **"Doctor"**. The form transitions to the login step.

3. For a live session, enter credentials:
   - Username: `doctor`
   - Password: `doctor123`
   - Click **"Sign In"**

   > In demo mode the login is pre-filled — just click the **"Doctor"** quick-access button.

4. On success you are redirected to the **Clinical Dashboard**.

---

### Step 3 — Clinical Dashboard (45 seconds)

**Route:** `/dashboard`

Point out each section:

1. **KPI Cards (top row):** Total Patients, Analyses Today, High-Risk Alerts, Avg Confidence
2. **Risk Distribution Chart (left):** Recharts area chart showing patient risk over the last 7 days
3. **Stage Breakdown (right):** Pie chart — Healthy / MCI / Early AD / Moderate AD / Advanced AD
4. **Recent Analyses (bottom):** Table of the last 5 analyses with patient name, date, and stage badge

> **Talking point:** "Everything here is real-time from the backend. In demo mode, it's powered by synthetic data."

---

### Step 4 — Patient Registry (30 seconds)

**Route:** `/patients` (Patients in sidebar)

1. See the list of **30 synthetic patients** with MRN, name, age, stage badge, and last analysis date
2. Use the **search bar** to filter by name
3. Sort by clicking column headers (Stage, Risk Score, Date)
4. Click the **eye icon** on any patient → opens the patient detail panel

---

### Step 5 — Multimodal Analysis Wizard (90 seconds)

**Route:** `/analysis` (click "New Analysis" in sidebar or mobile FAB)

Walk through all 6 steps:

#### Step 1: Patient Information
- Select patient from dropdown or create new
- Fill demographics: age, sex, education years, handedness
- Ethnicity and comorbidity checkboxes

#### Step 2: MRI Scan Upload
- Drag-and-drop or click to upload brain scan (JPEG/PNG)
- Show the DropZone component accepting the file
- Preview renders immediately

#### Step 3: Cognitive Assessment
- 10-question MMSE-style battery
- Each question has a point value
- Running score updates at the bottom

#### Step 4: Handwriting Sample
- Upload a photo of handwritten text
- Show tremor/stroke analysis hint text

#### Step 5: Speech Sample
- Upload a short audio recording (MP3/WAV)
- Transcription begins on server receipt

#### Step 6: Blood Biomarkers & Risk Factors
- Amyloid Beta (pg/mL), Tau (pg/mL), NfL (pg/mL) sliders
- Risk factor checkboxes: ApoE4 carrier, family history, head trauma, hypertension, etc.

**Submit Analysis** → loading state → redirected to Results page.

---

### Step 6 — Diagnostic Results (60 seconds)

**Route:** `/results`

1. **Confidence Gauge (top left):** `CircularScore` SVG showing AI confidence percentage
2. **Diagnostic Stage Badge:** "Mild Cognitive Impairment" (or whichever stage computed)
3. **Key Findings Panel:** Bulleted AI-synthesised narrative
4. **Biomarker Panel:** Amyloid Beta, Tau, NfL with normal-range indicators

---

### Step 7 — MRI Viewer (45 seconds)

**Within the Results page → click "MRI Viewer" tab**

1. **Multi-planar toggle:** Switch between Axial / Coronal / Sagittal views
2. **Grad-CAM overlay:** Toggle the heatmap on/off — red/orange areas indicate regions of highest AI attention
3. **Controls toolbar:** Brightness slider, Contrast slider, Zoom in/out buttons
4. **Region labels:** Hippocampus, Entorhinal Cortex, Temporal Lobe annotations

> **Talking point:** "This is where we add true 3D DICOM support in v1.1."

---

### Step 8 — Explainable AI Dashboard (30 seconds)

**Within the Results page → click "Explainability" tab**

1. **SHAP Feature Importance Chart:** Horizontal bar chart showing each modality's contribution to the final diagnosis
2. Read the values left-to-right: MRI at 30%, Cognitive at 18%, etc.
3. Point out the **positive (risk-increasing) vs. negative (protective) contributions**

> **Talking point:** "Clinicians need to know *why* the AI made its recommendation — not just what it said."

---

### Step 9 — Clinical Report (30 seconds)

**Within the Results page → click "Generate Report"**

1. `ClinicalReportModal` slides in
2. Shows structured PDF-style report:
   - Patient header
   - Diagnostic summary
   - Biomarker interpretation
   - Recommended interventions
   - Clinician signature block
3. Click **"Download PDF"** to export

---

### Step 10 — Longitudinal Progression Timeline (30 seconds)

**Route:** `/history` (Patient History in sidebar) → select a patient

1. **4-Visit Timeline:** Area chart showing MMSE score, risk score, hippocampal volume across 4 visits
2. Each data point is clickable → shows visit details sidebar
3. **Progression indicator:** Arrow showing improvement or decline between visits
4. **Biomarker trend lines:** Amyloid Beta and Tau plotted over time

> **Talking point:** "For a neurologist this is the most powerful view — seeing how a patient is changing over months."

---

## ⏱️ Full Demo Timeline

| Segment | Duration | Key Points |
|---------|----------|-----------|
| Landing Page | 0:00 – 0:30 | Problem, value prop, call-to-action |
| Authentication | 0:30 – 1:00 | Role selection, role-based UX |
| Dashboard | 1:00 – 1:45 | Real-time KPIs, risk distribution |
| Patient Registry | 1:45 – 2:15 | 30-patient dataset, search/filter |
| Analysis Wizard | 2:15 – 3:45 | 6 modalities, guided intake |
| Results + MRI | 3:45 – 4:30 | Confidence gauge, Grad-CAM |
| Explainability | 4:30 – 5:00 | SHAP chart, clinical transparency |

---

## 💡 Presenter Tips

- Keep the browser DevTools closed during the demo
- Use the **Dark theme** (toggle in TopBar) for presentation screens — higher contrast
- If the backend is not running, click **"Try Demo"** on the landing page for a fully offline experience
- The `Ctrl+K` command palette is great to show off — it's fast and responsive
- For clinician audiences, lead with the **Longitudinal Timeline** — it tells the patient's story

---

## 🔐 Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Doctor | `doctor` | `doctor123` |
| Admin | `admin` | `admin123` |
