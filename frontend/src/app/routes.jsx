import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../providers/AuthProvider'
import AppLayout from './AppLayout'
import PageLoader from '../shared/components/ui/PageLoader'
import ErrorBoundary from '../shared/components/common/ErrorBoundary'

const LandingPage     = lazy(() => import('../features/landing/LandingPage'))
const LoginPage       = lazy(() => import('../features/auth/LoginPage'))
const DashboardPage   = lazy(() => import('../features/dashboard/DashboardPage'))
const AnalysisPage    = lazy(() => import('../features/analysis/AnalysisPage'))
const PatientsPage    = lazy(() => import('../features/patients/pages/PatientsPage'))
const HistoryPage     = lazy(() => import('../features/history/HistoryPage'))
const ResultsPage     = lazy(() => import('../features/results/ResultsPage'))
const AdminDashboard  = lazy(() => import('../features/admin/pages/AdminDashboard'))
const AdminPanel      = lazy(() => import('../features/admin/pages/AdminPanel'))

function PageTransition({ children }) {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="h-full w-full flex flex-col flex-1"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * Route-level crash recovery: keeps the app shell usable when any routed
 * analysis step throws instead of showing a white screen. Keyed by pathname
 * so navigating to another route automatically resets the boundary.
 */
function RouteErrorBoundary({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <ErrorBoundary
      key={location.pathname}
      title="This Page Encountered an Error"
      onReset={() => navigate('/dashboard')}
    >
      {children}
    </ErrorBoundary>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <RouteErrorBoundary>
                <AppLayout />
              </RouteErrorBoundary>
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<PageTransition><AdminDashboard /></PageTransition>} />
          <Route path="panel" element={<PageTransition><AdminPanel /></PageTransition>} />
        </Route>
        <Route
          element={
            <ProtectedRoute>
              <RouteErrorBoundary>
                <AppLayout />
              </RouteErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<PageTransition><DashboardPage /></PageTransition>} />
          <Route path="/analysis"  element={<PageTransition><AnalysisPage /></PageTransition>} />
          <Route path="/patients"  element={<PageTransition><PatientsPage /></PageTransition>} />
          <Route path="/history/:patientId" element={<PageTransition><HistoryPage /></PageTransition>} />
          <Route path="/results"   element={<PageTransition><ResultsPage /></PageTransition>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
