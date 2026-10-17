import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpeechResults } from './SpeechResults'

describe('SpeechResults Component', () => {
  it('returns null if sentiment is empty', () => {
    const { container } = render(<SpeechResults sentiment={null} transcription={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders standard linguistic rows when acoustic features are absent', () => {
    const sentiment = {
      dominant_emotion: 'Neutral',
      lexical_density: '62%',
      filler_word_count: 3,
      pause_frequency: 'moderate',
      pitch_variation: 'normal',
    }
    render(<SpeechResults sentiment={sentiment} transcription={{ text: 'Hello doctor' }} />)

    expect(screen.getByText('Speech and Text Summary')).toBeDefined()
    expect(screen.getByText('Neutral')).toBeDefined()
    expect(screen.getByText('62%')).toBeDefined()
    expect(screen.queryByText(/Acoustic Biomarkers/i)).toBeNull()
  })

  it('renders acoustic biomarkers panel when jitter/shimmer/HNR are present', () => {
    const sentiment = {
      dominant_emotion: 'Mild Anxiety',
      lexical_density: '48%',
      filler_word_count: 5,
      pause_frequency: 'frequent',
      pitch_variation: 'reduced',
      jitter_percent: 0.82,
      shimmer_percent: 2.45,
      hnr_db: 22.4,
      formant_f1_hz: 520,
      formant_f2_hz: 1640,
      vocal_risk_score: 0.22,
      vocal_impression: 'Acoustic biomarkers within normative vocal limits.',
    }
    const transcription = {
      text: 'Sample transcribed patient audio',
      acoustic_features: {
        f0_mean_hz: 142.5,
        f0_std_hz: 18.2,
        pause_ratio: 0.28,
        pause_count: 4,
        articulation_rate_syl_per_sec: 3.4,
      },
    }

    render(<SpeechResults sentiment={sentiment} transcription={transcription} />)

    expect(screen.getAllByText(/Acoustic Biomarkers/i).length).toBeGreaterThan(0)
    expect(screen.getByText('0.82%')).toBeDefined()
    expect(screen.getByText('Norm <1.04%')).toBeDefined()
    expect(screen.getByText('2.45%')).toBeDefined()
    expect(screen.getByText('Norm <3.81%')).toBeDefined()
    expect(screen.getByText('22.4 dB')).toBeDefined()
    expect(screen.getByText('Norm >20dB')).toBeDefined()
    expect(screen.getByText(/143 Hz/i)).toBeDefined()
    expect(screen.getByText('520 / 1640 Hz')).toBeDefined()
    expect(screen.getByText('22%')).toBeDefined() // Vocal Risk Index
    expect(screen.getByText(/Acoustic biomarkers within normative vocal limits/i)).toBeDefined()
  })
})
