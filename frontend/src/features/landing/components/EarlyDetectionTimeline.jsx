import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Dna, Brain, Activity, Mic, Stethoscope, Cpu, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react'

export default function EarlyDetectionTimeline() {
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      title: 'Subtle Biological & Genetic Risk',
      timeline: 'Years -20 to -10',
      icon: Dna,
      color: '#ec4899',
      desc: 'Initial risk profile assessment & genetic background evaluation prior to overt clinical symptoms.'
    },
    {
      title: 'Structural Brain Changes',
      timeline: 'Years -10 to -5',
      icon: Brain,
      color: '#6366f1',
      desc: 'Early neurodegeneration and subtle hippocampal volume atrophy detectable via high-resolution 3D MRI volumetric segmentation.'
    },
    {
      title: 'Cognitive Changes',
      timeline: 'Years -5 to -2',
      icon: Activity,
      color: '#10b981',
      desc: 'Emergence of mild short-term memory latency and sub-clinical score deviations on standardized MMSE and MoCA psychometric batteries.'
    },
    {
      title: 'Speech / Behavioral Changes',
      timeline: 'Years -2 to 0',
      icon: Mic,
      color: '#38bdf8',
      desc: 'Acoustic micro-pauses, increased hesitation intervals, semantic density reduction, and vocal cadence changes.'
    },
    {
      title: 'Clinical Assessment',
      timeline: 'Baseline Evaluation',
      icon: Stethoscope,
      color: '#f59e0b',
      desc: 'Comprehensive clinical evaluation by neurologists, radiologists, and memory specialist teams.'
    },
    {
      title: 'AI-Assisted Decision Support',
      timeline: 'Continuous Support',
      icon: Cpu,
      color: '#a855f7',
      desc: 'NeuroSense AI fuses cross-modal signals into joint risk estimation, stage classification, and transparent SHAP feature attributions.'
    }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
      {/* LEFT COLUMN: Narrative & Context */}
      <div className="lg:col-span-5 space-y-6">
        <div>
          <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3.5 border border-indigo-500/20">
            <Sparkles size={13} className="text-indigo-500" /> Early Detection Rationale
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
            Why Earlier Detection Matters
          </h2>
        </div>

        <p className="text-foreground-muted text-sm sm:text-base leading-relaxed">
          Alzheimer's-related biological changes occur decades before overt clinical symptoms become obvious. Traditional diagnostic pathways frequently identify structural damage only after significant neuronal loss has taken place.
        </p>

        <p className="text-foreground-muted text-sm leading-relaxed">
          NeuroSense AI bridges this temporal window by correlating complementary signals—ranging from 3D MRI scans and speech acoustics to cognitive batteries and clinical risk profiles—to empower clinicians with <strong className="text-foreground font-semibold">AI-assisted risk estimation and decision support</strong>.
        </p>

        {/* Non-autonomous Clinical Disclaimer */}
        <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert size={16} className="text-indigo-500" /> Clinical Decision Support Notice
          </div>
          <p className="text-xs text-foreground-muted leading-relaxed">
            NeuroSense AI is designed to support clinical judgment, provide risk estimation, and assist clinical review. It does not provide autonomous clinical diagnoses or replace professional medical evaluation.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Visual Timeline */}
      <div className="lg:col-span-7 bg-surface-card border border-border rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-border">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Disease Progression Timeline & AI Interception Window
          </h3>
          <span className="text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            Interactive Timeline
          </span>
        </div>

        <div className="relative pl-6 space-y-5">
          {/* Vertical Glowing Timeline Wire */}
          <div className="absolute left-[29px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-500 via-purple-500 to-emerald-500 opacity-40" />

          {steps.map((step, idx) => {
            const Icon = step.icon
            const isActive = activeStep === idx

            return (
              <motion.div
                key={idx}
                onClick={() => setActiveStep(idx)}
                whileHover={{ x: 4 }}
                className={`relative flex items-start gap-4 p-3.5 rounded-2xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-surface border border-indigo-500/40 shadow-md ring-1 ring-indigo-500/20'
                    : 'hover:bg-surface/50 border border-transparent'
                }`}
              >
                {/* Timeline Step Node Circle */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 z-10 transition-all ${
                    isActive ? 'scale-110 shadow-lg ring-2 ring-indigo-500/30' : ''
                  }`}
                  style={{
                    backgroundColor: isActive ? step.color : 'var(--surface-secondary)',
                    color: isActive ? '#ffffff' : step.color,
                    border: `1px solid ${step.color}60`
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-bold transition-colors ${isActive ? 'text-foreground' : 'text-foreground-muted'}`}>
                      {step.title}
                    </h4>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-secondary text-foreground-subtle border border-border">
                      {step.timeline}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground-muted mt-1 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

