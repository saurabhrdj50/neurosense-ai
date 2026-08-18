import React from 'react'
import { motion } from 'framer-motion'
import { 
  Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, 
  Stethoscope, Activity, ArrowRight, Brain, FileCheck
} from 'lucide-react'

export function WorkflowTracker({ currentStep = 3 }) {
  const steps = [
    { id: 1, label: "Patient" },
    { id: 2, label: "Assessment" },
    { id: 3, label: "AI Processing" },
    { id: 4, label: "Clinical Review" },
    { id: 5, label: "Report" },
    { id: 6, label: "Follow-up" },
    { id: 7, label: "Longitudinal Monitoring" }
  ]

  return (
    <div className="rounded-2xl p-4 shadow-xl border mb-6" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between overflow-x-auto gap-2 py-1 scrollbar-none">
        {steps.map((step, idx) => {
          const isDone = step.id < currentStep
          const isCurrent = step.id === currentStep

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition ${
                  isDone 
                    ? 'bg-emerald-500 text-white' 
                    : isCurrent 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/50 ring-2 ring-indigo-400' 
                    : 'border text-muted-foreground'
                }`} style={!isDone && !isCurrent ? { background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' } : {}}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : step.id}
                </div>
                <span className={`text-xs font-medium ${
                  isCurrent ? 'font-semibold' : 'opacity-70'
                }`} style={{ color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                  {step.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-0.5 w-6 sm:w-10 rounded ${isDone ? 'bg-emerald-500/60' : 'bg-slate-300 dark:bg-slate-800'}`} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export function SmartClinicalInsights({ patientData }) {
  const rawInsights = patientData?.clinical_decision_support || patientData?.clinicalInsights
  const insights = {
    keyFindings: rawInsights?.keyFindings || [
      "Patient presents with structural atrophy in medial temporal lobe region.",
      "Speech acoustic analysis confirms elevated hesitation pauses during recall test.",
      "MMSE score of 23 indicates mild cognitive impairment progression."
    ],
    riskFactors: rawInsights?.riskFactors || [
      "Elevated CSF p-tau181 levels (32.4 pg/mL).",
      "Decreased hippocampal volume below age-adjusted 25th percentile.",
      "Family history of late-onset neurodegenerative conditions."
    ],
    protectiveFactors: rawInsights?.protectiveFactors || [
      "High educational attainment & ongoing cognitive engagement.",
      "Normal cardiovascular profile and controlled lipid parameters."
    ],
    recommendations: rawInsights?.recommendations || [
      { test: "PET Amyloid Imaging Scan", confidence: 0.95, category: "Imaging" },
      { test: "Repeat Neuropsychological Battery in 6 months", confidence: 0.91, category: "Cognitive" },
      { test: "Plasma ApoE ε4 Genotyping", confidence: 0.88, category: "Laboratory" },
      { test: "Acetylcholinesterase Inhibitor Evaluation", confidence: 0.84, category: "Treatment" }
    ]
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 shadow-xl border space-y-6" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Smart Clinical Decision Insights</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI-generated evidence-based decision support flags</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Key Findings */}
          <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Key Clinical Findings
            </h4>
            <ul className="space-y-2">
              {insights.keyFindings.map((item, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Risk Factors */}
          <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Risk Factors
            </h4>
            <ul className="space-y-2">
              {insights.riskFactors.map((item, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Protective Factors */}
          <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Protective Factors
            </h4>
            <ul className="space-y-2">
              {insights.protectiveFactors.map((item, i) => (
                <li key={i} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recommended Action Cards */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Suggested Diagnostic & Follow-Up Procedures
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {insights.recommendations.map((rec, i) => (
              <div key={i} className="p-3.5 rounded-xl border space-y-2" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {rec.category}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    Conf: {Math.round(rec.confidence * 100)}%
                  </span>
                </div>
                <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{rec.test}</div>
                <div className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <FileCheck className="w-3 h-3 text-emerald-500" />
                  AI Clinical Support Tag
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
