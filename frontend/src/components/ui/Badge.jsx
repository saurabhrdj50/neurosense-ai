/**
 * @fileoverview Canonical clinical risk and status badge.
 * Variants map directly to semantic clinical and operational states.
 */
import React from 'react'

const VARIANT_CLASSES = {
  success:  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  warning:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
  danger:   'bg-danger/10 text-danger border-danger/25',
  info:     'bg-primary/10 text-primary border-primary/25',
  neutral:  'bg-surface-secondary text-muted border-border',
  purple:   'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25',

  /* Clinical Stage & Risk Mapping Aliases */
  low:      'bg-risk-low-bg text-risk-low border-risk-low-border',
  moderate: 'bg-risk-moderate-bg text-risk-moderate border-risk-moderate-border',
  high:     'bg-risk-high-bg text-risk-high border-risk-high-border',
  critical: 'bg-risk-critical-bg text-risk-critical border-risk-critical-border',
}

/**
 * Clinical status badge with semantic color variants.
 *
 * @param {'success'|'warning'|'danger'|'info'|'neutral'|'purple'|'low'|'moderate'|'high'|'critical'} [props.variant='neutral']
 * @param {React.ReactNode}   [props.icon]       Optional Lucide icon component.
 * @param {string}            [props.className]  Extra classes.
 * @param {React.ReactNode}   props.children     Badge text.
 */
export default function Badge({ variant = 'neutral', icon: Icon, className = '', children }) {
  const base = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border leading-tight shrink-0 tracking-tight transition-colors'
  const vrClass = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.neutral

  return (
    <span className={`${base} ${vrClass} ${className}`}>
      {Icon && <Icon size={14} className="shrink-0 opacity-90" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  )
}
