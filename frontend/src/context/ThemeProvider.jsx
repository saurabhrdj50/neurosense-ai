/**
 * @fileoverview Global theme context providing light/dark/system theme switching,
 * font-size preference, and reduce-motion support.
 */
import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

/**
 * Provides theme, font-size, and motion preferences to the entire component
 * tree.
 *
 * - Theme values are persisted to `localStorage` under the key `neurosense_theme`.
 * - `system` theme automatically tracks `prefers-color-scheme` media query.
 * - Applies `dark` / `light` class and `data-theme` attribute to `<html>`.
 * - Applies `data-fontsize` attribute for CSS cascade overrides.
 * - Applies `.reduce-motion` class to disable animations for users who prefer it.
 *
 * @param {object}          props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export function ThemeProvider({ children }) {
  // Theme: 'light' | 'dark' | 'system'
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('neurosense_theme')
      if (saved) return saved
    } catch (e) {
      // ignore
    }
    return 'system'
  })

  // FontSize: 'compact' | 'comfortable' | 'large'
  const [fontSize, setFontSize] = useState(() => {
    try {
      return localStorage.getItem('neurosense_fontsize') || 'comfortable'
    } catch (e) {
      return 'comfortable'
    }
  })

  // Motion: 'full' | 'reduced'
  const [motion, setMotion] = useState(() => {
    try {
      return localStorage.getItem('neurosense_motion') || 'full'
    } catch (e) {
      return 'full'
    }
  })

  // System mode listener
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return true
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setSystemDark(e.matches)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
    } else {
      mediaQuery.addListener(handler)
    }
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler)
      } else {
        mediaQuery.removeListener(handler)
      }
    }
  }, [])

  // Effective theme calculation
  const effectiveTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const root = document.documentElement
    if (effectiveTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
      root.setAttribute('data-theme', 'dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
      root.setAttribute('data-theme', 'light')
      root.style.colorScheme = 'light'
    }
    try {
      localStorage.setItem('neurosense_theme', theme)
    } catch (e) {
      // ignore
    }
  }, [theme, effectiveTheme])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-fontsize', fontSize)
    try {
      localStorage.setItem('neurosense_fontsize', fontSize)
    } catch (e) {
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
    } catch (e) {
      // ignore
    }
  }, [motion])

  const toggleTheme = () => {
    setTheme(prev => {
      const currentEffective = prev === 'system' ? (systemDark ? 'dark' : 'light') : prev
      return currentEffective === 'dark' ? 'light' : 'dark'
    })
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        effectiveTheme,
        setTheme,
        toggleTheme,
        fontSize,
        setFontSize,
        motion,
        setMotion,
        isDark: effectiveTheme === 'dark',
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
