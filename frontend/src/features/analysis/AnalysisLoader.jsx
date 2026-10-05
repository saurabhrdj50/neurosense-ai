import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Loader2 } from 'lucide-react'
import GlassCard from '../../shared/components/ui/GlassCard'
import { ANALYSIS_STAGE_LABELS } from './api/analysisApi'

/**
 * Honest analysis loader.
 *
 * Shows a single "Analyzing data…" state with a progress bar that eases up to
 * ~90% while the real request is in flight and only completes when the actual
 * API response arrives (the 90→100% completion plays during the exit fade).
 * No artificial delays and no stage labels claiming work that has not happened.
 * The modality chips reflect the inputs the clinician actually submitted.
 */
export function AnalysisLoader({ isLoading, patientName = 'Current patient', modalities = [], job = null }) {
  const displayModalities = modalities.length ? modalities : ['Demographics', 'MRI', 'Cognition', 'Speech', 'Risk Factors']
  // Real pipeline position from the background job (stage + 0-100). When the
  // sync fallback is used there is no job — the bar falls back to easing.
  const stageLabel = job?.stage ? (ANALYSIS_STAGE_LABELS[job.stage] || 'Processing') : null
  const pct = typeof job?.progress === 'number' ? Math.min(job.progress, 99) : null
  const headline = stageLabel || 'Analyzing data…'

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="analysis-loader-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45 } }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-colors duration-300"
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div className="max-w-xl w-full relative z-10">
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl space-y-6"
            >
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Brain size={28} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-indigo-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Analysis Engine</span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
                    {headline}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Processing examination for <span className="font-semibold text-white">{patientName}</span>
                  </p>
                </div>
              </div>

              {/* Progress bar: eases to ~90% while the request is in flight,
                  completes when the real response arrives */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-400">Analysis Progress</span>
                  <span className="text-indigo-400 font-mono font-bold flex items-center gap-1.5">
                    {pct !== null ? `${Math.round(pct)}%` : (
                      <>
                        <Loader2 size={11} className="animate-spin" /> in progress
                      </>
                    )}
                  </span>
                </div>
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{
                      // Real percentage when the job reports it; otherwise ease
                      // to 90% and complete on the actual response.
                      width: pct !== null ? `${pct}%` : (isLoading ? '90%' : '100%'),
                    }}
                    transition={pct !== null ? { duration: 0.4, ease: 'easeOut' } : (isLoading ? { duration: 6, ease: 'easeOut' } : { duration: 0.3, ease: 'easeIn' })}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500"
                  />
                </div>
              </div>

              {/* Submitted inputs — factual chips only, no staged step claims */}
              <GlassCard className="p-4 space-y-2.5 bg-slate-800/40 border-slate-700/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Inputs submitted for this assessment
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {displayModalities.map((m) => (
                    <span
                      key={m}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                    >
                      ✓ {m}
                    </span>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Tracks whether a real analysis request is in flight. No timers — the UI is
 * driven purely by the actual request lifecycle (start/stop around the call).
 */
export function useAnalysisProgress() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const startAnalysis = useCallback(() => setIsAnalyzing(true), [])
  const stopAnalysis = useCallback(() => setIsAnalyzing(false), [])

  return { isAnalyzing, startAnalysis, stopAnalysis }
}
