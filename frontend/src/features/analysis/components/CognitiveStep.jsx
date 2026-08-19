import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, BarChart2, BookOpen, Maximize2, X, Box, PenTool, Clock } from 'lucide-react'

const GUIDED_QUESTIONS = [
  { id: 'orientation_time', test: 'Basic', category: 'Time & Place', label: 'Time Awareness', prompt: 'What is today’s year, season, date, day of week, and month?', max: 5 },
  { id: 'orientation_place', test: 'Basic', category: 'Time & Place', label: 'Location Awareness', prompt: 'Where are we right now? (State, city, hospital/clinic, floor, room)', max: 5 },
  { id: 'registration', test: 'Basic', category: 'Memory', label: '3 Words Registration', prompt: 'Repeat 3 words: Apple, Table, Penny.', max: 3 },
  { id: 'attention_calc', test: 'Basic', category: 'Focus & Math', label: 'Serial 7s', prompt: 'Count backward from 100 by 7s (100, 93, 86, 79, 72, 65).', max: 5 },
  { id: 'recall', test: 'Basic', category: 'Memory', label: '3 Words Recall', prompt: 'What were the 3 words given earlier? (Apple, Table, Penny)', max: 3 },
  { id: 'naming', test: 'Basic', category: 'Language', label: 'Object Naming', prompt: 'Name these items shown below (Pencil & Watch).', max: 2, hasVisual: 'naming' },
  { id: 'animal_fluency', test: 'Basic', category: 'Language', label: '60-Second Animal Naming', prompt: 'Name as many animals as you can in 1 minute. (Target: 11 or more animals is normal).', max: 3 },
  { id: 'clock_drawing', test: 'Advanced', category: 'Visuals & Drawing', label: 'Clock Drawing Test', prompt: 'Draw a clock face with all 12 numbers and set the hands to 10 minutes past 11 (11:10).', max: 3, hasVisual: 'clock_drawing' },
  { id: 'repetition', test: 'Basic', category: 'Language', label: 'Phrase Repetition', prompt: 'Repeat: "No ifs, ands, or buts."', max: 1 },
  { id: 'three_stage_cmd', test: 'Basic', category: 'Language', label: '3-Step Command', prompt: 'Take paper in right hand, fold in half, put on floor.', max: 3 },
  { id: 'reading_exec', test: 'Basic', category: 'Language', label: 'Read & Action', prompt: 'Read card "CLOSE YOUR EYES" and perform the action.', max: 1, hasVisual: 'fullscreen_text', textToDisplay: 'CLOSE YOUR EYES' },
  { id: 'moca_visuospatial', test: 'Advanced', category: 'Visuals & Drawing', label: 'Pattern & 3D Shape Test', prompt: 'Connect numbers and letters (1-A-2-B) and copy 3D box.', max: 5, hasVisual: '3d_cube' },
  { id: 'moca_abstraction', test: 'Advanced', category: 'Visuals & Drawing', label: 'Similarities', prompt: 'How are Train & Bicycle similar? Watch & Ruler similar?', max: 2 },
]

