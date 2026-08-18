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
  'Very Mild Demented': { badgeVariant: 'purple',   risk: 'Mild Risk',         score: 35 },
  'Mild Demented':      { badgeVariant: 'warning',  risk: 'Moderate Risk',     score: 60 },
  'Moderate Demented':  { badgeVariant: 'danger',   risk: 'High Risk',         score: 85 },
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
 * Maps a stage string to a risk tier level: 'Low' | 'Medium' | 'High'.
 */
export function getRiskLevel(stage) {
  if (!stage) return 'Low';
  if (stage.includes('Non') || stage.includes('Very Mild')) return 'Low';
  if (stage.includes('Mild')) return 'Medium';
  return 'High';
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
