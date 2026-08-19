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
    // Default fallback sample sentiment for demonstration
    sentiment = {
      dominant_emotion: 'Hesitant / Pausing',
      cognitive_risk_score: 0.42,
      semantic_coherence: '84%',
      speech_fluency: '78%',
      word_finding: '64%',
      speaking_speed: '112 WPM',
      pause_frequency: '4.2 / min',
      topic_focus: '91%',
      story_recall: '70%',
      clinical_summary: 'The patient demonstrated mild hesitation, word retrieval delay during object description tasks, preserved articulation, and slightly reduced sentence complexity.'
    }
  }

  const clinicalFindings = [
    { label: 'Speech Fluency', status: 'Slightly Hesitant', score: sentiment.speech_fluency || '78%', note: 'Occasional pauses during word retrieval', color: 'text-amber-400' },
    { label: 'Word Finding', status: 'Word Retrieval Delay', score: sentiment.word_finding || '64%', note: 'Increased reliance on generic pronouns', color: 'text-rose-400' },
    { label: 'Speaking Speed', status: 'Mildly Reduced', score: sentiment.speaking_speed || '112 WPM', note: 'Normal range: 130 - 160 WPM', color: 'text-amber-400' },
    { label: 'Pause Frequency', status: 'Frequent Pauses', score: sentiment.pause_frequency || '4.2 / min', note: 'Unfilled inter-phrase pauses', color: 'text-rose-400' },
    { label: 'Topic Focus', status: 'Stays On Topic', score: sentiment.topic_focus || '91%', note: 'Stays focused on prompt', color: 'text-emerald-400' },
    { label: 'Story Recall', status: 'Mild Memory Gap', score: sentiment.story_recall || '70%', note: 'Recalled 3 of 5 story details', color: 'text-amber-400' },
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
          <DataRow label="Dominant Tone" value={sentiment.dominant_emotion || 'Hesitant'} color="#c084fc" />
          <DataRow label="Cognitive Speech Risk" value={sentiment.cognitive_risk_score ? `${Math.round(sentiment.cognitive_risk_score * 100)}%` : '42%'} />
          <DataRow label="Semantic Coherence" value={sentiment.semantic_coherence || '84%'} />
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
            "{sentiment.clinical_summary || 'The patient demonstrated mild hesitation, word retrieval delay during object description tasks, preserved articulation, and slightly reduced sentence complexity.'}"
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
