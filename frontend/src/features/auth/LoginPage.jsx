import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Activity, Eye, EyeOff, Mail, Lock, User, ChevronRight,
  Shield, Zap,
} from 'lucide-react'
import { useAuth } from './AuthProvider'
import Button from '../../components/ui/Button'

function FloatingPill({ label, emoji, style, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: { duration: 4 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut', delay },
      }}
      className="absolute px-4 py-2 rounded-full text-xs font-semibold"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        color: '#94a3b8',
        whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
        ...style,
      }}
    >
      <span className="mr-1.5">{emoji}</span>{label}
    </motion.div>
  )
}

function StatPill({ value, label, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="text-center"
    >
      <div
        style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Space Grotesk', letterSpacing: '-0.03em' }}
        className="gradient-text"
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#475569', marginTop: 3, fontWeight: 500 }}>{label}</div>
    </motion.div>
  )
}

function InputField({ icon: Icon, ...props }) {
  return (
    <div className="relative group">
      <div
        className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none"
        style={{ color: '#334155' }}
      >
        <Icon size={16} />
      </div>
      <input
        className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm transition-all duration-300"
        style={{ fontSize: 13.5 }}
        {...props}
      />
    </div>
  )
}

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode]       = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [form, setForm]       = useState({ username: '', email: '', password: '', full_name: '', role: 'doctor' })

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const ok = await login(form.username, form.password)
        if (ok) navigate('/dashboard')
      } else {
        const ok = await register(form)
        if (ok) setMode('login')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#060a14' }}>
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', filter: 'blur(120px)' }} />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', filter: 'blur(120px)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)', filter: 'blur(100px)' }} />
        <div className="absolute inset-0 grid-pattern" />
      </div>

      <div className="hidden lg:flex flex-col justify-center items-center flex-1 relative p-12 xl:p-16">
        <FloatingPill emoji="🧠" label="MRI Analysis"        style={{ top: '15%', left: '8%' }}   delay={0.2} />
        <FloatingPill emoji="📊" label="Risk Profiling"       style={{ top: '25%', right: '12%' }} delay={0.4} />
        <FloatingPill emoji="🎯" label="94.2% Accuracy"       style={{ bottom: '32%', left: '6%' }} delay={0.6} />
        <FloatingPill emoji="✍️" label="Handwriting Analysis" style={{ bottom: '18%', right: '8%' }} delay={0.8} />
        <FloatingPill emoji="🗣️" label="Speech Analysis"     style={{ top: '52%', left: '3%' }}   delay={1.0} />
        <FloatingPill emoji="💊" label="Genomic Sequencing"   style={{ top: '40%', right: '5%' }}  delay={1.2} />

        <div className="relative z-10 text-center max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="relative w-36 h-36 rounded-3xl flex items-center justify-center mx-auto mb-10"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            }}
          >
            <div className="absolute inset-0 rounded-3xl animate-glow-pulse" />
            <div
              className="absolute inset-0 rounded-3xl opacity-20"
              style={{
                background: 'repeating-conic-gradient(rgba(255,255,255,0.1) 0% 25%, transparent 0% 50%)',
                backgroundSize: '20px 20px',
              }}
            />
            <Activity size={64} color="white" strokeWidth={2} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: '#f1f5f9',
              lineHeight: 1.05,
            }}
          >
            NeuroSense<br />
            <span className="gradient-text">Advanced</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            style={{ fontSize: 16, color: '#475569', marginTop: 20, lineHeight: 1.7, maxWidth: 380, margin: '20px auto 0' }}
          >
            Multimodal AI platform for early Alzheimer's detection using MRI, cognitive assessment, and behavioral analysis.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex gap-10 mt-12 justify-center"
          >
            <StatPill value="94.2%" label="Accuracy" delay={0.8} />
            <StatPill value="18K+"  label="Scans Analyzed" delay={0.9} />
            <StatPill value="<3s"   label="Analysis Time" delay={1.0} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex items-center justify-center gap-6 mt-12"
          >
            {[
              { icon: Shield, label: 'HIPAA Compliant' },
              { icon: Lock, label: 'End-to-End Encrypted' },
              { icon: Zap, label: 'Real-time AI' },
            ].map(({ icon: I, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <I size={12} style={{ color: '#334155' }} />
                <span style={{ fontSize: 11, color: '#334155', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div
        className="flex-1 lg:flex-none lg:w-[480px] flex items-center justify-center p-6 sm:p-8 relative z-10"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.3), rgba(10,14,26,0.5))',
          borderLeft: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-[380px]"
        >
          <div
            className="p-8 rounded-3xl relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 40px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, #6366f1, #a855f7, transparent)' }}
            />

            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
              >
                <Activity size={22} color="white" />
              </div>
              <span
                className="gradient-text"
                style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18 }}
              >
                NeuroSense
              </span>
            </div>

            <div className="mb-7">
              <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.03em' }}>
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p style={{ fontSize: 14, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
                {mode === 'login' ? 'Sign in to your clinical workspace' : 'Register to start using NeuroSense'}
              </p>
            </div>

            <div
              className="flex rounded-xl p-1 mb-7"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              {['login', 'register'].map(m => (
                <motion.button
                  key={m}
                  onClick={() => setMode(m)}
                  className="relative flex-1 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
                  style={{
                    background: 'none',
                    color: mode === m ? 'white' : '#475569',
                    border: 'none',
                    fontSize: 13,
                    zIndex: 1,
                  }}
                >
                  {mode === m && (
                    <motion.div
                      layoutId="authTab"
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                      }}
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </span>
                </motion.button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div
                    key="reg-extra"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <InputField icon={User} type="text" placeholder="Full Name" value={form.full_name} onChange={set('full_name')} />
                    <InputField icon={Mail} type="email" placeholder="Email Address" value={form.email} onChange={set('email')} />
                    <div className="relative">
                      <select
                        value={form.role}
                        onChange={set('role')}
                        className="w-full px-4 py-3.5 rounded-xl text-sm"
                        style={{ fontSize: 13.5 }}
                      >
                        <option value="doctor">Doctor</option>
                        <option value="researcher">Researcher</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <InputField icon={User} type="text" placeholder="Username" value={form.username} onChange={set('username')} required />

              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#334155' }}>
                  <Lock size={16} />
                </div>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  value={form.password}
                  onChange={set('password')}
                  required
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl text-sm"
                  style={{ fontSize: 13.5 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  style={{ color: '#334155', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <Button type="submit" loading={loading} size="lg" className="w-full mt-3">
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ChevronRight size={16} />
              </Button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2" style={{ fontSize: 11, color: '#1e293b' }}>
              <Shield size={11} />
              <span>HIPAA compliant · 256-bit AES encrypted</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
