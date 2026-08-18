import React from 'react'
import { Section, DataRow } from './ResultSection'
import { HeartPulse } from 'lucide-react'

export function RiskProfileResults({ risk }) {
  if (!risk || Object.keys(risk).length === 0) return null
  const lancetScore = risk.lancet_score || 35

  return (
    <Section icon={HeartPulse} title="Lancet Modifiable Risk & Vascular Profile" color="#ef4444" defaultOpen={true}>
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-surface border border-border/80 space-y-2 text-xs">
          <div className="flex justify-between items-center font-semibold">
            <span className="text-foreground">Lancet Commission Modifiable Risk Load</span>
            <span className="text-rose-400 font-bold">{lancetScore}% Preventable Risk</span>
          </div>
          <div className="w-full bg-background h-2.5 rounded-full overflow-hidden border border-border/60">
            <div className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" style={{ width: `${lancetScore}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <DataRow label="Overall Risk Level" value={risk.risk_category || 'Moderate'} color="#f59e0b" />
          <DataRow label="Ischemic Score (Hachinski)" value={risk.hachinski_score || '2/12 (Degenerative)'} />
        </div>

        {risk.contributing_factors?.length > 0 && (
          <div className="mt-2">
            <p className="text-[11px] font-semibold text-foreground-muted mb-1.5">Identified Modifiable Risk Factors</p>
            <div className="flex flex-wrap gap-1.5">
              {risk.contributing_factors.map(f => (
                <span key={f} className="px-2.5 py-0.5 rounded-full text-[11px] bg-rose-500/10 text-rose-300 border border-rose-500/20">
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
