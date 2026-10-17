/**
 * @fileoverview Shared framer-motion vocabulary for the app.
 *
 * Design rules: 150–250ms, easeOut curves, subtle 8–16px distances. No bouncy
 * springs on clinical data screens. Every export honors the user's motion
 * preference (`neurosense_motion` in localStorage, or the OS
 * `prefers-reduced-motion` setting) by returning no-op variants / static
 * numbers when motion is reduced.
 */
import { useEffect, useState, useRef } from 'react'
import { animate, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

const MOTION_STORAGE_KEY = 'neurosense_motion'
const MOTION_CHANGE_EVENT = 'neurosense:motion-change'

/** Reads the effective motion preference without React (also used at module scope). */
export function isReducedMotionPreferred() {
  try {
    if (localStorage.getItem(MOTION_STORAGE_KEY) === 'reduced') return true
  } catch {
    // Storage unavailable — fall through to the media query
  }
  try {
    return typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * Reactive flag for the reduced-motion preference. Re-renders when the user
 * flips the in-app setting (ThemeProvider dispatches `neurosense:motion-change`)
 * or changes the OS preference while the app is open.
 */
export function useReducedMotionPref() {
  const [reduced, setReduced] = useState(isReducedMotionPreferred)

  useEffect(() => {
    const update = () => setReduced(isReducedMotionPreferred())
    window.addEventListener('storage', update)
    window.addEventListener(MOTION_CHANGE_EVENT, update)
    try {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)')
      media.addEventListener('change', update)
      return () => {
        window.removeEventListener('storage', update)
        window.removeEventListener(MOTION_CHANGE_EVENT, update)
        media.removeEventListener('change', update)
      }
    } catch {
      return () => {
        window.removeEventListener('storage', update)
        window.removeEventListener(MOTION_CHANGE_EVENT, update)
      }
    }
  }, [])

  return reduced
}

/* ─── Page transition (route swaps) ──────────────────────────────────────── */
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeOut' } },
}

const REDUCED_PAGE_TRANSITION = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1, transition: { duration: 0 } },
}

/** Page-transition variants that collapse to a no-op when motion is reduced. */
export function usePageTransition() {
  const reduced = useReducedMotionPref()
  return reduced ? REDUCED_PAGE_TRANSITION : pageTransition
}

/* ─── Stagger (lists, KPI grids) ─────────────────────────────────────────── */
const STAGGER_CONTAINER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

const REDUCED_STAGGER = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
}

/**
 * Returns `{ container, item }` variants for a staggered list entrance.
 * Collapses to instant rendering when motion is reduced.
 */
export function useStagger() {
  const reduced = useReducedMotionPref()
  return reduced
    ? { container: REDUCED_STAGGER, item: REDUCED_STAGGER }
    : { container: STAGGER_CONTAINER, item: STAGGER_ITEM }
}

/* ─── Count-up numbers ───────────────────────────────────────────────────── */
const COUNT_UP_DEFAULTS = { duration: 0.8, decimals: 0 }

/**
 * Animated numeric readout built entirely on framer-motion motion values —
 * no React state, so nothing re-renders per frame. Falls back to the plain
 * target number when motion is reduced.
 *
 * @param {object} props
 * @param {number} props.value
 * @param {number} [props.duration]
 * @param {number} [props.decimals]
 * @param {string} [props.suffix]
 * @param {string} [props.className]
 */
export function CountUp({ value, duration = 0.8, decimals = 0, suffix = '', className = '' }) {
  const reduced = useReducedMotionPref()
  const target = Number.isFinite(Number(value)) ? Number(value) : 0
  const factor = 10 ** decimals

  const mv = useMotionValue(target)
  const display = useTransform(mv, (latest) =>
    (Math.round(latest * factor) / factor).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  )

  useEffect(() => {
    if (reduced) {
      mv.set(target)
      return undefined
    }
    const controls = animate(mv, target, { duration, ease: 'easeOut' })
    return () => controls.stop()
  }, [target, reduced, duration, mv])

  if (reduced) {
    return (
      <span className={className}>
        {target.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        {suffix}
      </span>
    )
  }

  return (
    <span className={className}>
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  )
}

/**
 * Pre-bound motion.div that animates as a staggered list item (or renders
 * statically when motion is reduced). Keeps list consumers one-liner simple.
 */
export function StaggerItem({ children, className = '', as = 'div', ...props }) {
  const { item } = useStagger()
  const Component = motion[as] || motion.div
  return (
    <Component variants={item} className={className} {...props}>
      {children}
    </Component>
  )
}

/**
 * Staggered entrance containers/cells for card grids and lists. Each child
 * <StaggerCell> fades/slides in with a 40ms stagger; children render
 * statically when motion is reduced.
 */
export function StaggerGrid({ children, className = '', as = 'div', ...props }) {
  const { container } = useStagger()
  const Component = motion[as] || motion.div
  return (
    <Component variants={container} initial="hidden" animate="visible" className={className} {...props}>
      {children}
    </Component>
  )
}

export function StaggerCell({ children, className = '', as = 'div', ...props }) {
  const { item } = useStagger()
  const Component = motion[as] || motion.div
  return (
    <Component variants={item} className={className} {...props}>
      {children}
    </Component>
  )
}

/* ─── Magnetic hover (primary CTAs) ──────────────────────────────────────── */
/**
 * Wraps a CTA so it drifts a few pixels toward the cursor, springing back on
 * leave. Subtle by design (≤ strength × half-size ≈ 6-8px). Renders children
 * statically when motion is reduced.
 */
export function Magnetic({ children, strength = 0.22, className = '' }) {
  const reduced = useReducedMotionPref()
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 260, damping: 20 })
  const springY = useSpring(y, { stiffness: 260, damping: 20 })

  if (reduced) {
    return <div className={className}>{children}</div>
  }

  const handleMove = (e) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength)
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength)
  }
  const handleLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ x: springX, y: springY, display: 'inline-flex' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
