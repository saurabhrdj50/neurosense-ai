# NeuroSense AI — Master Design System (UI/UX Pro Max)

> **Design Archetype:** Accessible & Ethical + Minimalism & Swiss Medical Style  
> **Target Audience:** Neurologists, Primary Care Physicians, Patients, and Family Caregivers  
> **Core Objective:** Deliver complex multimodal AI diagnostic data with clinical authority, absolute clarity, and compassionate human empathy.

---

## 1. Visual Identity & Brand Philosophy

NeuroSense AI is an assistive diagnostic platform for neurodegenerative disorders. The visual language must never feel like an experimental AI tech demo; it must feel like a trusted medical instrument.

* **Emotional Tone:** Calm, reassuring, authoritative, and dignified.
* **Core Rule:** **Never cause unnecessary panic.** High-risk findings must be accompanied by constructive, actionable care pathways and support guidance.
* **Dual-Lens Architecture:** Every diagnostic screen allows seamless toggling between **Clinician View** (high-density clinical metrics, raw telemetry, Grad-CAM overlays) and **Patient & Family View** (plain-English reassurance, daily life meaning, questions for the care team).

---

## 2. Color System & Semantic Tokens

All color combinations strictly satisfy **WCAG 2.1 AA (4.5:1 minimum) and target AAA (7:1)** for body text.

| Role | Hex | RGB Triplet | Semantic Usage |
|---|---|---|---|
| **Primary (Medical Trust)** | `#0284C7` | `2 132 199` | Primary action buttons, focused tabs, verified indicators |
| **Primary Dark / Hover** | `#0369A1` | `3 105 161` | Interactive button hover and active states |
| **Surface Canvas (Light)** | `#F8FAFC` | `248 250 252` | Workstation background — reduces glare and eye strain |
| **Surface Card** | `#FFFFFF` | `255 255 255` | Elevated clinical card surfaces |
| **Text Primary** | `#0F172A` | `15 23 42` | Headlines, primary diagnostic metrics, clinical diagnoses |
| **Text Secondary** | `#334155` | `51 65 85` | Supporting explanations, clinical interpretations |
| **Text Muted** | `#64748B` | `100 116 139` | Timestamps, metadata labels, unit indicators |
| **Border Neutral** | `#E2E8F0` | `226 232 240` | Subtle structural dividers (never heavy black borders) |
| **Normal / Stable (Green)** | `#059669` | `5 150 105` | Normal cognitive scores, negative biomarkers, verified checks |
| **Borderline / Warning (Amber)**| `#D97706` | `217 119 6` | Mild Cognitive Impairment (MCI), elevated risk factors |
| **Clinical Alert (Crimson)** | `#DC2626` | `220 38 38` | Dementia / AD detection, critical cognitive deficits |

---

## 3. Typography Hierarchy

* **Heading Font:** `Figtree` (Geometric sans-serif with friendly, open counters — approachable yet scientific).
* **Body Font:** `Noto Sans` / `Inter` (Optimized for maximum screen legibility, wide x-height, clear numeric distinctions).
* **Monospace Font:** `JetBrains Mono` (Voxel counts, patient IDs, session timestamps).

| Scale | Font Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **Display 1** | `28px` / `1.75rem` | 800 (Extrabold) | `1.2` | Diagnostic verdict headlines |
| **Heading 2** | `20px` / `1.25rem` | 700 (Bold) | `1.3` | Section cards, modality headers |
| **Heading 3** | `16px` / `1.0rem` | 600 (Semibold) | `1.4` | Card titles, modality labels |
| **Body Large** | `16px` / `1.0rem` | 400 (Regular) | `1.6` | Patient/Family explanations, care advice |
| **Body Normal**| `14px` / `0.875rem`| 400/500 | `1.5` | Evidence table rows, test descriptions |
| **Caption/Tag**| `12px` / `0.75rem`| 600 (Semibold) | `1.4` | Badges, status pills, timestamps |

---

## 4. UI/UX Anti-Patterns (Explicitly Forbidden)

* ❌ **No AI Tech Glows:** Do not use purple/pink gradients, glowing neon borders, or dark futuristic cyberpunk effects.
* ❌ **No Bare Emojis as Icons:** Always use clean vector SVGs ([Lucide React](https://lucide.dev/)).
* ❌ **No Uncontextualized Numbers:** Never show a raw `66.2%` without explaining what modalities contributed and what the next medical steps are.
* ❌ **No Motion Without Purpose:** No bouncy spring physics or distracting auto-sliding carousels. Animations must convey spatial continuity (150–220ms ease-out) and immediately respect `prefers-reduced-motion`.
* ❌ **No Micro-Text:** Body text must never drop below `14px`; critical patient information must be `15px+`.

---

## 5. Humanization Microcopy Standards

* **Instead of:** *"Failed: Brain MRI Error"*  
  **Use:** *"Brain scan could not be analyzed due to upload format. [Retry with NIfTI scan]"*
* **Instead of:** *"Prediction: Alzheimer's Disease (Confidence: 66.2%)"*  
  **Use:** *"Assessment indicates patterns consistent with Mild Cognitive Impairment. Multimodal agreement across tests: High. Recommended next step: Schedule in-person neurological evaluation."*
* **Always provide:** A dedicated *"Questions to ask your physician"* checklist on patient-facing screens.

