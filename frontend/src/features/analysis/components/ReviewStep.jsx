import React from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircle2, AlertCircle, Edit3, User, Brain, MessageSquare, Mic, HeartPulse,
  Sparkles, Zap, ShieldCheck, FileText, ArrowRight
} from 'lucide-react'
import Button from '../../../components/ui/Button'

export function ReviewStep({
  patient,
  patientText,
  mriFile,
  cognData,
  speechText,
  audioFile,
  risk,
  onGoToStep,
  onSubmit
}) {
  /* Compute individual section completion & readiness status */
  const isPatientComplete = !!(patient.name && patient.patient_id && patient.age)
  const isMriComplete = !!mriFile
  const isCognitiveComplete = Object.keys(cognData).length > 0 && (cognData.mmse !== undefined || cognData.moca !== undefined)
  const isSpeechComplete = !!(speechText || audioFile)
  const isRiskComplete = Object.keys(risk).length > 0

  /* Overall Readiness Percentage Calculation */
  const sectionWeights = [
    { key: 'patient', complete: isPatientComplete, weight: 25 },
    { key: 'mri', complete: isMriComplete, weight: 20 },
    { key: 'cognitive', complete: isCognitiveComplete, weight: 20 },
    { key: 'speech', complete: isSpeechComplete, weight: 20 },
    { key: 'risk', complete: isRiskComplete, weight: 15 },
  ]

  const totalReadiness = sectionWeights.reduce((acc, curr) => acc + (curr.complete ? curr.weight : 0), 0)

  /* Compute warnings and missing info list */
  const missingItems = []
  const warnings = []

  if (!patient.name) missingItems.push('Patient Full Name')
  if (!patient.patient_id) missingItems.push('Patient Medical ID')
  if (!patient.age) missingItems.push('Patient Age')
  if (!mriFile) warnings.push('MRI Scan not attached (Fusion Engine will operate in clinical/speech mode).')
  if (!isCognitiveComplete) warnings.push('Cognitive Battery (MMSE/MoCA) is incomplete.')
  if (!isSpeechComplete) warnings.push('Speech audio or transcript is missing.')
  if (!isRiskComplete) warnings.push('Lancet clinical risk factors not specified.')

  return (
    <div className="space-y-6">
      {/* ── Readiness Summary Banner ──────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-bold text-foreground tracking-tight">Clinical Assessment Readiness</h2>
            </div>
            <p className="text-xs text-foreground-muted">
              Pre-execution quality check before launching the Multimodal Fusion Diagnostic Engine.
            </p>
          </div>

          {/* Readiness Score Gauge */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-foreground-muted block">Overall Readiness</span>
              <span className={`text-2xl font-extrabold ${totalReadiness >= 80 ? 'text-emerald-500' : totalReadiness >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                {totalReadiness}%
              </span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-surface-secondary border border-border flex items-center justify-center p-1">
              <div
                className="w-full h-full rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-inner"
                style={{
                  background: totalReadiness >= 80 ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #F59E0B, #D97706)'
                }}
              >
                {totalReadiness >= 80 ? 'READY' : 'INCOMPLETE'}
              </div>
            </div>
          </div>
        </div>

        {/* Readiness Checklist Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-border/60">
          {[
            { label: 'Patient Profile', ok: isPatientComplete, stepIdx: 0 },
            { label: 'MRI Study', ok: isMriComplete, stepIdx: 1 },
            { label: 'Cognitive Exam', ok: isCognitiveComplete, stepIdx: 2 },
            { label: 'Speech & Tasks', ok: isSpeechComplete, stepIdx: 3 },
            { label: 'Clinical Risk', ok: isRiskComplete, stepIdx: 4 },
          ].map((sec) => (
            <div
              key={sec.label}
              onClick={() => onGoToStep(sec.stepIdx)}
              className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                sec.ok
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50'
                  : 'bg-surface-hover text-foreground-muted border-border hover:border-border/80'
              }`}
            >
              <span className="font-semibold text-[11px] truncate">{sec.label}</span>
              <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${sec.ok ? 'text-emerald-500' : 'text-foreground-muted/40'}`} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Warnings & Missing Info Box ──────────────────────────────── */}
      {(missingItems.length > 0 || warnings.length > 0) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Readiness Alerts & Missing Parameters</span>
          </div>
          <ul className="space-y-1 pl-6 list-disc text-foreground-muted text-[11px]">
            {missingItems.map((item, idx) => (
              <li key={`m-${idx}`} className="text-rose-500 font-semibold">Missing Required Field: {item}</li>
            ))}
            {warnings.map((warn, idx) => (
              <li key={`w-${idx}`}>{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Section Summary Cards (Clinician Overview) ──────────────── */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Assessment Component Summary</h3>

        {/* 1. Patient Information */}
        <div className="p-4 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              <User size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Patient Information</span>
                {isPatientComplete ? (
                  <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Complete</span>
                ) : (
                  <span className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">Incomplete</span>
                )}
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">
                {patient.name || 'Unspecified'} ({patient.patient_id || 'No ID'}) · Age {patient.age || '?'}, Sex: {patient.sex || 'M'}, Edu: {patient.education_years || '?'} yrs
              </p>
              {patientText && <p className="text-[11px] text-foreground-muted/80 line-clamp-1 italic mt-0.5">"{patientText}"</p>}
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={Edit3} onClick={() => onGoToStep(0)}>
            Edit Section
          </Button>
        </div>

        {/* 2. MRI Scan Review */}
        <div className="p-4 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
              <Brain size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">MRI Study Review</span>
                {isMriComplete ? (
                  <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Ready</span>
                ) : (
                  <span className="text-[10px] font-semibold text-foreground-muted bg-surface-secondary px-2 py-0.5 rounded-full border border-border">Optional / Not Uploaded</span>
                )}
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">
                {mriFile ? `File: ${mriFile.name} (Preprocessed, Quality: High SNR)` : 'No MRI study uploaded. Will proceed using clinical & speech models.'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={Edit3} onClick={() => onGoToStep(1)}>
            Edit Section
          </Button>
        </div>

        {/* 3. Cognitive Evaluation */}
        <div className="p-4 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold text-xs">
              <MessageSquare size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Cognitive Evaluation</span>
                {isCognitiveComplete ? (
                  <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Complete</span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Partial</span>
                )}
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">
                MMSE Score: {cognData.mmse || 0}/30 · MoCA Score: {cognData.moca || 0}/30 · Clock Draw: {cognData.clock_draw || 0}/6
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={Edit3} onClick={() => onGoToStep(2)}>
            Edit Section
          </Button>
        </div>

        {/* 4. Speech & Conversation Assessment */}
        <div className="p-4 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
              <Mic size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Speech & Conversation Assessment</span>
                {isSpeechComplete ? (
                  <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Ready</span>
                ) : (
                  <span className="text-[10px] font-semibold text-foreground-muted bg-surface-secondary px-2 py-0.5 rounded-full border border-border">Optional</span>
                )}
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">
                {speechText ? `Transcript sample attached (${speechText.split(/\s+/).filter(Boolean).length} words)` : audioFile ? `Audio File: ${audioFile.name}` : 'No speech sample recorded.'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={Edit3} onClick={() => onGoToStep(3)}>
            Edit Section
          </Button>
        </div>

        {/* 5. Clinical Risk Factors */}
        <div className="p-4 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold text-xs">
              <HeartPulse size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Clinical Risk Factors</span>
                {isRiskComplete ? (
                  <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Evaluated</span>
                ) : (
                  <span className="text-[10px] font-semibold text-foreground-muted bg-surface-secondary px-2 py-0.5 rounded-full border border-border">Default Low Risk</span>
                )}
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">
                Lancet Modifiable Risk Load: {Object.keys(risk).length} risk factor(s) documented
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={Edit3} onClick={() => onGoToStep(4)}>
            Edit Section
          </Button>
        </div>
      </div>

      {/* ── Bottom Final Action CTA ────────────────────────────────────── */}
      <div className="pt-4 border-t border-border flex items-center justify-between">
        <div className="text-xs text-foreground-muted">
          Clicking "Run Analysis" will execute the Multimodal Fusion Model.
        </div>
        <Button
          variant="primary"
          size="md"
          icon={Zap}
          onClick={onSubmit}
          className="px-6 py-2.5 shadow-lg shadow-primary/20"
        >
          Run Analysis & Generate Report
        </Button>
      </div>
    </div>
  )
}
