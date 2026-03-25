import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react'
import { getAnalysisResults } from '../../context/ResultsStore'
import GlassCard from '../../components/ui/GlassCard'
import CircularScore from '../../components/ui/CircularScore'
import ProgressBar from '../../components/ui/ProgressBar'
import Button from '../../components/ui/Button'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import { MRIResults } from './components/MRIResults'
import { CognitiveResults, SentimentResults } from './components/AssessmentResults'
import { HandwritingResults, RiskProfileResults } from './components/ProfileResults'
import { MusicRecommendations } from './components/MusicRecommendations'

const STAGE_CONFIG = {
  'Non Demented':      { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  risk: 'Low',    score: 15 },
  'Very Mild Demented':{ color: '#6366f1', bg: 'rgba(99,102,241,0.12)', risk: 'Low',    score: 30 },
  'Mild Demented':     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', risk: 'Medium', score: 55 },
  'Moderate Demented': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  risk: 'High',   score: 80 },
}

function RadarTip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px' }}>
      <p style={{ fontSize: 13, color: '#f1f5f9' }}>{payload[0]?.value?.toFixed(1)}</p>
    </div>
  )
}

export default function ResultsPage() {
  const navigate = useNavigate()
  const results = getAnalysisResults()

  useEffect(() => {
    if (!results) {
      const t = setTimeout(() => navigate('/analysis'), 800)
      return () => clearTimeout(t)
    }
  }, [results, navigate])

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertTriangle size={40} style={{ color: '#475569' }} />
        <p style={{ color: '#64748b' }}>No results yet. Redirecting to analysis…</p>
      </div>
    )
  }

  const mri       = results.mri         || {}
  const sentiment = results.sentiment   || {}
  const cognitive = results.cognitive     || {}
  const risk     = results.risk_profile || {}
  const handwriting = results.handwriting || {}
  const fusion    = results.final_stage  || {}
  const music     = results.music        || {}
  const patient   = results.patient_info || {}

  const stage = fusion.stage || mri.stage || 'Unknown'
  const conf  = fusion.confidence || mri.confidence || 0
  const stageConf = STAGE_CONFIG[stage] || STAGE_CONFIG['Mild Demented']

  const radarData = [
    { subject: 'MRI',         A: (mri.confidence || 0) },
    { subject: 'Cognitive',   A: (cognitive.composite_score || 0) * 10 },
    { subject: 'Sentiment',   A: Math.min(100, (sentiment.cognitive_risk_score || 0) * 10) },
    { subject: 'Handwriting', A: Math.min(100, (1 - (handwriting.handwriting_risk_score || 0)) * 100) },
    { subject: 'Risk',       A: Math.min(100, (1 - (risk.overall_risk_score || 0)) * 100) },
    { subject: 'Speech',      A: (results.audio_transcription?.confidence || 50) },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Analysis Results</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>
            {patient.name ? `Patient: ${patient.name}` : 'Multimodal Alzheimer\'s Assessment'}
            {patient.patient_id && ` · ID: ${patient.patient_id}`}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/analysis')}>New Analysis</Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
        <GlassCard className="p-6" glow hover={false}>
          <div className="flex flex-wrap items-center gap-8">
            <CircularScore value={stageConf.score} max={100} color={stageConf.color} size={130} label="Risk Index" />
            <div className="flex-1 min-w-48">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
                style={{ background: stageConf.bg, border: `1px solid ${stageConf.color}40` }}>
                {stageConf.risk === 'High' ? <AlertTriangle size={14} style={{ color: stageConf.color }} /> : <CheckCircle size={14} style={{ color: stageConf.color }} />}
                <span style={{ fontSize: 12, fontWeight: 700, color: stageConf.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stageConf.risk} Risk</span>
              </div>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.1 }}>{stage}</h2>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>AI Fusion Confidence</p>
              <div className="mt-3"><ProgressBar value={conf} color={stageConf.color} showPercent /></div>
            </div>
            <div className="hidden sm:block">
              <ResponsiveContainer width={180} height={160}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11 }} />
                  <Radar dataKey="A" stroke={stageConf.color} fill={stageConf.color} fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <MRIResults mri={mri} />
      <CognitiveResults cognitive={cognitive} />
      <SentimentResults sentiment={sentiment} />
      <HandwritingResults handwriting={handwriting} />
      <RiskProfileResults risk={risk} />
      <MusicRecommendations music={music} />

      <div className="p-4 rounded-2xl flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
          <strong style={{ color: '#f59e0b' }}>Clinical Disclaimer:</strong> This AI analysis is for research assistance only and does not constitute medical diagnosis. Always consult a qualified neurologist for clinical decisions.
        </p>
      </div>
    </div>
  )
}
