import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu, Search, Command, Shield,
  Settings, HelpCircle, User, LogOut, ChevronDown
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider'
import SettingsModal from '../SettingsModal'
import CommandPalette from '../CommandPalette'
import HelpCenterModal from '../HelpCenterModal'

const PAGE_TITLES = {
  '/admin/dashboard': { title: 'Admin Dashboard',      subtitle: 'System overview & user management' },
  '/admin/panel':     { title: 'User Management',       subtitle: 'Manage user access & permissions' },
  '/dashboard':       { title: 'Patient Dashboard',     subtitle: 'Patient overview & quick health insights' },
  '/analysis':        { title: 'Patient Assessment',    subtitle: 'Step-by-step patient diagnostic testing' },
  '/patients':        { title: 'Patient List',          subtitle: 'All patient records & test history' },
  '/results':         { title: 'Diagnostic Report',     subtitle: 'Detailed test results & recommendations' },
  '/history':         { title: 'Health History',        subtitle: 'Patient test history over time' },
}

/**
 * Top Bar rendered inside the authenticated layout shell.
 */
export default function TopBar({ onMenuClick }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, isAdmin, logout } = useAuth()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const profileRef = useRef(null)

  const pageKey = Object.keys(PAGE_TITLES).find(k => pathname.startsWith(k)) || '/dashboard'
  const { title, subtitle } = PAGE_TITLES[pageKey]

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault()
        setHelpOpen(o => !o)
      }
      if (e.key === 'Escape') {
        setProfileOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      <header
        className="flex items-center justify-between px-4 sm:px-6 flex-shrink-0 bg-surface/80 backdrop-blur-xl border-b border-border z-20 sticky top-0"
        style={{ height: 64 }}
      >
        {/* Left Title / Breadcrumb Area */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuClick}
            aria-label="Open mobile navigation menu"
            className="p-2 rounded-lg lg:hidden bg-surface-secondary text-foreground-muted hover:bg-surface-hover hover:text-foreground transition-colors border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className="text-foreground tracking-tight">Clinic</span>
              <span className="text-foreground-subtle font-mono text-xs">/</span>
              <span className="text-primary truncate font-extrabold">{title}</span>
            </div>
            <p className="text-xs sm:text-sm text-foreground-muted truncate font-medium mt-0.5 hidden sm:block">{subtitle}</p>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* System Admin Role Badge */}
          {isAdmin && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              <Shield size={13} />
              <span>Admin</span>
            </div>
          )}

          {/* Settings Trigger */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg bg-surface-secondary text-foreground-muted hover:bg-surface-hover hover:text-foreground transition-colors border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            title="System Settings"
            aria-label="System Settings"
          >
            <Settings size={16} />
          </button>

          {/* User Profile Popover */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(o => !o)}
              aria-label="User account menu"
              aria-expanded={profileOpen}
              className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-surface-hover transition-colors border border-transparent hover:border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <div className="w-7 h-7 rounded-md bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
              </div>
              <ChevronDown size={14} className="text-foreground-subtle hidden sm:block" />
            </button>

            <AnimatePresence>
              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50 text-xs"
                >
                  <div className="p-2 border-b border-border">
                    <p className="font-bold text-foreground truncate">{user?.full_name || 'Dr. Eleanor Vance'}</p>
                    <p className="text-[10px] text-muted truncate">{user?.username || 'e.vance@hospital.org'}</p>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      onClick={() => { setProfileOpen(false); setSettingsOpen(true) }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-hover font-medium transition-colors"
                    >
                      <User size={14} className="text-muted" /> Profile & Settings
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); setHelpOpen(true) }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-foreground hover:bg-hover font-medium transition-colors"
                    >
                      <HelpCircle size={14} className="text-muted" /> Help & Documentation
                    </button>
                  </div>

                  <div className="pt-1 border-t border-border">
                    <button
                      onClick={() => { setProfileOpen(false); logout(); navigate('/login') }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-danger hover:bg-danger/10 font-semibold transition-colors"
                    >
                      <LogOut size={14} /> Log Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Modals & Command Overlays */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <HelpCenterModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}
