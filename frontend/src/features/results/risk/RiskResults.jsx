import React from 'react'
import { Section, DataRow } from '../ResultSection'
import { HeartPulse } from 'lucide-react'

export function RiskResults({ risk }) {
  if (!risk || Object.keys(risk).length === 0) return null
  const factorsAssessed = risk.factors_assessed ?? risk.contributing_factors?.length ?? 0
  const hasScore = factorsAssessed > 0 && risk.overall_risk_score != null
  const riskScore = hasScore ? Number(risk.overall_risk_score) : null
  const scoreColor = riskScore == null
    ? 'text-foreground-muted'
    : riskScore < 30
      ? 'text-emerald-500 dark:text-emerald-400'
      : riskScore < 65
        ? 'text-amber-500 dark:text-amber-400'
        : 'text-rose-500 dark:text-rose-400'

  const categoryLabel = hasScore ? (risk.risk_category || risk.risk_label || 'Not available') : 'Not assessed'
  const categoryColor = categoryLabel.toLowerCase().includes('low') || categoryLabel.toLowerCase().includes('normal')
    ? '#10b981'
    : categoryLabel.toLowerCase().includes('high')
      ? '#ef4444'
      : '#f59e0b'

  return (
    <Section icon={HeartPulse} title="Risk Factor Profile" color="#ef4444" defaultOpen={true}>
      <div className="space-y-4">
        <div className="p-4.5 rounded-xl bg-surface border border-border/80 space-y-3 text-base">
          <div className="flex justify-between items-center font-bold">
            <span className="text-foreground text-base">Rule-based factor score</span>
            <span className={`font-extrabold text-base ${scoreColor}`}>
              {riskScore == null ? 'Not assessed' : `${riskScore}/100`}
            </span>
          </div>
          <div className="w-full bg-background h-3.5 rounded-full overflow-hidden border border-border/60">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" style={{ width: `${riskScore ?? 0}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-base">
          <DataRow label="Risk category" value={categoryLabel} color={categoryColor} />
        </div>

        {risk.contributing_factors?.length > 0 && (
          <div className="mt-4 space-y-2.5">
            <p className="text-xs font-extrabold text-foreground-muted uppercase tracking-wider">Contributing factors</p>
            <div className="flex flex-wrap gap-2">
              {risk.contributing_factors.map(f => (
                <span key={f} className="px-3.5 py-1.5 rounded-xl text-sm font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
