import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Brain, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import ProgressBar from '../../components/ui/ProgressBar'
import { SectionSkeleton } from '../../components/ui/Skeleton'

const STAGE_COLOR = {
  'Non Demented':       '#22c55e',
  'Very Mild Demented': '#6366f1',
  'Mild Demented':      '#f59e0b',
  'Moderate Demented':  '#ef4444',
}

function Metric({ label, value, color }) {
  return (
    <div>
      <p style={{ fontSize: 11, color: '#475569', marginBottom: 1 }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color: color || '#f1f5f9' }}>{value}</p>
    </div>
  )
}

export default function HistoryPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/patients/history/${patientId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => toast.error('Failed to load history'))
      .finally(() => setLoading(false))
  }, [patientId])

  const history = data?.history || []
  const trends  = data?.trends  || {}

  const chartData = history.map(s => ({
    date: new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mriConf: s.results?.mri?.confidence || 0,
    cogScore: (s.results?.cognitive?.composite_score || 0) * 10,
    riskScore: (1 - (s.results?.risk_profile?.overall_risk_score || 0)) * 100,
  })).reverse()

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate('/patients')}
            className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', cursor: 'pointer' }}>
            <ArrowLeft size={18} />
          </motion.button>
          <div>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>Patient History</h1>
            <p style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>ID: {patientId} · {history.length} sessions</p>
          </div>
        </div>
        <Button variant="secondary" icon={Download} onClick={() => window.open(`/api/export/${patientId}`, '_blank')}>Export CSV</Button>
      </div>

      {loading ? (
        <GlassCard className="p-6"><SectionSkeleton rows={6} /></GlassCard>
      ) : history.length === 0 ? (
        <GlassCard className="p-12 flex flex-col items-center gap-4">
          <Clock size={40} style={{ color: '#334155' }} />
          <p style={{ color: '#475569', fontSize: 14 }}>No analysis history for this patient yet.</p>
          <Button onClick={() => navigate('/analysis')}>Start Analysis</Button>
        </GlassCard>
      ) : (
        <>
          {chartData.length > 1 && (
            <GlassCard className="p-6">
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 16, color: '#f1f5f9', marginBottom: 16 }}>Progression Over Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
                  <Line type="monotone" dataKey="mriConf" stroke="#6366f1" strokeWidth={2} dot={false} name="MRI Confidence" />
                  <Line type="monotone" dataKey="cogScore" stroke="#06b6d4" strokeWidth={2} dot={false} name="Cognitive Score" />
                  <Line type="monotone" dataKey="riskScore" stroke="#22c55e" strokeWidth={2} dot={false} name="Health Index" />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          )}

          <div className="space-y-3">
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 15, color: '#f1f5f9', paddingLeft: 4 }}>Session History</h3>
            {history.map((s, i) => {
              const mri   = s.results?.mri || {}
              const stage = s.results?.final_stage?.stage || mri.stage || 'Unknown'
              const conf  = s.results?.final_stage?.confidence || mri.confidence || 0
              const color = STAGE_COLOR[stage] || '#6366f1'
              const date  = new Date(s.timestamp)

              return (
                <motion.div key={s.session_id || i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <GlassCard className="p-5" hover>
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}1A`, border: `1px solid ${color}30` }}>
                          <Brain size={18} style={{ color }} />
                        </div>
                        {i < history.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 20, background: 'rgba(255,255,255,0.06)' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                          <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mb-1"
                              style={{ background: `${color}15`, color, border: `1px solid ${color}35` }}>{stage}</span>
                            <p style={{ fontSize: 12, color: '#475569' }}>
                              {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'Space Grotesk' }}>{conf.toFixed(1)}%</p>
                            <p style={{ fontSize: 11, color: '#475569' }}>AI confidence</p>
                          </div>
                        </div>
                        <ProgressBar value={conf} color={color} showPercent={false} height={5} />
                        <div className="flex flex-wrap gap-4 mt-3">
                          {s.results?.cognitive?.composite_score != null && <Metric label="Cognitive" value={s.results.cognitive.composite_score + '/10'} />}
                          {s.results?.risk_profile?.risk_category && <Metric label="Risk" value={s.results.risk_profile.risk_category} color={s.results.risk_profile.risk_category === 'Low' ? '#22c55e' : s.results.risk_profile.risk_category === 'Moderate' ? '#f59e0b' : '#ef4444'} />}
                          {s.results?.sentiment?.dominant_emotion && <Metric label="Emotion" value={s.results.sentiment.dominant_emotion} />}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
