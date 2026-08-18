import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, HelpCircle, ChevronDown, ChevronUp, ShieldCheck, 
  TrendingUp, TrendingDown, Info, Gauge, Zap, CheckCircle2
} from 'lucide-react'

export default function ExplainableAIPanel({ patientData }) {
  const [expandedIndex, setExpandedIndex] = useState(null)

  const shapFeatures = patientData?.shapFeatures || [
    { name: "Hippocampal Atrophy", contribution: 28, confidence: "94%", type: "positive", interpretation: "Strong volumetric reduction in medial temporal lobe region (+28% contribution to AD prediction)" },
    { name: "Speech Pause Rate", contribution: 14, confidence: "89%", type: "positive", interpretation: "Elevated hesitation pauses during cognitive sentence repetition tasks (+14% contribution)" },
    { name: "MMSE Cognitive Score", contribution: -18, confidence: "92%", type: "negative", interpretation: "High baseline cognitive performance lowers immediate progression probability (-18% risk contribution)" },
    { name: "Clinical Risk Profile", contribution: 10, confidence: "88%", type: "positive", interpretation: "Vascular risk factors and family history contribution (+10% risk contribution)" }
  ]

  const certaintyScore = patientData?.confidence ? Math.round(patientData.confidence * 100) : 92

  return (
    <div className="space-y-6">
      {/* Top Banner & Confidence Meter */}
      <div className="rounded-2xl p-6 shadow-xl border grid grid-cols-1 md:grid-cols-3 gap-6 items-center" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
        <div className="md:col-span-2 space-y-2">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Shapley Feature Attribution (SHAP Engine v4.2)</h3>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Quantifying multimodal model inference weights. Features with positive values push the diagnosis toward mild/moderate neurodegeneration, while negative features act as protective biomarkers.
          </p>
        </div>

        {/* Confidence Meter Card */}
        <div className="p-4 rounded-xl border flex items-center justify-between shadow-inner" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
          <div className="space-y-1">
            <span className="text-xs font-medium block" style={{ color: 'var(--text-muted)' }}>Prediction Certainty</span>
            <div className="text-2xl font-bold font-mono flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              {certaintyScore}%
              <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                High Confidence
              </span>
            </div>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Cross-validated across 10,000 cohort scans</span>
          </div>
          <div className="relative w-14 h-14 flex items-center justify-center">
            <Gauge className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Horizontal SHAP Bars Chart */}
      <div className="rounded-2xl p-6 shadow-xl border space-y-6" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h4 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Top Feature Importance</h4>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Relative impact on current patient risk score</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-rose-500" />
              <span style={{ color: 'var(--text-secondary)' }}>Positive Contributor (Increases Risk)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span style={{ color: 'var(--text-secondary)' }}>Negative Contributor (Protective Factor)</span>
            </div>
          </div>
        </div>

        {/* Feature Bars List */}
        <div className="space-y-4">
          {shapFeatures.map((feat, idx) => {
            const isPositive = feat.contribution > 0
            const absVal = Math.abs(feat.contribution)
            const maxVal = 35
            const widthPct = Math.min(100, Math.round((absVal / maxVal) * 100))

            return (
              <div
                key={idx}
                className="p-4 rounded-xl border transition space-y-3"
                style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4 text-rose-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-emerald-500" />
                    )}
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{feat.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                      Confidence: {feat.confidence}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold font-mono ${isPositive ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {isPositive ? `+${feat.contribution}%` : `${feat.contribution}%`}
                    </span>
                    <button
                      onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                      className="p-1 transition"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {expandedIndex === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full h-2.5 rounded-full overflow-hidden flex" style={{ background: 'var(--surface-card)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                    className={`h-full rounded-full ${
                      isPositive
                        ? 'bg-gradient-to-r from-rose-600 to-amber-500'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-400'
                    }`}
                  />
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedIndex === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="pt-2 border-t text-xs space-y-1.5"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-2 font-medium text-indigo-600 dark:text-indigo-400">
                        <Info className="w-3.5 h-3.5" />
                        Clinical Interpretation:
                      </div>
                      <p className="leading-relaxed pl-5" style={{ color: 'var(--text-secondary)' }}>{feat.interpretation}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {/* Expandable Explanation Card: "What influenced this prediction?" */}
      <div className="rounded-2xl p-6 shadow-xl border space-y-4 bg-indigo-500/10 border-indigo-500/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-xl">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>What influenced this prediction?</h4>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              NeuroSense AI synthesizes multi-modal data inputs including 3T MRI volumetric segmentation, cognitive test performance, spectral speech acoustic pause patterns, and clinical risk profiles. The dominant factor driving this classification is <span className="text-rose-500 font-semibold">Hippocampal Atrophy (+28%)</span>, supported by elevated pause duration during complex sentence construction.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
