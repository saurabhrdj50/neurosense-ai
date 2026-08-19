import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, HeartPulse, Moon, Stethoscope, Dna, Pill, RotateCcw, ShieldAlert } from 'lucide-react'

const RISK_CATEGORIES = [
  {
    id: 'lifestyle',
    title: 'Daily Habits & Sleep',
    icon: Moon,
    iconColor: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10 border-indigo-500/20',
    factors: [
      { id: 'physical_inactivity', label: 'Lack of Daily Exercise', desc: 'Getting less than 20–30 minutes of light exercise or walking per day.' },
      { id: 'sleep_issues', label: 'Poor Sleep or Snoring Problems', desc: 'Frequent trouble sleeping at night, severe snoring, or waking up unrefreshed.' },
      { id: 'smoking', label: 'Smoking History', desc: 'Currently smoking or a past history of regular tobacco use.' },
      { id: 'social_isolation', label: 'Low Social Contact', desc: 'Rarely socializing with family, friends, or neighbors.' },
      { id: 'alcohol_excess', label: 'Heavy Alcohol Use', desc: 'Drinking alcoholic beverages frequently or in large amounts.' },
    ]
  },
  {
    id: 'medical',
    title: 'Heart & General Health',
    icon: Stethoscope,
    iconColor: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
    factors: [
      { id: 'hypertension', label: 'High Blood Pressure', desc: 'Blood pressure consistently higher than normal (over 130/80).' },
      { id: 'diabetes', label: 'High Blood Sugar / Diabetes', desc: 'Diagnosed with diabetes or taking daily blood sugar medication.' },
      { id: 'heart_disease', label: 'Heart Problems or Past Stroke', desc: 'History of heart trouble, irregular heartbeat, or a past stroke.' },
      { id: 'hearing_loss', label: 'Hearing Trouble (No Hearing Aid)', desc: 'Difficulty hearing clearly in conversations without wearing hearing aids.' },
      { id: 'obesity', label: 'Being Significantly Overweight', desc: 'Body weight significantly higher than recommended for height.' },
      { id: 'depression', label: 'Depression or Low Mood', desc: 'History of feeling down, low energy, or clinical depression.' },
    ]
  },
  {
    id: 'genetics',
    title: 'Family History & Genes',
    icon: Dna,
    iconColor: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    factors: [
      { id: 'family_history', label: 'Family History of Memory Loss', desc: 'A parent or sibling who was diagnosed with Alzheimer’s or memory loss.' },
      { id: 'apoe4_allele', label: 'Memory Risk Gene Present (APOE-4)', desc: 'Carrying the APOE-4 gene variant associated with higher memory risk.' },
      { id: 'early_onset_family', label: 'Early Memory Loss in Family', desc: 'A family member who experienced memory loss before age 65.' },
    ]
  },
  {
    id: 'medications',
    title: 'Medications & Daily Care',
    icon: Pill,
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    factors: [
      { id: 'anticholinergic_load', label: 'Meds Causing Drowsiness or Confusion', desc: 'Regular use of allergy, bladder, or nerve medicines that cause dry mouth or drowsiness.' },
      { id: 'benzodiazepines', label: 'Long-Term Sleeping Pills or Anti-Anxiety Meds', desc: 'Taking prescribed sleeping pills or anxiety medicines regularly.' },
      { id: 'polypharmacy', label: 'Taking 5 or More Daily Medicines', desc: 'Using 5 or more different daily prescription pills.' },
      { id: 'medication_noncompliance', label: 'Frequently Forgetting Doses', desc: 'Occasionally or regularly forgetting to take daily medicines on schedule.' },
    ]
  }
]

export function RiskStep({ risk, setRisk }) {
  const [activeCategoryTab, setActiveCategoryTab] = useState('lifestyle')

  const toggleFactor = (factorId) => {
    setRisk(p => ({ ...p, [factorId]: !p[factorId] }))
  }

  // Calculate total checked count
  const totalChecked = Object.values(risk || {}).filter(Boolean).length

  // Filter factors based on selected tab
  const activeCategory = RISK_CATEGORIES.find(c => c.id === activeCategoryTab) || RISK_CATEGORIES[0]

  return (
    <div className="space-y-5">
      {/* ── HEADER BANNER & RISK LEVEL DISPLAY ────────────────────────────── */}
      <div className="p-4.5 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <HeartPulse className="text-primary" size={22} /> Risk Factors Assessment
          </h2>
          <p className="text-sm text-foreground-muted font-medium mt-0.5">
            Select a category tab below to review daily habits, health history, and medications.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className={`px-4 py-2 rounded-xl text-sm font-extrabold border flex items-center gap-2 ${
            totalChecked === 0
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : totalChecked <= 4
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <ShieldAlert size={16} />
            <span>{totalChecked} Risk Flags Selected</span>
          </div>

          {totalChecked > 0 && (
            <button
              type="button"
              onClick={() => setRisk({})}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-background border border-border text-foreground-muted hover:text-rose-400 hover:border-rose-400/40 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── 4 CATEGORY TABS ONLY ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {RISK_CATEGORIES.map(cat => {
          const CatIcon = cat.icon
          const catCount = cat.factors.filter(f => risk[f.id]).length
          const isActive = activeCategoryTab === cat.id

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryTab(cat.id)}
              className={`p-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-between gap-2 cursor-pointer border ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface hover:bg-surface-hover text-foreground-muted border-border'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <CatIcon size={16} className={isActive ? 'text-white' : cat.iconColor} />
                <span className="truncate">{cat.title}</span>
              </div>
              {catCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold shrink-0 ${
                  isActive ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {catCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── SPACIOUS RISK FACTOR ROWS FOR ACTIVE CATEGORY ──────────────────── */}
      <div className="space-y-3">
        {/* Active Category Header */}
        <div className="flex items-center gap-2 pt-1 border-b border-border/60 pb-2.5">
          <activeCategory.icon size={18} className={activeCategory.iconColor} />
          <h3 className="text-base font-extrabold text-foreground">{activeCategory.title}</h3>
        </div>

        {/* Spacious List Rows */}
        <div className="space-y-2.5">
          {activeCategory.factors.map(f => {
            const isChecked = !!risk[f.id]

            return (
              <motion.div
                key={f.id}
                whileHover={{ scale: 1.002 }}
                onClick={() => toggleFactor(f.id)}
                className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-4 cursor-pointer ${
                  isChecked
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-surface hover:bg-surface-hover border-border'
                }`}
              >
                {/* Factor Label & Description */}
                <div className="space-y-1 max-w-2xl">
                  <h4 className={`text-base font-bold leading-snug ${isChecked ? 'text-primary' : 'text-foreground'}`}>
                    {f.label}
                  </h4>
                  <p className="text-xs text-foreground-muted font-medium leading-relaxed">
                    {f.desc}
                  </p>
                </div>

                {/* Large iOS-style Toggle Switch */}
                <div className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center shrink-0 border ${
                  isChecked ? 'bg-primary border-primary justify-end' : 'bg-surface-secondary border-border justify-start'
                }`}>
                  <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md ${
                      isChecked ? 'bg-white text-primary' : 'bg-foreground-muted/40 text-transparent'
                    }`}
                  >
                    <Check size={14} className="stroke-[3]" />
                  </motion.div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
