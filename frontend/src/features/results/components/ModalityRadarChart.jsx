import React from 'react'
import { motion } from 'framer-motion'
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  ResponsiveContainer, Tooltip 
} from 'recharts'
import GlassCard from '../../../components/ui/GlassCard'
import { useTheme } from '../../../context/ThemeProvider'

const MODALITY_COLORS = {
  MRI: '#6366f1',
  Cognitive: '#06b6d4',
  Sentiment: '#f59e0b',
  Risk: '#22c55e',
  Speech: '#8b5cf6',
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Number(value) || 0))
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  return (
    <div style={{ 
      background: 'var(--surface-card)', 
      border: '1px solid var(--border)', 
      borderRadius: 10, 
      padding: '10px 14px',
      boxShadow: 'var(--shadow)'
    }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{data?.subject}</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Score: <span style={{ color: MODALITY_COLORS[data?.subject], fontWeight: 600 }}>{(Number(data?.A) || 0).toFixed(1)}</span>
      </p>
      <p style={{ fontSize: 11, color: 'var(--text-dimmed)', marginTop: 4 }}>{data?.description}</p>
    </div>
  )
}

export function ModalityRadarChart({ results }) {
  const { isDark } = useTheme()
  const mri = results?.mri || {}
  const cognitive = results?.cognitive || {}
  const sentiment = results?.sentiment || {}
  const risk = results?.risk_profile || {}
  const speech = results?.audio_transcription || {}

  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const axisTextColor = isDark ? '#94a3b8' : '#475569'
  const radiusTextColor = isDark ? '#475569' : '#64748b'

  const radarData = [
    { 
      subject: 'MRI', 
      A: mri.confidence || 0,
      fullMark: 100,
      description: 'Brain imaging analysis confidence'
    },
    { 
      subject: 'Cognitive', 
      A: clampScore(cognitive.composite_score),
      fullMark: 100,
      description: 'Neuropsychological test performance'
    },
    { 
      subject: 'Sentiment', 
      A: clampScore(sentiment.cognitive_risk_score),
      fullMark: 100,
      description: 'Emotional expression analysis'
    },
    { 
      subject: 'Speech', 
      A: speech.confidence || 0,
      fullMark: 100,
      description: 'Speech pattern analysis'
    },
    { 
      subject: 'Risk', 
      A: clampScore(100 - (risk.overall_risk_score || 0)),
      fullMark: 100,
      description: 'Clinical and lifestyle risk factors'
    },
  ]

  const getAverageScore = () => {
    const validScores = radarData.filter(d => d.A > 0)
    if (validScores.length === 0) return 0
    return validScores.reduce((a, b) => a + b.A, 0) / validScores.length
  }

  const avgScore = getAverageScore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-foreground">
              Modality Contribution
            </h3>
            <p className="text-xs text-muted mt-0.5">
              How each assessment contributes to the final prediction
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Average Score</p>
            <p className="text-xl font-bold text-primary">{(Number(avgScore) || 0).toFixed(1)}%</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: axisTextColor, fontSize: 11 }} 
              tickLine={false}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: radiusTextColor, fontSize: 10 }} 
              axisLine={false}
            />
            <Radar
              name="Score"
              dataKey="A"
              stroke="#6366f1"
              strokeWidth={2}
              fill="#6366f1"
              fillOpacity={0.2}
              dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
          {radarData.map((item) => (
            <div key={item.subject} className="flex items-center gap-2 p-2 rounded-lg" 
                 style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-subtle)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: MODALITY_COLORS[item.subject] }} />
              <span className="text-xs text-muted">{item.subject}</span>
              <span className="text-xs font-semibold text-foreground ml-auto">
                {(Number(item.A) || 0).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  )
}
