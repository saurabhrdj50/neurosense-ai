import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ResultsPage from './ResultsPage'
import * as ResultsStore from '../../context/ResultsStore'
import { analysisApi } from '../analysis/api/analysisApi'

// Mock recharts responsive container for jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  }
})

describe('ResultsPage Component', () => {
  beforeEach(() => {
    vi.spyOn(analysisApi, 'getPastAnalyses').mockResolvedValue([])
    vi.spyOn(ResultsStore, 'getAnalysisResults').mockReturnValue({
      patient: { name: 'Test Patient', patient_id: 'P123', age: 72, sex: 'M' },
      stage: 'Mild Cognitive Impairment (MCI)',
      overall_confidence: 88,
      risk_level: 'Moderate',
      mri: { stage: 'Mild Demented', confidence: 85, model: 'ResNet-18' },
      cognitive: { composite_score: 65, answers: { q1: 1, q2: 0 } },
      speech: { clinical_summary: 'Slight hesitation noted.' },
      risk: { overall_risk_score: 45, risk_category: 'Moderate' },
      fusion: { summary: 'Multimodal assessment consistent.' },
    })
  })

  it('renders ResultsPage detail view without crashing or ReferenceError', () => {
    const { container } = render(
      <MemoryRouter initialEntries={[{ pathname: '/results', state: { fromAssessment: true } }]}>
        <ResultsPage />
      </MemoryRouter>
    )
    expect(container).toBeDefined()
    expect(screen.getByText('What We Evaluated')).toBeDefined()
    expect(screen.getByText('Memory & Recall Exercises')).toBeDefined()
  })
})
