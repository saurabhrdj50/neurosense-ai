import React from 'react'
import { Section, DataRow } from './ResultSection'
import { MessageSquare, Activity } from 'lucide-react'
import ProgressBar from '../../../components/ui/ProgressBar'

export function CognitiveResults({ cognitive }) {
  if (!cognitive || Object.keys(cognitive).length === 0) return null

  return (
    <Section icon={MessageSquare} title="Cognitive Assessment" color="#06b6d4" defaultOpen={false}>
      <div className="grid grid-cols-2 gap-4">
        <DataRow label="Composite Score" value={cognitive.composite_score} />
        <DataRow label="MMSE Equivalent" value={cognitive.mmse_equivalent} />
        <DataRow label="Impairment Level" value={cognitive.impairment_level} color={cognitive.impairment_level === 'Normal' ? '#22c55e' : cognitive.impairment_level === 'Moderate' ? '#f59e0b' : '#ef4444'} />
        <DataRow label="Memory Recall" value={cognitive.memory_recall} />
      </div>
    </Section>
  )
}

export function SentimentResults({ sentiment }) {
  if (!sentiment || Object.keys(sentiment).length === 0) return null

  return (
    <Section icon={Activity} title="Sentiment & Language" color="#a855f7" defaultOpen={false}>
      <div className="space-y-3">
        <DataRow label="Dominant Emotion" value={sentiment.dominant_emotion} color="#c084fc" />
        <DataRow label="Cognitive Risk Score" value={sentiment.cognitive_risk_score} />
        <DataRow label="Semantic Coherence" value={sentiment.semantic_coherence} />
        {sentiment.emotions && (
          <div className="space-y-2 mt-3">
            {Object.entries(sentiment.emotions).map(([em, val]) => (
              <ProgressBar key={em} label={em.charAt(0).toUpperCase() + em.slice(1)} value={val * 100} color="#a855f7" glow={false} height={6} />
            ))}
          </div>
        )}
      </div>
    </Section>
  )
}
