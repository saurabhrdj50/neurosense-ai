/**
 * Tests for the pure clinical mapping utilities in clinicalMappers.js.
 * Run with: npm test (vitest run)
 */
import { describe, it, expect } from 'vitest'
import {
  RISK_COLORS,
  STAGE_CONFIG,
  getAnalysisStage,
  getAnalysisConfidence,
  getRiskLevel,
  stageToBadgeVariant,
  stageToLabel,
  SIMPLE_STAGE_INFO,
  getSimpleStageKey,
  formatTimeAgo,
} from './clinicalMappers'

describe('getRiskLevel', () => {
  it('returns Unknown for empty/missing stages', () => {
    expect(getRiskLevel(null)).toBe('Unknown')
    expect(getRiskLevel(undefined)).toBe('Unknown')
    expect(getRiskLevel('')).toBe('Unknown')
  })

  it('returns Unknown for error and unknown stages', () => {
    expect(getRiskLevel('Error')).toBe('Unknown')
    expect(getRiskLevel('MRI Error')).toBe('Unknown')
    expect(getRiskLevel('Unknown')).toBe('Unknown')
    expect(getRiskLevel('unknown stage')).toBe('Unknown')
  })

  it('returns Unknown for unrecognized stages (never fabricates High)', () => {
    expect(getRiskLevel('some totally unrecognized label')).toBe('Unknown')
    expect(getRiskLevel('Under Evaluation')).toBe('Unknown')
    expect(getRiskLevel(12345)).toBe('Unknown')
  })

  it('maps cognitively normal / non-demented stages to Low', () => {
    expect(getRiskLevel('Non-Demented')).toBe('Low')
    expect(getRiskLevel('Non Demented')).toBe('Low')
    expect(getRiskLevel('Cognitively Normal (CN)')).toBe('Low')
    expect(getRiskLevel('Normal Cognition')).toBe('Low')
    expect(getRiskLevel('CN')).toBe('Low')
  })

  it('maps very mild / subtle stages to Low', () => {
    expect(getRiskLevel('Very Mild Demented')).toBe('Low')
    expect(getRiskLevel('Subtle Decline')).toBe('Low')
  })

  it('maps mild / MCI stages to Medium', () => {
    expect(getRiskLevel('Mild Demented')).toBe('Medium')
    expect(getRiskLevel('MCI')).toBe('Medium')
    expect(getRiskLevel('Mild Cognitive Impairment (MCI)')).toBe('Medium')
    expect(getRiskLevel('Mild Memory Loss (MCI)')).toBe('Medium')
  })

  it('maps advanced disease stages to High', () => {
    expect(getRiskLevel("Alzheimer's Disease (AD)")).toBe('High')
    expect(getRiskLevel('AD')).toBe('High')
    expect(getRiskLevel('Moderate Demented')).toBe('High')
    expect(getRiskLevel('Significant Impairment')).toBe('High')
    expect(getRiskLevel('Moderate Decline')).toBe('High')
  })

  it('only returns the four documented tiers', () => {
    const stages = [
      'Non-Demented', 'CN', 'Normal Cognition', 'Very Mild Demented', 'Subtle Decline',
      'Mild Demented', 'MCI', 'Moderate Demented', 'AD', "Alzheimer's Disease (AD)",
      'Significant Impairment', 'Error', 'Unknown', '', null, 'gibberish',
    ]
    for (const stage of stages) {
      expect(['Low', 'Medium', 'High', 'Unknown']).toContain(getRiskLevel(stage))
    }
  })
})

describe('getAnalysisStage', () => {
  it('returns Unknown for null/undefined records', () => {
    expect(getAnalysisStage(null)).toBe('Unknown')
    expect(getAnalysisStage(undefined)).toBe('Unknown')
    expect(getAnalysisStage({})).toBe('Unknown')
  })

  it('prefers the direct stage field', () => {
    expect(getAnalysisStage({ stage: 'Mild Demented' })).toBe('Mild Demented')
    expect(getAnalysisStage({ stage: 'Mild Demented', final_stage: { stage: 'AD' } })).toBe('Mild Demented')
  })

  it('falls back to nested final_stage and mri_stage', () => {
    expect(getAnalysisStage({ final_stage: { stage: 'AD' } })).toBe('AD')
    expect(getAnalysisStage({ final_stage: 'AD' })).toBe('AD')
    expect(getAnalysisStage({ mri_stage: 'Very Mild Demented' })).toBe('Very Mild Demented')
  })
})

describe('getAnalysisConfidence', () => {
  it('returns 0 for null/undefined records', () => {
    expect(getAnalysisConfidence(null)).toBe(0)
    expect(getAnalysisConfidence({})).toBe(0)
  })

  it('prefers the direct confidence field', () => {
    expect(getAnalysisConfidence({ confidence: 88.4 })).toBe(88.4)
    expect(getAnalysisConfidence({ confidence: 90, final_stage: { confidence: 10 } })).toBe(90)
  })

  it('falls back to nested confidence fields', () => {
    expect(getAnalysisConfidence({ final_stage: { confidence: 72 } })).toBe(72)
    expect(getAnalysisConfidence({ final_confidence: 55 })).toBe(55)
    expect(getAnalysisConfidence({ mri_confidence: 41 })).toBe(41)
  })
})

