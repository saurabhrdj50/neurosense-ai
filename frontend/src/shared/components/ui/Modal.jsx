/**
 * @fileoverview Clinical dialog modal with ARIA support, focus management,
 * theme tokens, and spring entrance/exit animation.
 */
import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Clinical dialog modal.
 * Closes on Escape or backdrop click. Focus is trapped to modal content.
 * Rendered through a portal so parent stacking contexts cannot clip it.
 *
 * @param {boolean}         props.open
 * @param {function}        props.onClose
 * @param {string}          [props.title]
 * @param {React.ReactNode} props.children
 * @param {number}          [props.maxWidth=560]
 */
export default function Modal({ open, onClose, title, children, maxWidth = 560 }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return
      if (e.key === 'Escape') onClose?.()
      // Basic focus trap
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last?.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first?.focus() }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Auto-focus first element when opening
  useEffect(() => {
    if (open && panelRef.current) {
      const first = panelRef.current.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      const t = setTimeout(() => first?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[90]"
            aria-hidden="true"
            onClick={onClose}
          />

          {/* Centering wrapper — panel animates inside without fighting translate */}
          <div className="fixed inset-0 z-[91] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'modal-title' : undefined}
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              className="pointer-events-auto max-h-[90vh] bg-card border border-border rounded-2xl shadow-lg overflow-hidden flex flex-col"
              style={{ width: `min(${maxWidth}px, 92vw)` }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface-secondary/60">
                {title && (
                  <h3 id="modal-title" className="text-sm font-bold text-foreground tracking-tight">
                    {title}
                  </h3>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className={`p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors ${title ? '' : 'ml-auto'}`}
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
