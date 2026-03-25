import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Brain, Users, Activity, TrendingUp, TrendingDown,
  Zap, AlertTriangle, ArrowRight, BarChart3, Sparkles,
  Clock,
} from 'lucide-react'
import CountUp from 'react-countup'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
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

const TREND_DATA = [
  { month: 'Sep', nonDemented: 35, mildDemented: 20, moderateDemented: 8 },
  { month: 'Oct', nonDemented: 40, mildDemented: 25, moderateDemented: 10 },
  { month: 'Nov', nonDemented: 48, mildDemented: 28, moderateDemented: 12 },
  { month: 'Dec', nonDemented: 55, mildDemented: 30, moderateDemented: 15 },
  { month: 'Jan', nonDemented: 62, mildDemented: 35, moderateDemented: 16 },
  { month: 'Feb', nonDemented: 70, mildDemented: 38, moderateDemented: 18 },
  { month: 'Mar', nonDemented: 78, mildDemented: 42, moderateDemented: 20 },
]

const PIE_DATA = [
  { name: 'Non Demented',      value: 52, color: '#22c55e' },
  { name: 'Mild Demented',     value: 31, color: '#f59e0b' },
  { name: 'Moderate Demented', value: 12, color: '#ef4444' },
  { name: 'Very Mild',         value: 5,  color: '#818cf8' },
]

const RECENT_ANALYSES = [
  { id: 'P-1042', name: 'Anita Sharma',   stage: 'Non Demented',      risk: 'Low',    time: '2m ago',  conf: 96, trend: 'up' },
  { id: 'P-8831', name: 'Robert Chen',    stage: 'Mild Demented',     risk: 'Medium', time: '34m ago', conf: 88, trend: 'down' },
  { id: 'P-3302', name: 'Mary O\'Brien',  stage: 'Moderate Demented', risk: 'High',   time: '1h ago',  conf: 91, trend: 'down' },
  { id: 'P-5510', name: 'James Miller',   stage: 'Non Demented',      risk: 'Low',    time: '3h ago',  conf: 94, trend: 'up' },
]

function RiskBadge({ level }) {
  const cls = level === 'Low' ? 'risk-low' : level === 'Medium' ? 'risk-medium' : 'risk-high'
  return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cls}`}>{level} Risk</span>
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

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 700)
    return () => clearTimeout(t)
  }, [])

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
        <Button icon={Zap} onClick={() => navigate('/analysis')}>New Analysis</Button>
      </motion.div>

      <motion.div variants={containerAnim} initial="hidden" animate={ready ? 'show' : 'hidden'} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {!ready ? (
          Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={Brain} label="Total Analyses" value={1842} trend="+12.3%" trendUp color="#6366f1" />
            <StatCard icon={Users} label="Active Patients" value={347} trend="+5.2%" trendUp color="#06b6d4" />
            <StatCard icon={AlertTriangle} label="High Risk Detected" value={34} trend="+8.1%" trendUp={false} color="#ef4444" />
            <StatCard icon={BarChart3} label="AI Accuracy" value={94.2} unit="%" trend="+1.1%" trendUp color="#22c55e" />
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
              <AreaChart data={TREND_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gNon" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gMild" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gMod" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#334155', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="nonDemented" stroke="#22c55e" strokeWidth={2} fill="url(#gNon)" dot={false} />
                <Area type="monotone" dataKey="mildDemented" stroke="#f59e0b" strokeWidth={2} fill="url(#gMild)" dot={false} />
                <Area type="monotone" dataKey="moderateDemented" stroke="#ef4444" strokeWidth={2} fill="url(#gMod)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-5 mt-4 pl-1">
              {[['Non Demented', '#22c55e'], ['Mild Demented', '#f59e0b'], ['Moderate', '#ef4444']].map(([l, c]) => (
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
                  <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={48} outerRadius={76} dataKey="value" strokeWidth={0} paddingAngle={3}>
                    {PIE_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={v => [`${v}%`]} contentStyle={{ background: 'rgba(20,28,48,0.97)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, backdropFilter: 'blur(20px)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 mt-3">
              {PIE_DATA.map(d => (
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
              {RECENT_ANALYSES.map((a, i) => (
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
                    {a.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: 13.5, fontWeight: 600, color: '#f1f5f9' }}>{a.name}</p>
                    <p style={{ fontSize: 11.5, color: '#475569' }}>{a.stage} · {a.conf}% confidence</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <RiskBadge level={a.risk} />
                    <span style={{ fontSize: 10, color: '#1e293b' }}>{a.time}</span>
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
