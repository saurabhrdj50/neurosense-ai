import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './features/auth'
import AnimatedBg from './components/AnimatedBg'
import AppLayout from './components/layout/AppLayout'
import PageLoader from './components/ui/PageLoader'

const LoginPage     = lazy(() => import('./features/auth/LoginPage'))
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'))
const AnalysisPage = lazy(() => import('./features/analysis/AnalysisPage'))
const PatientsPage = lazy(() => import('./features/patients/PatientsPage'))
const HistoryPage  = lazy(() => import('./features/history/HistoryPage'))
const ResultsPage  = lazy(() => import('./features/results/ResultsPage'))

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
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<PageTransition><DashboardPage /></PageTransition>} />
          <Route path="analysis"  element={<PageTransition><AnalysisPage /></PageTransition>} />
          <Route path="patients"  element={<PageTransition><PatientsPage /></PageTransition>} />
          <Route path="history/:patientId" element={<PageTransition><HistoryPage /></PageTransition>} />
          <Route path="results"   element={<PageTransition><ResultsPage /></PageTransition>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnimatedBg />
        <div className="noise-overlay" />
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'rgba(30,41,59,0.95)',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              fontSize: '13px',
              fontFamily: 'Inter, sans-serif',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#0a0e1a' },
              style: { borderLeft: '3px solid #22c55e' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0a0e1a' },
              style: { borderLeft: '3px solid #ef4444' },
            },
            loading: {
              style: { borderLeft: '3px solid #6366f1' },
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
