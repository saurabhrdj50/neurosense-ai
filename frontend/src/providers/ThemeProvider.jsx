/**
 * @fileoverview Global theme context providing light/dark theme switching,
 * font-size preference, and reduce-motion support.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const ThemeContext = createContext(null)

const THEME_STORAGE_KEY = 'neurosense_theme'
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

/**
 * Resolves the initial theme: an explicit `light`/`dark` value persisted under
 * `neurosense_theme` wins; otherwise fall back to the system preference via
 * `matchMedia` (defaulting to light when the media API is unavailable).
 * Mirrors the pre-hydration logic inlined in index.html so React adopts the
 * theme the boot script already applied instead of flashing the wrong one.
 */
function getInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Storage may be unavailable (private browsing) — fall through
  }
  try {
    if (typeof window.matchMedia === 'function' && window.matchMedia(DARK_MEDIA_QUERY).matches) {
      return 'dark'
    }
  } catch {
    // matchMedia can throw in exotic embeds — default to light
  }
  return 'light'
}

/** Reads whether the user has ever pinned a theme explicitly. */
function hasStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark'
  } catch {
    return false
  }
}

/**
 * Applies (or removes) the `dark` class plus the legacy `data-theme`/
 * `color-scheme` hints on `<html>`. The `dark` class is what Tailwind's
 * `darkMode: 'class'` strategy and the `.dark` token block in index.css key
 * off; `data-theme` keeps the pre-existing attribute selectors working.
 */
function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.classList.toggle('light', theme !== 'dark')
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme
}

/**
 * Provides theme, font-size, and motion preferences to the entire component
 * tree.
 *
 * - Theme values are persisted to `localStorage` under the key `neurosense_theme`.
 * - With no stored preference the theme follows the `prefers-color-scheme`
 *   media query, including live updates while the app is open.
 * - Applies the `dark` / `light` class and `data-theme` attribute to `<html>`.
 * - Applies `data-fontsize` attribute for CSS cascade overrides.
 * - Applies `.reduce-motion` class to disable animations for users who prefer it.
 *
 * @param {object}          props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme)

  // FontSize: 'compact' | 'comfortable' | 'large'
  const [fontSize, setFontSize] = useState(() => {
    try {
      return localStorage.getItem('neurosense_fontsize') || 'comfortable'
    } catch {
      return 'comfortable'
    }
  })

  // Motion: 'full' | 'reduced'
  const [motion, setMotion] = useState(() => {
    try {
      return localStorage.getItem('neurosense_motion') || 'full'
    } catch {
      return 'full'
    }
  })

  // Reflect theme changes onto <html> and persist them.
  useEffect(() => {
    applyThemeToDocument(theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  // While the user has not pinned a theme explicitly, track the OS-level
  // preference live (e.g. night-shift auto switch). Once they toggle in-app,
  // their explicit choice takes precedence.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia(DARK_MEDIA_QUERY)
    const handleChange = (event) => {
      if (hasStoredTheme()) return
      setThemeState(event.matches ? 'dark' : 'light')
    }
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-fontsize', fontSize)
    try {
      localStorage.setItem('neurosense_fontsize', fontSize)
    } catch {
      // ignore
    }
  }, [fontSize])

  useEffect(() => {
    const root = document.documentElement
    if (motion === 'reduced') {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }
    try {
      localStorage.setItem('neurosense_motion', motion)
    } catch {
      // ignore
    }
    // Let the shared motion module (and anything else listening) react to
    // same-tab preference changes — 'storage' events only fire cross-tab.
    window.dispatchEvent(new CustomEvent('neurosense:motion-change'))
  }, [motion])

  const setTheme = useCallback((next) => {
    setThemeState((current) => {
      if (typeof next === 'function') return next(current)
      return next === 'dark' ? 'dark' : 'light'
    })
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const isDark = theme === 'dark'

  return (
    <ThemeContext.Provider
      value={{
        theme,
        effectiveTheme: theme,
        setTheme,
        toggleTheme,
        fontSize,
        setFontSize,
        motion,
        setMotion,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Convenience hook to consume the ThemeContext.
 *
 * @returns {{ theme: string, effectiveTheme: string, setTheme: function,
 *   toggleTheme: function, fontSize: string, setFontSize: function,
 *   motion: string, setMotion: function, isDark: boolean }}
 */
export const useTheme = () => useContext(ThemeContext)
