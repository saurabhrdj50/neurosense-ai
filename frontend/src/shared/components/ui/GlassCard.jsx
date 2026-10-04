/**
 * @fileoverview Enterprise panel card container.
 * Flexible card primitive supporting default, elevated, interactive, glass, subtle, and highlighted variants.
 * Uses semantic theme tokens for dark/light mode consistency and built-in keyboard accessibility.
 */
import React from 'react'

/**
 * Enterprise card panel.
 *
 * @param {'primary'|'secondary'|'supporting'|'default'|'elevated'|'interactive'|'glass'|'subtle'|'highlighted'} [variant='default']
 * @param {string}          [className]  Extra Tailwind classes.
 * @param {React.CSSProperties} [style]  Inline overrides.
 * @param {boolean}         [hover]      Subtle lift on hover.
 * @param {boolean}         [glow]       Glow effect around border.
 * @param {function}        [onClick]    Click handler.
 * @param {React.ReactNode} children
 */
export default function GlassCard({
  variant = 'default',
  className = '',
  style = {},
  hover = false,
  glow = false,
  onClick,
  onKeyDown,
  children,
  ...props
}) {
  const VARIANTS = {
    // ── Canonical 3-Level Card Hierarchy ──
    primary:     'bg-card border-l-4 border-l-primary border-t border-r border-b border-border shadow-xs',
    secondary:   'bg-card border border-border shadow-2xs',
    supporting:  'bg-surface-secondary/50 border border-border-subtle shadow-none',
    
    // ── Specialized Aliases ──
    default:     'bg-card border border-border shadow-2xs',
    elevated:    'bg-card border border-border-strong shadow-xs',
    interactive: 'bg-card border border-border shadow-2xs hover:border-primary/50 hover:bg-surface-hover cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:outline-none',
    glass:       'bg-card border border-border shadow-2xs',
    subtle:      'bg-surface-secondary/50 border border-border-subtle shadow-none',
    highlighted: 'bg-surface-secondary border border-primary/40 shadow-2xs',
  }

  const selectedVariant = VARIANTS[variant] || VARIANTS.default
  const hoverClass = hover && (variant === 'default' || variant === 'secondary' || variant === 'primary') 
    ? 'hover:border-primary/40 hover:bg-surface-hover/80 transition-all duration-150' 
    : ''
  const cursorClass = onClick && variant !== 'interactive' 
    ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:outline-none' 
    : ''

  const handleKeyDown = (e) => {
    if (onKeyDown) {
      onKeyDown(e)
    } else if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick(e)
    }
  }

  return (
    <div
      onClick={onClick}
      onKeyDown={onClick || onKeyDown ? handleKeyDown : undefined}
      tabIndex={onClick || variant === 'interactive' ? 0 : undefined}
      role={onClick || variant === 'interactive' ? 'button' : undefined}
      className={`rounded-xl transition-all duration-150 ${selectedVariant} ${hoverClass} ${cursorClass} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}

