import React from 'react'
import { motion } from 'framer-motion'
import { Brain, Activity, Heart, PenTool, AlertCircle, CheckCircle } from 'lucide-react'
import GlassCard from '../../../components/ui/GlassCard'
import ProgressBar from '../../../components/ui/ProgressBar'

const MODALITY_ICONS = {
  MRI: Brain,
  Cognitive: Activity,
  Sentiment: Heart,
  Handwriting: PenTool,
}

const CONFIDENCE_COLORS = {
  'Very High': '#22c55e',
  'High': '#6366f1',
  'Moderate': '#f59e0b',
  'Low': '#ef4444',
}

function ModalityIndicator({ icon: Icon, modality, value, confidence, weight }) {
  const color = weight === 'high' ? '#6366f1' : weight === 'medium' ? '#06b6d4' : '#64748b'
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1">
        <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{modality}</p>
        <p style={{ fontSize: 12, color: '#64748b' }}>{value}</p>
      </div>
      <div className="text-right">
        <p style={{ fontSize: 12, fontWeight: 600, color }}>{confidence.toFixed(0)}%</p>
        {weight === 'high' && <span style={{ fontSize: 10, color: '#64748b' }}>High impact</span>}
      </div>
    </div>
  )
}

function StageIndicator({ stage, indicators }) {
  return (
    <div className="space-y-2">
      {indicators.map((ind, i) => (
        <div key={i} className="flex items-start gap-2">
          <CheckCircle size={14} style={{ color: '#22c55e', marginTop: 2 }} />
          <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{ind}</p>
        </div>
      ))}
    </div>
  )
}

export function AIExplanationPanel({ explanation }) {
  if (!explanation) return null
  
  const { 
    summary, 
    key_indicators, 
    stage_details,
    confidence_level,
    overall_explanation,
    mri_explanation,
    cognitive_explanation,
    sentiment_explanation,
    handwriting_explanation,
    risk_factors
  } = explanation

  const confidenceColor = CONFIDENCE_COLORS[confidence_level] || '#6366f1'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <GlassCard className="p-6" glow>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
               style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Brain size={20} style={{ color: '#fff' }} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
              AI Explanation
            </h2>
            <p style={{ fontSize: 12, color: '#64748b' }}>Why the model predicted this stage</p>
          </div>
        </div>

        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: 11, fontWeight: 600, color: confidenceColor, textTransform: 'uppercase' }}>
              {confidence_level} Confidence
            </span>
          </div>
          <p style={{ fontSize: 14, color: '#e2e8f0', lineHeight: 1.6 }}>{summary}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-5">
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Key Modality Indicators
            </h3>
            <div className="space-y-2">
              {key_indicators?.map((ind, i) => {
                const Icon = MODALITY_ICONS[ind.modality] || Brain
                return (
                  <ModalityIndicator
                    key={i}
                    icon={Icon}
                    modality={ind.modality}
                    value={ind.value}
                    confidence={ind.confidence}
                    weight={ind.weight}
                  />
                )
              })}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Stage Details
            </h3>
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 12, lineHeight: 1.6 }}>
                {stage_details?.summary}
              </p>
              <StageIndicator stage={stage_details} indicators={stage_details?.indicators || []} />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} style={{ color: '#06b6d4' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#06b6d4' }}>Analysis Breakdown</span>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>{overall_explanation}</p>
        </div>

        {risk_factors?.top_factors?.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={14} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>Top Risk Factors</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {risk_factors.top_factors.map((factor, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                  {factor.name}: {factor.score.toFixed(0)}%
                </span>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  )
}