describe('stageToBadgeVariant', () => {
  it('maps healthy/low stages to success', () => {
    expect(stageToBadgeVariant('Normal')).toBe('success')
    expect(stageToBadgeVariant('Non-Demented')).toBe('success')
    expect(stageToBadgeVariant('Cognitively Normal (CN)')).toBe('success')
    expect(stageToBadgeVariant('Low')).toBe('success')
  })

  it('maps mild/medium stages to warning', () => {
    expect(stageToBadgeVariant('Mild')).toBe('warning')
    expect(stageToBadgeVariant('Mild Demented')).toBe('warning')
    expect(stageToBadgeVariant('Mild Cognitive Impairment (MCI)')).toBe('warning')
    expect(stageToBadgeVariant('Medium')).toBe('warning')
  })

  it('maps high/moderate/severe stages to danger', () => {
    expect(stageToBadgeVariant('High')).toBe('danger')
    expect(stageToBadgeVariant('Moderate Demented')).toBe('danger')
    expect(stageToBadgeVariant('Severe Demented')).toBe('danger')
    expect(stageToBadgeVariant("Alzheimer's Disease (AD)")).toBe('danger')
  })

  it('maps empty/unrecognized stages to neutral', () => {
    expect(stageToBadgeVariant('')).toBe('neutral')
    expect(stageToBadgeVariant(null)).toBe('neutral')
    expect(stageToBadgeVariant('Unknown')).toBe('neutral')
  })
})

describe('stageToLabel', () => {
  it('maps tier codes to human labels', () => {
    expect(stageToLabel('Normal')).toBe('Normal / Low Risk')
    expect(stageToLabel('Low')).toBe('Normal / Low Risk')
    expect(stageToLabel('Mild')).toBe('Mild Risk')
    expect(stageToLabel('Medium')).toBe('Mild Risk')
    expect(stageToLabel('High')).toBe('High Risk')
  })

  it('falls back to the given stage or Unknown', () => {
    expect(stageToLabel('Mild Demented')).toBe('Mild Demented')
    expect(stageToLabel('')).toBe('Unknown')
    expect(stageToLabel(null)).toBe('Unknown')
  })
})

describe('getSimpleStageKey', () => {
  it('maps stages onto SIMPLE_STAGE_INFO keys', () => {
    expect(SIMPLE_STAGE_INFO).toHaveProperty('healthy')
    expect(SIMPLE_STAGE_INFO).toHaveProperty('early')
    expect(SIMPLE_STAGE_INFO).toHaveProperty('mild')
    expect(SIMPLE_STAGE_INFO).toHaveProperty('serious')
    expect(SIMPLE_STAGE_INFO).toHaveProperty('pending')

    expect(getSimpleStageKey('Non-Demented')).toBe('healthy')
    expect(getSimpleStageKey('Cognitively Normal (CN)')).toBe('healthy')
    expect(getSimpleStageKey('Very Mild Demented')).toBe('early')
    expect(getSimpleStageKey('Subtle Decline')).toBe('early')
    expect(getSimpleStageKey('Mild Demented')).toBe('mild')
    expect(getSimpleStageKey('MCI')).toBe('mild')
    expect(getSimpleStageKey("Alzheimer's Disease (AD)")).toBe('serious')
    expect(getSimpleStageKey('Severe Impairment')).toBe('serious')
    expect(getSimpleStageKey('Pending Assessment')).toBe('pending')
    expect(getSimpleStageKey('Error')).toBe('pending')
    expect(getSimpleStageKey('Unknown')).toBe('pending')
    expect(getSimpleStageKey('')).toBe('pending')
    expect(getSimpleStageKey(null)).toBe('pending')
  })
})

describe('STAGE_CONFIG / RISK_COLORS', () => {
  it('keeps pending/error stages out of concrete risk tiers', () => {
    expect(STAGE_CONFIG['Unknown'].risk).toBe('Under Evaluation')
    expect(STAGE_CONFIG['Error'].risk).toBe('Unavailable')
    expect(STAGE_CONFIG['Pending Assessment'].risk).toBe('Under Evaluation')
  })

  it('exposes the three canonical risk colors (CN / MCI / AD model)', () => {
    expect(Object.keys(RISK_COLORS)).toEqual(['Normal', 'Mild', 'AD'])
  })
})

describe('formatTimeAgo', () => {
  it('returns Unknown for missing dates', () => {
    expect(formatTimeAgo(null)).toBe('Unknown')
    expect(formatTimeAgo(undefined)).toBe('Unknown')
    expect(formatTimeAgo('')).toBe('Unknown')
  })

  it('formats relative times', () => {
    const now = new Date()
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60000).toISOString()
    const threeHoursAgo = new Date(now.getTime() - 3 * 3600000).toISOString()
    const fiveDaysAgo = new Date(now.getTime() - 5 * 86400000).toISOString()
    expect(formatTimeAgo(new Date().toISOString())).toBe('Just now')
    expect(formatTimeAgo(twoMinutesAgo)).toBe('2m ago')
    expect(formatTimeAgo(threeHoursAgo)).toBe('3h ago')
    expect(formatTimeAgo(fiveDaysAgo)).toBe('5d ago')
  })
})
