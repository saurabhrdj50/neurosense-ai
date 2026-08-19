import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from './features/auth'
import { ThemeProvider } from './context/ThemeProvider'
import AnimatedBg from './components/AnimatedBg'
import AppLayout from './components/layout/AppLayout'
import PageLoader from './components/ui/PageLoader'

const LandingPage     = lazy(() => import('./features/landing/LandingPage'))
const LoginPage       = lazy(() => import('./features/auth/LoginPage'))
const DashboardPage   = lazy(() => import('./features/dashboard/DashboardPage'))
const AnalysisPage    = lazy(() => import('./features/analysis/AnalysisPage'))
const PatientsPage    = lazy(() => import('./features/patients/PatientsPage'))
const ComparePatients = lazy(() => import('./features/patients/ComparePatients'))
const HistoryPage     = lazy(() => import('./features/history/HistoryPage'))
const ResultsPage     = lazy(() => import('./features/results/ResultsPage'))
const AdminDashboard  = lazy(() => import('./features/admin/AdminDashboard'))
const AdminPanel      = lazy(() => import('./features/admin/AdminPanel'))

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

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AppLayout />
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
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<PageTransition><DashboardPage /></PageTransition>} />
          <Route path="/analysis"  element={<PageTransition><AnalysisPage /></PageTransition>} />
          <Route path="/patients"  element={<PageTransition><PatientsPage /></PageTransition>} />
          <Route path="/compare"   element={<PageTransition><ComparePatients /></PageTransition>} />
          <Route path="/history/:patientId" element={<PageTransition><HistoryPage /></PageTransition>} />
          <Route path="/results"   element={<Navigate to="/patients" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AnimatedBg />
          <div className="noise-overlay" />
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--surface-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                backdropFilter: 'blur(20px)',
                boxShadow: 'var(--shadow)',
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
                style: { borderLeft: '3px solid #5b5ceb' },
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
