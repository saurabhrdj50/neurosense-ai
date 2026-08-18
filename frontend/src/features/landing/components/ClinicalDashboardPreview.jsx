import React from 'react'
import { motion } from 'framer-motion'
import { User, Activity, Brain, Mic, ShieldAlert, BarChart3, Calendar, Award } from 'lucide-react'

export default function ClinicalDashboardPreview() {
  const patient = {
    id: 'PT-8942-AZ',
    age: 71,
    gender: 'Female',
    date: 'Oct 24, 2026',
    assessment: "Alzheimer's Disease — AI-Assisted Assessment"
  }

  const cards = [
    { label: 'Risk Level', value: 'Moderate Risk', sub: 'Elevated early markers (Index 64/100)', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
    { label: 'Stage Estimate', value: 'MCI / Early-Stage', sub: 'Mild Cognitive Impairment pattern', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30' },
    { label: 'Model Confidence', value: '89.4% Certainty', sub: 'Latent space agreement index', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' }
  ]

  const findings = [
    { title: 'MRI Findings', val: 'Hippocampal volume reduction (14.2% below age-normative mean)', icon: Brain, color: '#6366f1' },
    { title: 'Speech Findings', val: 'Elevated acoustic micro-pause frequency (1.8s avg hesitation interval)', icon: Mic, color: '#38bdf8' },
    { title: 'Cognitive Findings', val: 'Sub-score reduction in delayed word recall (MMSE score 24/30)', icon: Activity, color: '#10b981' }
  ]

  const featureAttributions = [
    { name: 'MRI Structural Features (Hippocampal Vol)', weight: 42, color: '#6366f1' },
    { name: 'Cognitive Sub-scores (Delayed Recall)', weight: 28, color: '#10b981' },
    { name: 'Speech Acoustic Features (Pause Duration)', weight: 18, color: '#38bdf8' },
    { name: 'Clinical Risk Factors (Vascular / Family)', weight: 12, color: '#ec4899' }
  ]

  return (
    <div className="w-full max-w-5xl mx-auto rounded-3xl bg-surface-card border border-border shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Top Header Mock Workspace Bar */}
      <div className="px-6 py-4 bg-surface border-b border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Sample Patient ({patient.id})</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono font-medium">
                {patient.gender}, {patient.age} Y/O
              </span>
            </div>
            <p className="text-[11px] text-foreground-muted">{patient.assessment}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-surface-secondary text-foreground-subtle border border-border flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-indigo-500" /> {patient.date}
          </span>
          <span className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3 text-amber-500" /> Demo Interface — Not a Clinical Diagnosis
          </span>
        </div>
      </div>

      {/* Main Preview Body */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Top 3 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {cards.map((card, idx) => (
            <div key={idx} className={`p-4 rounded-2xl border ${card.color} backdrop-blur-md`}>
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider opacity-80 block">
                {card.label}
              </span>
              <h4 className="text-lg font-extrabold mt-1">{card.value}</h4>
              <p className="text-[11px] opacity-90 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Clinical Modality Findings & SHAP Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Findings List (Left) */}
          <div className="lg:col-span-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground-subtle flex items-center justify-between">
              <span>Multimodal Clinical Findings</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">3 Modalities Assessed</span>
            </h4>

            <div className="space-y-2.5">
              {findings.map((f, idx) => {
                const Icon = f.icon
                return (
                  <div key={idx} className="p-3.5 rounded-2xl bg-surface border border-border flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-surface-secondary shrink-0" style={{ color: f.color }}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-foreground">{f.title}</h5>
                      <p className="text-[11px] text-foreground-muted leading-relaxed mt-0.5">{f.val}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SHAP Feature Weights (Right) */}
          <div className="lg:col-span-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground-subtle flex items-center justify-between">
              <span>SHAP Feature Weight Breakdown</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">Normalized Vector</span>
            </h4>

            <div className="p-4 rounded-2xl bg-surface border border-border space-y-3.5">
              {featureAttributions.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{item.name}</span>
                    <span className="font-mono font-bold text-foreground-muted">{item.weight}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.weight}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

