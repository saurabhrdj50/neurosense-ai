import React from 'react'
import { motion } from 'framer-motion'

/**
 * GlassCard — Glassmorphism container with hover lift, optional glow, and gradient border.
 */
export default function GlassCard({
  className = '', style = {}, hover = true, glow = false,
  onClick, children, gradient = false, padding = true,
}) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={hover ? {
        y: -3,
        scale: 1.003,
        boxShadow: glow
          ? '0 0 30px rgba(99,102,241,0.15), 0 20px 40px rgba(0,0,0,0.3)'
          : '0 20px 40px rgba(0,0,0,0.2)',
      } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`rounded-2xl overflow-hidden ${padding ? 'p-5' : ''} ${className}`}
      style={{
        background: gradient
          ? 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.04), rgba(6,182,212,0.03))'
          : 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.06)',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </motion.div>
  )
}