export function CognitiveStep({ cognData, setCognData, patient }) {
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [patientModalText, setPatientModalText] = useState(null)

  const mmseScores = cognData.mmse_breakdown || {}
  const mocaScores = cognData.moca_breakdown || {}

  const totalMMSE = Object.values(mmseScores).reduce((a, b) => a + Number(b || 0), 0)
  const rawMoCA = Object.values(mocaScores).reduce((a, b) => a + Number(b || 0), 0)

  const eduYears = Number(patient?.education_years || 16)
  const isEduAdjusted = eduYears <= 12 && rawMoCA > 0 && rawMoCA < 30
  const adjustedMoCA = isEduAdjusted ? Math.min(30, rawMoCA + 1) : rawMoCA

  const orientationScore = Number(mmseScores.orientation_time || 0) + Number(mmseScores.orientation_place || 0)
  const memoryScore = Number(mmseScores.registration || 0) + Number(mmseScores.recall || 0)
  const attentionScore = Number(mmseScores.attention_calc || 0)
  const languageScore = Number(mmseScores.naming || 0) + Number(mmseScores.animal_fluency || 0) + Number(mmseScores.repetition || 0) + Number(mmseScores.three_stage_cmd || 0) + Number(mmseScores.reading_exec || 0)
  const visuoScore = Number(mocaScores.clock_drawing || 0) + Number(mocaScores.moca_visuospatial || 0) + Number(mocaScores.moca_abstraction || 0)

  const getBrainStage = () => {
    if (totalMMSE === 0 && rawMoCA === 0) {
      return { stage: 'Pending Assessment', color: 'text-foreground-muted bg-surface-secondary border-border' }
    }
    if (totalMMSE >= 29 && adjustedMoCA >= 26) {
      return { stage: 'Normal Cognition', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' }
    }
    if (totalMMSE >= 27) {
      return { stage: 'Subtle Decline', color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30' }
    }
    if (adjustedMoCA >= 18 || totalMMSE >= 22) {
      return { stage: 'Mild Memory Loss (MCI)', color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' }
    }
    if (totalMMSE >= 19 || adjustedMoCA >= 10) {
      return { stage: 'Moderate Decline', color: 'text-orange-500 bg-orange-500/10 border-orange-500/30' }
    }
    return { stage: 'Significant Impairment', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' }
  }

  const brainStage = getBrainStage()

  const domainScores = {
    orientation: { score: orientationScore, max: 10 },
    memory: { score: memoryScore, max: 6 },
    attention: { score: attentionScore, max: 5 },
    language: { score: languageScore, max: 10 },
    visuospatial: { score: visuoScore, max: 10 }
  }

  useEffect(() => {
    setCognData(prev => ({
      ...prev,
      mmse: totalMMSE,
      moca: adjustedMoCA,
      moca_raw: rawMoCA,
      education_adjusted: isEduAdjusted,
      nia_aa_stage: brainStage.stage,
      domains: domainScores,
    }))
  }, [totalMMSE, adjustedMoCA, rawMoCA, isEduAdjusted, brainStage.stage, orientationScore, memoryScore, attentionScore, languageScore, visuoScore, setCognData])

  const currentQ = GUIDED_QUESTIONS[currentQIndex]
  const currentScore = currentQ.test === 'Basic' ? (mmseScores[currentQ.id] ?? 0) : (mocaScores[currentQ.id] ?? 0)

  const setQuestionScore = (scoreVal) => {
    if (currentQ.test === 'Basic') {
      setCognData(p => ({
        ...p,
        mmse_breakdown: { ...(p.mmse_breakdown || {}), [currentQ.id]: scoreVal }
      }))
    } else {
      setCognData(p => ({
        ...p,
        moca_breakdown: { ...(p.moca_breakdown || {}), [currentQ.id]: scoreVal }
      }))
    }
  }

  return (
    <div className="space-y-5">
      {/* ── FULLSCREEN PATIENT DISPLAY MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {patientModalText && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <button
              type="button"
              onClick={() => setPatientModalText(null)}
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X size={28} />
            </button>

            <div className="space-y-6 max-w-2xl">
              <span className="text-sm font-mono text-cyan-400 uppercase tracking-widest block font-bold">
                Patient Presentation Mode
              </span>

              <div className="p-12 rounded-3xl bg-white/5 border border-white/20 shadow-2xl">
                <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-wide uppercase leading-tight">
                  {patientModalText}
                </h1>
              </div>

              <p className="text-sm text-slate-400 font-medium">
                Instruct patient to read text and perform the action. Click X or anywhere to close.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SCORE HEADER WITH PLAIN EVERYDAY LABELS ───────────────────────── */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BookOpen size={20} className="text-primary" />
              Memory & Brain Test
            </h2>
            <p className="text-sm text-foreground-muted font-medium">Simple guided questions to check memory, recall, and focus skills</p>
          </div>
        </div>

        {/* Score Badges Row with Plain Everyday Labels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-background border border-border space-y-0.5">
            <span className="text-xs text-foreground font-bold block">Basic Memory Check</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-foreground">{totalMMSE} <span className="text-xs text-foreground-muted font-normal">/ 30</span></span>
              <span className="text-[11px] text-foreground-muted">Daily Recall</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-background border border-border space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground font-bold">Advanced Focus & Recall</span>
              {isEduAdjusted && <span className="text-[10px] text-cyan-400 font-bold">+1 Bonus</span>}
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-foreground">{adjustedMoCA} <span className="text-xs text-foreground-muted font-normal">/ 30</span></span>
              <span className="text-[11px] text-foreground-muted">Problem-Solving</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-xl border flex flex-col justify-center ${brainStage.color}`}>
            <span className="text-[11px] font-semibold uppercase tracking-wider block opacity-70">Overall Memory Status</span>
            <span className="text-base font-extrabold leading-tight">{brainStage.stage}</span>
          </div>
        </div>
      </div>

      {/* ── COGNITIVE DOMAIN CATEGORY PERFORMANCE ─────────────────────────── */}
      <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
        <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
          <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <BarChart2 size={14} className="text-primary" />
            Category Performance Breakdown
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: 'Time & Place', score: orientationScore, max: 10, color: 'bg-indigo-500' },
            { label: 'Memory', score: memoryScore, max: 6, color: 'bg-cyan-500' },
            { label: 'Focus & Math', score: attentionScore, max: 5, color: 'bg-emerald-500' },
            { label: 'Language', score: languageScore, max: 10, color: 'bg-amber-500' },
            { label: 'Visuals', score: visuoScore, max: 10, color: 'bg-purple-500' },
          ].map(domain => {
            const pct = Math.round((domain.score / domain.max) * 100)
            return (
              <div key={domain.label} className="p-2 rounded-lg bg-background border border-border/70 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-foreground truncate">{domain.label}</span>
                  <span className="font-mono text-foreground-muted">{domain.score}/{domain.max}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-secondary overflow-hidden">
                  <div className={`h-full rounded-full ${domain.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── QUESTION STEPPER WITH VISUAL TEST CARDS ──────────────────────── */}
      <div className="p-6 rounded-2xl bg-surface border border-border space-y-5">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <span className="text-sm font-bold text-foreground">
            Question {currentQIndex + 1} of {GUIDED_QUESTIONS.length} ({currentQ.category})
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex(i => Math.max(0, i - 1))}
              className="p-2 rounded-xl border border-border disabled:opacity-30 hover:bg-surface-hover min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              disabled={currentQIndex === GUIDED_QUESTIONS.length - 1}
              onClick={() => setCurrentQIndex(i => Math.min(GUIDED_QUESTIONS.length - 1, i + 1))}
              className="p-2 rounded-xl border border-border disabled:opacity-30 hover:bg-surface-hover min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">{currentQ.label}</h3>

            {currentQ.hasVisual === 'fullscreen_text' && (
              <button
                type="button"
                onClick={() => setPatientModalText(currentQ.textToDisplay)}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Maximize2 size={14} /> Present to Patient
              </button>
            )}
          </div>

          <div className="p-4 rounded-xl bg-background border border-border/80">
            <p className="text-base text-foreground font-semibold">
              {currentQ.prompt}
            </p>
          </div>

          {currentQ.hasVisual === 'naming' && (
            <div className="p-4 rounded-xl bg-background border border-border grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-3 rounded-lg bg-surface border border-border space-y-2 text-center">
                <PenTool size={32} className="text-primary" />
                <span className="text-xs font-bold text-foreground">1. Pencil</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-surface border border-border space-y-2 text-center">
                <Clock size={32} className="text-amber-400" />
                <span className="text-xs font-bold text-foreground">2. Watch</span>
              </div>
            </div>
          )}

          {currentQ.hasVisual === 'clock_drawing' && (
            <div className="p-4 rounded-xl bg-background border border-border flex flex-col items-center justify-center space-y-2 text-center">
              <Clock size={44} className="text-emerald-400" />
              <span className="text-xs font-bold text-foreground">Clock Face Reference (11:10)</span>
              <span className="text-[11px] text-foreground-muted">Instruct patient to draw clock contour, numbers 1-12, and set hands to 11:10</span>
            </div>
          )}

          {currentQ.hasVisual === '3d_cube' && (
            <div className="p-4 rounded-xl bg-background border border-border flex flex-col items-center justify-center space-y-2 text-center">
              <Box size={44} className="text-indigo-400" />
              <span className="text-xs font-bold text-foreground">3D Cube Reference Diagram</span>
              <span className="text-[11px] text-foreground-muted">Instruct patient to copy this 3D box structure on paper</span>
            </div>
          )}
        </div>

        <div className="space-y-2 pt-1">
          <span className="text-xs font-semibold text-foreground-muted block">Select Points:</span>
          <div className="flex flex-wrap gap-2.5">
            {Array.from({ length: currentQ.max + 1 }, (_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuestionScore(idx)}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold border min-h-[44px] min-w-[52px] cursor-pointer ${
                  currentScore === idx
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-background hover:bg-surface-hover text-foreground border-border'
                }`}
              >
                {idx} {idx === currentQ.max ? '(Full)' : 'Pts'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
