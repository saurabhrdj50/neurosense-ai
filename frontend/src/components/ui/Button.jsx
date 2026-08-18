/**
 * @fileoverview Reusable enterprise clinical button primitive.
 * Uses semantic theme tokens for consistent styling and accessibility across light/dark modes.
 */
import React from 'react'

const BASE = 'relative inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]'

const VARIANTS = {
  primary:   'bg-primary hover:bg-primary/90 text-white border border-primary/80 shadow-xs',
  secondary: 'bg-surface dark:bg-card hover:bg-hover text-foreground border border-border shadow-2xs',
  outline:   'bg-transparent hover:bg-hover text-foreground border border-border',
  ghost:     'bg-transparent hover:bg-hover text-muted hover:text-foreground border border-transparent',
  danger:    'bg-danger hover:bg-danger/90 text-white border border-danger/80 shadow-xs',
  success:   'bg-success hover:bg-success/90 text-white border border-success/80 shadow-xs',
}

const SIZES = {
  sm: { padding: 'px-3 py-1.5', text: 'text-xs', icon: 14 },
  md: { padding: 'px-4 py-2',   text: 'text-sm', icon: 16 },
  lg: { padding: 'px-5 py-2.5', text: 'text-sm', icon: 18 },
}

/**
 * Enterprise Clinical Button.
 *
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'|'success'} [variant='primary']
 * @param {'sm'|'md'|'lg'} [size='md']
 * @param {React.ElementType} [icon] Lucide icon component.
 * @param {boolean} [loading] Shows a spinner.
 * @param {boolean} [disabled]
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  icon: Icon,
  type = 'button',
  disabled,
  ...props
}) {
  const sz = SIZES[size] ?? SIZES.md
  const vr = VARIANTS[variant] ?? VARIANTS.primary

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`${BASE} ${vr} ${sz.padding} ${sz.text} ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <span
            aria-hidden="true"
            className="w-3.5 h-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin shrink-0"
          />
          <span>Processing…</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={sz.icon} className="shrink-0" aria-hidden="true" />}
          {children && <span>{children}</span>}
        </>
      )}
    </button>
  )
}
