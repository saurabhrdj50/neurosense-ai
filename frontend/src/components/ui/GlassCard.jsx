import React from 'react'
import { motion } from 'framer-motion'

/**
 * GlassCard — Solid card container with hover lift, optional glow, and gradient border.
 */
export default function GlassCard({
  className = '', style = {}, hover = true, glow = false,
  onClick, children, gradient = false, padding = true,
}) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? {
        y: -2,
        scale: 1.002,
        boxShadow: glow
          ? '0 0 30px rgba(99,102,241,0.2), 0 20px 50px rgba(0,0,0,0.4)'
          : '0 8px 30px rgba(0,0,0,0.3)',
      } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`rounded-2xl overflow-hidden ${padding ? 'p-5' : ''} ${className}`}
      style={{
        background: gradient
          ? 'linear-gradient(135deg, #1E293B, #111827)'
          : '#111827',
        border: '1px solid #374151',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}
