/**
 * @fileoverview Canonical enterprise KPI stat card.
 * Uses semantic design tokens for light and dark theme consistency.
 */
import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const ICON_VARIANT_CLASSES = {
  blue:    'bg-primary/10 text-primary border-primary/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  amber:   'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  red:     'bg-danger/10 text-danger border-danger/20',
  violet:  'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  slate:   'bg-surface-secondary text-muted border-border',
  cyan:    'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
}

/**
 * Enterprise KPI stat card.
 *
 * @param {React.ElementType} props.icon           Lucide icon component.
 * @param {'blue'|'emerald'|'amber'|'red'|'violet'|'slate'|'cyan'} [props.iconVariant='slate']
 * @param {string}            props.label          Metric label.
 * @param {string|number}     props.value          Metric value.
 * @param {string}            [props.subtext]      Optional subscript below value.
 * @param {'up'|'down'|'stable'|null} [props.trend] Trend direction.
 * @param {string}            [props.trendLabel]   Trend label text (e.g. "+12%").
 * @param {string}            [props.className]    Extra wrapper classes.
 */
export default function StatCard({
  icon: Icon,
  iconVariant = 'slate',
  label,
  value,
  subtext,
  trend,
  trendLabel,
  className = '',
}) {
  const iconCls = ICON_VARIANT_CLASSES[iconVariant] ?? ICON_VARIANT_CLASSES.slate

  const trendConfig = {
    up:     { icon: TrendingUp,   cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    down:   { icon: TrendingDown, cls: 'text-danger bg-danger/10 border-danger/20' },
    stable: { icon: Minus,        cls: 'text-muted bg-surface-secondary border-border' },
  }

  const td = trend ? trendConfig[trend] : null

  return (
    <div className={`bg-card border border-border rounded-2xl p-5 flex items-start justify-between gap-4 shadow-2xs hover:border-border-strong transition-all duration-150 ${className}`}>
      <div className="flex items-start gap-3.5 min-w-0">
        {Icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${iconCls}`}>
            <Icon size={20} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[15px] font-bold uppercase tracking-wider text-foreground-muted truncate">{label}</p>
          <p className="text-3xl font-extrabold font-mono text-foreground tracking-tight leading-tight mt-1">{value}</p>
          {subtext && <p className="text-sm font-medium text-foreground-muted mt-1.5">{subtext}</p>}
        </div>
      </div>
      {td && trendLabel && (
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold shrink-0 ${td.cls}`}>
          <td.icon size={15} />
          {trendLabel}
        </div>
      )}
    </div>
  )
}
