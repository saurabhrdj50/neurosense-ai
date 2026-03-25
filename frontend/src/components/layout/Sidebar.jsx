import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Brain, Users, ChartBar, LogOut,
  ChevronLeft, Activity, Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

/* ── Nav items ────────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', color: '#6366f1' },
  { to: '/analysis',  icon: Brain,           label: 'Analysis',  color: '#06b6d4' },
  { to: '/patients',  icon: Users,           label: 'Patients',  color: '#a855f7' },
  { to: '/results',   icon: ChartBar,        label: 'Results',   color: '#f59e0b' },
]

export default function Sidebar({ open, onToggle }) {
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <motion.aside
      animate={{ width: open ? 256 : 76 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`
        relative flex flex-col h-full flex-shrink-0 overflow-hidden
        fixed lg:relative z-50
      `}
      style={{
        background: 'rgba(10,14,26,0.85)',
        backdropFilter: 'blur(30px)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* ── Accent gradient top edge ────────────────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #6366f1, #a855f7, transparent)' }}
      />

      {/* ── Logo ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-6" style={{ minHeight: 80 }}>
        <motion.div
          whileHover={{ scale: 1.08, rotate: 3 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          }}
        >
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-2xl animate-glow-pulse" />
          <Activity size={22} color="white" strokeWidth={2.5} />
        </motion.div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: 17, letterSpacing: '-0.03em' }}>
                <span className="gradient-text">NeuroSense</span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Sparkles size={9} style={{ color: '#a855f7' }} />
                <span style={{ fontSize: 10, color: '#475569', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
                  Advanced AI
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Collapse toggle ─────────────────────────────────────────────── */}
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        className="absolute top-6 -right-3.5 w-7 h-7 rounded-full hidden lg:flex items-center justify-center cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#94a3b8',
          zIndex: 51,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        <motion.span animate={{ rotate: open ? 0 : 180 }} transition={{ duration: 0.3 }}>
          <ChevronLeft size={13} />
        </motion.span>
      </motion.button>

      {/* ── AI Status ───────────────────────────────────────────────────── */}
      <div className="px-4 mb-5">
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}
        >
          <div className="relative flex-shrink-0">
            <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
            <div className="absolute inset-0 w-2 h-2 rounded-full animate-ping-slow" style={{ background: '#22c55e' }} />
          </div>
          <AnimatePresence>
            {open && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                style={{ fontSize: 11, color: '#4ade80', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', letterSpacing: '0.02em' }}
              >
                AI Models Active
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Nav Section Label ───────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-5 mb-2"
          >
            <span style={{ fontSize: 10, color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Navigation
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Nav items ───────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label, color }) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.04)' }}
                whileTap={{ scale: 0.97 }}
                className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer overflow-hidden"
                style={{
                  background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                  transition: 'border-color 0.3s',
                }}
              >
                {/* Active left accent bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebarActiveIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{ background: `linear-gradient(180deg, ${color}, #a855f7)` }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}

                {/* Icon with subtle glow when active */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isActive ? `${color}18` : 'transparent',
                    ...(isActive ? { boxShadow: `0 0 12px ${color}20` } : {}),
                  }}
                >
                  <Icon size={17} style={{ color: isActive ? color : '#475569' }} />
                </div>

                <AnimatePresence>
                  {open && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.15 }}
                      style={{
                        fontSize: 13.5,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#e2e8f0' : '#64748b',
                        whiteSpace: 'nowrap',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User profile + logout ─────────────────────────────────────── */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            {/* Gradient avatar */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                letterSpacing: '0.02em',
              }}
            >
              {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                {user?.full_name || user?.username}
              </p>
              <p style={{ fontSize: 11, color: '#475569', textTransform: 'capitalize' }}>
                {user?.role || 'Doctor'}
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.15, color: '#ef4444' }}
              whileTap={{ scale: 0.85 }}
              onClick={handleLogout}
              className="p-1.5 rounded-lg"
              style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}
              title="Sign out"
            >
              <LogOut size={15} />
            </motion.button>
          </motion.div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.85 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2.5 rounded-xl cursor-pointer"
            style={{ color: '#64748b', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            title="Sign out"
          >
            <LogOut size={17} />
          </motion.button>
        )}
      </div>
    </motion.aside>
  )
}
