/**
 * @fileoverview Clinical progress bar. No glow, no shine — enterprise-grade.
 */
import React from 'react'

/**
 * Enterprise progress bar with semantic fill and optional label.
 *
 * @param {number}  [value=0]        Progress 0–100.
 * @param {string}  [color]          Tailwind CSS custom color (hex for fill only — Recharts compat).
 * @param {string}  [colorClass]     Tailwind bg-* class string (preferred over color).
 * @param {string}  [label]          Optional left label.
 * @param {boolean} [showPercent=true] Show percent value on the right.
 * @param {number}  [height=6]       Track height in px.
 */
export default function ProgressBar({
  value = 0,
  color,
  colorClass,
  label,
  showPercent = true,
  height = 6,
}) {
  const v = Math.min(100, Math.max(0, value))

  // Prefer Tailwind colorClass, fall back to inline style hex for chart colors
  const fillStyle = colorClass ? {} : { backgroundColor: color || '#2563EB' }
  const fillClass = colorClass ?? ''

  return (
    <div>
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</span>
          )}
          {showPercent && (
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums">
              {v.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      <div
        className="rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
        style={{ height }}
        role="progressbar"
        aria-valuenow={Math.round(v)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `${Math.round(v)}%`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${fillClass}`}
          style={{ width: `${v}%`, ...fillStyle }}
        />
      </div>
    </div>
  )
}
