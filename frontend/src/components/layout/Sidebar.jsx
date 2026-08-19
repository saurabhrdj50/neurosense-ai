import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Brain, Users, ChartBar, LogOut,
  ChevronLeft, Activity, Shield,
} from 'lucide-react'
import { useAuth } from '../../features/auth/AuthProvider'

/* ── Nav items ────────────────────────────────────────────────────────────── */
const DOCTOR_NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patients',  icon: Users,           label: 'Patient List' },
  { to: '/analysis',  icon: Brain,           label: 'New Assessment' },
]

const ADMIN_NAV_ITEMS = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin Dashboard' },
  { to: '/admin/panel',     icon: Shield,          label: 'User Management' },
]

/**
 * Clinical Sidebar navigation panel.
 */
export default function Sidebar({ open, onToggle, isMobile = false }) {
  const { logout, user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : DOCTOR_NAV_ITEMS

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <motion.aside
      animate={{ width: open ? 250 : 64 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={`relative flex flex-col h-full flex-shrink-0 overflow-hidden select-none bg-shell border-r border-border text-foreground z-30 ${
        isMobile ? 'w-[250px]' : ''
      }`}
    >
      {/* ── Brand Header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4" style={{ minHeight: 60 }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
            <Activity size={18} strokeWidth={2.5} />
          </div>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="min-w-0"
              >
                <div className="font-extrabold text-base text-foreground tracking-tight leading-tight truncate">
                  NeuroSense AI
                </div>
                <div className="text-xs text-foreground-muted font-semibold truncate">
                  Clinical System
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Collapse Toggle (Desktop only) ─────────────────────────────── */}
      {!isMobile && (
        <button
          onClick={onToggle}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          className="absolute top-[68px] -right-3 w-6 h-6 rounded-full hidden lg:flex items-center justify-center cursor-pointer z-50 bg-card border border-border text-muted hover:text-foreground shadow-2xs transition-colors"
        >
          <ChevronLeft size={12} className={open ? 'transition-transform duration-200' : 'rotate-180 transition-transform duration-200'} />
        </button>
      )}

      {/* ── System Status Indicator ───────────────────────────────────── */}
      <div className="px-3 my-2">
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-secondary/70 border border-border-subtle ${open ? '' : 'justify-center'}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          {open && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap overflow-hidden">
              System Active
            </span>
          )}
        </div>
      </div>

      {/* ── Nav items ─────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2.5 space-y-1.5 mt-2" role="navigation" aria-label="Primary navigation">
        {open && (
          <div className="px-2.5 pt-2 pb-1.5 text-xs font-bold uppercase tracking-wider text-foreground-muted">
            {isAdmin ? 'Admin System' : 'Navigation Menu'}
          </div>
        )}
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} title={!open ? label : undefined}>
            {({ isActive }) => (
              <div
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl cursor-pointer transition-all duration-150 relative min-h-[48px] ${
                  open ? '' : 'justify-center'
                } ${
                  isActive
                    ? 'bg-primary/10 text-primary font-bold shadow-2xs'
                    : 'text-foreground-muted hover:bg-surface-hover hover:text-foreground font-medium'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-primary" />
                )}
                <Icon size={20} className={`shrink-0 ${isActive ? 'text-primary' : 'text-foreground-muted'}`} />
                {open && (
                  <span className="text-base font-semibold whitespace-nowrap truncate">{label}</span>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User Profile & Logout Footer ─────────────────────────────────── */}
      <div className="p-2.5 border-t border-border bg-surface-secondary/40">
        {open ? (
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border/80 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-sm font-extrabold shrink-0 shadow-xs">
              {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-bold text-foreground">
                {user?.full_name || user?.username}
              </p>
              <p className="text-xs text-foreground-muted capitalize truncate font-medium">
                {user?.role || 'Clinician'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/50"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center p-2 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/50"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </motion.aside>
  )
}
