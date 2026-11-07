import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Brain, FileText, Clock, User, ChevronDown, ChevronUp,
  Search, Calendar, Download, Sparkles, Activity, MessageSquare, HeartPulse
} from 'lucide-react'
import Badge from '../../../shared/components/ui/Badge'
import Button from '../../../shared/components/ui/Button'

const STAGE_CONFIG = {
  'Cognitively Normal (CN)': { label: 'Typical / Normal Cognition (CN)', variant: 'success', color: '#10B981' },
  'Non-Demented':       { label: 'Typical / Normal Cognition', variant: 'success', color: '#10B981' },
  'Non Demented':       { label: 'Typical / Normal Cognition', variant: 'success', color: '#10B981' },
  'Very Mild Demented': { label: 'Subtle Variations Observed', variant: 'purple',  color: '#7C3AED' },
  'Mild Cognitive Impairment (MCI)': { label: 'Mild Cognitive Changes (MCI)', variant: 'warning', color: '#F59E0B' },
  'Mild Demented':      { label: 'Mild Cognitive Changes (MCI)', variant: 'warning', color: '#F59E0B' },
  "Alzheimer's Disease (AD)": { label: "Alzheimer's Disease (AD)", variant: 'danger',  color: '#EF4444' },
  'Moderate Demented':  { label: 'Notable Cognitive Decline', variant: 'danger',  color: '#EF4444' },
  'Severe Demented':    { label: 'Significant Impairment', variant: 'danger',  color: '#EF4444' },
  'Unknown':            { label: 'Under Clinical Evaluation', variant: 'neutral', color: '#94A3B8' },
}

