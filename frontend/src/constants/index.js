/**
 * @fileoverview Application-wide constants for NeuroSense AI.
 *
 * Centralises magic numbers, hardcoded strings, colour palettes, and
 * animation configuration so they are easy to update in one place.
 */

// ─── Brand & Palette ──────────────────────────────────────────────────────────

/** Primary brand colour used throughout the application. */
export const COLOR_PRIMARY = '#5B5CEB'

/** Supporting accent colour (purple). */
export const COLOR_ACCENT = '#8B5CF6'

/** Success/normal-stage colour (green). */
export const COLOR_SUCCESS = '#10B981'

/** Warning/mild-stage colour (amber). */
export const COLOR_WARNING = '#F59E0B'

/** Danger/high-risk colour (red). */
export const COLOR_DANGER = '#EF4444'

/** Info colour (blue). */
export const COLOR_INFO = '#3B82F6'

/** Cyan (used for patient-related stat cards). */
export const COLOR_CYAN = '#06B6D4'

// ─── Disease Stage Labels ────────────────────────────────────────────────────

/** Alzheimer's disease stage labels used across the application. */
export const DISEASE_STAGES = {
  HEALTHY: 'Healthy Control',
  MCI: 'Mild Cognitive Impairment (MCI)',
  EARLY_AD: 'Early AD',
  MODERATE_AD: 'Moderate AD',
  ADVANCED_AD: 'Advanced AD',
  NON_DEMENTED: 'Non Demented',
  VERY_MILD: 'Very Mild Demented',
  MILD: 'Mild Demented',
  MODERATE: 'Moderate Demented',
}

// ─── Risk Level Colours ───────────────────────────────────────────────────────

/**
 * Risk level → colour mapping for badges, charts, and indicators.
 * Each entry has bg (background), color (text/stroke), and border values.
 */
export const RISK_LEVEL_COLORS = {
  Low: {
    bg: 'rgba(16,185,129,0.12)',
    color: '#10B981',
    border: 'rgba(16,185,129,0.25)',
  },
  Medium: {
    bg: 'rgba(245,158,11,0.12)',
    color: '#F59E0B',
    border: 'rgba(245,158,11,0.25)',
  },
  High: {
    bg: 'rgba(239,68,68,0.12)',
    color: '#EF4444',
    border: 'rgba(239,68,68,0.25)',
  },
  Normal: { bg: 'rgba(16,185,129,0.12)', color: '#10B981', border: 'rgba(16,185,129,0.25)' },
  Mild: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: 'rgba(245,158,11,0.25)' },
  Moderate: { bg: 'rgba(239,68,68,0.12)', color: '#EF4444', border: 'rgba(239,68,68,0.25)' },
}

// ─── Stage Distribution Chart Colours ────────────────────────────────────────

/** Colour array for risk/stage distribution pie and area charts. */
export const RISK_CHART_COLORS = {
  Normal: '#10B981',
  Mild: '#F59E0B',
  Moderate: '#EF4444',
  High: '#DC2626',
}

// ─── Animation Variants (Framer Motion) ──────────────────────────────────────

/**
 * Staggered container animation — apply to parent wrapper.
 * Children should use ITEM_ANIM.
 */
export const CONTAINER_ANIM = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

/**
 * Individual item fade-up animation — apply to each staggered child.
 */
export const ITEM_ANIM = {
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4 } },
}

/**
 * Standard page-entry animation (fade + slight slide up).
 */
export const PAGE_ENTRY_ANIM = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
}

// ─── Timing ───────────────────────────────────────────────────────────────────

/** Toast notification display duration in milliseconds. */
export const TOAST_DURATION_MS = 4000

/** Default React Query stale time (5 minutes). */
export const QUERY_STALE_TIME_MS = 5 * 60 * 1000

/** Default React Query garbage collection time (10 minutes). */
export const QUERY_GC_TIME_MS = 10 * 60 * 1000

// ─── Thresholds ───────────────────────────────────────────────────────────────

/** MMSE score upper bound for a normal cognitive result. */
export const MMSE_THRESHOLD_NORMAL = 24

/** MMSE score upper bound for a mild cognitive impairment result. */
export const MMSE_THRESHOLD_MILD = 18

/** Risk score threshold below which a patient is considered low risk. */
export const RISK_SCORE_LOW = 0.35

/** Risk score threshold below which a patient is considered medium risk. */
export const RISK_SCORE_MEDIUM = 0.65

// ─── Pagination ───────────────────────────────────────────────────────────────

/** Default number of patients displayed per page in the patient list. */
export const PATIENTS_PER_PAGE = 10

// ─── Local Storage Keys ───────────────────────────────────────────────────────

/** localStorage key for the user's selected theme. */
export const LS_THEME_KEY = 'neurosense_theme'

/** localStorage key for the user's preferred font size. */
export const LS_FONT_SIZE_KEY = 'neurosense_fontsize'

/** localStorage key for the user's motion preference. */
export const LS_MOTION_KEY = 'neurosense_motion'

// ─── Demo Mode ────────────────────────────────────────────────────────────────

/** Total number of synthetic demo patients available. */
export const DEMO_PATIENT_COUNT = 30

/**
 * Breakdown of demo patients by disease stage.
 * Healthy: 6, MCI: 8, Early AD: 8, Moderate AD: 5, Advanced AD: 3
 */
export const DEMO_STAGE_DISTRIBUTION = {
  HEALTHY: { count: 6, range: [0, 5] },
  MCI: { count: 8, range: [6, 13] },
  EARLY_AD: { count: 8, range: [14, 21] },
  MODERATE_AD: { count: 5, range: [22, 26] },
  ADVANCED_AD: { count: 3, range: [27, 29] },
}
