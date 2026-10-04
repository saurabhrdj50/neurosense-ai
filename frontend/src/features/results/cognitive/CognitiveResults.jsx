import React from 'react'
import { Section, DataRow } from '../ResultSection'
import { Activity, Brain } from 'lucide-react'
import ProgressBar from '../../../shared/components/ui/ProgressBar'

const DOMAIN_COLORS = {
  orientation: 'from-indigo-400 to-indigo-600',
  immediate_memory: 'from-purple-400 to-purple-600',
  delayed_memory: 'from-fuchsia-400 to-fuchsia-600',
  working_memory: 'from-cyan-400 to-cyan-600',
  attention: 'from-emerald-400 to-emerald-600',
  verbal_fluency: 'from-teal-400 to-teal-600',
  language: 'from-rose-400 to-rose-600',
  executive_function: 'from-orange-400 to-orange-600',
  reasoning: 'from-blue-400 to-blue-600',
  problem_solving: 'from-amber-400 to-amber-600',
  episodic_memory: 'from-pink-400 to-pink-600',
}

export function CognitiveResults({ cognitive }) {
  if (!cognitive || Object.keys(cognitive).length === 0) return null

  const profile = cognitive.profile || cognitive.domains || {}
  const domainEntries = Array.isArray(profile)
    ? profile
    : Object.entries(profile).map(([key, val]) => {
        const info = typeof val === 'number' ? { score: val, max: 100 } : val
        return {
          key,
          label: info.label || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          pct: Math.round(info.pct ?? ((info.max || 100) > 0 ? (info.score / (info.max || 100)) * 100 : 0)),
        }
      })

  const domainsAssessed = domainEntries.filter(d => d.pct !== undefined).length

  return (
    <Section icon={Brain} title="Cognitive Screening Profile" color="#06b6d4" defaultOpen={false}>
      <div className="grid grid-cols-2 gap-4">
        <DataRow label="Composite Score" value={cognitive.composite_score} />
        <DataRow label="Rule-based screening band" value={cognitive.impairment_level} color={cognitive.impairment_level === 'Normal' ? '#22c55e' : cognitive.impairment_level === 'Moderate' ? '#f59e0b' : '#ef4444'} />
        {cognitive.total_questions ? (
          <DataRow label="Questions Completed" value={`${cognitive.questions_completed || 0} / ${cognitive.total_questions}`} />
        ) : (
          <DataRow label="Memory Recall" value={cognitive.memory_recall} />
        )}
      </div>

      {domainEntries.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={14} className="text-cyan-400" /> Domain Profile
            </h4>
            {cognitive.total_questions && (
              <span className="text-[11px] font-semibold text-foreground-muted">
                {domainsAssessed} / {Object.keys(DOMAIN_COLORS).length} domains
              </span>
            )}
          </div>
          {domainEntries.map(d => (
            <ProgressBar
              key={d.key}
              label={d.label}
              value={Math.max(0, Math.min(100, d.pct))}
              colorClass={`bg-gradient-to-r ${DOMAIN_COLORS[d.key] || 'from-cyan-400 to-cyan-600'}`}
              color="#06b6d4"
              glow={false}
              height={6}
            />
          ))}
        </div>
      )}
    </Section>
  )
}
