import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Mic, Activity, PenTool, TestTube, Cpu, ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Layers } from 'lucide-react'

export default function MultimodalFusionDiagram() {
  const [selectedModality, setSelectedModality] = useState('mri')

  const modalities = [
    {
      id: 'mri',
      title: '🧠 MRI Imaging',
      icon: Brain,
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.12)',
      border: 'rgba(99, 102, 241, 0.3)',
      features: ['Hippocampal volume reduction', 'Cortical thickness mapping', '3D structural atrophy patterns']
    },
    {
      id: 'speech',
      title: '🎤 Speech & Language',
      icon: Mic,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.3)',
      features: ['Acoustic pause frequency', 'Hesitation cadence & latency', 'Linguistic semantic density']
    },
    {
      id: 'cognitive',
      title: '📊 Cognitive Assessment',
      icon: Activity,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.3)',
      features: ['MMSE / MoCA sub-scores', 'Delayed recall score', 'Executive function index']
    },
    {
      id: 'clinical_risk',
      title: '📋 Clinical Risk Profile',
      icon: PenTool,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      features: ['Lancet dementia risk score', 'Vascular disease load', 'Family history weighting']
    },
    {
      id: 'demographics',
      title: '👤 Patient Demographics',
      icon: TestTube,
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.12)',
      border: 'rgba(236, 72, 153, 0.3)',
      features: ['Age & education indexing', 'Baseline cognitive history', 'Gender-specific risk adjustment']
    },
    {
      id: 'shap',
      title: '🤖 Explainable AI (SHAP)',
      icon: Cpu,
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.12)',
      border: 'rgba(168, 85, 247, 0.3)',
      features: ['Regional feature attribution', 'Positive & negative weights', 'Model uncertainty bounds']
    }
  ]

  const outputs = [
    { label: 'Risk Score', value: 'Moderate Risk', sub: 'Indexed 0 to 100 continuous scale', badge: 'Risk Index' },
    { label: 'Stage Estimate', value: 'MCI / Early-Stage', sub: 'Clinical staging recommendation', badge: 'Staging' },
    { label: 'Model Confidence', value: '89.4% Certainty', sub: 'Latent space agreement bound', badge: 'Confidence' },
    { label: 'Key Contributing Features', value: 'Hippocampal & Speech Pauses', sub: 'Top SHAP feature attributions', badge: 'Attributions' },
    { label: 'Clinician Review', value: 'Pending Review', sub: 'Human-in-the-loop signoff step', badge: 'Verification' }
  ]

  const activeModality = modalities.find(m => m.id === selectedModality) || modalities[0]

  return (
    <div className="space-y-12">
      {/* SECTION HEADER */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider border border-indigo-500/20">
          <Layers size={13} className="text-indigo-500" /> Multimodal Fusion Architecture
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
          One Patient. Multiple Signals. One Unified View.
        </h2>
        <p className="text-foreground-muted text-sm sm:text-base leading-relaxed">
          The NeuroSense AI Fusion Engine processes distinct diagnostic modalities through specialized sub-networks, projecting feature vectors into a joint cross-attention fusion matrix.
        </p>
      </div>

      {/* THREE-COLUMN FUSION MATRIX DIAGRAM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* INPUT MODALITY CARDS (LEFT) */}
        <div className="lg:col-span-4 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-foreground-subtle px-1 flex items-center justify-between mb-1">
            <span>Input Diagnostic Modalities</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">6 Modality Streams</span>
          </div>

          {modalities.map((mod) => {
            const Icon = mod.icon
            const isSelected = selectedModality === mod.id

            return (
              <motion.div
                key={mod.id}
                onClick={() => setSelectedModality(mod.id)}
                whileHover={{ x: 4 }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-surface border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-surface-card border-border hover:border-foreground/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: mod.bg, border: `1px solid ${mod.border}` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: mod.color }} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{mod.title}</h4>
                    <p className="text-[10px] text-foreground-muted">{mod.features[0]}</p>
                  </div>
                </div>
                <ArrowRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-indigo-500 translate-x-1' : 'text-foreground-subtle opacity-40'}`} />
              </motion.div>
            )
          })}
        </div>

        {/* CENTRAL AI FUSION ENGINE (CENTER) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center relative my-4 lg:my-0">
          {/* Visual Pulsing Glow Ring */}
          <div className="absolute w-64 h-64 bg-indigo-500/15 dark:bg-indigo-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />

          <div className="relative w-full max-w-sm rounded-3xl p-6 bg-gradient-to-b from-indigo-900/50 via-surface-card to-purple-900/50 border border-indigo-500/40 shadow-2xl backdrop-blur-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30 border border-indigo-400/40">
              <Cpu className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-indigo-400 block">
                Core Neural Architecture
              </span>
              <h3 className="text-base font-extrabold text-white mt-1">
                NeuroSense AI Fusion Engine
              </h3>
              <p className="text-xs text-indigo-200/90 mt-1 leading-relaxed">
                Cross-modal transformer attention layer mapping multi-source embeddings into unified staging probability vectors.
              </p>
            </div>

            {/* Active Highlight Feature Preview */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-indigo-500/40 text-left space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-[10px] font-mono text-indigo-300">
                <span>ACTIVE STREAM</span>
                <span className="text-emerald-400 font-bold">{activeModality.title}</span>
              </div>
              <ul className="text-[11px] text-slate-200 space-y-1">
                {activeModality.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* OUTPUT CLINICAL VERDICTS (RIGHT) */}
        <div className="lg:col-span-4 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-foreground-subtle px-1 flex items-center justify-between mb-1">
            <span>Clinical Verdict Outputs</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">Unified Staging</span>
          </div>

          {outputs.map((out, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-surface-card border border-border hover:border-indigo-500/30 transition-all flex items-center justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-semibold uppercase text-foreground-subtle block">{out.label}</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-surface-secondary text-indigo-600 dark:text-indigo-400 border border-border">
                    {out.badge}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-foreground mt-0.5">{out.value}</h4>
                <p className="text-[10px] text-foreground-muted">{out.sub}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

