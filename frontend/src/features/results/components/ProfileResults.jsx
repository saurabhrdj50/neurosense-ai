import React from 'react'
import { Section, DataRow } from './ResultSection'
import { PenTool, HeartPulse } from 'lucide-react'

export function HandwritingResults({ handwriting }) {
  if (!handwriting || Object.keys(handwriting).length === 0) return null

  return (
    <Section icon={PenTool} title="Handwriting Analysis" color="#f59e0b" defaultOpen={false}>
      <DataRow label="Handwriting Risk Score" value={handwriting.handwriting_risk_score} />
      <DataRow label="Tremor Score" value={handwriting.tremor_score} />
      <DataRow label="Stroke Irregularity" value={handwriting.stroke_irregularity} />
      <DataRow label="Risk Level" value={handwriting.risk_level} color={handwriting.risk_level === 'Low' ? '#22c55e' : handwriting.risk_level === 'Medium' ? '#f59e0b' : '#ef4444'} />
    </Section>
  )
}

export function RiskProfileResults({ risk }) {
  if (!risk || Object.keys(risk).length === 0) return null

  return (
    <Section icon={HeartPulse} title="Risk Profile" color="#ef4444" defaultOpen={false}>
      <div className="space-y-3">
        <DataRow label="Overall Risk Score" value={risk.overall_risk_score} />
        <DataRow label="Risk Category" value={risk.risk_category} color={risk.risk_category === 'Low' ? '#22c55e' : risk.risk_category === 'Moderate' ? '#f59e0b' : '#ef4444'} />
        {risk.contributing_factors?.length > 0 && (
          <div className="mt-3">
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Contributing Factors</p>
            <div className="flex flex-wrap gap-2">
              {risk.contributing_factors.map(f => (
                <span key={f} className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}>{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
