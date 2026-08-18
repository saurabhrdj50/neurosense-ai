import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Brain, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ProgressBar from '../../components/ui/ProgressBar'
import { SectionSkeleton } from '../../components/ui/Skeleton'
import SpotlightCard from '../../components/ui/SpotlightCard'
import { historyApi } from '../../services'
import LongitudinalTimeline from './components/LongitudinalTimeline'

// ── Stage →  config ────────────────────────────────────────────────────────
const STAGE_BADGE = {
  'Non-Demented':       { variant: 'success',  color: '#10B981' },
  'Non Demented':       { variant: 'success',  color: '#10B981' },
  'Very Mild Demented': { variant: 'purple',   color: '#7C3AED' },
  'Mild Demented':      { variant: 'warning',  color: '#F59E0B' },
  'Moderate Demented':  { variant: 'danger',   color: '#EF4444' },
  'Unknown':            { variant: 'neutral',  color: '#94A3B8' },
}

const STAGE_SCORE = {
  'Non-Demented': 15,
  'Non Demented': 15,
  'Very Mild Demented': 35,
  'Mild Demented': 60,
  'Moderate Demented': 85,
  'Unknown': 50,
}

// Shared chart config
const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--tw-bg-opacity, #fff)',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    fontSize: 11,
    color: '#1E293B',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
  },
  labelStyle: { color: '#64748B', fontWeight: 600 },
}

// ── Metric cell ─────────────────────────────────────────────────────────────
function Metric({ label, value }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500 mb-0.5">{label}</p>
      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  )
}

// ── Trend badge ─────────────────────────────────────────────────────────────
function TrendBadge({ trend }) {
  if (trend === 'worsening') return <Badge variant="danger"  icon={TrendingDown}>Worsening</Badge>
  if (trend === 'improving') return <Badge variant="success" icon={TrendingUp}>Improving</Badge>
  return <Badge variant="neutral" icon={Minus}>Stable</Badge>
}

