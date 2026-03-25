import React from 'react'
import { motion } from 'framer-motion'
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  ResponsiveContainer, Legend, Tooltip 
} from 'recharts'
import GlassCard from '../../../components/ui/GlassCard'

const MODALITY_COLORS = {
  MRI: '#6366f1',
  Cognitive: '#06b6d4',
  Sentiment: '#f59e0b',
  Handwriting: '#ec4899',
  Risk: '#22c55e',
  Speech: '#8b5cf6',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  return (
    <div style={{ 
      background: '#1e293b', 
      border: '1px solid rgba(255,255,255,0.1)', 
      borderRadius: 10, 
      padding: '10px 14px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
    }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>{data?.subject}</p>
      <p style={{ fontSize: 12, color: '#94a3b8' }}>
        Score: <span style={{ color: MODALITY_COLORS[data?.subject], fontWeight: 600 }}>{data?.A?.toFixed(1)}</span>
      </p>
      <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{data?.description}</p>
    </div>
  )
}

export function ModalityRadarChart({ results }) {
  const mri = results?.mri || {}
  const cognitive = results?.cognitive || {}
  const sentiment = results?.sentiment || {}
  const handwriting = results?.handwriting || {}
  const risk = results?.risk_profile || {}
  const speech = results?.audio_transcription || {}

  const radarData = [
    { 
      subject: 'MRI', 
      A: mri.confidence || 0,
      fullMark: 100,
      description: 'Brain imaging analysis confidence'
    },
    { 
      subject: 'Cognitive', 
      A: (cognitive.composite_score || 0) * 10,
      fullMark: 100,
      description: 'Neuropsychological test performance'
    },
    { 
      subject: 'Sentiment', 
      A: Math.min(100, (sentiment.cognitive_risk_score || 0) * 10),
      fullMark: 100,
      description: 'Emotional expression analysis'
    },
    { 
      subject: 'Handwriting', 
      A: Math.min(100, (1 - (handwriting.handwriting_risk_score || 0)) * 100),
      fullMark: 100,
      description: 'Motor control & writing analysis'
    },
    { 
      subject: 'Speech', 
      A: speech.confidence || 50,
      fullMark: 100,
      description: 'Speech pattern analysis'
    },
    { 
      subject: 'Risk', 
      A: Math.min(100, (1 - (risk.overall_risk_score || 0)) * 100),
      fullMark: 100,
      description: 'Lifestyle & genetic risk factors'
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
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>
              Modality Contribution
            </h3>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              How each assessment contributes to the final prediction
            </p>
          </div>
          <div className="text-right">
            <p style={{ fontSize: 11, color: '#64748b' }}>Average Score</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#6366f1' }}>{avgScore.toFixed(1)}%</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#94a3b8', fontSize: 11 }} 
              tickLine={false}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: '#475569', fontSize: 10 }} 
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
                 style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: MODALITY_COLORS[item.subject] }} />
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{item.subject}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#f1f5f9', marginLeft: 'auto' }}>
                {item.A.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  )
}
