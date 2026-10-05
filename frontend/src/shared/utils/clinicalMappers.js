/**
 * @fileoverview Shared Clinical Mapping Utilities.
 * Unified source of truth for Alzheimer's stage classification, risk levels, badge styles, and colors.
 */

export const RISK_COLORS = {
  Normal: '#10B981',
  Mild: '#F59E0B',
  Moderate: '#EF4444',
  High: '#DC2626',
};

export const STAGE_CONFIG = {
  'Non-Demented':       { badgeVariant: 'success',  risk: 'Low Risk',          score: 15 },
  'Non Demented':       { badgeVariant: 'success',  risk: 'Low Risk',          score: 15 },
  'Cognitively Normal (CN)': { badgeVariant: 'success', risk: 'Low Risk',      score: 10 },
  'Normal Cognition':   { badgeVariant: 'success',  risk: 'Low Risk',          score: 12 },
  'CN':                 { badgeVariant: 'success',  risk: 'Low Risk',          score: 10 },
  'Very Mild Demented': { badgeVariant: 'purple',   risk: 'Mild Risk',         score: 35 },
  'Subtle Decline':     { badgeVariant: 'purple',   risk: 'Mild Risk',         score: 30 },
  'Mild Demented':      { badgeVariant: 'warning',  risk: 'Moderate Risk',     score: 60 },
  'Mild Cognitive Impairment (MCI)': { badgeVariant: 'warning', risk: 'Moderate Risk', score: 55 },
  'Mild Memory Loss (MCI)': { badgeVariant: 'warning', risk: 'Moderate Risk',  score: 55 },
  'MCI':                { badgeVariant: 'warning',  risk: 'Moderate Risk',     score: 55 },
  'Moderate Demented':  { badgeVariant: 'danger',   risk: 'High Risk',         score: 85 },
  "Alzheimer's Disease (AD)": { badgeVariant: 'danger', risk: 'High Risk',     score: 88 },
  'Moderate Decline':   { badgeVariant: 'danger',   risk: 'High Risk',         score: 80 },
  'Significant Impairment': { badgeVariant: 'danger', risk: 'High Risk',       score: 92 },
  'AD':                 { badgeVariant: 'danger',   risk: 'High Risk',         score: 88 },
  'Cognitive Assessment Completed': { badgeVariant: 'neutral', risk: 'Under Evaluation', score: 0 },
  'Screening In Progress': { badgeVariant: 'neutral', risk: 'Under Evaluation', score: 0 },
  'Pending Assessment': { badgeVariant: 'neutral',  risk: 'Under Evaluation',  score: 0 },
  'Unknown':            { badgeVariant: 'neutral',  risk: 'Under Evaluation',  score: 0 },
  'Error':              { badgeVariant: 'neutral',  risk: 'Unavailable',       score: 0 },
};

/**
 * Extracts the clinical stage string from an analysis record.
 */
export function getAnalysisStage(analysis) {
  if (!analysis) return 'Unknown';
  return analysis.stage || analysis.final_stage?.stage || analysis.final_stage || analysis.mri_stage || 'Unknown';
}

/**
 * Extracts the clinical confidence value (0-100) from an analysis record.
 */
export function getAnalysisConfidence(analysis) {
  if (!analysis) return 0;
  return analysis.confidence || analysis.final_stage?.confidence || analysis.final_confidence || analysis.mri_confidence || 0;
}

/**
 * Maps a stage string to a risk tier level: 'Low' | 'Medium' | 'High' | 'Unknown'.
 * Unrecognized, errored, or empty stages return 'Unknown' so consumers never
 * treat an unassessed analysis as a concrete risk tier.
 */
export function getRiskLevel(stage) {
  if (!stage) return 'Unknown';
  const lower = String(stage).toLowerCase();
  if (lower.includes('error') || lower.includes('unknown')) return 'Unknown';
  // Cognitively normal / non-demented (check before generic 'mild' matching
  // since 'Mild Cognitive Impairment' also contains 'mild'-adjacent text)
  if (lower.includes('non') || lower.includes('cognitively normal') || lower === 'cn'
      || lower.includes('normal cognition') || lower.includes('pending')
      || lower.includes('in progress') || lower.includes('completed')) return 'Low';
  if (lower.includes('very mild') || lower.includes('subtle decline')) return 'Low';
  if (lower.includes('alzheimer') || lower.includes('moderate') || lower.includes('significant impairment')
      || lower === 'ad' || lower.includes('(ad)')) return 'High';
  if (lower.includes('mild') || lower.includes('mci') || lower.includes('(mci)')) return 'Medium';
  // Unrecognized stage — do not fabricate a risk tier
  return 'Unknown';
}