// ── Session card ─────────────────────────────────────────────────────────────
function SessionCard({ session, idx, total }) {
  const mri   = session.results?.mri || {}
  const stage = session.results?.final_stage?.stage || mri.stage || 'Unknown'
  const conf  = session.results?.final_stage?.confidence || mri.confidence || 0
  const stageConf = STAGE_BADGE[stage] ?? STAGE_BADGE['Unknown']
  const date  = new Date(session.timestamp)

  return (
    <SpotlightCard className="p-4">
      <div className="flex flex-wrap items-start gap-3.5">
        {/* Timeline node */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <Brain size={15} className="text-slate-500 dark:text-slate-400" aria-hidden="true" />
          </div>
          {idx < total - 1 && (
            <div className="w-px flex-1 min-h-4 bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-1">
              <Badge variant={stageConf.variant}>{stage}</Badge>
              <p className="text-[11px] text-slate-500">
                {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {' · '}
                {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">{conf.toFixed(1)}%</p>
              <p className="text-[11px] text-slate-500">Diagnostic Confidence</p>
            </div>
          </div>

          <ProgressBar value={conf} color={stageConf.color} showPercent={false} height={3} />

          {/* Metrics row */}
          <div className="flex flex-wrap gap-5 pt-1">
            {session.results?.cognitive?.composite_score != null && (
              <Metric label="Cognitive Score" value={`${session.results.cognitive.composite_score}/100`} />
            )}
            {session.results?.risk_profile?.risk_category && (
              <Metric label="Risk Category"   value={session.results.risk_profile.risk_category} />
            )}
            {session.results?.sentiment?.dominant_emotion && (
              <Metric label="Affect"          value={session.results.sentiment.dominant_emotion} />
            )}
          </div>
        </div>
      </div>
    </SpotlightCard>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    historyApi.getPatientHistory(patientId)
      .then(d => setData(d))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false))
  }, [patientId])

  const history = data?.history || []

  const chartData = history.map((s, idx) => {
    const stage = s.results?.final_stage?.stage || s.results?.mri?.stage || 'Unknown'
    return {
      date:       new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      session:    idx + 1,
      stageScore: STAGE_SCORE[stage] ?? 50,
      mriConf:    s.results?.mri?.confidence || 0,
      cogScore:   s.results?.cognitive?.composite_score || 0,
      riskScore:  Math.max(0, 100 - (s.results?.risk_profile?.overall_risk_score || 0)),
      stage,
    }
  }).reverse()

  const getTrend = () => {
    if (chartData.length < 2) return 'stable'
    const first = chartData[0]?.stageScore  ?? 50
    const last  = chartData[chartData.length - 1]?.stageScore ?? 50
    if (last > first + 5) return 'worsening'
    if (last < first - 5) return 'improving'
    return 'stable'
  }

  const trend          = getTrend()
  const latestStage    = chartData[chartData.length - 1]?.stage || 'Unknown'
  const earliestStage  = chartData[0]?.stage || 'Unknown'
  const avgConf        = chartData.length > 0
    ? chartData.reduce((a, b) => a + (b.mriConf || 0), 0) / chartData.length
    : 0

  const stageColor  = s => (STAGE_BADGE[s] ?? STAGE_BADGE['Unknown']).color
  const stageBadge  = s => (STAGE_BADGE[s] ?? STAGE_BADGE['Unknown']).variant

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/patients')}
            aria-label="Back to Patient Registry"
            className="p-2 rounded-lg bg-surface border border-border text-foreground-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">Patient Longitudinal History</h1>
            <p className="text-xs text-foreground-muted mt-0.5">Patient ID: <span className="font-mono">{patientId}</span> · {history.length} recorded sessions</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={Download}
          onClick={() => historyApi.exportPatientHistory(patientId)}
          aria-label="Export patient history as CSV"
        >
          Export History CSV
        </Button>
      </div>

      {loading ? (
        <div className="bg-surface border border-border rounded-xl p-6">
          <SectionSkeleton rows={6} />
        </div>
      ) : history.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl py-14 px-4 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-secondary border border-border text-foreground-muted flex items-center justify-center">
            <Clock size={24} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">No Diagnostic Sessions Recorded</h3>
            <p className="text-xs text-foreground-muted max-w-sm mt-1">
              There are no longitudinal assessment records available for patient ID <span className="font-mono">{patientId}</span>.
            </p>
          </div>
          <Button size="sm" onClick={() => navigate('/analysis')}>
            Start New Assessment
          </Button>
        </div>
      ) : (
        <>
          {/* Longitudinal Charts — only when ≥ 2 sessions */}
          {chartData.length > 1 && (
            <>
              {/* Summary stats + trajectory chart */}
              <SpotlightCard className="p-5 space-y-4 rounded-xl bg-surface border border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Longitudinal Diagnostic Trajectory</h3>
                  <TrendBadge trend={trend} />
                </div>

                {/* Key stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Baseline Stage',   value: earliestStage, color: stageColor(earliestStage) },
                    { label: 'Current Stage',     value: latestStage,   color: stageColor(latestStage) },
                    { label: 'Avg Confidence',    value: `${avgConf.toFixed(1)}%`, color: null },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-3 rounded-lg bg-background border border-border">
                      <p className="text-[10px] uppercase font-bold text-foreground-muted mb-0.5">{label}</p>
                      <p className="text-xs font-bold text-foreground" style={color ? { color } : {}}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Stage Score area chart */}
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={chartData} margin={{ left: -20, right: 8 }}>
                    <defs>
                      <linearGradient id="stageGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} formatter={v => [v.toFixed(1), 'Stage Score']} />
                    <Area type="monotone" dataKey="stageScore" stroke="#6366F1" fill="url(#stageGrad)" strokeWidth={2} name="Stage Score" />
                  </AreaChart>
                </ResponsiveContainer>
              </SpotlightCard>

              {/* Multimodal trends */}
              <SpotlightCard className="p-5 rounded-xl bg-surface border border-border">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Multi-Modality Biomarker Trends</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData} margin={{ left: -20, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip {...CHART_TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="mriConf"  stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} name="MRI Confidence" />
                    <Line type="monotone" dataKey="cogScore"  stroke="#0EA5E9" strokeWidth={2} dot={{ r: 3 }} name="Cognitive Score" />
                    <Line type="monotone" dataKey="riskScore" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Health Index" />
                  </LineChart>
                </ResponsiveContainer>
              </SpotlightCard>
            </>
          )}

          {/* Session timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Recorded Diagnostic Sessions Stream</h3>
            <LongitudinalTimeline history={history} patientId={patientId} />
          </div>
        </>
      )}
    </div>
  )
}
