import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Bell, Search, X, Brain, Command, Clock } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/* ── Page title map ───────────────────────────────────────────────────────── */
const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard',            subtitle: 'Clinical overview & insights' },
  '/analysis':  { title: 'Multimodal Analysis',  subtitle: 'AI-powered Alzheimer\'s detection' },
  '/patients':  { title: 'Patient Registry',     subtitle: 'Manage patient records' },
  '/results':   { title: 'Analysis Results',     subtitle: 'View detailed diagnostics' },
  '/history':   { title: 'Patient History',       subtitle: 'Timeline & progression' },
}

/* ── Mock notifications (replace with real API) ───────────────────────────── */
const NOTIFICATIONS = [
  { id: 1, text: 'MRI analysis completed for P-1042',      time: '2 min ago',  type: 'success' },
  { id: 2, text: 'High risk detected — Patient P-8831',    time: '18 min ago', type: 'danger' },
  { id: 3, text: 'Cognitive assessment ready for review',   time: '1h ago',     type: 'info' },
  { id: 4, text: 'New patient John Miller was registered',  time: '3h ago',     type: 'info' },
]

export default function TopBar({ onMenuClick }) {
  const { pathname }   = useLocation()
  const { user }       = useAuth()
  const navigate       = useNavigate()
  const [notifOpen, setNotifOpen]   = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVal, setSearchVal]   = useState('')
  const searchRef = useRef(null)
  const notifRef  = useRef(null)

  const pageKey = Object.keys(PAGE_TITLES).find(k => pathname.startsWith(k)) || '/dashboard'
  const { title, subtitle } = PAGE_TITLES[pageKey]

  /* ── Close dropdowns on outside click ────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── Keyboard shortcut: Ctrl+K for search ────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0"
      style={{
        background: 'rgba(10,14,26,0.65)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        height: 72,
        position: 'relative',
        zIndex: 40,
      }}
    >
      {/* ── Left ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile menu toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onMenuClick}
          className="p-2 rounded-xl lg:hidden"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', cursor: 'pointer' }}
        >
          <Menu size={18} />
        </motion.button>

        {/* Page title with transition */}
        <div>
          <motion.h1
            key={title}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 18,
              fontWeight: 700,
              color: '#f1f5f9',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </motion.h1>
          <motion.p
            key={subtitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{ fontSize: 12, color: '#475569', marginTop: 1 }}
          >
            {subtitle}
          </motion.p>
        </div>
      </div>

      {/* ── Right ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5">

        {/* Search bar / toggle */}
        <AnimatePresence mode="wait">
          {searchOpen ? (
            <motion.div
              key="search-input"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden hidden sm:block"
            >
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
                <input
                  ref={searchRef}
                  autoFocus
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  placeholder="Search patients…"
                  onBlur={() => { if (!searchVal) setSearchOpen(false) }}
                  className="w-full pl-9 pr-9 py-2 text-sm rounded-xl"
                  style={{ height: 38, fontSize: 13 }}
                  onKeyDown={e => e.key === 'Escape' && (setSearchOpen(false), setSearchVal(''))}
                />
                <button
                  onClick={() => { setSearchOpen(false); setSearchVal('') }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="search-btn"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#475569',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              <Search size={15} />
              <span className="hidden md:inline" style={{ color: '#334155' }}>Search…</span>
              <span
                className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', color: '#475569', fontFamily: 'JetBrains Mono', fontWeight: 500 }}
              >
                <Command size={9} />K
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setNotifOpen(o => !o)}
            className="relative p-2 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            <Bell size={17} />
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full text-white flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                fontSize: 9,
                fontWeight: 700,
                minWidth: 18,
                height: 18,
                boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
              }}
            >
              {NOTIFICATIONS.length}
            </motion.span>
          </motion.button>

          {/* Notification dropdown */}
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute right-0 mt-2 rounded-2xl overflow-hidden"
                style={{
                  width: 340,
                  background: 'rgba(20,28,48,0.97)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.55)',
                  backdropFilter: 'blur(40px)',
                  zIndex: 999,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2">
                    <Bell size={14} style={{ color: '#6366f1' }} />
                    <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'Space Grotesk', color: '#f1f5f9' }}>Notifications</span>
                  </div>
                  <button
                    style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Mark all read
                  </button>
                </div>

                {/* Items */}
                {NOTIFICATIONS.map((n, i) => (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 px-5 py-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{
                        background: n.type === 'success' ? '#22c55e' : n.type === 'danger' ? '#ef4444' : '#6366f1',
                        boxShadow: `0 0 6px ${n.type === 'success' ? '#22c55e' : n.type === 'danger' ? '#ef4444' : '#6366f1'}50`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.4 }}>{n.text}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock size={10} style={{ color: '#334155' }} />
                        <span style={{ fontSize: 11, color: '#334155' }}>{n.time}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Footer */}
                <div className="px-5 py-3 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <button style={{ fontSize: 12, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    View all notifications →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Ready badge */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl cursor-default"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))',
            border: '1px solid rgba(99,102,241,0.15)',
          }}
        >
          <div className="relative">
            <Brain size={14} style={{ color: '#818cf8' }} />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
          </div>
          <span style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 600, letterSpacing: '-0.01em' }}>AI Ready</span>
        </motion.div>

        {/* Avatar */}
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm cursor-pointer flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
          }}
        >
          {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
        </motion.div>
      </div>
    </header>
  )
}
