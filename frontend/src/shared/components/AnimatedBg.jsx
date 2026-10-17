import React from 'react'
import { motion } from 'framer-motion'
import { useReducedMotionPref } from '../../shared/motion'

/**
 * Purely decorative animated background rendered at root level (z-index 0).
 *
 * Renders four floating gradient orbs with independent Framer Motion paths
 * and a subtle CSS grid-pattern overlay. The entire element is
 * `aria-hidden="true"` so screen readers ignore it. The orb motion collapses
 * to static gradients when the user prefers reduced motion (the grid and
 * palette remain so the background still has depth).
 *
 * @returns {JSX.Element}
 */
export default function AnimatedBg() {
  const reduced = useReducedMotionPref()

  const orbTransition = (duration, delay = 0) => (
    reduced
      ? { duration: 0 }
      : { duration, repeat: Infinity, ease: 'easeInOut', delay }
  )

  return (
    <div className="animated-bg" aria-hidden="true">
      <motion.div
        className="orb orb-1"
        animate={{ x: [0, 50, -30, 0], y: [0, -40, 30, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={orbTransition(16)}
      />
      <motion.div
        className="orb orb-2"
        animate={{ x: [0, -60, 40, 0], y: [0, 30, -50, 0], scale: [1, 0.9, 1.15, 1] }}
        transition={orbTransition(20, 3)}
      />
      <motion.div
        className="orb orb-3"
        animate={{ x: [0, 70, -40, 0], y: [0, -60, 40, 0], scale: [1, 1.2, 0.9, 1] }}
        transition={orbTransition(18, 6)}
      />
      <motion.div
        className="orb orb-4"
        animate={{ x: [0, -40, 60, 0], y: [0, 50, -30, 0], scale: [1, 1.1, 0.85, 1] }}
        transition={orbTransition(22, 9)}
      />
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 grid-pattern" />
    </div>
  )
}
