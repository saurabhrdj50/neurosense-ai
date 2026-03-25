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
        background: 'rgba(99,102,241,0.1)',
        border: '1px solid rgba(99,102,241,0.2)',
        color: '#9CA3AF',
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
      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3, fontWeight: 500 }}>{label}</div>
    </motion.div>
  )
}

function InputField({ icon: Icon, label, error, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium" style={{ color: '#E5E7EB' }}>
          {label}
        </label>
      )}
      <div className="relative group">
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 pointer-events-none"
          style={{ color: '#6B7280' }}
        >
          <Icon size={18} />
        </div>
        <input
          className="w-full pl-12 pr-4 py-3.5 rounded-xl text-sm transition-all duration-300 focus:outline-none login-input"
          style={{ 
            fontSize: 14,
            background: '#1F2937 !important',
            border: '1px solid #374151 !important',
            color: '#FFFFFF !important',
          }}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs mt-1" style={{ color: '#F87171' }}>{error}</p>
      )}
    </div>
  )
}

function PasswordField({ label, error, ...props }) {
  const [showPw, setShowPw] = useState(false)
  
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium" style={{ color: '#E5E7EB' }}>
          {label}
        </label>
      )}
      <div className="relative">
        <div 
          className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" 
          style={{ color: '#6B7280' }}
        >
          <Lock size={18} />
        </div>
        <input
          type={showPw ? 'text' : 'password'}
          className="w-full pl-12 pr-14 py-3.5 rounded-xl text-sm transition-all duration-300 focus:outline-none login-input"
          style={{ 
            fontSize: 14,
            background: '#1F2937 !important',
            border: '1px solid #374151 !important',
            color: '#FFFFFF !important',
          }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPw(v => !v)}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{ color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <p className="text-xs mt-1" style={{ color: '#F87171' }}>{error}</p>
      )}
    </div>
  )
}

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode]       = useState('login')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})
  const [form, setForm]       = useState({ username: '', email: '', password: '', full_name: '' })

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }))
  }

  const validate = () => {
    const newErrors = {}
    
    if (!form.username.trim()) {
      newErrors.username = 'Username is required'
    }
    
    if (!form.password) {
      newErrors.password = 'Password is required'
    }
    
    if (mode === 'register') {
      if (!form.full_name.trim()) {
        newErrors.full_name = 'Full name is required'
      }
      if (!form.email.trim()) {
        newErrors.email = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        newErrors.email = 'Invalid email format'
      }
      if (!form.password || form.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validate()) return
    
    setLoading(true)
    setErrors({})
    
    try {
      if (mode === 'login') {
        const result = await login(form.username, form.password)
        if (result.success) {
          if (result.role === 'admin') {
            navigate('/admin/dashboard', { replace: true })
          } else {
            navigate('/dashboard', { replace: true })
          }
        } else {
          setErrors({ general: 'Invalid username or password' })
        }
      } else {
        const ok = await register(form)
        if (ok) {
          setMode('login')
          setErrors({})
        }
      }
    } catch (err) {
      setErrors({ general: err.message || 'An error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#0B0F1A' }}>
      <div className="absolute inset-0" aria-hidden>
        <div className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', filter: 'blur(120px)' }} />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)', filter: 'blur(120px)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)', filter: 'blur(100px)' }} />
        <div className="absolute inset-0 grid-pattern" />
      </div>

      <div className="hidden lg:flex flex-col justify-center items-center flex-1 relative p-12 xl:p-16">
        <FloatingPill emoji="🧠" label="MRI Analysis"        style={{ top: '15%', left: '8%' }}   delay={0.2} />
        <FloatingPill emoji="📊" label="Risk Profiling"       style={{ top: '25%', right: '12%' }} delay={0.4} />
        <FloatingPill emoji="🎯" label="94.2% Accuracy"       style={{ bottom: '32%', left: '6%' }} delay={0.6} />
        <FloatingPill emoji="✍️" label="Handwriting Analysis" style={{ bottom: '18%', right: '8%' }} delay={0.8} />

        <div className="relative z-10 text-center max-w-lg">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="relative w-32 h-32 rounded-3xl flex items-center justify-center mx-auto mb-8"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            }}
          >
            <div className="absolute inset-0 rounded-3xl animate-glow-pulse" />
            <Activity size={56} color="white" strokeWidth={2} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 42,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: '#FFFFFF',
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
            style={{ fontSize: 15, color: '#9CA3AF', marginTop: 20, lineHeight: 1.7, maxWidth: 400, margin: '20px auto 0' }}
          >
            Multimodal AI platform for early Alzheimer's detection using MRI, cognitive assessment, and behavioral analysis.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex gap-10 mt-10 justify-center"
          >
            <StatPill value="94.2%" label="Accuracy" delay={0.8} />
            <StatPill value="18K+"  label="Scans Analyzed" delay={0.9} />
            <StatPill value="<3s"   label="Analysis Time" delay={1.0} />
          </motion.div>
        </div>
      </div>

      <div
        className="flex-1 lg:flex-none lg:w-[480px] flex items-center justify-center p-6 sm:p-8 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-[400px]"
        >
          <div
            className="p-8 rounded-3xl relative overflow-hidden"
            style={{
              background: '#111827',
              border: '1px solid #374151',
              boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
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
              <h2 style={{ fontFamily: 'Space Grotesk', fontSize: 26, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em' }}>
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p style={{ fontSize: 14, color: '#9CA3AF', marginTop: 6, lineHeight: 1.5 }}>
                {mode === 'login' ? 'Sign in to your clinical workspace' : 'Register to start using NeuroSense'}
              </p>
            </div>

            <div
              className="flex rounded-xl p-1 mb-6"
              style={{ background: '#1F2937', border: '1px solid #374151' }}
            >
              {['login', 'register'].map(m => (
                <motion.button
                  key={m}
                  onClick={() => {
                    setMode(m)
                    setErrors({})
                  }}
                  className="relative flex-1 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
                  style={{
                    background: 'none',
                    color: mode === m ? '#FFFFFF' : '#6B7280',
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
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
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

            <AnimatePresence>
              {errors.general && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 rounded-lg"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <p style={{ color: '#F87171', fontSize: 13 }}>{errors.general}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                    <InputField 
                      icon={User} 
                      label="Full Name"
                      type="text" 
                      placeholder="Enter your full name"
                      value={form.full_name} 
                      onChange={set('full_name')}
                      error={errors.full_name}
                    />
                    <InputField 
                      icon={Mail} 
                      label="Email Address"
                      type="email" 
                      placeholder="Enter your email"
                      value={form.email} 
                      onChange={set('email')}
                      error={errors.email}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <InputField 
                icon={User} 
                label="Username"
                type="text" 
                placeholder="Enter your username"
                value={form.username} 
                onChange={set('username')}
                error={errors.username}
                required 
              />

              <PasswordField
                label="Password"
                placeholder="Enter your password"
                value={form.password}
                onChange={set('password')}
                error={errors.password}
                required
              />

              <Button 
                type="submit" 
                loading={loading} 
                size="lg" 
                className="w-full mt-2"
                style={{ height: 48 }}
              >
                {mode === 'login' ? (loading ? 'Signing in...' : 'Sign In') : (loading ? 'Creating account...' : 'Create Account')}
                <ChevronRight size={16} />
              </Button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-2" style={{ fontSize: 11, color: '#6B7280' }}>
              <Shield size={12} />
              <span>HIPAA compliant · 256-bit AES encrypted</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
