import { describe, it, expect } from 'vitest'
import { ANALYSIS_STAGE_LABELS } from './analysisApi'

describe('ANALYSIS_STAGE_LABELS', () => {
  it('covers every pipeline stage the backend reports', () => {
    // Mirrors app/features/analysis/service.py run_full_analysis report() calls
    const backendStages = ['mri', 'notes', 'speech', 'cognitive', 'risk', 'fusion', 'explanation', 'recommendations']
    for (const stage of backendStages) {
      expect(ANALYSIS_STAGE_LABELS[stage], `missing label for ${stage}`).toBeTruthy()
    }
  })

  it('labels are human-readable and non-empty', () => {
    for (const label of Object.values(ANALYSIS_STAGE_LABELS)) {
      expect(label.length).toBeGreaterThan(5)
      expect(label).not.toMatch(/[<>{}]/)
    }
  })
})
