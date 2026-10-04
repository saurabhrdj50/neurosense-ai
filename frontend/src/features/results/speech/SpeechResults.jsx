import React from 'react'
import { Section, DataRow } from '../ResultSection'
import { Activity } from 'lucide-react'

export function SpeechResults({ sentiment }) {
  if (!sentiment || Object.keys(sentiment).length === 0) return null

  return (
    <Section icon={Activity} title="Speech and Text Summary" color="#a855f7" defaultOpen={true}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <DataRow label="Detected tone" value={sentiment.dominant_emotion || 'Not assessed'} />
          <DataRow label="Lexical density (heuristic)" value={sentiment.lexical_density || 'Not available'} />
          <DataRow label="Filler words (transcript count)" value={sentiment.filler_word_count ?? 'Not available'} />
          <DataRow label="Pause category" value={sentiment.pause_frequency || 'Not available'} />
          <DataRow label="Pitch variation category" value={sentiment.pitch_variation || 'Not available'} />
        </div>
        <p className="text-xs text-foreground-muted leading-relaxed">
          {sentiment.clinical_summary || 'Speech summaries are unavailable.'} Speech is not an input to the active fusion calculation.
        </p>
      </div>
    </Section>
  )
}
