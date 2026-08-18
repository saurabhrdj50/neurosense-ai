import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Calendar, TrendingUp, Activity, Brain, Speech, Award, Clock, 
  ChevronRight, Filter, LineChart as ChartIcon
} from 'lucide-react'

export default function LongitudinalTimeline({ patientData }) {
  const [timeRange, setTimeRange] = useState('All Time') // '3M' | '6M' | '1Y' | '2Y' | 'All Time'
  const [activeMetric, setActiveMetric] = useState('mmse') // 'mmse' | 'risk' | 'brainVol' | 'speechScore'

  const rawTimeline = patientData?.timeline || [
    { date: "2024-03-15", mmse: 28, risk: 0.22, brainVol: 3.8, speechScore: 92, event: "Baseline Clinical Screening" },
    { date: "2024-09-10", mmse: 26, risk: 0.35, brainVol: 3.6, speechScore: 86, event: "6-Month Follow-Up" },
    { date: "2025-03-20", mmse: 25, risk: 0.48, brainVol: 3.2, speechScore: 78, event: "1-Year Clinical Evaluation" },
    { date: "2026-03-18", mmse: 23, risk: 0.62, brainVol: 2.85, speechScore: 68, event: "Latest Multimodal NeuroSense Scan" }
  ]

  const metricsConfig = {
    mmse: { label: "MMSE Score", unit: "/ 30", color: "#3b82f6", gradient: "from-blue-500 to-indigo-600", desc: "Mini-Mental State Examination cognitive baseline" },
    risk: { label: "AI Risk Index", unit: "Score", color: "#ef4444", gradient: "from-rose-500 to-amber-600", desc: "Integrated multi-modal neurodegenerative risk model" },
    brainVol: { label: "Hippocampal Volume", unit: "cm³", color: "#10b981", gradient: "from-emerald-500 to-teal-600", desc: "Segmented medial temporal lobe volume" },
    speechScore: { label: "Speech Acoustic Score", unit: "pts", color: "#8b5cf6", gradient: "from-purple-500 to-fuchsia-600", desc: "Spectral pause frequency & articulation stability" }
  }

  const currentMetricConfig = metricsConfig[activeMetric]

  return (
    <div className="space-y-6">
      {/* Timeframe & Metric Selector Header */}
      <div className="rounded-2xl p-6 shadow-xl border space-y-4" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Longitudinal Progression Timeline</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tracking disease trajectory over clinical visits</p>
            </div>
          </div>

          {/* Time Range Filter Buttons */}
          <div className="flex items-center p-1 rounded-xl border" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
            {['3M', '6M', '1Y', '2Y', 'All Time'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timeRange === range
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {Object.entries(metricsConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveMetric(key)}
              className={`p-3 rounded-xl border text-left transition ${
                activeMetric === key
                  ? 'bg-indigo-500/10 border-indigo-500/50 text-foreground shadow-sm'
                  : 'bg-surface border-border/80 text-foreground-muted hover:border-border'
              }`}
            >
              <span className="text-xs font-medium block truncate" style={{ color: 'var(--text-muted)' }}>{config.label}</span>
              <span className="text-lg font-bold font-mono mt-1 block" style={{ color: 'var(--text-primary)' }}>
                {rawTimeline[rawTimeline.length - 1][key]} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{config.unit}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Trend Visualizer Component */}
      <div className="rounded-2xl p-6 shadow-xl border space-y-4" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ChartIcon className="w-4 h-4 text-blue-500" />
            {currentMetricConfig.label} Trend ({timeRange})
          </h4>
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{currentMetricConfig.desc}</span>
        </div>

        {/* SVG Curve Line Graph Visualizer */}
        <div className="h-64 w-full pt-4 relative flex items-end justify-between px-4 pb-8 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          {rawTimeline.map((item, idx) => {
            const val = item[activeMetric]
            let maxVal = 30
            if (activeMetric === 'risk') maxVal = 1
            if (activeMetric === 'brainVol') maxVal = 5
            if (activeMetric === 'speechScore') maxVal = 100

            const heightPct = Math.min(100, Math.max(15, (val / maxVal) * 100))

            return (
              <div key={idx} className="flex flex-col items-center gap-2 relative group flex-1">
                {/* Tooltip Popup */}
                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2.5 py-1 rounded-lg shadow-xl font-mono pointer-events-none z-10 whitespace-nowrap border"
                     style={{ background: 'var(--surface-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  {item.date}: {val} {currentMetricConfig.unit}
                </div>

                <div className="w-full flex justify-center items-end h-44">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.15 }}
                    style={{ backgroundColor: currentMetricConfig.color }}
                    className="w-8 rounded-t-lg opacity-80 group-hover:opacity-100 transition-opacity shadow-lg"
                  />
                </div>
                <span className="text-[11px] font-mono mt-2" style={{ color: 'var(--text-muted)' }}>{item.date}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chronological Visit Milestone Cards */}
      <div className="rounded-2xl p-6 shadow-xl border space-y-4" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
        <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Calendar className="w-4 h-4 text-indigo-500" />
          Clinical Visit Milestones
        </h4>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5" style={{ '--tw-before-bg': 'var(--border)' }}>
          {rawTimeline.map((item, idx) => (
            <div key={idx} className="relative flex items-start gap-4">
              <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-500 border-2 shadow-md shadow-blue-500/50" style={{ borderColor: 'var(--surface-card)' }} />
              <div className="p-4 rounded-xl border w-full flex flex-wrap items-center justify-between gap-4" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-blue-500 font-semibold">{item.date}</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>• {item.event}</span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Multimodal Assessment • Neurologist Review Confirmed
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span style={{ color: 'var(--text-secondary)' }}>MMSE: <strong style={{ color: 'var(--text-primary)' }}>{item.mmse}</strong></span>
                  <span style={{ color: 'var(--text-secondary)' }}>Risk: <strong className="text-rose-500">{item.risk}</strong></span>
                  <span style={{ color: 'var(--text-secondary)' }}>Brain Vol: <strong className="text-emerald-500">{item.brainVol} cm³</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
