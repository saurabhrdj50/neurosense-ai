import React from 'react'
import { motion } from 'framer-motion'

/**
 * Animated progress bar with gradient fill, glow, and spring animation.
 */
export default function ProgressBar({
  value = 0, color = '#6366f1', label, showPercent = true,
  height = 6, glow = true, delay = 0,
}) {
  const v = Math.min(100, Math.max(0, value))

  return (
    <div>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{label}</span>}
          {showPercent && (
            <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'Space Grotesk', letterSpacing: '-0.02em' }}>
              {v.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div
        className="rounded-full overflow-hidden"
        style={{ height, background: 'rgba(255,255,255,0.04)' }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1], delay }}
          className="h-full rounded-full relative overflow-hidden"
          style={{
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            ...(glow ? { boxShadow: `0 0 12px ${color}60` } : {}),
          }}
        >
          {/* Animated shine */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              backgroundSize: '200% 100%',
            }}
            animate={{ backgroundPosition: ['-200% 0', '200% 0'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: delay + 1 }}
          />
        </motion.div>
      </div>
    </div>
  )
}
