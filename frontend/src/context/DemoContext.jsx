/**
 * @fileoverview Demo mode context for the synthetic 30-patient dataset.
 *
 * When demo mode is active the application substitutes real API data with
 * the pre-generated {@link DEMO_PATIENTS} dataset so the platform can be
 * demonstrated without a running backend.
 */
import React, { createContext, useContext, useState } from 'react'

const DemoContext = createContext()

/**
 * Provides demo-mode state to the entire component tree.
 *
 * @param {object}          props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
export function DemoProvider({ children }) {
  const [isDemoMode, setIsDemoMode] = useState(false)

  const launchDemo = () => {
    setIsDemoMode(true)
  }

  const exitDemo = () => {
    setIsDemoMode(false)
  }

  return (
    <DemoContext.Provider value={{ isDemoMode, launchDemo, exitDemo }}>
      {children}
    </DemoContext.Provider>
  )
}

/**
 * Convenience hook to consume the Demo context.
 *
 * @returns {{ isDemoMode: boolean, launchDemo: function, exitDemo: function }}
 */
export function useDemo() {
  return useContext(DemoContext)
}
