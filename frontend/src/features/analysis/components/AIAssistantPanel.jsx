import React from 'react'
import { Sparkles, AlertTriangle, CheckCircle2, Clock, ArrowRight, Info } from 'lucide-react'

export function AIAssistantPanel({ step, patient, mriFile, cognData, speechText, audioFile, risk }) {
  const getStepInsights = () => {
    switch (step) {
      case 0: { // Patient Info
        const missing = []
        if (!patient.name) missing.push('Patient Name')
        if (!patient.age) missing.push('Age')
        if (!patient.patient_id) missing.push('Medical ID')

        if (missing.length > 0) {
          return {
            status: 'warning',
            summary: `Missing essential field(s): ${missing.join(', ')}.`,
            suggestion: 'Use Quick Chips to select presenting symptoms without typing.',
            nextStep: 'Complete essential fields, then proceed to MRI Review.',
            estTime: '6 minutes'
          }
        }
        return {
          status: 'success',
          summary: 'Demographic baseline complete.',
          suggestion: 'Symptom chips attached. Optional details available under "More Details".',
          nextStep: 'Proceed to MRI Review.',
          estTime: '5 minutes'
        }
      }
      case 1: { // MRI
        if (!mriFile) {
          return {
            status: 'info',
            summary: 'No MRI scan uploaded yet.',
            suggestion: 'Upload a 2D/3D MRI study or click "Load Sample Case" in Step 1 to auto-attach.',
            nextStep: 'Proceed to Cognitive Assessment when ready.',
            estTime: '4 minutes'
          }
        }
        return {
          status: 'success',
          summary: 'MRI scan uploaded and preprocessed successfully.',
          suggestion: 'AI extracted hippocampal atrophy and ventricular enlargement metrics.',
          nextStep: 'Proceed to Cognitive Assessment.',
          estTime: '4 minutes'
        }
      }
      case 2: { // Cognitive
        const mmse = cognData.mmse || 0
        const moca = cognData.moca || 0
        const hasData = Object.keys(cognData).length > 0
        if (!hasData) {
          return {
            status: 'info',
            summary: 'Cognitive examination in progress.',
            suggestion: 'Answer guided items individually or select quick clinical presets.',
            nextStep: 'Complete MMSE / MoCA items and Clock Drawing test.',
            estTime: '3 minutes'
          }
        }
        return {
          status: 'success',
          summary: `MMSE (${mmse}/30) & MoCA (${moca}/30) scores recorded.`,
          suggestion: 'Clock Drawing canvas auto-scored via Vision AI.',
          nextStep: 'Proceed to Speech & Conversation Assessment.',
          estTime: '2 minutes'
        }
      }
      case 3: { // Speech
        const hasSpeech = !!(speechText || audioFile)
        if (!hasSpeech) {
          return {
            status: 'info',
            summary: 'Speech recording or audio sample pending.',
            suggestion: 'Administer guided speech tasks or record spontaneous patient conversation.',
            nextStep: 'Complete speech task recording or load sample task response.',
            estTime: '2 minutes'
          }
        }
        return {
          status: 'success',
          summary: 'Speech sample transcribed and analyzed.',
          suggestion: 'Clinician-friendly fluency and emotional cards generated.',
          nextStep: 'Proceed to Clinical Risk Factors.',
          estTime: '1 minute'
        }
      }
      case 4: { // Risk
        const hasRisk = Object.keys(risk).length > 0
        if (!hasRisk) {
          return {
            status: 'info',
            summary: 'Clinical risk factor inventory open.',
            suggestion: 'Toggle modifiable vascular, lifestyle, and medical comorbidities.',
            nextStep: 'Complete risk factors, then review final readiness.',
            estTime: '1 minute'
          }
        }
        return {
          status: 'success',
          summary: 'Lancet risk load index calculated.',
          suggestion: 'Modifiable risk profile compiled.',
          nextStep: 'Proceed to Final Review Page.',
          estTime: '< 1 minute'
        }
      }
      case 5: { // Review
        return {
          status: 'success',
          summary: 'All examination modules complete and ready.',
          suggestion: 'Verify overall readiness score before executing fusion analysis.',
          nextStep: 'Click "Run Analysis" to generate clinical diagnostic report.',
          estTime: 'Instant'
        }
      }
      default:
        return { status: 'info', summary: 'Ready', suggestion: '', nextStep: '', estTime: '' }
    }
  }

  const insight = getStepInsights()

  return (
    <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs space-y-4 text-base">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2.5 font-bold text-lg text-foreground">
          <Sparkles size={20} className="text-primary shrink-0" />
          <span>AI Clinical Assistant</span>
        </div>
        <span className="flex items-center gap-1.5 text-sm font-mono font-semibold text-foreground-muted bg-surface-secondary px-3 py-1 rounded-lg border border-border">
          <Clock size={14} className="shrink-0" /> Est. {insight.estTime}
        </span>
      </div>

      <div className="flex items-start gap-3.5 text-foreground-muted">
        {insight.status === 'warning' ? (
          <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
        ) : insight.status === 'success' ? (
          <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
        ) : (
          <Info size={20} className="text-primary shrink-0 mt-0.5" />
        )}
        <div className="space-y-1.5">
          <p className="font-extrabold text-base text-foreground leading-snug">{insight.summary}</p>
          <p className="text-[15px] leading-relaxed text-foreground-muted font-medium">{insight.suggestion}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 pt-3.5 text-base font-bold text-primary border-t border-border leading-snug">
        <ArrowRight size={18} className="shrink-0 text-primary" />
        <span>Recommendation: {insight.nextStep}</span>
      </div>
    </div>
  )
}
