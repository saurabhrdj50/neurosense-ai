import React from 'react'
import { motion } from 'framer-motion'

/**
 * Animated Bg — Four floating gradient orbs + grid pattern overlay.
 * Renders once at root level, z-index 0, behind everything.
 */
export default function AnimatedBg() {
  return (
    <div className="animated-bg" aria-hidden="true">
      <motion.div
        className="orb orb-1"
        animate={{ x: [0, 50, -30, 0], y: [0, -40, 30, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="orb orb-2"
        animate={{ x: [0, -60, 40, 0], y: [0, 30, -50, 0], scale: [1, 0.9, 1.15, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div
        className="orb orb-3"
        animate={{ x: [0, 70, -40, 0], y: [0, -60, 40, 0], scale: [1, 1.2, 0.9, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
      />
      <motion.div
        className="orb orb-4"
        animate={{ x: [0, -40, 60, 0], y: [0, 50, -30, 0], scale: [1, 1.1, 0.85, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 9 }}
      />
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 grid-pattern" />
    </div>
  )
}
