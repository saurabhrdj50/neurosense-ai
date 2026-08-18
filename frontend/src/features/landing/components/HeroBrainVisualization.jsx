import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Activity, Mic, TestTube, Cpu, CheckCircle2, Sparkles, Zap, Layers, BarChart2 } from 'lucide-react'

export default function HeroBrainVisualization() {
  const [activeSignal, setActiveSignal] = useState('mri')

  const signals = [
    {
      id: 'mri',
      label: 'MRI Scan',
      sub: '3D Structural Vision',
      detail: 'Hippocampal volume reduction & cortical thickness mapping',
      icon: Brain,
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.15)',
      border: 'rgba(99, 102, 241, 0.4)',
      coords: { x: 22, y: 32 },
      badge: '3D CNN Matrix'
    },
    {
      id: 'speech',
      label: 'Speech Waveform',
      sub: 'Acoustic & NLP',
      detail: 'Micro-pause duration, vocal cadence & semantic density',
      icon: Mic,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.15)',
      border: 'rgba(56, 189, 248, 0.4)',
      coords: { x: 78, y: 28 },
      badge: 'Audio Transformer'
    },
    {
      id: 'cognitive',
      label: 'Cognitive Score',
      sub: 'Psychometric Index',
      detail: 'MMSE / MoCA sub-scores across memory & executive domains',
      icon: Activity,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.4)',
      coords: { x: 18, y: 68 },
      badge: 'Normalized Sub-scores'
    },
    {
      id: 'clinical_risk',
      label: 'Clinical Risk',
      sub: 'Risk Profile',
      detail: 'Vascular risk factor & family history indexing',
      icon: TestTube,
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.15)',
      border: 'rgba(236, 72, 153, 0.4)',
      coords: { x: 82, y: 70 },
      badge: 'Lancet Index'
    },
    {
      id: 'fusion',
      label: 'AI Fusion Node',
      sub: 'Cross-Attention Core',
      detail: 'Cross-modal transformer fusion matrix mapping latent space',
      icon: Cpu,
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.25)',
      border: 'rgba(168, 85, 247, 0.6)',
      coords: { x: 50, y: 48 },
      badge: 'Joint Latent Engine'
    },
    {
      id: 'insight',
      label: 'Clinical Insight',
      sub: 'Decision Support',
      detail: 'Risk estimation, stage prognosis & SHAP feature attributions',
      icon: CheckCircle2,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.18)',
      border: 'rgba(59, 130, 246, 0.5)',
      coords: { x: 50, y: 88 },
      badge: 'Clinician Verdict'
    }
  ]

  const activeData = signals.find(s => s.id === activeSignal) || signals[0]

  return (
    <div className="relative w-full max-w-xl mx-auto rounded-3xl p-6 sm:p-7 bg-surface-card border border-border shadow-2xl backdrop-blur-xl overflow-hidden group">
      {/* Background Ambient Radial Glows */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Brain className="w-5 h-5 animate-pulse text-indigo-500" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              NeuroSense Multimodal Visualization
            </h3>
            <p className="text-[11px] text-foreground-muted">Interactive Neural Signal Synthesis Engine</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-semibold border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          Active Pipeline
        </span>
      </div>

      {/* Main Interactive Brain Canvas */}
      <div className="relative w-full aspect-[4/3] rounded-2xl bg-surface/80 border border-border/70 p-4 overflow-hidden flex items-center justify-center">
        {/* Grid pattern background */}
        <div className="absolute inset-0 grid-pattern opacity-35 pointer-events-none" />

        {/* SVG Brain Silhouette and Neural Connections */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="mri-to-fusion" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="speech-to-fusion" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="cog-to-fusion" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="bio-to-fusion" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="fusion-to-insight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Brain Contour Path */}
          <path
            d="M 50 16 C 28 16 14 28 14 48 C 14 66 26 80 40 80 C 45 80 47 78 50 78 C 53 78 55 80 60 80 C 74 80 86 66 86 48 C 86 28 72 16 50 16 Z"
            fill="none"
            stroke="currentColor"
            className="text-indigo-500/25 dark:text-indigo-400/25"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />

          {/* Inner Brain Folds (Stylized) */}
          <path
            d="M 30 33 Q 40 26 50 30 T 70 33 M 22 48 Q 36 40 50 46 T 78 48 M 28 63 Q 42 56 50 60 T 72 63"
            fill="none"
            stroke="currentColor"
            className="text-purple-500/20 dark:text-purple-400/20"
            strokeWidth="0.6"
          />

          {/* Animated Connecting Lines from Inputs to Central AI Fusion Node */}
          <line x1="22" y1="32" x2="50" y2="48" stroke="url(#mri-to-fusion)" strokeWidth="1.8" strokeDasharray="3 3" />
          <line x1="78" y1="28" x2="50" y2="48" stroke="url(#speech-to-fusion)" strokeWidth="1.8" strokeDasharray="3 3" />
          <line x1="18" y1="68" x2="50" y2="48" stroke="url(#cog-to-fusion)" strokeWidth="1.8" strokeDasharray="3 3" />
          <line x1="82" y1="70" x2="50" y2="48" stroke="url(#bio-to-fusion)" strokeWidth="1.8" strokeDasharray="3 3" />
          <line x1="50" y1="48" x2="50" y2="88" stroke="url(#fusion-to-insight)" strokeWidth="2.2" strokeDasharray="2 2" />

          {/* Animated Pulse Orbs Traveling along neural lines */}
          <circle cx="36" cy="40" r="1.8" fill="#6366f1" className="animate-ping" />
          <circle cx="64" cy="38" r="1.8" fill="#38bdf8" className="animate-ping" />
          <circle cx="34" cy="58" r="1.8" fill="#10b981" className="animate-ping" />
          <circle cx="66" cy="59" r="1.8" fill="#ec4899" className="animate-ping" />
          <circle cx="50" cy="68" r="2.2" fill="#a855f7" className="animate-ping" />
        </svg>

        {/* Render Interactive Modality Nodes */}
        {signals.map((sig) => {
          const Icon = sig.icon
          const isActive = activeSignal === sig.id

          return (
            <motion.button
              key={sig.id}
              onClick={() => setActiveSignal(sig.id)}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.95 }}
              style={{
                left: `${sig.coords.x}%`,
                top: `${sig.coords.y}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: sig.bg,
                borderColor: sig.border
              }}
              className={`absolute flex items-center justify-center p-2.5 rounded-2xl border backdrop-blur-md transition-all duration-300 ${
                isActive
                  ? 'ring-4 ring-offset-2 ring-indigo-500/50 z-20 shadow-xl scale-110 bg-surface'
                  : 'hover:border-foreground/50 opacity-90 hover:opacity-100 z-10'
              }`}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: sig.color }} />
              {isActive && (
                <motion.span
                  layoutId="active-indicator"
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-background shadow"
                />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Signal Fusion Flow Ribbon (MRI → Speech → Cognitive → Biomarkers → AI Fusion → Clinical Insight) */}
      <div className="mt-4 flex items-center justify-between gap-1 overflow-x-auto py-2 no-scrollbar border-t border-b border-border/60">
        {[
          { label: 'MRI', id: 'mri' },
          { label: 'Speech', id: 'speech' },
          { label: 'Cognitive', id: 'cognitive' },
          { label: 'Clinical Risk', id: 'clinical_risk' },
          { label: 'AI Fusion', id: 'fusion' },
          { label: 'Clinical Insight', id: 'insight' }
        ].map((step, idx) => (
          <React.Fragment key={step.id}>
            <button
              onClick={() => setActiveSignal(step.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all ${
                activeSignal === step.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-surface-secondary text-foreground-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              {step.label}
            </button>
            {idx < 5 && <span className="text-[10px] text-foreground-subtle">→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Active Signal Details Panel */}
      <motion.div
        key={activeData.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-4 p-3.5 rounded-2xl bg-surface border border-border flex items-center justify-between shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: activeData.bg, border: `1px solid ${activeData.border}` }}
          >
            <activeData.icon className="w-5 h-5" style={{ color: activeData.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-foreground">{activeData.label}</h4>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-secondary text-indigo-600 dark:text-indigo-400 font-semibold border border-border">
                {activeData.badge}
              </span>
            </div>
            <p className="text-[11px] text-foreground-muted mt-0.5 leading-tight">{activeData.detail}</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 shrink-0">
          <Sparkles className="w-3 h-3" /> Signal Fused
        </div>
      </motion.div>
    </div>
  )
}

