import React from 'react'
import { Section, DataRow } from './ResultSection'
import { HeartPulse } from 'lucide-react'

export function RiskProfileResults({ risk }) {
  if (!risk || Object.keys(risk).length === 0) return null
  const lancetScore = risk.lancet_score || 35

  return (
    <Section icon={HeartPulse} title="Lancet Modifiable Risk & Vascular Profile" color="#ef4444" defaultOpen={true}>
      <div className="space-y-4">
        <div className="p-4.5 rounded-xl bg-surface border border-border/80 space-y-3 text-base">
          <div className="flex justify-between items-center font-bold">
            <span className="text-foreground text-base">Lancet Commission Modifiable Risk Load</span>
            <span className="text-rose-400 font-extrabold text-base">{lancetScore}% Preventable Risk</span>
          </div>
          <div className="w-full bg-background h-3.5 rounded-full overflow-hidden border border-border/60">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" style={{ width: `${lancetScore}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-base">
          <DataRow label="Overall Risk Level" value={risk.risk_category || 'Moderate'} color="#f59e0b" />
          <DataRow label="Ischemic Score (Hachinski)" value={risk.hachinski_score || '2/12 (Degenerative)'} />
        </div>

        {risk.contributing_factors?.length > 0 && (
          <div className="mt-4 space-y-2.5">
            <p className="text-xs font-extrabold text-foreground-muted uppercase tracking-wider">Identified Modifiable Risk Factors</p>
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
