import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Brain, Activity, Heart, PenTool, Mic, Stethoscope, CheckCircle, Loader2 } from 'lucide-react'
import GlassCard from '../../../components/ui/GlassCard'

const ANALYSIS_STEPS = [
  { id: 'mri', label: 'Analyzing MRI Scan', icon: Brain, description: 'Processing brain imaging with deep learning model' },
  { id: 'sentiment', label: 'Processing Speech & Text', icon: Mic, description: 'Analyzing emotional patterns in speech' },
  { id: 'cognitive', label: 'Evaluating Cognitive Tests', icon: Activity, description: 'Scoring neuropsychological assessments' },
  { id: 'handwriting', label: 'Analyzing Handwriting', icon: PenTool, description: 'Detecting motor control patterns' },
  { id: 'risk', label: 'Computing Risk Profile', icon: Stethoscope, description: 'Calculating lifestyle and genetic factors' },
  { id: 'fusion', label: 'Fusing Multimodal Results', icon: Heart, description: 'Combining all data for final prediction' },
]

const STEP_COLORS = {
  mri: '#6366f1',
  sentiment: '#8b5cf6',
  cognitive: '#06b6d4',
  handwriting: '#ec4899',
  risk: '#f59e0b',
  fusion: '#22c55e',
}

export function AnalysisLoader({ isLoading, currentStep = 0 }) {
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

  const progress = Math.min(((completedSteps.length) / ANALYSIS_STEPS.length) * 100, 100)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)' }}
    >
      <div className="max-w-md w-full mx-4">
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-8" glow>
            <div className="text-center mb-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                <Loader2 size={32} style={{ color: '#fff' }} />
              </motion.div>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 }}>
                AI Analysis in Progress
              </h2>
              <p style={{ fontSize: 14, color: '#64748b' }}>
                Running multimodal Alzheimer's assessment
              </p>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-xs mb-2" style={{ color: '#64748b' }}>
                <span>Progress</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {ANALYSIS_STEPS.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id)
                const isActive = activeStep === step.id && !isCompleted
                const color = STEP_COLORS[step.id]
                
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ 
                      background: isActive ? `${color}15` : isCompleted ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isActive ? color + '40' : isCompleted ? 'rgba(34,197,94,0.2)' : 'transparent'}`
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                         style={{ background: isCompleted ? 'rgba(34,197,94,0.2)' : isActive ? `${color}20` : 'rgba(255,255,255,0.05)' }}>
                      {isCompleted ? (
                        <CheckCircle size={18} style={{ color: '#22c55e' }} />
                      ) : isActive ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 size={18} style={{ color }} />
                        </motion.div>
                      ) : (
                        <step.icon size={18} style={{ color: '#475569' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ 
                        fontSize: 13, 
                        fontWeight: 600, 
                        color: isCompleted ? '#22c55e' : isActive ? color : '#64748b'
                      }}>
                        {step.label}
                      </p>
                      <p style={{ fontSize: 11, color: '#475569' }}>{step.description}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <p className="text-center mt-6 text-xs" style={{ color: '#475569' }}>
              Please wait while our AI processes your data...
            </p>
          </GlassCard>
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
    
    const stepIntervals = [
      { step: 1, delay: 500 },
      { step: 2, delay: 2000 },
      { step: 3, delay: 3500 },
      { step: 4, delay: 5000 },
      { step: 5, delay: 6500 },
      { step: 6, delay: 8000 },
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
