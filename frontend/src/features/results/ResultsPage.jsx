import React, { useEffect, useState, Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle, ArrowLeft, Download, FileText, Clock, Shield, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAnalysisResults } from '../../context/ResultsStore'
import GlassCard from '../../components/ui/GlassCard'
import CircularScore from '../../components/ui/CircularScore'
import ProgressBar from '../../components/ui/ProgressBar'
import Button from '../../components/ui/Button'
import { ResultsPageSkeleton } from '../../components/ui/Skeleton'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts'
import { MRIResults } from './components/MRIResults'
import { CognitiveResults, SentimentResults } from './components/AssessmentResults'
import { HandwritingResults, RiskProfileResults } from './components/ProfileResults'
import { MusicRecommendations } from './components/MusicRecommendations'
import { AIExplanationPanel } from './components/AIExplanationPanel'
import { RecommendationsPanel } from './components/RecommendationsPanel'
import { ModalityRadarChart } from './components/ModalityRadarChart'
import { analysisApi } from '../analysis/api/analysisApi'

const STAGE_CONFIG = {
  'Non Demented':      { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  risk: 'Low',    score: 15 },
  'Very Mild Demented':{ color: '#6366f1', bg: 'rgba(99,102,241,0.12)', risk: 'Low',    score: 30 },
  'Mild Demented':     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', risk: 'Medium', score: 55 },
  'Moderate Demented': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  risk: 'High',   score: 80 },
}

function ConfidenceMeter({ confidence, color }) {
  const getConfidenceLevel = (conf) => {
    if (conf >= 90) return { label: 'Very High', color: '#22c55e' }
    if (conf >= 75) return { label: 'High', color: '#6366f1' }
    if (conf >= 50) return { label: 'Moderate', color: '#f59e0b' }
    return { label: 'Low', color: '#ef4444' }
  }
  
  const level = getConfidenceLevel(confidence)
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={14} style={{ color: level.color }} />
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Prediction Confidence</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: level.color }}>{confidence.toFixed(1)}%</span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${confidence}%` }}
          transition={{ duration: 1, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          className="absolute h-full rounded-full"
          style={{ 
            background: `linear-gradient(90deg, ${level.color}, ${level.color}cc)`,
            boxShadow: `0 0 12px ${level.color}60`
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ fontSize: 9, color: '#fff', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{level.label}</span>
        </div>
      </div>
    </div>
  )
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
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!results) {
      const timer = setTimeout(() => {
        setLoading(false)
      }, 1500)
      return () => clearTimeout(timer)
    } else {
      setLoading(false)
    }
  }, [results])

  const handleDownloadPdf = async () => {
    if (!results) return
    setDownloading(true)
    try {
      await analysisApi.downloadPdfReport(results)
      toast.success('PDF report downloaded successfully!')
    } catch (err) {
      toast.error('Failed to download PDF: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    if (!results && !loading) {
      const t = setTimeout(() => navigate('/analysis'), 800)
      return () => clearTimeout(t)
    }
  }, [results, loading, navigate])

  if (loading) {
    return <ResultsPageSkeleton />
  }

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
  const explanation = results.ai_explanation || {}
  const recommendations = results.recommendations || {}

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

  const analysisDate = results.created_at ? new Date(results.created_at).toLocaleString() : new Date().toLocaleString()

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Analysis Results</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span style={{ fontSize: 13, color: '#475569' }}>
              {patient.name ? `Patient: ${patient.name}` : 'Multimodal Alzheimer\'s Assessment'}
            </span>
            {patient.patient_id && (
              <span style={{ fontSize: 12, color: '#6366f1', fontFamily: 'monospace', padding: '2px 8px', background: 'rgba(99,102,241,0.1)', borderRadius: 4 }}>
                {patient.patient_id}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={Download} loading={downloading} onClick={handleDownloadPdf}>
            <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/analysis')}>New</Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
        <GlassCard className="p-4 sm:p-6" glow hover={false}>
          <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
            <CircularScore value={stageConf.score} max={100} color={stageConf.color} size={130} label="Risk Index" />
            <div className="flex-1 w-full">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                  style={{ background: stageConf.bg, border: `1px solid ${stageConf.color}40` }}>
                  {stageConf.risk === 'High' ? <AlertTriangle size={14} style={{ color: stageConf.color }} /> : <CheckCircle size={14} style={{ color: stageConf.color }} />}
                  <span style={{ fontSize: 12, fontWeight: 700, color: stageConf.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stageConf.risk} Risk</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <Clock size={12} style={{ color: '#64748b' }} />
                  <span style={{ fontSize: 11, color: '#64748b' }}>{analysisDate}</span>
                </div>
              </div>
              <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 28, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.1 }}>{stage}</h2>
              <div className="mt-4">
                <ConfidenceMeter confidence={conf} color={stageConf.color} />
              </div>
            </div>
            <div className="w-full sm:w-auto">
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

      <AIExplanationPanel explanation={explanation} />
      <RecommendationsPanel recommendations={recommendations} />
      <ModalityRadarChart results={results} />
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
