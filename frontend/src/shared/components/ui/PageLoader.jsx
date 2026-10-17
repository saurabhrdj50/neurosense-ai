/**
 * @fileoverview Full-screen page loader for initial auth verification and route chunks.
 * Enterprise clinical loading state — no neon gradients or rotating rings.
 */
import React from 'react'
import { Activity } from 'lucide-react'

/**
 * Full-screen loading overlay (used as Suspense fallback and auth-wait state).
 * Uses neutral slate colors aligned with the enterprise design system.
 */
export default function PageLoader() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999]"
      role="status"
      aria-label="Loading NeuroSense AI"
    >
      {/* Logo mark */}
      <div className="mb-6 w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/30">
        <Activity size={28} color="white" strokeWidth={2} aria-hidden="true" />
      </div>

      {/* Brand name */}
      <h2 className="text-lg font-bold text-foreground tracking-tight mb-1">
        NeuroSense AI
      </h2>
      <p className="text-xs text-muted">Initializing clinical modules…</p>

      {/* Progress bar */}
      <div className="mt-8 w-44 h-0.5 rounded-full overflow-hidden bg-surface-secondary">
        <div className="h-full w-1/3 rounded-full bg-primary animate-[loading-bar_1.2s_ease-in-out_infinite]" />
      </div>

      {/* Dot indicators */}
      <div className="flex gap-1.5 mt-4" aria-hidden="true">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-border-strong"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  )
}
