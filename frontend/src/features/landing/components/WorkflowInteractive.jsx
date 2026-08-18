import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, UploadCloud, Sliders, Cpu, Layers, BarChart3, CheckCircle, Sparkles, Stethoscope } from 'lucide-react'

export default function WorkflowInteractive() {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0)

  const steps = [
    {
      num: '01',
      title: 'Patient Registration',
      sub: 'Dossier Initialization',
      icon: UserPlus,
      color: '#6366f1',
      detail: 'Clinician creates or imports encrypted patient record (PT-8942-AZ), associating demographic baseline metrics & clinical history notes.'
    },
    {
      num: '02',
      title: 'Multimodal Data Intake',
      sub: 'Multi-Stream Ingestion',
      icon: UploadCloud,
      color: '#38bdf8',
      detail: 'Ingestion of DICOM 3D MRI scans, audio speech samples (.wav), psychometric scores (MMSE/MoCA), and clinical risk profile assessments.'
    },
    {
      num: '03',
      title: 'Preprocessing & Extraction',
      sub: 'Feature Normalization',
      icon: Sliders,
      color: '#10b981',
      detail: 'Automated DICOM skull-stripping, voxel normalization, Librosa acoustic pitch/pause extraction, and psychometric sub-score indexing.'
    },
    {
      num: '04',
      title: 'Deep Learning AI Analysis',
      sub: 'Specialized Sub-networks',
      icon: Cpu,
      color: '#a855f7',
      detail: '3D CNN extracts hippocampal spatial features; Wav2Vec 2.0 / NLP extracts speech pause patterns; ML models compute biomarker indices.'
    },
    {
      num: '05',
      title: 'Multimodal Fusion',
      sub: 'Cross-Attention Matrix',
      icon: Layers,
      color: '#ec4899',
      detail: 'Feature vectors are projected into a unified latent space using a multi-head cross-attention transformer fusion matrix.'
    },
    {
      num: '06',
      title: 'Explainable Results',
      sub: 'SHAP Feature Attribution',
      icon: BarChart3,
      color: '#f59e0b',
      detail: 'SHAP explainability engine calculates global & local feature attributions, mapping regional heatmaps onto volumetric 3D brain representations.'
    },
    {
      num: '07',
      title: 'Clinical Review Support',
      sub: 'Human-in-the-Loop Signoff',
      icon: Stethoscope,
      color: '#3b82f6',
      detail: 'Neurologist reviews risk estimation, inspects explainability heatmaps, adds diagnostic clinical notes, and approves final report.'
    }
  ]

  const activeData = steps[activeWorkflowStep] || steps[0]

  return (
    <div className="space-y-10">
      {/* SECTION HEADER */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider border border-indigo-500/20">
          <Sparkles size={13} className="text-indigo-500" /> End-to-End Clinical Process
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
          From Patient Data to Clinical Insight
        </h2>
        <p className="text-foreground-muted text-sm sm:text-base leading-relaxed">
          A seamless 7-step pipeline designed for high-efficiency clinical decision support while ensuring rigorous data integrity and human clinician oversight.
        </p>
      </div>

      {/* HORIZONTAL STEP SELECTOR RIBBON */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {steps.map((step, idx) => {
          const Icon = step.icon
          const isActive = activeWorkflowStep === idx

          return (
            <motion.button
              key={step.num}
              type="button"
              onClick={() => setActiveWorkflowStep(idx)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer select-none ${
                isActive
                  ? 'bg-surface border-indigo-500 shadow-lg ring-2 ring-indigo-500/20'
                  : 'bg-surface-card border-border hover:border-foreground/30 opacity-90'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {step.num}
                </span>
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${step.color}20`, color: step.color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <h4 className="text-xs font-bold text-foreground leading-tight line-clamp-2">
                {step.title}
              </h4>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
              )}
            </motion.button>
          )
        })}
      </div>

      {/* ACTIVE STEP DETAILED DISPLAY PANEL */}
      <motion.div
        key={activeData.num}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="p-6 sm:p-8 rounded-3xl bg-surface-card border border-border shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md border"
            style={{ backgroundColor: `${activeData.color}20`, borderColor: `${activeData.color}50`, color: activeData.color }}
          >
            <activeData.icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-surface-secondary text-indigo-600 dark:text-indigo-400 border border-border">
                Step {activeData.num} of 07
              </span>
              <span className="text-xs font-semibold text-foreground-muted">{activeData.sub}</span>
            </div>
            <h3 className="text-xl font-extrabold text-foreground mt-1">
              {activeData.title}
            </h3>
            <p className="text-xs sm:text-sm text-foreground-muted mt-2 leading-relaxed max-w-2xl">
              {activeData.detail}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 shrink-0">
          <CheckCircle className="w-4 h-4" /> Validated Pipeline Step
        </div>
      </motion.div>
    </div>
  )
}
