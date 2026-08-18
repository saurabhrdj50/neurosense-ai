/**
 * @fileoverview Enterprise circular risk score indicator.
 * Uses SVG arc — no framer-motion, no Space Grotesk, no dark-only hardcoded colors.
 */
import React from 'react'

/**
 * SVG circular score ring.
 *
 * @param {number}  [value=0]      Score value (0–max).
 * @param {number}  [max=100]      Maximum score.
 * @param {string}  [color]        Stroke hex color (required for SVG fill).
 * @param {number}  [size=96]      Diameter in px.
 * @param {string}  [label='Score'] Center sub-label.
 * @param {number}  [thickness=7]  Arc stroke width.
 */
export default function CircularScore({
  value = 0, max = 100, color = '#2563EB',
  size = 96, label = 'Score', thickness = 7,
}) {
  const radius      = 42
  const circumference = 2 * Math.PI * radius
  const pct         = Math.min(1, Math.max(0, value / max))
  const offset      = circumference * (1 - pct)
  const gradId      = `cg-${color.replace('#', '')}`
  const fontSize    = Math.round(size * 0.22)
  const subFontSize = Math.round(size * 0.085)

  return (
    <div
      className="flex flex-col items-center shrink-0"
      style={{ width: size }}
      role="img"
      aria-label={`${label}: ${Math.round(value)} out of ${max}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={color} stopOpacity="0.7" />
              <stop offset="100%" stopColor={color} stopOpacity="1"   />
            </linearGradient>
          </defs>

          {/* Track */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="currentColor"
            className="text-slate-100 dark:text-slate-800"
            strokeWidth={thickness}
          />

          {/* Arc */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          <span
            className="font-bold text-slate-900 dark:text-slate-100 tabular-nums leading-none"
            style={{ fontSize }}
          >
            {Math.round(value)}
          </span>
          <span
            className="text-slate-500 dark:text-slate-400 mt-0.5 text-center leading-none"
            style={{ fontSize: subFontSize }}
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  )
}