/**
 * Maps a stage/risk string to a Badge UI variant.
 */
export function stageToBadgeVariant(stage) {
  if (!stage) return 'neutral';
  const lower = stage.toLowerCase();
  if (stage === 'Normal' || lower.includes('non') || lower === 'low') return 'success';
  if (stage === 'Mild' || (lower.includes('mild') && !lower.includes('moderate')) || lower === 'medium') return 'warning';
  if (stage === 'High' || lower.includes('moderate') || lower.includes('severe')) return 'danger';
  return 'neutral';
}

/**
 * Formats a stage or risk tier for clinical label display.
 */
export function stageToLabel(stage) {
  if (stage === 'Normal' || stage === 'Low') return 'Normal / Low Risk';
  if (stage === 'Mild' || stage === 'Medium') return 'Mild Risk';
  if (stage === 'High') return 'High Risk';
  return stage || 'Unknown';
}

/**
 * Plain-language stage explanations for patients and families.
 * `simple` is the big headline, `meaning` is one easy sentence,
 * `nextStep` tells the reader what to do about it.
 */
export const SIMPLE_STAGE_INFO = {
  healthy: {
    simple: 'Memory looks healthy',
    meaning: 'No clear signs of memory disease right now. Keep up regular check-ups.',
    nextStep: 'Continue a healthy lifestyle and repeat screening yearly.',
  },
  early: {
    simple: 'Very early small changes',
    meaning: 'Tiny changes that can be normal aging or the very start of memory trouble.',
    nextStep: 'Watch and re-check in 6–12 months; stay mentally and socially active.',
  },
  mild: {
    simple: 'Mild memory problems',
    meaning: 'Noticeable memory trouble, but daily life is still mostly okay.',
    nextStep: 'See a memory specialist and re-check in 3–6 months.',
  },
  serious: {
    simple: 'Serious memory problems',
    meaning: 'Clear memory loss that affects daily life and needs medical care.',
    nextStep: 'See a neurologist soon and arrange daily support.',
  },
  pending: {
    simple: 'Not enough information yet',
    meaning: 'More tests are needed before saying anything certain.',
    nextStep: 'Complete the remaining tests.',
  },
};

/**
 * Maps any backend/demo stage string to a SIMPLE_STAGE_INFO key.
 */
export function getSimpleStageKey(stage) {
  if (!stage) return 'pending';
  const lower = stage.toLowerCase();
  if (lower.includes('non') || lower.includes('cognitively normal') || lower === 'cn'
      || lower.includes('normal cognition')) return 'healthy';
  if (lower.includes('very mild') || lower.includes('subtle decline')) return 'early';
  if (lower.includes('alzheimer') || lower.includes('moderate') || lower.includes('significant impairment')
      || lower === 'ad' || lower.includes('(ad)') || lower.includes('severe')) return 'serious';
  if (lower.includes('mild') || lower.includes('mci') || lower.includes('(mci)')) return 'mild';
  if (lower.includes('pending') || lower.includes('in progress') || lower.includes('completed')
      || lower.includes('unknown') || lower.includes('error')) return 'pending';
  return 'pending';
}

/**
 * Simple names for the 5 analysis steps (medical name → everyday name).
 */
export const SIMPLE_MODALITY_NAMES = {
  mri: { simple: 'Brain scan', what: 'Photo of the brain showing shrinkage' },
  cognitive: { simple: 'Memory test', what: '15 short questions testing memory and thinking' },
  speech: { simple: 'Speech test', what: 'Listening to how clearly the person speaks' },
  risk: { simple: 'Health risks', what: 'Blood pressure, sleep, lifestyle and family factors' },
  notes: { simple: "Doctor's notes", what: 'What the doctor wrote about the patient' },
};

/**
 * Human-readable relative time formatting.
 */
export function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Display name for a clinician: prepends the "Dr." honorific unless the name
 * already carries it (demo seed full_name is "Dr. Gupta" — naive templates
 * produced "Dr. Dr. Gupta").
 */
export function doctorDisplayName(name) {
  if (!name) return '—'
  const n = String(name).trim()
  return /^dr\.?\s/i.test(n) ? n : `Dr. ${n}`
}

/** Human-readable biological sex for stored codes M/F/Other. */
export function formatSex(sex) {
  if (sex === 'M' || sex === 'male') return 'Male'
  if (sex === 'F' || sex === 'female') return 'Female'
  if (!sex) return '—'
  return sex.charAt(0).toUpperCase() + sex.slice(1)
}
