import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import Sidebar from '../shared/components/layout/Sidebar'
import TopBar from '../shared/components/layout/TopBar'
import OnboardingTour from '../shared/components/OnboardingTour'
import { useAuth } from '../providers/AuthProvider'
import { useDataSync } from '../shared/utils/dataSync'

const ONBOARDING_KEY = 'neurosense_onboarding_done'

const ROUTE_TITLES = {
  '/dashboard': 'Dashboard',
  '/patients': 'Patient List',
  '/analysis': 'New Assessment',
  '/results': 'Diagnostic Report',
  '/admin/dashboard': 'Admin Dashboard',
  '/admin/panel': 'Admin Panel',
  '/login': 'Sign In',
}

function ROUTE_TITLE_DEFAULTS() {
  if (window.location.pathname.startsWith('/history')) return 'Patient History'
  return 'Clinical Workspace'
}

/**
 * AppLayout — Main dashboard shell wrapping all protected pages.
 *
 * Provides a responsive clinical shell with sticky desktop {@link Sidebar},
 * glassmorphic {@link TopBar}, slide-in mobile navigation drawer, and an
 * accessible Floating Action Button (FAB) for starting new analysis workflows.
 *
 * @returns {JSX.Element}
 */
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  // Delete/analysis propagation: invalidates all caches when clinical data
  // changes in any session (doctor, admin, or another tab).
  useDataSync()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAdmin } = useAuth()

  // Close mobile drawer on route change (intentional state reset)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileDrawerOpen(false)
  }, [location.pathname])

  // Scroll to top + document title on route change
  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = `${ROUTE_TITLES[location.pathname] || ROUTE_TITLE_DEFAULTS()} · NeuroSense AI`
  }, [location.pathname])

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // First-run guided tour: only for clinicians, only on the dashboard,
  // only on wide viewports (the sidebar anchor is hidden below lg).
  const [tourOpen, setTourOpen] = useState(false)
  useEffect(() => {
    if (isAdmin || location.pathname !== '/dashboard') return undefined
    try {
      if (localStorage.getItem(ONBOARDING_KEY)) return undefined
    } catch {
      return undefined
    }
    if (window.innerWidth < 1024) return undefined
    const t = setTimeout(() => setTourOpen(true), 1500)
    return () => clearTimeout(t)
  }, [isAdmin, location.pathname])

  const closeTour = () => {
    setTourOpen(false)
    try {
      localStorage.setItem(ONBOARDING_KEY, '1')
    } catch {
      // Storage unavailable — tour simply re-offers next session
    }
  }

  // Full-screen workspace mode for assessment workflow
  const isAssessmentPage = location.pathname === '/analysis'

  if (isAssessmentPage) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-background text-foreground relative z-1 flex flex-col">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground relative z-1">
      {/* ── Desktop Sidebar (lg+) ──────────────────────────────────────── */}
      <div className="hidden lg:block h-full">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
      </div>

      {/* ── Mobile Navigation Drawer & Sheet (lg:hidden) ────────────────── */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <>
            {/* Backdrop Blur Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
              onClick={() => setMobileDrawerOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-In Navigation Sheet */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden flex"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation Menu"
            >
              <div className="relative h-full flex">
                <Sidebar open={true} isMobile={true} />
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="absolute top-4 right-3 p-1.5 rounded-lg bg-surface-secondary text-muted hover:text-foreground border border-border"
                  aria-label="Close menu"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content Workstation Area ─────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar onMenuClick={() => setMobileDrawerOpen(o => !o)} />
        <main
          className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-[1600px] w-full mx-auto"
          style={{ scrollbarGutter: 'stable' }}
        >
          <Outlet />
        </main>
      </div>

      {/* ── Accessible Floating Action Button (Mobile — Clinicians only) ── */}
      {!isAdmin && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Start new analysis intake"
          onClick={() => navigate('/analysis')}
          className="fixed bottom-5 right-5 z-30 lg:hidden w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 border border-primary/20 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Plus size={22} strokeWidth={2.5} />
        </motion.button>
      )}

      {/* ── First-run guided tour ─────────────────────────────────────────── */}
      {!isAdmin && <OnboardingTour open={tourOpen} onClose={closeTour} />}
    </div>
  )
}
