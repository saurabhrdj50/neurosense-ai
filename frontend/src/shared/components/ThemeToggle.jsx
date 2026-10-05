/**
 * @fileoverview Animated light/dark theme toggle — sun/moon icon crossfade
 * driven by framer-motion, honoring the reduced-motion preference.
 */
import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../providers/ThemeProvider'
import { useReducedMotionPref } from '../../shared/motion'

/**
 * Pill toggle that crossfades between the sun (current: dark, click for
 * light) and moon (current: light, click for dark) icons.
 *
 * @param {object}   props
 * @param {string}   [props.className]  Extra classes for the button.
 * @param {boolean}  [props.compact]    Icon-only variant (no label).
 */
export function ThemeToggle({ className = '', compact = false }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const reducedMotion = useReducedMotionPref()

  const Icon = isDark ? Sun : Moon
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      className={`inline-flex items-center justify-center gap-2 rounded-xl text-foreground-muted hover:text-foreground transition-colors border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
        compact ? 'p-2' : 'px-3 min-h-[38px]'
      } ${className}`}
    >
      <span className="relative w-4 h-4 flex items-center justify-center" aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? 'sun' : 'moon'}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, rotate: -90, scale: 0.6 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, rotate: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute flex items-center justify-center"
          >
            <Icon size={16} className="text-primary" />
          </motion.span>
        </AnimatePresence>
      </span>
      {!compact && <span className="text-xs font-bold whitespace-nowrap">{isDark ? 'Light' : 'Dark'}</span>}
    </button>
  )
}

export default ThemeToggle
