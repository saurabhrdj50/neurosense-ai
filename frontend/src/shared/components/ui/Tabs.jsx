/**
 * @fileoverview Enterprise clinical tab strip component.
 * Supports underline-style and segment-style layouts.
 * Keyboard navigable with left/right arrows, Home, End.
 */
import React, { useRef } from 'react'

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

  const handleKeyDown = (e, idx) => {
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
        className={`inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${className}`}
      >
        {tabs.map((tab, idx) => {
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
              onKeyDown={e => handleKeyDown(e, idx)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-150 whitespace-nowrap ${
                active
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {Icon && <Icon size={13} className="shrink-0" />}
              {tab.label}
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
      className={`flex items-center gap-0 border-b border-slate-200 dark:border-slate-800 overflow-x-auto ${className}`}
    >
      {tabs.map((tab, idx) => {
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
            onKeyDown={e => handleKeyDown(e, idx)}
            className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors duration-150 border-b-2 -mb-px ${
              active
                ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
            } ${tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {Icon && <Icon size={13} className="shrink-0" />}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
