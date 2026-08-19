import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Brain, Activity, Heart, PenTool, Mic, Stethoscope, CheckCircle, Loader2 } from 'lucide-react'
import GlassCard from '../../../components/ui/GlassCard'

const ANALYSIS_STEPS = [
  { id: 'mri', label: 'Analyzing MRI...', icon: Brain, description: 'Extracting brain structure & measurements' },
  { id: 'cognitive', label: 'Running Cognitive Test...', icon: Activity, description: 'Scoring MMSE, MoCA, and Clock Drawing' },
  { id: 'speech', label: 'Running Speech Test...', icon: Mic, description: 'Analyzing language & speech patterns' },
  { id: 'risk', label: 'Checking Risk Factors...', icon: Stethoscope, description: 'Evaluating modifiable health risk factors' },
  { id: 'report', label: 'Creating Report...', icon: CheckCircle, description: 'Building diagnostic summary & recommendations' },
]

const STEP_COLORS = {
  mri: '#6366f1',
  cognitive: '#06b6d4',
  speech: '#8b5cf6',
  risk: '#f59e0b',
  report: '#10b981',
}

export function AnalysisLoader({ isLoading, currentStep = 0, patientName = 'Current patient', modalities = [] }) {
  const [completedSteps, setCompletedSteps] = useState([])
  const [activeStep, setActiveStep] = useState(null)

  const updateSteps = useCallback(() => {
    if (!isLoading) return
    const stepsToComplete = Math.min(currentStep, ANALYSIS_STEPS.length)
    setCompletedSteps(ANALYSIS_STEPS.slice(0, stepsToComplete).map(s => s.id))
    
    const nextStep = Math.min(currentStep, ANALYSIS_STEPS.length) - 1
    if (nextStep >= 0 && nextStep < ANALYSIS_STEPS.length) {
      setActiveStep(ANALYSIS_STEPS[nextStep].id)
    } else {
      setActiveStep(null)
    }
  }, [currentStep, isLoading])

  useEffect(() => {
    if (isLoading) {
      setCompletedSteps([])
      setActiveStep(0)
      updateSteps()
    } else {
      setCompletedSteps([])
      setActiveStep(null)
    }
  }, [isLoading, updateSteps])

  if (!isLoading) return null

  const progress = Math.min(((completedSteps.length + (activeStep ? 0.5 : 0)) / ANALYSIS_STEPS.length) * 100, 100)
  const activeStepData = ANALYSIS_STEPS.find((item) => item.id === activeStep) || ANALYSIS_STEPS[0]
  const activeModalities = modalities.length ? modalities : ['Demographics', 'MRI', 'Cognition', 'Speech', 'Lancet Risk']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
                Running Analysis
              </h2>
              <p className="text-xs text-slate-400">
                Processing examination for <span className="font-semibold text-white">{patientName}</span>
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-400">Analysis Progress</span>
              <span className="text-indigo-400 font-mono font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500"
              />
            </div>
          </div>

          {/* Stage List */}
          <div className="space-y-2.5 pt-2">
            {ANALYSIS_STEPS.map((stepItem, idx) => {
              const isDone = completedSteps.includes(stepItem.id)
              const isCurrent = activeStep === stepItem.id
              return (
                <div
                  key={stepItem.id}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                    isDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : isCurrent
                      ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300 font-semibold'
                      : 'bg-slate-800/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isDone ? (
                      <CheckCircle size={16} className="text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 size={16} className="animate-spin text-indigo-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[9px] font-mono">
                        {idx + 1}
                      </div>
                    )}
                    <span>{stepItem.label}</span>
                  </div>
                  <span className="text-[10px] font-mono">
                    {isDone ? 'COMPLETED' : isCurrent ? 'IN PROGRESS...' : 'WAITING'}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function useAnalysisProgress() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const startAnalysis = () => {
    setIsAnalyzing(true)
    setCurrentStep(0)
    
    // Total execution time: ~3.0 seconds
    const stepIntervals = [
      { step: 1, delay: 400 },
      { step: 2, delay: 1000 },
      { step: 3, delay: 1700 },
      { step: 4, delay: 2400 },
      { step: 5, delay: 3000 },
    ]

    stepIntervals.forEach(({ step, delay }) => {
      setTimeout(() => setCurrentStep(step), delay)
    })
  }

  const stopAnalysis = () => {
    setIsAnalyzing(false)
    setCurrentStep(0)
  }

  return { isAnalyzing, currentStep, startAnalysis, stopAnalysis }
}

