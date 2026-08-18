import React, { useState } from 'react'
import { Check, HeartPulse, ChevronDown, ChevronUp, Activity } from 'lucide-react'

const RISK_CATEGORIES = [
  {
    id: 'lifestyle',
    title: '1. Lifestyle & Physical Activity',
    desc: 'Sedentary habits, sleep cycle, alcohol, smoking, social isolation.',
    factors: [
      { id: 'physical_inactivity', label: 'Physical Inactivity / Sedentary' },
      { id: 'sleep_issues', label: 'Sleep Apnea / Chronic Insomnia' },
      { id: 'smoking', label: 'Current / Past Tobacco Smoking' },
      { id: 'social_isolation', label: 'Social Isolation / Infrequent Contact' },
      { id: 'alcohol_excess', label: 'Excessive Alcohol Intake (>14 units/wk)' },
    ]
  },
  {
    id: 'medical',
    title: '2. Medical History & Vascular Factors',
    desc: 'Hypertension, diabetes, cardiovascular disease, hearing loss, obesity.',
    factors: [
      { id: 'hypertension', label: 'Midlife Hypertension (>130/80)' },
      { id: 'diabetes', label: 'Type 2 Diabetes Mellitus' },
      { id: 'heart_disease', label: 'Cardiovascular Disease / Prior Stroke' },
      { id: 'hearing_loss', label: 'Uncorrected Hearing Loss' },
      { id: 'obesity', label: 'Midlife Obesity (BMI > 30)' },
      { id: 'depression', label: 'Depression / Mood Disorder' },
    ]
  },
  {
    id: 'genetics',
    title: '3. Family History & Genetics',
    desc: 'First-degree Alzheimer family history, APOE ε4 allele status.',
    factors: [
      { id: 'family_history', label: "First-Degree Family History of Alzheimer's / Dementia" },
      { id: 'apoe4_allele', label: 'APOE-ε4 Carrier (Self-reported / Genotyped)' },
      { id: 'early_onset_family', label: 'Early-Onset Dementia Family History (<65 yrs)' },
    ]
  },
  {
    id: 'medications',
    title: '4. Current Medications & Compliance',
    desc: 'Anticholinergic burden, sedatives, antihypertensives, adherence.',
    factors: [
      { id: 'anticholinergic_load', label: 'High Anticholinergic Medication Burden' },
      { id: 'benzodiazepines', label: 'Chronic Benzodiazepine / Sedative Use' },
      { id: 'polypharmacy', label: 'Polypharmacy (>5 concurrent prescription meds)' },
      { id: 'medication_noncompliance', label: 'Reported Medication Non-Adherence' },
    ]
  }
]

export function RiskStep({ risk, setRisk }) {
  const [expandedCards, setExpandedCards] = useState({
    lifestyle: true,
    medical: true,
    genetics: true,
    medications: true
  })

  const toggleCard = (id) => {
    setExpandedCards(p => ({ ...p, [id]: !p[id] }))
  }

  const toggleFactor = (factorId) => {
    setRisk(p => ({ ...p, [factorId]: !p[factorId] }))
  }

  // Count checked factors
  const totalChecked = Object.values(risk || {}).filter(Boolean).length

  return (
    <div className="space-y-5">
      {/* Header & Risk Load Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-2xl bg-surface border border-border">
        <div>
          <h2 className="text-sm font-bold text-foreground">Clinical Risk Factors & Comorbidities</h2>
          <p className="text-xs text-foreground-muted">2024 Lancet Commission Modifiable Risk Factor Framework.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
            <HeartPulse size={14} /> Total Risk Flags: {totalChecked}
          </span>
        </div>
      </div>

      {/* 4 Expandable Cards Grid */}
      <div className="space-y-3">
        {RISK_CATEGORIES.map(cat => {
          const isExpanded = expandedCards[cat.id]
          const catCheckedCount = cat.factors.filter(f => risk[f.id]).length

          return (
            <div key={cat.id} className="rounded-2xl bg-surface border border-border overflow-hidden transition-all">
              {/* Card Header */}
              <button
                type="button"
                onClick={() => toggleCard(cat.id)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-hover transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-foreground">{cat.title}</h3>
                    {catCheckedCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {catCheckedCount} Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-foreground-muted mt-0.5">{cat.desc}</p>
                </div>

                <div className="text-foreground-muted">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Card Body - Checkable Chips/Toggles */}
              {isExpanded && (
                <div className="p-4 pt-1 border-t border-border/60 bg-background/50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cat.factors.map(f => {
                    const isChecked = !!risk[f.id]
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFactor(f.id)}
                        className={`p-3 rounded-xl border text-xs text-left font-medium transition-all flex items-center justify-between ${
                          isChecked
                            ? 'bg-primary/15 border-primary text-primary font-bold shadow-sm'
                            : 'bg-surface border-border text-foreground hover:bg-surface-hover'
                        }`}
                      >
                        <span>{f.label}</span>
                        <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                          isChecked ? 'bg-primary border-primary text-white' : 'border-border'
                        }`}>
                          {isChecked && <Check size={10} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
