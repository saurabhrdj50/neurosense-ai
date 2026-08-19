import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Brain, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import { SectionSkeleton } from '../../components/ui/Skeleton'
import { historyApi } from '../../services'
import LongitudinalTimeline from './components/LongitudinalTimeline'

const STAGE_BADGE = {
  'Non-Demented':       { variant: 'success', color: '#10B981', label: 'Normal' },
  'Non Demented':       { variant: 'success', color: '#10B981', label: 'Normal' },
  'Very Mild Demented': { variant: 'purple',  color: '#7C3AED', label: 'Very Mild' },
  'Mild Demented':      { variant: 'warning', color: '#F59E0B', label: 'Mild MCI' },
  'Moderate Demented':  { variant: 'danger',  color: '#EF4444', label: 'Moderate' },
  'Severe Demented':    { variant: 'danger',  color: '#EF4444', label: 'Severe' },
  'Unknown':            { variant: 'neutral', color: '#94A3B8', label: 'Unknown' },
}

const STAGE_SCORE = {
  'Non-Demented': 15,
  'Non Demented': 15,
  'Very Mild Demented': 35,
  'Mild Demented': 60,
  'Moderate Demented': 85,
  'Severe Demented': 95,
  'Unknown': 50,
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border shadow-md text-foreground text-xs rounded-xl p-2.5 min-w-[130px] z-50">
      <p className="font-bold text-foreground border-b border-border pb-1 mb-1">{label}</p>
      <div className="flex justify-between items-center gap-3">
        <span className="text-foreground-muted font-medium">Stage Level:</span>
        <span className="font-mono font-bold text-indigo-500">{payload[0].value}%</span>
      </div>
    </div>
  )
}

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
      stageScore: STAGE_SCORE[stage] ?? 50,
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

  const latestInfo    = STAGE_BADGE[latestStage] || STAGE_BADGE['Unknown']
  const earliestInfo  = STAGE_BADGE[earliestStage] || STAGE_BADGE['Unknown']

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10 font-sans">
      {/* Top Navigation & Title Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate('/patients')}
            aria-label="Back to Patient Registry"
            className="p-2.5 rounded-xl bg-surface border border-border text-foreground-muted hover:text-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shadow-2xs"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Patient History & Trends</h1>
            <p className="text-sm font-medium text-foreground-muted mt-0.5">
              Patient ID: <span className="font-mono font-bold text-foreground">{patientId}</span> · {history.length} assessment session(s)
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="md"
          icon={Download}
          onClick={() => historyApi.exportPatientHistory(patientId)}
          className="min-h-[40px] text-sm font-bold"
        >
          Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <SectionSkeleton rows={6} />
        </div>
      ) : history.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-16 px-4 flex flex-col items-center justify-center text-center gap-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-surface border border-border text-foreground-muted flex items-center justify-center">
            <Clock size={28} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">No History Recorded</h3>
            <p className="text-sm text-foreground-muted max-w-sm mt-1 font-medium">
              No previous assessment records found for patient ID <span className="font-mono font-bold">{patientId}</span>.
            </p>
          </div>
          <Button size="md" onClick={() => navigate('/analysis')} className="min-h-[40px] text-sm font-semibold">
            Start New Assessment
          </Button>
        </div>
      ) : (
        <>
          {/* Key Summary Cards & Health Trend Graph */}
          {chartData.length > 1 && (
            <Card className="p-6 space-y-5 rounded-2xl bg-card border border-border shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Health Trend Trajectory</h3>
                  <p className="text-xs text-foreground-muted font-medium mt-0.5">Overall diagnostic stage progression over time</p>
                </div>
                <Badge variant={trend === 'worsening' ? 'danger' : trend === 'improving' ? 'success' : 'neutral'}>
                  {trend === 'worsening' ? 'Worsening' : trend === 'improving' ? 'Improving' : 'Stable'}
                </Badge>
              </div>

              {/* KPI Chips */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                  <span className="text-[11px] font-semibold text-foreground-muted uppercase block">First Test Stage</span>
                  <Badge variant={earliestInfo.variant}>{earliestInfo.label}</Badge>
                </div>
                <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                  <span className="text-[11px] font-semibold text-foreground-muted uppercase block">Latest Test Stage</span>
                  <Badge variant={latestInfo.variant}>{latestInfo.label}</Badge>
                </div>
                <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                  <span className="text-[11px] font-semibold text-foreground-muted uppercase block">Recorded Tests</span>
                  <span className="text-base font-extrabold text-foreground block font-mono">{history.length}</span>
                </div>
              </div>

              {/* Clean Single Progression Chart */}
              <div className="pt-2">
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chartData} margin={{ top: 5, left: -25, right: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="historyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="stageScore" stroke="#6366F1" fill="url(#historyGrad)" strokeWidth={2.5} name="Stage Score" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Clean Session Timeline Stream */}
          <div className="space-y-3">
            <h3 className="text-base font-extrabold text-foreground tracking-tight">Recorded Test Sessions</h3>
            <LongitudinalTimeline history={history} patientId={patientId} />
          </div>
        </>
      )}
    </div>
  )
}
