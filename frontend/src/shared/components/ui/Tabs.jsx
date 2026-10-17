/**
 * @fileoverview Enterprise clinical tab strip component.
 * Supports underline-style and segment-style layouts with an animated
 * active-state indicator that slides between tabs (framer-motion layoutId).
 * Keyboard navigable with left/right arrows, Home, End.
 */
import React, { useRef, useId } from 'react'
import { motion } from 'framer-motion'

/**
 * Enterprise tab navigation component.
 *
 * @param {Array<{id: string, label: string, icon?: React.ElementType, disabled?: boolean}>} props.tabs
 * @param {string}   props.activeTab        Currently selected tab ID.
 * @param {function} props.onChange          Called with new tab ID.
 * @param {'underline'|'segment'} [props.variant='underline']
 * @param {string}   [props.className]       Extra wrapper classes.
 */
export default function Tabs({ tabs, activeTab, onChange, variant = 'underline', className = '' }) {
  const containerRef = useRef(null)
  const layoutId = useId()

  const handleKeyDown = (e) => {
    const items = Array.from(containerRef.current?.querySelectorAll('[role="tab"]:not([disabled])') ?? [])
    const cur = items.indexOf(e.currentTarget)
    if (e.key === 'ArrowRight') items[(cur + 1) % items.length]?.focus()
    if (e.key === 'ArrowLeft')  items[(cur - 1 + items.length) % items.length]?.focus()
    if (e.key === 'Home') items[0]?.focus()
    if (e.key === 'End')  items[items.length - 1]?.focus()
  }

  if (variant === 'segment') {
    return (
      <div
        ref={containerRef}
        role="tablist"
        className={`inline-flex items-center gap-0.5 p-1 rounded-xl bg-surface-secondary border border-border ${className}`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onChange(tab.id)}
              onKeyDown={e => handleKeyDown(e)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 whitespace-nowrap ${
                active ? 'text-foreground' : 'text-muted hover:text-foreground'
              } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {active && (
                <motion.span
                  layoutId={`${layoutId}-segment`}
                  transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                  className="absolute inset-0 rounded-lg bg-card border border-border shadow-xs"
                  aria-hidden="true"
                />
              )}
              <span className="relative z-1 flex items-center gap-1.5">
                {Icon && <Icon size={13} className="shrink-0" />}
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  // Underline variant (default)
  return (
    <div
      ref={containerRef}
      role="tablist"
      className={`flex items-center gap-0 border-b border-border overflow-x-auto ${className}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            onKeyDown={e => handleKeyDown(e)}
            className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors duration-150 ${
              active
                ? 'text-primary'
                : `text-muted hover:text-foreground ${tab.disabled ? '' : 'hover:bg-surface-hover'}`
            } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {Icon && <Icon size={13} className="shrink-0" />}
            {tab.label}
            {active && (
              <motion.span
                layoutId={`${layoutId}-underline`}
                transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
