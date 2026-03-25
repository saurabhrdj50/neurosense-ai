import React from 'react'
import { motion } from 'framer-motion'

/**
 * Premium animated button with multiple variants & ripple feel.
 * Variants: primary | secondary | ghost | danger | success
 */
const VARIANTS = {
  primary: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
  },
  secondary: {
    background: 'rgba(6,182,212,0.1)',
    color: '#22d3ee',
    border: '1px solid rgba(6,182,212,0.25)',
    boxShadow: 'none',
  },
  ghost: {
    background: 'rgba(255,255,255,0.03)',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: 'none',
  },
  danger: {
    background: 'rgba(239,68,68,0.1)',
    color: '#f87171',
    border: '1px solid rgba(239,68,68,0.25)',
    boxShadow: 'none',
  },
  success: {
    background: 'rgba(34,197,94,0.1)',
    color: '#4ade80',
    border: '1px solid rgba(34,197,94,0.25)',
    boxShadow: 'none',
  },
}

export default function Button({
  children, variant = 'primary', size = 'md', className = '',
  loading = false, icon: Icon, type = 'button', disabled, ...props
}) {
  const varStyle = VARIANTS[variant] || VARIANTS.primary
  const pd = size === 'sm' ? '7px 14px' : size === 'lg' ? '13px 28px' : '10px 22px'
  const fs = size === 'sm' ? 12.5 : size === 'lg' ? 15 : 13.5

  return (
    <motion.button
      type={type}
      whileHover={!disabled && !loading ? { scale: 1.04, y: -1 } : undefined}
      whileTap={!disabled && !loading ? { scale: 0.96 } : undefined}
      disabled={disabled || loading}
      className={`relative flex items-center justify-center gap-2 rounded-xl font-semibold overflow-hidden ${className}`}
      style={{
        ...varStyle,
        padding: pd,
        fontSize: fs,
        opacity: disabled || loading ? 0.5 : 1,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '-0.01em',
        transition: 'box-shadow 0.3s',
      }}
      {...props}
    >
      {/* Subtle shimmer overlay on primary */}
      {variant === 'primary' && !loading && !disabled && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
            backgroundSize: '200% 100%',
          }}
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
        />
      )}

      {loading ? (
        <div className="flex items-center gap-2">
          <motion.div
            className="w-4 h-4 rounded-full"
            style={{
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
          />
          <span>Processing…</span>
        </div>
      ) : (
        <>
          {Icon && <Icon size={fs} />}
          {children}
        </>
      )}
    </motion.button>
  )
}