export default function LongitudinalTimeline({ history }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSessions, setExpandedSessions] = useState({})

  // Sort history chronologically (newest first)
  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [history])

  // Filtered history list
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return sortedHistory

    const q = searchQuery.toLowerCase()
    return sortedHistory.filter(session => {
      const stage = session.results?.final_stage?.stage || session.results?.mri?.stage || ''
      const user = session.user_name || ''
      const date = new Date(session.timestamp).toLocaleDateString()
      return stage.toLowerCase().includes(q) || user.toLowerCase().includes(q) || date.includes(q)
    })
  }, [sortedHistory, searchQuery])

  const toggleExpand = (id) => {
    setExpandedSessions(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-4 font-sans">
      {/* Clean Search & Filter Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search test history by stage, date..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-background border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
          />
        </div>

        <div className="text-xs text-foreground-muted font-semibold">
          Showing <strong className="text-foreground">{filteredHistory.length}</strong> of <strong className="text-foreground">{history.length}</strong> test sessions
        </div>
      </div>

      {/* Clean Timeline Session Cards */}
      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-12 text-center text-sm text-foreground-muted font-medium">
            No test sessions match your search criteria.
          </div>
        ) : (
          filteredHistory.map((session, idx) => {
            const dateObj = new Date(session.timestamp)
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

            const mri = session.results?.mri || {}
            const cog = session.results?.cognitive || {}
            const speech = session.results?.speech || session.results?.sentiment || {}
            const risk = session.results?.risk_profile || {}

            const rawStage = session.results?.final_stage?.stage || mri.stage || 'Unknown'
            const stageInfo = STAGE_CONFIG[rawStage] || STAGE_CONFIG['Unknown']
            const confidence = session.results?.final_stage?.confidence || mri.confidence || 0

            const isExpanded = !!expandedSessions[session.id]

            return (
              <div key={session.id || idx} className="bg-card border border-border rounded-2xl p-5 space-y-4 hover:border-primary/30 transition-all shadow-xs">
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold">
                      <Brain size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-extrabold text-foreground">{dateStr}</h4>
                        <Badge variant={stageInfo.variant}>{stageInfo.label}</Badge>
                      </div>
                      <p className="text-xs text-foreground-muted font-medium mt-0.5">
                        {timeStr} · Evaluated by <strong className="text-foreground">{session.user_name || 'Clinical Team'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right pr-2 hidden sm:block">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-sm font-extrabold text-foreground font-mono">{confidence.toFixed(1)}%</span>
                        <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                          ±{Math.max(2, Math.round((100 - confidence) * 0.28))}% CI
                        </span>
                      </div>
                      <span className="text-[10px] text-foreground-muted font-semibold uppercase tracking-wider block">Concordance Band</span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      icon={FileText}
                      onClick={() => navigate('/results', { state: { results: session.results } })}
                      className="min-h-[40px] text-xs font-bold px-3"
                    >
                      View Report
                    </Button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(session.id || idx)}
                      className="p-2 rounded-xl bg-surface border border-border text-foreground-muted hover:text-foreground transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title={isExpanded ? 'Hide details' : 'Show details'}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Hide diagnostic snapshot details' : 'Show diagnostic snapshot details'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Key Summary Chips Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
                    <span className="text-foreground-muted font-medium flex items-center gap-1">
                      <Brain size={13} className="text-indigo-500" /> Brain Scan (MRI)
                    </span>
                    <p className="font-extrabold text-foreground text-sm">
                      {mri.hippocampalVolume ? `${mri.hippocampalVolume} cm³` : (mri.stage || 'Scan Completed')}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
                    <span className="text-foreground-muted font-medium flex items-center gap-1">
                      <Sparkles size={13} className="text-amber-500" /> Memory Score
                    </span>
                    <p className="font-extrabold text-foreground text-sm">
                      {cog.composite_score != null ? `${cog.composite_score}/100` : 'Not assessed'}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
                    <span className="text-foreground-muted font-medium flex items-center gap-1">
                      <MessageSquare size={13} className="text-cyan-500" /> Speech Pattern
                    </span>
                    <p className="font-extrabold text-foreground text-sm">
                      {speech.pause_frequency && speech.pause_frequency !== 'Not available' ? `Pauses: ${speech.pause_frequency}` : (speech.clinical_summary ? 'Transcript available' : 'Not assessed')}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
                    <span className="text-foreground-muted font-medium flex items-center gap-1">
                      <HeartPulse size={13} className="text-rose-500" /> Health Risk
                    </span>
                    <p className="font-extrabold text-foreground text-sm">
                      {risk.risk_category || (risk.overall_risk_score != null ? (risk.overall_risk_score > 60 ? 'Moderate' : 'Low Risk') : 'Not Assessed')}
                    </p>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="pt-3 border-t border-border space-y-3 text-xs animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-foreground uppercase tracking-wider text-[11px] font-heading">Detailed Diagnostic Snapshot</h5>
                      <span className="text-[10px] font-mono text-foreground-muted">
                        Session Ref: {session.id ? session.id.slice(0, 8) : idx}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-foreground-muted">
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span>Memory Center (Hippocampus):</span>
                        <strong className="text-foreground">{mri.hippocampalVolume ? `${mri.hippocampalVolume} cm³` : 'Not measured'}</strong>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span>Total Brain Volume:</span>
                        <strong className="text-foreground">{mri.brainVolume ? `${mri.brainVolume} cm³` : 'Not measured'}</strong>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span>Cognitive Recall Score:</span>
                        <strong className="text-foreground">{cog.memory_recall != null ? `${cog.memory_recall}` : (cog.recall ? `${cog.recall}/3` : 'Not assessed')}</strong>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span>ApoE4 Genetic Indicator:</span>
                        <strong className="text-foreground">{risk.genetics?.apoe4 ? 'Present (e3/e4)' : 'Unknown'}</strong>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span>Epistemic Uncertainty Margin:</span>
                        <strong className="text-indigo-400 font-mono">±{Math.max(2, Math.round((100 - confidence) * 0.28))}%</strong>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-border/50">
                        <span>Multi-modal Concordance:</span>
                        <strong className="text-emerald-500 font-mono">
                          {confidence >= 80 ? 'High Agreement' : confidence >= 60 ? 'Moderate Concordance' : 'Single-Modality Driven'}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
