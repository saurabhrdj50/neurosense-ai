/**
 * @fileoverview First-run onboarding tour: a 3-step spotlight coach-mark that
 * walks new clinicians past the sidebar, the command palette, and the
 * assessment entry point. Anchored to elements carrying `data-tour`
 * attributes; the dismissal flag lives in localStorage
 * (`neurosense_onboarding_done`) and is owned by the caller.
 *
 * Rendered through a portal on <body> because the app shell animates
 * `filter`/`transform` on ancestors, which would otherwise turn `fixed`
 * positioning into a containing block and misplace the spotlight.
 */
import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import Button from './ui/Button'
import { useReducedMotionPref } from '../motion'

const TOUR_STEPS = [
  {
    selector: '[data-tour="sidebar-nav"]',
    placement: 'right',
    title: 'Your navigation hub',
    body: 'Jump between the Dashboard, the Patient List, and new assessments from here. The sidebar collapses when you need more room.',
  },
  {
    selector: '[data-tour="command-palette"]',
    placement: 'bottom',
    title: 'Everything is searchable',
    body: 'Press Ctrl+K (⌘K on Mac) any time to find a patient or jump to any page without clicking around.',
  },
  {
    selector: '[data-tour="new-assessment"]',
    placement: 'bottom',
    title: 'Start your first assessment',
    body: 'The assessment wizard walks through patient details, MRI, cognition, speech, and risk factors. Drafts auto-save, so you can safely step away.',
  },
]

const CARD_WIDTH = 320
const VIEWPORT_MARGIN = 16

function isElementVisible(el) {
  if (!el) return false
  const rect = el.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

export default function OnboardingTour({ open, onClose }) {
  const reduced = useReducedMotionPref()
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const [cardPos, setCardPos] = useState(null)

  const step = TOUR_STEPS[stepIndex]

  // Reset to the first step when the tour (re)opens. Adjusting state during
  // render (documented React pattern) instead of a setState-in-effect.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setStepIndex(0)
  }

  const measure = useCallback(() => {
    if (!open) return
    const el = document.querySelector(step?.selector)
    if (!isElementVisible(el)) {
      // Anchor missing (e.g. collapsed layout) — finish gracefully.
      setTargetRect(null)
      setCardPos(null)
      return
    }
    const rect = el.getBoundingClientRect()
    setTargetRect(rect)

    // Prefer below the anchor, flip above when the card would overflow, and
    // center for very tall anchors (e.g. the full-height sidebar) where
    // neither above nor below placement can fit.
    const cardHeightEstimate = 230
    const viewportH = window.innerHeight
    let top
    if (rect.height > viewportH * 0.55) {
      top = (viewportH - cardHeightEstimate) / 2 - 30
    } else if (viewportH - rect.bottom > cardHeightEstimate + 16 || rect.top < cardHeightEstimate) {
      top = rect.bottom + 12
    } else {
      top = rect.top - cardHeightEstimate - 12
    }
    top = Math.min(top, viewportH - cardHeightEstimate - VIEWPORT_MARGIN)
    top = Math.max(VIEWPORT_MARGIN, top)
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, rect.left),
      window.innerWidth - CARD_WIDTH - VIEWPORT_MARGIN
    )
    setCardPos({ top, left, placeBelow: top >= rect.bottom })
  }, [open, step?.selector])

  useLayoutEffect(() => {
    if (!open) return undefined
    // Schedule rather than measure synchronously: the shell's entrance
    // animation is still settling on the first frames.
    const raf = requestAnimationFrame(measure)
    // Measure again once entrance animations have fully settled.
    const t = setTimeout(measure, 450)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, stepIndex, measure])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (stepIndex < TOUR_STEPS.length - 1) setStepIndex((i) => i + 1)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, stepIndex, onClose])

  if (!open || !step) return null

  const spotlight = targetRect
    ? {
        top: targetRect.top - 6,
        left: targetRect.left - 6,
        width: targetRect.width + 12,
        height: targetRect.height + 12,
      }
    : null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Guided tour, step ${stepIndex + 1} of ${TOUR_STEPS.length}: ${step.title}`}
      className="fixed inset-0 z-[80]"
    >
      {/* Dimmer with a punched hole over the anchor (box-shadow spread trick) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.2 }}
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
        style={{ background: 'rgba(2, 6, 23, 0.55)' }}
        aria-hidden="true"
      />
      {spotlight && (
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
          className="absolute rounded-2xl pointer-events-none"
          style={{
            ...spotlight,
            boxShadow: '0 0 0 4px rgba(255,255,255,0.35), 0 0 0 9999px rgba(2, 6, 23, 0)',
            outline: '2px solid rgb(var(--primary))',
            outlineOffset: '2px',
          }}
          aria-hidden="true"
        />
      )}

      {/* Coach-mark card */}
      <motion.div
        key={stepIndex}
        initial={reduced ? false : { opacity: 0, y: cardPos?.placeBelow ? -8 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.22, ease: 'easeOut' }}
        className="fixed rounded-2xl border border-border bg-surface-card text-foreground shadow-lg p-5"
        style={{
          top: cardPos?.top ?? 'auto',
          left: cardPos?.left ?? VIEWPORT_MARGIN,
          width: CARD_WIDTH,
          maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === stepIndex ? 'w-5 bg-primary' : 'w-1.5 bg-border-strong'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Skip tour"
            className="p-1 rounded-md text-foreground-subtle hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <h3 className="text-base font-extrabold tracking-tight mt-3">{step.title}</h3>
        <p className="text-xs text-foreground-muted font-medium leading-relaxed mt-1.5">
          {step.body}
        </p>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <span className="text-[11px] font-mono font-bold text-foreground-subtle">
            {stepIndex + 1} / {TOUR_STEPS.length}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Skip tour
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => (stepIndex < TOUR_STEPS.length - 1 ? setStepIndex((i) => i + 1) : onClose())}
            >
              {stepIndex < TOUR_STEPS.length - 1 ? 'Next' : 'Got it'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}
