import React from 'react'
import { motion } from 'framer-motion'

/**
 * Animated SVG circular health/risk score indicator with gradient track.
 */
export default function CircularScore({
  value = 0, max = 100, color = '#6366f1', size = 130,
  label = 'Score', thickness = 8,
}) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(1, Math.max(0, value / max))
  const offset = circumference * (1 - pct)
  const gradId = `circ-grad-${color.replace('#', '')}`

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
          </defs>
          {/* Background track */}
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={thickness} />
          {/* Animated progress arc */}
          <motion.circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.6, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
            style={{ filter: `drop-shadow(0 0 8px ${color}60)` }}
          />
        </svg>

        {/* Center content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ transform: 'none' }}
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5, type: 'spring' }}
            style={{
              fontSize: size * 0.22,
              fontWeight: 800,
              color: '#f1f5f9',
              fontFamily: 'Space Grotesk',
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}
          >
            {Math.round(value)}
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            style={{ fontSize: size * 0.085, color: '#475569', marginTop: 3, fontWeight: 500 }}
          >
            {label}
          </motion.span>
        </div>
      </div>
    </div>
  )
}
