/**
 * @fileoverview Clinical dialog modal with ARIA support and focus management.
 */
import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Clinical dialog modal.
 * Closes on Escape or backdrop click. Focus is trapped to modal content.
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
      setTimeout(() => first?.focus(), 50)
    }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 dark:bg-slate-950/70 z-50"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col"
        style={{ width: `min(${maxWidth}px, 92vw)` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          {title && (
            <h3 id="modal-title" className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-auto"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </>
  )
}
