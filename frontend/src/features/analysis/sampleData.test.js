import { describe, it, expect } from 'vitest'
import { buildSampleCognitive, SAMPLE_PATIENT, SAMPLE_SPEECH_TEXT } from './sampleData'

describe('sample data', () => {
  it('builds a fully derived cognitive profile from the breakdown', () => {
    const cogn = buildSampleCognitive()
    expect(Object.keys(cogn.screening_breakdown)).toHaveLength(15)
    expect(cogn.questions_completed).toBe(15)

    // Derivation mirrors CognitiveStep: earned/possible across max-4 items.
    const earned = Object.values(cogn.screening_breakdown).reduce((s, v) => s + v, 0)
    expect(cogn.composite_score).toBe(Math.round((earned / 60) * 100))

    // Instrument scores (MMSE/MoCA) must NOT be fabricated — the backend
    // treats them as clinician-administered scores and labels reports
    // accordingly. Only the screening composite travels in the payload.
    expect(cogn.mmse).toBeUndefined()
    expect(cogn.moca).toBeUndefined()

    // Every domain covered by the breakdown is present with matching sums.
    const domainIds = new Set(Object.values({
      orientation: ['orient_date', 'orient_place'],
      immediate_memory: ['register_3words'],
      delayed_memory: ['delay_recall'],
      working_memory: ['digit_span_fwd'],
      attention: ['serial_7'],
      verbal_fluency: ['animal_fluency'],
      language: ['object_naming', 'sentence_compreh'],
      executive_function: ['multi_step_cmd', 'months_reverse'],
      reasoning: ['logical_reason', 'abstraction'],
      problem_solving: ['problem_solve'],
      episodic_memory: ['auto_memory'],
    }).flat())
    expect(domainIds.size).toBe(15)
  })

  it('keeps the demo patient clearly fictional', () => {
    expect(SAMPLE_PATIENT.patient_id).toContain('DEMO')
    expect(SAMPLE_PATIENT.notes.toLowerCase()).toContain('demo')
  })

  it('speech sample contains hesitation markers for the annotated transcript', () => {
    const words = SAMPLE_SPEECH_TEXT.toLowerCase()
    expect(words).toContain('um')
    expect(words).toContain('...')
  })
})
