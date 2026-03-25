import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Stethoscope, Heart, BookOpen, Phone, Clock, ChevronDown, ChevronUp, Target, Lightbulb, Brain } from 'lucide-react'
import GlassCard from '../../../components/ui/GlassCard'

const URGENCY_COLORS = {
  urgent: '#ef4444',
  important: '#f59e0b',
  recommended: '#6366f1',
  optional: '#64748b',
  routine: '#22c55e',
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
  const color = URGENCY_COLORS[referral.urgency] || '#64748b'
  
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
      <Stethoscope size={16} style={{ color, flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{referral.specialist}</p>
          <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: `${color}15`, color }}>
            {referral.urgency}
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{referral.reason}</p>
        {referral.note && <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>{referral.note}</p>}
      </div>
    </div>
  )
}

function LifestyleTip({ tip, index }) {
  const Icon = CATEGORY_ICONS[tip.category] || Lightbulb
  const priorityColor = tip.priority === 'high' ? '#f59e0b' : '#22c55e'
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3 p-3 rounded-lg"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ background: `${priorityColor}15` }}>
        <Icon size={14} style={{ color: priorityColor }} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded" 
                style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
            {tip.category}
          </span>
          {tip.priority === 'high' && (
            <span className="text-xs" style={{ color: '#f59e0b' }}>Priority</span>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4, lineHeight: 1.5 }}>{tip.tip}</p>
      </div>
    </motion.div>
  )
}

function ResourceItem({ resource }) {
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
      <Phone size={12} style={{ color: '#64748b' }} />
      <span>{resource.name}: {resource.resource}</span>
    </div>
  )
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true, color = '#6366f1' }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <div className="border rounded-xl" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={16} style={{ color: '#64748b' }} /> : <ChevronDown size={16} style={{ color: '#64748b' }} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function RecommendationsPanel({ recommendations }) {
  if (!recommendations) return null
  
  const { 
    medical_recommendations, 
    lifestyle_recommendations, 
    resources, 
    summary,
    urgency_level,
    follow_up
  } = recommendations

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
               style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)' }}>
            <Heart size={20} style={{ color: '#fff' }} />
          </div>
          <div>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
              Smart Recommendations
            </h2>
            <p style={{ fontSize: 12, color: '#64748b' }}>Personalized guidance based on your results</p>
          </div>
        </div>

        <div className="mb-5 p-3 rounded-lg flex items-center gap-3" style={{ background: 'rgba(34,197,94,0.08)' }}>
          <Clock size={16} style={{ color: '#22c55e' }} />
          <div>
            <p style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>{urgency_level} follow-up</p>
            <p style={{ fontSize: 11, color: '#94a3b8' }}>{follow_up}</p>
          </div>
        </div>

        <div className="space-y-4">
          <CollapsibleSection 
            title="Medical Referrals" 
            icon={Stethoscope} 
            color="#ef4444"
          >
            {medical_recommendations?.referrals?.map((ref, i) => (
              <MedicalReferral key={i} referral={ref} />
            ))}
          </CollapsibleSection>

          <CollapsibleSection 
            title="Lifestyle Recommendations" 
            icon={Heart} 
            color="#22c55e"
          >
            {lifestyle_recommendations?.tips?.map((tip, i) => (
              <LifestyleTip key={i} tip={tip} index={i} />
            ))}
          </CollapsibleSection>

          <CollapsibleSection 
            title="Goals & Focus Areas" 
            icon={Target} 
            color="#6366f1"
            defaultOpen={false}
          >
            <div className="space-y-3">
              {lifestyle_recommendations?.focus_areas?.map((area, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Target size={12} style={{ color: '#6366f1' }} />
                  <span style={{ fontSize: 12, color: '#cbd5e1' }}>{area}</span>
                </div>
              ))}
              <div className="pt-2 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Recommended Goals:</p>
                {lifestyle_recommendations?.goals?.map((goal, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span style={{ fontSize: 12, color: '#cbd5e1' }}>{goal.goal}</span>
                    <span className="text-xs px-2 py-0.5 rounded" 
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
                      {goal.timeline}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection 
            title="Resources & Support" 
            icon={Phone} 
            color="#06b6d4"
            defaultOpen={false}
          >
            <div className="grid gap-2">
              {resources?.map((res, i) => (
                <ResourceItem key={i} resource={res} />
              ))}
            </div>
          </CollapsibleSection>
        </div>
      </GlassCard>
    </motion.div>
  )
}
