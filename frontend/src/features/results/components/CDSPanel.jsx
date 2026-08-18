import React from 'react'
import { Stethoscope, CheckCircle2, AlertCircle, FileText, Sparkles } from 'lucide-react'
import GlassCard from '../../../components/ui/GlassCard'

export function CDSPanel({ cds }) {
  if (!cds || !Object.keys(cds).length) return null

  const guidelines = cds.guidelines || []
  const riskClass = cds.risk_classification || 'Standard Monitoring'
  const trials = cds.recommended_trials || []

  return (
    <GlassCard className="p-5" hover={false}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Stethoscope size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Clinical Decision Support (CDS)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              Evidence-Based
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Protocol Guidelines & Monoclonal Antibody Eligibility</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 mb-4">
        <div className="p-3.5 rounded-xl border" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Clinical Classification</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{riskClass}</p>
        </div>

        <div className="p-3.5 rounded-xl border" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Clinical Actions</p>
          <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{guidelines.length} Actionable Guidelines</p>
        </div>
      </div>

      {guidelines.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Actionable Guidelines</p>
          {guidelines.map((g, idx) => (
            <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl border text-xs" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>{g}</span>
            </div>
          ))}
        </div>
      )}

      {trials.length > 0 && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
            <Sparkles size={14} />
            <span>Eligible Clinical Trials</span>
          </div>
          <ul className="list-disc list-inside text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
            {trials.map((t, idx) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </GlassCard>
  )
}
