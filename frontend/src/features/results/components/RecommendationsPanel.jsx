import React, { useState } from 'react'
import { Stethoscope, Heart, BookOpen, Phone, Clock, ChevronDown, ChevronUp, Target, Lightbulb, Brain } from 'lucide-react'
import GlassCard from '../../../components/ui/GlassCard'
import Badge from '../../../components/ui/Badge'

const URGENCY_BADGE = {
  urgent:      'danger',
  important:   'warning',
  recommended: 'info',
  optional:    'neutral',
  routine:     'success',
}

const CATEGORY_ICONS = {
  Cognitive: Brain,
  Physical: Heart,
  Social: BookOpen,
  Diet: Heart,
  Sleep: BookOpen,
  Safety: Target,
  Caregiver: BookOpen,
  'Mental Health': Heart,
}

function MedicalReferral({ referral }) {
  const badgeVariant = URGENCY_BADGE[referral.urgency] || 'neutral'
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border text-xs" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
      <Stethoscope size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{referral.specialist}</p>
          <Badge variant={badgeVariant}>{referral.urgency}</Badge>
        </div>
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{referral.reason}</p>
        {referral.note && <p className="text-[11px] font-medium mt-1 text-amber-600 dark:text-amber-400">{referral.note}</p>}
      </div>
    </div>
  )
}

function LifestyleTip({ tip }) {
  const Icon = CATEGORY_ICONS[tip.category] || Lightbulb
  const isHigh = tip.priority === 'high'
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border text-xs" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isHigh ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'}`}>
        <Icon size={13} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{tip.category}</span>
          {isHigh && <Badge variant="warning">Priority</Badge>}
        </div>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{tip.tip}</p>
      </div>
    </div>
  )
}

function ResourceItem({ resource }) {
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
      <Phone size={11} aria-hidden="true" />
      <span className="truncate">{resource.name}: {resource.resource}</span>
    </div>
  )
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between p-3.5 transition-colors text-left"
        style={{ background: 'var(--surface-hover)' }}
      >
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{title}</span>
        </div>
        {isOpen
          ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
          : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
        }
      </button>
      {isOpen && <div className="p-3.5 space-y-2">{children}</div>}
    </div>
  )
}

export function RecommendationsPanel({ recommendations }) {
  if (!recommendations) return null
  const { medical_recommendations, lifestyle_recommendations, resources, urgency_level, follow_up } = recommendations

  return (
    <GlassCard className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Heart size={16} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>AI Recommendations</h2>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Personalised guidance from 8-modality analysis</p>
          </div>
        </div>
        {recommendations.ai_provider_used && (
          <Badge variant="info">{recommendations.ai_provider_used}</Badge>
        )}
      </div>

      {/* Follow-up alert */}
      {urgency_level && (
        <div className="mb-4 flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Clock size={13} className="text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{urgency_level} follow-up required</p>
            {follow_up && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{follow_up}</p>}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <CollapsibleSection title="Medical Referrals" icon={Stethoscope}>
          {medical_recommendations?.referrals?.map((ref, i) => (
            <MedicalReferral key={i} referral={ref} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Lifestyle Recommendations" icon={Heart}>
          {lifestyle_recommendations?.tips?.map((tip, i) => (
            <LifestyleTip key={i} tip={tip} />
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Goals & Focus Areas" icon={Target} defaultOpen={false}>
          <div className="space-y-2">
            {lifestyle_recommendations?.focus_areas?.map((area, i) => (
              <div key={i} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <Target size={11} className="text-blue-500 shrink-0" aria-hidden="true" />
                <span>{area}</span>
              </div>
            ))}
            {lifestyle_recommendations?.goals && (
              <div className="pt-2 mt-1 border-t space-y-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                {lifestyle_recommendations.goals.map((goal, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span style={{ color: 'var(--text-secondary)' }}>{goal.goal}</span>
                    <Badge variant="neutral">{goal.timeline}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Resources & Support" icon={Phone} defaultOpen={false}>
          <div className="grid gap-1.5">
            {resources?.map((res, i) => (
              <ResourceItem key={i} resource={res} />
            ))}
          </div>
        </CollapsibleSection>
      </div>
    </GlassCard>
  )
}
