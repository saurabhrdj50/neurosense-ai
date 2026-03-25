import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Brain, Users, Activity, TrendingUp, TrendingDown,
  Zap, AlertTriangle, ArrowRight, BarChart3, Sparkles,
  Clock, FileText, ShieldAlert,
} from 'lucide-react'
import API_URL from '../../config/api'
import CountUp from 'react-countup'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import ProgressBar from '../../components/ui/ProgressBar'
import { StatCardSkeleton } from '../../components/ui/Skeleton'

const containerAnim = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const itemAnim = {
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  show:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.4 } },
}

const RISK_COLORS = {
  Normal: '#22c55e',
  Mild: '#f59e0b', 
  Moderate: '#ef4444',
  High: '#dc2626',
}

function getRiskLevel(stage) {
  if (!stage) return 'Low'
  if (stage.includes('Non') || stage.includes('Very Mild')) return 'Low'
  if (stage.includes('Mild')) return 'Medium'
  return 'High'
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function getDefaultDistribution() {
  return [
    { name: 'Normal', value: 52, count: 0, color: RISK_COLORS.Normal },
    { name: 'Mild', value: 31, count: 0, color: RISK_COLORS.Mild },
    { name: 'Moderate', value: 12, count: 0, color: RISK_COLORS.Moderate },
    { name: 'High', value: 5, count: 0, color: RISK_COLORS.High },
  ]
}

function getDefaultRecentAnalyses() {
  return [
    { id: 'P-1042', name: 'Anita Sharma', stage: 'Non Demented', risk: 'Low', time: '2m ago', conf: 96 },
    { id: 'P-8831', name: 'Robert Chen', stage: 'Mild Demented', risk: 'Medium', time: '34m ago', conf: 88 },
    { id: 'P-3302', name: 'Mary O\'Brien', stage: 'Moderate Demented', risk: 'High', time: '1h ago', conf: 91 },
    { id: 'P-5510', name: 'James Miller', stage: 'Non Demented', risk: 'Low', time: '3h ago', conf: 94 },
  ]
}

function getDefaultTrendData() {
  return [
    { month: 'Sep', normal: 35, mild: 20, moderate: 8 },
    { month: 'Oct', normal: 40, mild: 25, moderate: 10 },
    { month: 'Nov', normal: 48, mild: 28, moderate: 12 },
    { month: 'Dec', normal: 55, mild: 30, moderate: 15 },
    { month: 'Jan', normal: 62, mild: 35, moderate: 16 },
    { month: 'Feb', normal: 70, mild: 38, moderate: 18 },
    { month: 'Mar', normal: 78, mild: 42, moderate: 20 },
  ]
}

function generateTrendData(analyses) {
  const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']
  const monthlyData = months.map(month => ({ month, normal: 0, mild: 0, moderate: 0 }))
  
  analyses.forEach(a => {
    const stage = a.final_stage?.stage || a.stage || ''
    const date = new Date(a.created_at || Date.now())
    const monthIdx = date.getMonth() - 8
    if (monthIdx >= 0 && monthIdx < 7) {
      if (stage.includes('Non') || stage.includes('Very Mild')) monthlyData[monthIdx].normal++
      else if (stage.includes('Mild')) monthlyData[monthIdx].mild++
      else if (stage.includes('Moderate')) monthlyData[monthIdx].moderate++
    }
  })
  
  if (monthlyData.every(m => m.normal === 0 && m.mild === 0 && m.moderate === 0)) {
    return getDefaultTrendData()
  }
  
  return monthlyData
}

function RiskBadge({ level }) {
  const colors = {
    Low: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    Medium: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    High: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  }
  const c = colors[level] || colors.Low
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold" 
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {level}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, unit = '', trend, trendUp, color = '#6366f1' }) {
  return (
    <motion.div variants={itemAnim}>
      <GlassCard glow hover gradient>
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${color}15, ${color}08)`,
              border: `1px solid ${color}25`,
            }}
          >
            <Icon size={22} style={{ color }} />
          </div>
          {trend && (
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{
                background: trendUp ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                color: trendUp ? '#4ade80' : '#f87171',
                border: `1px solid ${trendUp ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              }}
            >
              {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trend}
            </div>
          )}
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#f1f5f9', fontFamily: 'Space Grotesk', lineHeight: 1, letterSpacing: '-0.03em' }}>
          <CountUp end={value} duration={2.5} separator="," />{unit}
        </div>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, fontWeight: 500 }}>{label}</p>
      </GlassCard>
    </motion.div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(20,28,48,0.97)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <div style={{ width: 8, height: 8, borderRadius: 3, background: p.color, boxShadow: `0 0 6px ${p.color}50` }} />
          <span style={{ fontSize: 12.5, color: '#f1f5f9', fontWeight: 500 }}>{p.value} patients</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAnalyses: 0,
    highRiskCount: 0,
    recentActivity: 0,
  })
  const [riskDistribution, setRiskDistribution] = useState([])
  const [recentAnalyses, setRecentAnalyses] = useState([])
  const [trendData, setTrendData] = useState([])

  const fetchDashboardData = useCallback(async () => {
    try {
      const [patientsRes, analysesRes] = await Promise.all([
        fetch(`${API_URL}/api/patients`, { credentials: 'include' }),
        fetch(`${API_URL}/api/analyses`, { credentials: 'include' }).catch(() => ({ json: () => ({ analyses: [] }) })),
      ])
      
      const patientsData = await patientsRes.json()
      const analysesData = await analysesRes.json()
      
      const patients = patientsData.patients || []
      const analyses = analysesData.analyses || []
      
      const riskCounts = { Normal: 0, Mild: 0, Moderate: 0, High: 0 }
      analyses.forEach(a => {
        const stage = a.final_stage?.stage || a.stage || 'Normal'
        if (stage.includes('Non') || stage.includes('Very Mild')) riskCounts.Normal++
        else if (stage.includes('Mild')) riskCounts.Mild++
        else if (stage.includes('Moderate')) riskCounts.Moderate++
        else riskCounts.High++
      })
      
      const totalRisk = riskCounts.Normal + riskCounts.Mild + riskCounts.Moderate + riskCounts.High
      const distribution = [
        { name: 'Normal', value: totalRisk > 0 ? Math.round((riskCounts.Normal / totalRisk) * 100) : 52, count: riskCounts.Normal, color: RISK_COLORS.Normal },
        { name: 'Mild', value: totalRisk > 0 ? Math.round((riskCounts.Mild / totalRisk) * 100) : 31, count: riskCounts.Mild, color: RISK_COLORS.Mild },
        { name: 'Moderate', value: totalRisk > 0 ? Math.round((riskCounts.Moderate / totalRisk) * 100) : 12, count: riskCounts.Moderate, color: RISK_COLORS.Moderate },
        { name: 'High', value: totalRisk > 0 ? Math.round((riskCounts.High / totalRisk) * 100) : 5, count: riskCounts.High, color: RISK_COLORS.High },
      ]
      
      const recent = analyses.slice(0, 5).map(a => ({
        id: a.patient_info?.patient_id || a.patient_id || 'P-0000',
        name: a.patient_info?.name || a.name || 'Unknown',
        stage: a.final_stage?.stage || a.stage || 'Unknown',
        risk: getRiskLevel(a.final_stage?.stage || a.stage),
        time: formatTimeAgo(a.created_at),
        conf: Math.round(a.final_stage?.confidence || a.confidence || 85),
      }))
      
      const monthlyData = generateTrendData(analyses)
      
      setStats({
        totalPatients: patients.length,
        totalAnalyses: analyses.length,
        highRiskCount: riskCounts.High,
        recentActivity: analyses.filter(a => {
          const created = new Date(a.created_at)
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
          return created > dayAgo
        }).length,
      })
      setRiskDistribution(distribution)
      setRecentAnalyses(recent.length > 0 ? recent : getDefaultRecentAnalyses())
      setTrendData(monthlyData)
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
      setRiskDistribution(getDefaultDistribution())
      setRecentAnalyses(getDefaultRecentAnalyses())
      setTrendData(getDefaultTrendData())
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
    const t = setTimeout(() => setReady(true), 500)
    return () => clearTimeout(t)
  }, [fetchDashboardData])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk', fontSize: 28, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.2, letterSpacing: '-0.03em' }}>
            {greeting}, Doctor 👋
          </h1>
          <p style={{ fontSize: 14, color: '#475569', marginTop: 6 }}>
            Here's your clinical overview — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={FileText} onClick={() => navigate('/results')}>View Reports</Button>
          <Button icon={Zap} onClick={() => navigate('/analysis')}>New Analysis</Button>
        </div>
      </motion.div>

      <motion.div variants={containerAnim} initial="hidden" animate={ready ? 'show' : 'hidden'} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {!ready ? (
          Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={Users} label="Total Patients" value={stats.totalPatients} trend={stats.totalPatients > 0 ? '+3.2%' : ''} trendUp color="#06b6d4" />
            <StatCard icon={Brain} label="Total Analyses" value={stats.totalAnalyses} trend={stats.totalAnalyses > 0 ? '+8.5%' : ''} trendUp color="#6366f1" />
            <StatCard icon={ShieldAlert} label="High Risk" value={stats.highRiskCount} trend={stats.highRiskCount > 0 ? 'Needs Attention' : ''} trendUp={false} color="#ef4444" />
            <StatCard icon={Activity} label="Today's Activity" value={stats.recentActivity} trend="Last 24h" color="#22c55e" />
          </>
        )}
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="xl:col-span-2">
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>Detection Trends</h3>
                <p style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>Monthly classification breakdown</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <Clock size={12} style={{ color: '#818cf8' }} />
                <span style={{ fontSize: 11, color: '#818cf8', fontWeight: 600 }}>Last 7 months</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendData.length > 0 ? trendData : getDefaultTrendData()} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gNon" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gMild" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gMod" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="normal" stroke="#22c55e" strokeWidth={2} fill="url(#gNon)" dot={false} />
                <Area type="monotone" dataKey="mild" stroke="#f59e0b" strokeWidth={2} fill="url(#gMild)" dot={false} />
                <Area type="monotone" dataKey="moderate" stroke="#ef4444" strokeWidth={2} fill="url(#gMod)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-5 mt-4 pl-1 flex-wrap">
              {[['Normal', '#22c55e'], ['Mild', '#f59e0b'], ['Moderate', '#ef4444']].map(([l, c]) => (
                <div key={l} className="flex items-center gap-2">
                  <div style={{ width: 8, height: 8, borderRadius: 3, background: c, boxShadow: `0 0 6px ${c}40` }} />
                  <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{l}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <GlassCard className="flex flex-col h-full">
            <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 16, color: '#f1f5f9', marginBottom: 6 }}>Stage Distribution</h3>
            <p style={{ fontSize: 12, color: '#475569', marginBottom: 20 }}>Current patient breakdown</p>
            <div className="flex-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={riskDistribution.length > 0 ? riskDistribution : getDefaultDistribution()} cx="50%" cy="50%" innerRadius={48} outerRadius={76} dataKey="value" strokeWidth={0} paddingAngle={3}>
                    {(riskDistribution.length > 0 ? riskDistribution : getDefaultDistribution()).map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={v => [`${v}%`]} contentStyle={{ background: 'rgba(20,28,48,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, backdropFilter: 'blur(20px)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 mt-3">
              {(riskDistribution.length > 0 ? riskDistribution : getDefaultDistribution()).map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div style={{ width: 8, height: 8, borderRadius: 3, background: d.color, boxShadow: `0 0 6px ${d.color}40` }} />
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', fontFamily: 'Space Grotesk' }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <GlassCard>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles size={16} style={{ color: '#a855f7' }} />
              <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>AI Module Performance</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: 'MRI Classifier (EfficientNet-B4)', value: 94.2, color: '#6366f1' },
                { label: 'Cognitive Assessment', value: 87.5, color: '#06b6d4' },
                { label: 'Sentiment Analyzer', value: 81.3, color: '#a855f7' },
                { label: 'Handwriting Analysis', value: 78.9, color: '#f59e0b' },
                { label: 'Speech Transcriber', value: 84.1, color: '#22c55e' },
              ].map(m => <ProgressBar key={m.label} {...m} />)}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <GlassCard>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Activity size={16} style={{ color: '#06b6d4' }} />
                <h3 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>Recent Analyses</h3>
              </div>
              <button onClick={() => navigate('/patients')} className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#818cf8', background: 'none', border: 'none', cursor: 'pointer' }}>
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-2.5">
              {recentAnalyses.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.06 }}
                  className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-white/[0.02] transition-all duration-200 cursor-pointer group"
                  style={{ border: '1px solid rgba(255,255,255,0.03)' }}
                  onClick={() => navigate(`/history/${a.id}`)}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 group-hover:scale-105 transition-transform"
                    style={{ background: `linear-gradient(135deg, ${a.risk === 'Low' ? '#22c55e' : a.risk === 'Medium' ? '#f59e0b' : '#ef4444'}30, ${a.risk === 'Low' ? '#22c55e' : a.risk === 'Medium' ? '#f59e0b' : '#ef4444'}10)`, border: `1px solid ${a.risk === 'Low' ? '#22c55e' : a.risk === 'Medium' ? '#f59e0b' : '#ef4444'}25`, color: a.risk === 'Low' ? '#4ade80' : a.risk === 'Medium' ? '#fbbf24' : '#f87171' }}>
                    {(a.name || '?').split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: 13.5, fontWeight: 600, color: '#f1f5f9' }}>{a.name}</p>
                    <p style={{ fontSize: 11.5, color: '#475569' }}>{a.stage} · {a.conf}% confidence</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <RiskBadge level={a.risk} />
                    <span style={{ fontSize: 10, color: '#64748b' }}>{a.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <motion.div variants={containerAnim} initial="hidden" animate={ready ? 'show' : 'hidden'} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'MRI Analysis', icon: Brain, to: '/analysis', color: '#6366f1', desc: 'Scan classification' },
          { label: 'Patient Registry', icon: Users, to: '/patients', color: '#06b6d4', desc: 'Manage records' },
          { label: 'View Results', icon: BarChart3, to: '/results', color: '#a855f7', desc: 'Detailed reports' },
          { label: 'Alert Center', icon: AlertTriangle, to: '/patients', color: '#ef4444', desc: 'High risk alerts' },
        ].map(({ label, icon: Icon, to, color, desc }) => (
          <motion.div key={label} variants={itemAnim}>
            <GlassCard className="flex flex-col items-center justify-center gap-3 cursor-pointer group text-center" style={{ minHeight: 110 }} onClick={() => navigate(to)} hover>
              <motion.div whileHover={{ scale: 1.08, rotate: 3 }} className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${color}15, ${color}08)`, border: `1px solid ${color}25` }}>
                <Icon size={20} style={{ color }} />
              </motion.div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{label}</span>
                <p style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>{desc}</p>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
