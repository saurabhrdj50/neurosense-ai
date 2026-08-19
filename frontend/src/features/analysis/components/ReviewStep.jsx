import React from 'react'
import {
  CheckCircle2, User, Brain, MessageSquare, Mic, HeartPulse,
  ShieldCheck, ChevronRight
} from 'lucide-react'

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
  const isCognitiveComplete = Object.keys(cognData || {}).length > 0
  const isSpeechComplete = !!(speechText || audioFile)
  const isRiskComplete = Object.keys(risk || {}).length > 0

  /* Overall Readiness Percentage Calculation */
  const sectionWeights = [
    { key: 'patient', complete: isPatientComplete, weight: 25 },
    { key: 'mri', complete: isMriComplete, weight: 20 },
    { key: 'cognitive', complete: isCognitiveComplete, weight: 20 },
    { key: 'speech', complete: isSpeechComplete, weight: 20 },
    { key: 'risk', complete: isRiskComplete, weight: 15 },
  ]

  const totalReadiness = sectionWeights.reduce((acc, curr) => acc + (curr.complete ? curr.weight : 0), 0)

  // Count active risk flags
  const activeRiskKeys = Object.keys(risk || {}).filter(k => risk[k] === true)
  const riskFlagCount = activeRiskKeys.length

  return (
    <div className="space-y-5">
      {/* ── READINESS SUMMARY HEADER BANNER ───────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">Ready for Assessment Report</h2>
            <p className="text-sm text-foreground-muted font-medium mt-0.5">
              Review all patient details and test information below before generating your report.
            </p>
          </div>
        </div>

        {/* Readiness Percentage & Status Badge */}
        <div className="flex items-center gap-4 self-start sm:self-auto shrink-0">
          <div className="text-right">
            <span className="text-xs uppercase font-extrabold tracking-wider text-foreground-muted block">Completion Score</span>
            <span className={`text-3xl font-extrabold font-mono leading-none ${totalReadiness >= 60 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {totalReadiness}%
            </span>
          </div>
          <div className={`px-4 py-2.5 rounded-xl text-sm font-extrabold border ${
            totalReadiness >= 60 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          }`}>
            {totalReadiness >= 60 ? 'READY FOR REPORT' : 'INCOMPLETE'}
          </div>
        </div>
      </div>

      {/* ── 5 ENHANCED SECTION CARDS (Fills Viewport Comfortably) ──────────── */}
      <div className="space-y-4">
        <h3 className="text-xs font-extrabold text-foreground-muted uppercase tracking-wider">
          Assessment Summary (Click Any Box to Edit)
        </h3>

        {/* CARD 1: PATIENT INFORMATION */}
        <div
          onClick={() => onGoToStep(0)}
          className="p-5 rounded-2xl bg-surface border border-primary/30 hover:border-primary cursor-pointer transition-all space-y-3.5 group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                <User size={20} />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors">
                  1. Patient Information
                </h4>
                <p className="text-sm text-foreground-muted font-medium">Patient name, age, and ID details</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                isPatientComplete ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}>
                {isPatientComplete ? 'Complete' : 'Needs Details'}
              </span>
              <ChevronRight size={18} className="text-foreground-muted group-hover:text-primary transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/40 text-sm">
            <div className="p-3 rounded-xl bg-background border border-border">
              <span className="text-xs text-foreground-muted block font-semibold">Full Name</span>
              <span className="font-bold text-foreground block text-sm mt-0.5 break-words">{patient.name || 'Not entered'}</span>
            </div>
            <div className="p-3 rounded-xl bg-background border border-border">
              <span className="text-xs text-foreground-muted block font-semibold">Patient ID</span>
              <span className="font-bold font-mono text-primary block text-sm mt-0.5 break-all">{patient.patient_id || 'Not entered'}</span>
            </div>
            <div className="p-3 rounded-xl bg-background border border-border">
              <span className="text-xs text-foreground-muted block font-semibold">Age & Gender</span>
              <span className="font-bold text-foreground block text-sm mt-0.5">{patient.age ? `${patient.age} yrs` : '?'}, {patient.sex || 'M'}</span>
            </div>
            <div className="p-3 rounded-xl bg-background border border-border">
              <span className="text-xs text-foreground-muted block font-semibold">Years of Schooling</span>
              <span className="font-bold text-foreground block text-sm mt-0.5">{patient.education_years || 12} Years</span>
            </div>
          </div>
        </div>

        {/* CARD 2: BRAIN MRI SCAN */}
        <div
          onClick={() => onGoToStep(1)}
          className="p-5 rounded-2xl bg-surface border border-indigo-500/30 hover:border-indigo-500 cursor-pointer transition-all space-y-3.5 group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                <Brain size={20} />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-foreground group-hover:text-indigo-400 transition-colors">
                  2. Brain MRI Scan
                </h4>
                <p className="text-sm text-foreground-muted font-medium">Brain scan image file</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                isMriComplete ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-surface-secondary text-foreground-muted border border-border'
              }`}>
                {isMriComplete ? 'Scan Uploaded' : 'Not Uploaded'}
              </span>
              <ChevronRight size={18} className="text-foreground-muted group-hover:text-indigo-400 transition-colors" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="text-foreground-muted font-semibold shrink-0">Scan Status:</span>
            <span className="font-bold text-indigo-400 sm:text-right leading-normal">
              {mriFile ? `Uploaded File: ${mriFile.name}` : 'No MRI scan uploaded (Analysis will run using Cognitive & Speech tests)'}
            </span>
          </div>
        </div>

        {/* CARD 3: MEMORY & BRAIN TEST */}
        <div
          onClick={() => onGoToStep(2)}
          className="p-5 rounded-2xl bg-surface border border-cyan-500/30 hover:border-cyan-500 cursor-pointer transition-all space-y-3.5 group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold shrink-0">
                <MessageSquare size={20} />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-foreground group-hover:text-cyan-400 transition-colors">
                  3. Memory & Brain Test
                </h4>
                <p className="text-sm text-foreground-muted font-medium">Memory recall, focus, and brain screening scores</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                isCognitiveComplete ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {isCognitiveComplete ? 'Complete' : 'Pending'}
              </span>
              <ChevronRight size={18} className="text-foreground-muted group-hover:text-cyan-400 transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-border/40 text-sm">
            <div className="p-3 rounded-xl bg-background border border-border">
              <span className="text-xs text-foreground-muted block font-semibold">Basic Memory Check</span>
              <span className="font-extrabold text-cyan-400 text-sm block mt-0.5">{cognData.mmse || 0} / 30</span>
            </div>
            <div className="p-3 rounded-xl bg-background border border-border">
              <span className="text-xs text-foreground-muted block font-semibold">Advanced Focus Check</span>
              <span className="font-extrabold text-cyan-400 text-sm block mt-0.5">{cognData.moca || 0} / 30</span>
            </div>
            <div className="p-3 rounded-xl bg-background border border-border">
              <span className="text-xs text-foreground-muted block font-semibold">Animal Naming Test</span>
              <span className="font-bold text-foreground block text-sm mt-0.5">{cognData.animal_fluency ? `${cognData.animal_fluency} animals` : 'Recorded'}</span>
            </div>
            <div className="p-3 rounded-xl bg-background border border-border">
              <span className="text-xs text-foreground-muted block font-semibold">Clock Drawing Test</span>
              <span className="font-bold text-foreground block text-sm mt-0.5">{cognData.clock_draw ? `${cognData.clock_draw} / 5 pts` : 'Recorded'}</span>
            </div>
          </div>
        </div>

        {/* CARD 4: VOICE & SPEECH TEST */}
        <div
          onClick={() => onGoToStep(3)}
          className="p-5 rounded-2xl bg-surface border border-amber-500/30 hover:border-amber-500 cursor-pointer transition-all space-y-3.5 group shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold shrink-0">
                <Mic size={20} />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-foreground group-hover:text-amber-400 transition-colors">
                  4. Voice & Speech Test
                </h4>
                <p className="text-sm text-foreground-muted font-medium">Voice recording and spoken transcript</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                isSpeechComplete ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-surface-secondary text-foreground-muted border border-border'
              }`}>
                {isSpeechComplete ? 'Voice Recorded' : 'Not Recorded'}
              </span>
              <ChevronRight size={18} className="text-foreground-muted group-hover:text-amber-400 transition-colors" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <span className="text-foreground-muted font-semibold shrink-0">Voice Transcript:</span>
            <span className="font-bold text-amber-400 sm:text-right leading-normal">
              {speechText ? `Transcript Saved (${speechText.split(/\s+/).filter(Boolean).length} words)` : audioFile ? `Audio File: ${audioFile.name}` : 'No voice recording attached'}
            </span>
          </div>
        </div>

        {/* CARD 5: HEALTH & RISK FACTORS */}
        <div
          onClick={() => onGoToStep(4)}
          className="p-5 rounded-2xl bg-surface border border-rose-500/30 hover:border-rose-500 cursor-pointer transition-all flex items-center justify-between group shadow-2xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold shrink-0">
              <HeartPulse size={20} />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-foreground group-hover:text-rose-400 transition-colors">
                5. Health & Risk Factors
              </h4>
              <p className="text-sm text-foreground-muted font-medium">Daily habits, heart health, and family history flags</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${
              isRiskComplete ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-surface-secondary text-foreground-muted border border-border'
            }`}>
              {isRiskComplete ? `${riskFlagCount} Risk Flags Selected` : 'No Risk Flags Selected'}
            </span>
            <ChevronRight size={18} className="text-foreground-muted group-hover:text-rose-400 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  )
}
