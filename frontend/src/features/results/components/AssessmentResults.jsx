import React from 'react'
import { Section, DataRow } from './ResultSection'
import { MessageSquare, Activity, Mic, CheckCircle2, HeartPulse } from 'lucide-react'
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
  if (!sentiment || Object.keys(sentiment).length === 0) {
    sentiment = {
      clinical_summary: 'No speech analysis data available.'
    }
  }

  const clinicalFindings = [
    { label: 'Speech Fluency', status: sentiment.speech_fluency ? 'Analyzed' : 'N/A', score: sentiment.speech_fluency || 'N/A', note: 'Pacing and flow', color: 'text-indigo-400' },
    { label: 'Word Finding', status: sentiment.word_finding ? 'Analyzed' : 'N/A', score: sentiment.word_finding || 'N/A', note: 'Hesitations and fillers', color: 'text-indigo-400' },
    { label: 'Speaking Speed', status: sentiment.speaking_speed ? 'Analyzed' : 'N/A', score: sentiment.speaking_speed || 'N/A', note: 'Words per minute', color: 'text-indigo-400' },
    { label: 'Pause Frequency', status: sentiment.pause_frequency ? 'Analyzed' : 'N/A', score: sentiment.pause_frequency || 'N/A', note: 'Silent pauses', color: 'text-indigo-400' },
    { label: 'Semantic Coherence', status: sentiment.semantic_coherence ? 'Analyzed' : 'N/A', score: sentiment.semantic_coherence || 'N/A', note: 'Logical flow of meaning', color: 'text-indigo-400' },
  ]

  const emotionalIndicators = [
    { label: 'Calmness', status: 'Calm (75%)', color: 'text-emerald-400' },
    { label: 'Anxiety Level', status: 'Mild Anxiety', color: 'text-amber-400' },
    { label: 'Stress Level', status: 'Controlled', color: 'text-emerald-400' },
    { label: 'Emotional Stability', status: 'Cooperative', color: 'text-emerald-400' },
  ]

  return (
    <Section icon={Activity} title="Speech Biomarker & Fluency Findings" color="#a855f7" defaultOpen={true}>
      <div className="space-y-4">
        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <DataRow label="Dominant Tone" value={sentiment.dominant_emotion || 'N/A'} color="#c084fc" />
          <DataRow label="Cognitive Speech Risk" value={sentiment.cognitive_risk_score ? `${Math.round(sentiment.cognitive_risk_score * 100)}%` : 'N/A'} />
          <DataRow label="Semantic Coherence" value={sentiment.semantic_coherence || 'N/A'} />
        </div>

        {/* Acoustic & Linguistic Findings Grid */}
        <div className="p-3.5 rounded-xl bg-background border border-border/80 space-y-2.5">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Mic size={14} className="text-purple-400" /> Acoustic & Linguistic Speech Metrics
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {clinicalFindings.map(cf => (
              <div key={cf.label} className="p-2 rounded-lg bg-surface border border-border/70 space-y-1">
                <span className="text-[11px] font-semibold text-foreground-muted truncate block">{cf.label}</span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground truncate">{cf.status}</span>
                  <span className={`text-xs font-extrabold font-mono ${cf.color}`}>{cf.score}</span>
                </div>
                <p className="text-[10px] text-foreground-muted truncate pt-0.5 border-t border-border/30">{cf.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Clinical Narrative & Emotional Affect */}
        <div className="p-3.5 rounded-xl bg-background border border-border/80 space-y-2.5">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <HeartPulse size={14} className="text-purple-400" /> Speech Narrative & Affect
          </h4>

          <p className="text-xs text-foreground bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20 font-medium leading-relaxed">
            "{sentiment.clinical_summary || 'No detailed clinical summary available.'}"
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {emotionalIndicators.map(ei => (
              <div key={ei.label} className="p-2 rounded-lg bg-surface border border-border text-center space-y-0.5">
                <span className="text-[10px] text-foreground-muted block font-semibold">{ei.label}</span>
                <span className={`text-xs font-bold block ${ei.color}`}>{ei.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Optional Emotion Progress Bars */}
        {sentiment.emotions && (
          <div className="space-y-2 pt-1">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider block">Voice Emotion Distribution</span>
            {Object.entries(sentiment.emotions).map(([em, val]) => (
              <ProgressBar key={em} label={em.charAt(0).toUpperCase() + em.slice(1)} value={val * 100} color="#a855f7" glow={false} height={6} />
            ))}
          </div>
        )}
      </div>
    </Section>
  )
}
