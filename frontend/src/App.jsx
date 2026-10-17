import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './providers/AuthProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import AnimatedBg from './shared/components/AnimatedBg'
import PwaUpdater from './shared/components/common/PwaUpdater'
import AppRoutes from './app/routes'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AnimatedBg />
          <div className="noise-overlay" />
          <AppRoutes />
          <PwaUpdater />
          <Toaster
            position="top-right"
            gutter={10}
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgb(var(--surface-card))',
                color: 'rgb(var(--text-primary))',
                border: '1px solid rgb(var(--border))',
                borderRadius: '16px',
                fontSize: '13px',
                fontFamily: 'Inter, sans-serif',
                backdropFilter: 'blur(20px)',
                boxShadow: 'var(--shadow-lg)',
                padding: '12px 16px',
              },
              /* Accent colors follow the clinical risk tokens in index.css so
                 toasts stay in-palette in both light and dark themes. */
              success: {
                iconTheme: { primary: 'rgb(var(--success))', secondary: 'rgb(var(--surface-card))' },
                style: { borderLeft: '3px solid rgb(var(--success))' },
              },
              error: {
                duration: 6000,
                iconTheme: { primary: 'rgb(var(--danger))', secondary: 'rgb(var(--surface-card))' },
                style: { borderLeft: '3px solid rgb(var(--danger))' },
              },
              loading: {
                iconTheme: { primary: 'rgb(var(--primary))', secondary: 'rgb(var(--surface-card))' },
                style: { borderLeft: '3px solid rgb(var(--primary))' },
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
