import React from 'react'

/**
 * Calm, glare-free clinical workstation canvas rendered at root level (z-index 0).
 * Keeps the background quiet and distraction-free in both light and dark themes.
 *
 * @returns {JSX.Element}
 */
export default function AnimatedBg() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
      <div className="absolute inset-0 grid-pattern opacity-60" />
    </div>
  )
}
