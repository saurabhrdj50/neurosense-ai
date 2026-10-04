import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './providers/AuthProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import AnimatedBg from './shared/components/AnimatedBg'
import AppRoutes from './app/routes'

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
