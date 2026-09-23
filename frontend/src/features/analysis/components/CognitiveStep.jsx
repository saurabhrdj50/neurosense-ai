import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, BarChart2, BookOpen, Maximize2, X,
  Box, PenTool, Clock, Calendar, Brain, Target, Activity,
  Info, Sparkles, MessageSquare, Eye, CheckCircle, Leaf
} from 'lucide-react'

const GUIDED_QUESTIONS = [
  { id: 'orientation_time', test: 'Basic', category: 'Time & Place', label: 'Time Awareness', subtitle: 'Test your awareness of current time and date', prompt: 'What is today’s year, season, date, day of week, and month?', max: 5, icon: Clock, visualType: 'calendar_clock' },
  { id: 'orientation_place', test: 'Basic', category: 'Time & Place', label: 'Location Awareness', subtitle: 'Test orientation to immediate surroundings', prompt: 'Where are we right now? (State, city, hospital/clinic, floor, room)', max: 5, icon: Calendar, visualType: 'location' },
  { id: 'registration', test: 'Basic', category: 'Memory', label: '3 Words Registration', subtitle: 'Immediate verbal memory encoding test', prompt: 'Repeat 3 words: Apple, Table, Penny.', max: 3, icon: Brain, visualType: 'words_register' },
  { id: 'attention_calc', test: 'Basic', category: 'Focus & Math', label: 'Serial 7s', subtitle: 'Working memory and mental arithmetic test', prompt: 'Count backward from 100 by 7s (100, 93, 86, 79, 72, 65).', max: 5, icon: Sparkles, visualType: 'serial7' },
  { id: 'recall', test: 'Basic', category: 'Memory', label: '3 Words Recall', subtitle: 'Delayed verbal memory retention test', prompt: 'What were the 3 words given earlier? (Apple, Table, Penny)', max: 3, icon: Brain, visualType: 'words_recall' },
  { id: 'naming', test: 'Basic', category: 'Language', label: 'Object Naming', subtitle: 'Visual confrontation naming examination', prompt: 'Name these items shown below (Pencil & Watch).', max: 2, icon: MessageSquare, hasVisual: 'naming', visualType: 'naming' },
  { id: 'animal_fluency', test: 'Basic', category: 'Language', label: '60-Second Animal Naming', subtitle: 'Semantic verbal fluency assessment', prompt: 'Name as many animals as you can in 1 minute. (Target: 11 or more animals is normal).', max: 3, icon: MessageSquare, visualType: 'animal_fluency' },
  { id: 'clock_drawing', test: 'Advanced', category: 'Visuals & Drawing', label: 'Clock Drawing Test', subtitle: 'Executive visuospatial construction test', prompt: 'Draw a clock face with all 12 numbers and set the hands to 10 minutes past 11 (11:10).', max: 3, icon: Clock, hasVisual: 'clock_drawing', visualType: 'clock_drawing' },
  { id: 'repetition', test: 'Basic', category: 'Language', label: 'Phrase Repetition', subtitle: 'Complex linguistic repetition test', prompt: 'Repeat: "No ifs, ands, or buts."', max: 1, icon: MessageSquare, visualType: 'quote' },
  { id: 'three_stage_cmd', test: 'Basic', category: 'Language', label: '3-Step Command', subtitle: 'Sequential motor execution & comprehension', prompt: 'Take paper in right hand, fold in half, put on floor.', max: 3, icon: MessageSquare, visualType: 'command' },
  { id: 'reading_exec', test: 'Basic', category: 'Language', label: 'Read & Action', subtitle: 'Reading comprehension and motor execution', prompt: 'Read card "CLOSE YOUR EYES" and perform the action.', max: 1, icon: Eye, hasVisual: 'fullscreen_text', textToDisplay: 'CLOSE YOUR EYES', visualType: 'fullscreen_text' },
  { id: 'moca_visuospatial', test: 'Advanced', category: 'Visuals & Drawing', label: 'Pattern & 3D Shape Test', subtitle: 'Visuoconstructional 3D Cube & Trail Making', prompt: 'Connect numbers and letters (1-A-2-B) and copy 3D box.', max: 5, icon: Box, hasVisual: '3d_cube', visualType: '3d_cube' },
  { id: 'moca_abstraction', test: 'Advanced', category: 'Visuals & Drawing', label: 'Similarities', subtitle: 'Conceptual abstract reasoning test', prompt: 'How are Train & Bicycle similar? Watch & Ruler similar?', max: 2, icon: Brain, visualType: 'abstraction' },
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
      return {
        stage: 'Pending Assessment',
        color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        iconColor: 'text-amber-500',
        message: 'Complete the assessment to see your results'
      }
    }
    if (totalMMSE >= 29 && adjustedMoCA >= 26) {
      return {
        stage: 'Normal Cognition',
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        iconColor: 'text-emerald-500',
        message: 'Scores indicate healthy memory & cognitive function'
      }
    }
    if (totalMMSE >= 27) {
      return {
        stage: 'Subtle Decline',
        color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        iconColor: 'text-cyan-500',
        message: 'Slight variations noted; consistent with mild age-associated changes'
      }
    }
    if (adjustedMoCA >= 18 || totalMMSE >= 22) {
      return {
        stage: 'Mild Memory Loss (MCI)',
        color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        iconColor: 'text-amber-500',
        message: 'Scores align with mild cognitive impairment criteria'
      }
    }
    if (totalMMSE >= 19 || adjustedMoCA >= 10) {
      return {
        stage: 'Moderate Decline',
        color: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20',
        badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
        iconColor: 'text-orange-500',
        message: 'Moderate cognitive score deficit across domains'
      }
    }
    return {
      stage: 'Significant Impairment',
      color: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      iconColor: 'text-rose-500',
      message: 'Substantial decline noted; clinical consultation recommended'
    }
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

  const progressPercentage = Math.round(((currentQIndex + 1) / GUIDED_QUESTIONS.length) * 100)

  return (
    <div className="space-y-5 select-none">
      {/* ── FULLSCREEN PATIENT PRESENTATION MODAL ───────────────────────── */}
      <AnimatePresence>
        {patientModalText && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
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

              <div className="p-12 sm:p-16 rounded-3xl bg-white/5 border border-white/20 shadow-2xl">
                <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-wide uppercase leading-tight">
                  {patientModalText}
                </h1>
              </div>

              <p className="text-sm text-slate-400 font-medium">
                Instruct patient to read the text and perform the action. Click X or press Escape to close.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP HEADER WITH CALMING CLINICAL ARTWORK ─────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-50/80 via-blue-50/50 to-indigo-50/40 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-800/80 border border-sky-200/60 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 right-0 w-96 h-full pointer-events-none opacity-40 dark:opacity-20 bg-radial from-cyan-400/20 via-blue-400/10 to-transparent" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Brain size={28} className="drop-shadow" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                Memory & Brain Test
              </h2>
              <p className="text-sm text-foreground-muted font-medium mt-0.5">
                Simple guided questions to check memory, recall, and focus skills
              </p>
            </div>
          </div>

          {/* Slogan & Cognitive Keywords Pillar */}
          <div className="flex items-center gap-4 self-start lg:self-auto pt-1 lg:pt-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs italic font-semibold text-sky-700 dark:text-sky-300 font-serif">
                A healthier mind,
              </p>
              <p className="text-xs italic font-semibold text-indigo-700 dark:text-indigo-300 font-serif">
                brighter tomorrows
              </p>
            </div>

            {/* Glowing Brain / Leaf decorative visual */}
            <div className="relative w-11 h-11 rounded-xl bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs">
              <Leaf size={20} className="text-emerald-500" />
              <Sparkles size={12} className="absolute -top-1 -right-1 text-sky-400 animate-pulse" />
            </div>

            {/* Micro Tags */}
            <div className="flex flex-col text-[10px] font-bold text-foreground-muted uppercase tracking-wider pl-1 border-l border-sky-200 dark:border-slate-700">
              <span className="text-sky-600 dark:text-sky-400">Focus</span>
              <span className="text-indigo-600 dark:text-indigo-400">Recall</span>
              <span className="text-emerald-600 dark:text-emerald-400">Learn</span>
              <span className="text-purple-600 dark:text-purple-400">Grow</span>
            </div>
          </div>
        </div>

        {/* ── TOP 3 SUMMARY SCORE & STATUS CARDS ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
          {/* Card 1: Basic Memory Check */}
          <div className="p-4 rounded-xl bg-surface/90 dark:bg-slate-900/90 border border-sky-200/70 dark:border-slate-800 space-y-2.5 shadow-xs hover:border-sky-300 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <Brain size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">Basic Memory Check</span>
                <span className="text-[11px] text-foreground-muted">Daily Recall</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground">{totalMMSE}</span>
                <span className="text-sm font-bold text-foreground-muted">/ 30</span>
              </div>
              <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                {Math.round((totalMMSE / 30) * 100)}%
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-sky-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(4, (totalMMSE / 30) * 100))}%` }}
              />
            </div>
          </div>

          {/* Card 2: Advanced Focus & Recall */}
          <div className="p-4 rounded-xl bg-surface/90 dark:bg-slate-900/90 border border-purple-200/70 dark:border-slate-800 space-y-2.5 shadow-xs hover:border-purple-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Target size={18} />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">Advanced Focus & Recall</span>
                  <span className="text-[11px] text-foreground-muted">Problem-Solving</span>
                </div>
              </div>

              {isEduAdjusted && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                  +1 Bonus
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground">{adjustedMoCA}</span>
                <span className="text-sm font-bold text-foreground-muted">/ 30</span>
              </div>
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                {Math.round((adjustedMoCA / 30) * 100)}%
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-purple-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(4, (adjustedMoCA / 30) * 100))}%` }}
              />
            </div>
          </div>

          {/* Card 3: Overall Memory Status */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between shadow-xs ${brainStage.color}`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider block opacity-75">
                  OVERALL MEMORY STATUS
                </span>
                <div className="w-7 h-7 rounded-lg bg-white/40 dark:bg-white/10 flex items-center justify-center">
                  <Activity size={16} className={brainStage.iconColor} />
                </div>
              </div>
              <span className="text-xl font-extrabold leading-tight block mt-1">
                {brainStage.stage}
              </span>
            </div>

            <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-black/5 dark:border-white/10 flex items-center gap-1.5">
              <Info size={13} className="shrink-0 opacity-80" />
              <span className="text-[11px] font-medium leading-tight truncate">
                {brainStage.message}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── CATEGORY PERFORMANCE BREAKDOWN ───────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/60 pb-2.5">
          <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <BarChart2 size={18} className="text-primary" />
            Category Performance Breakdown
          </h3>
          <span className="text-xs italic text-foreground-muted font-medium">
            Track your performance across different cognitive skills
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            { label: 'Time & Place', score: orientationScore, max: 10, icon: Calendar, color: 'bg-indigo-500', barGradient: 'from-blue-500 to-indigo-500', border: 'border-indigo-200 dark:border-indigo-900/40', iconBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400' },
            { label: 'Memory', score: memoryScore, max: 6, icon: Brain, color: 'bg-purple-500', barGradient: 'from-purple-500 to-pink-500', border: 'border-purple-200 dark:border-purple-900/40', iconBg: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400' },
            { label: 'Focus & Math', score: attentionScore, max: 5, icon: Sparkles, color: 'bg-emerald-500', barGradient: 'from-emerald-400 to-teal-500', border: 'border-emerald-200 dark:border-emerald-900/40', iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' },
            { label: 'Language', score: languageScore, max: 10, icon: MessageSquare, color: 'bg-rose-500', barGradient: 'from-rose-400 to-pink-500', border: 'border-rose-200 dark:border-rose-900/40', iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400' },
            { label: 'Visuals', score: visuoScore, max: 10, icon: Eye, color: 'bg-amber-500', barGradient: 'from-amber-400 to-orange-500', border: 'border-amber-200 dark:border-amber-900/40', iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
          ].map(domain => {
            const pct = Math.round((domain.score / domain.max) * 100)
            const IconComp = domain.icon
            return (
              <div
                key={domain.label}
                className={`p-3 rounded-xl bg-background border ${domain.border} space-y-2 shadow-2xs hover:shadow-xs transition-shadow`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <div className={`w-6 h-6 rounded-md ${domain.iconBg} flex items-center justify-center shrink-0`}>
                      <IconComp size={13} />
                    </div>
                    <span className="font-bold text-foreground text-xs truncate">{domain.label}</span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between text-xs pt-0.5">
                  <span className="font-extrabold text-foreground text-sm font-mono">{domain.score} <span className="text-[11px] text-foreground-muted font-normal">/ {domain.max}</span></span>
                  <span className="text-[11px] font-bold text-foreground-muted">{pct}%</span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-surface-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${domain.barGradient} transition-all duration-500`}
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── QUESTION STEPPER WITH VISUAL REFERENCE CARDS ─────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border space-y-5 shadow-xs">
        {/* Stepper Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <BookOpen size={18} />
            </div>
            <div>
              <span className="text-sm font-extrabold text-foreground">
                Question {currentQIndex + 1} of {GUIDED_QUESTIONS.length}
              </span>
              <span className="text-xs font-semibold text-primary ml-2 px-2 py-0.5 rounded-full bg-primary/10">
                {currentQ.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Linear Progress Pill Bar */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-secondary border border-border text-xs font-mono font-bold text-foreground">
              <div className="w-20 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span>{currentQIndex + 1} / {GUIDED_QUESTIONS.length}</span>
            </div>

            {/* Stepper Chevron Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex(i => Math.max(0, i - 1))}
                className="p-2 rounded-xl border border-border disabled:opacity-30 hover:bg-surface-hover text-foreground min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer transition-colors"
                title="Previous Question"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                disabled={currentQIndex === GUIDED_QUESTIONS.length - 1}
                onClick={() => setCurrentQIndex(i => Math.min(GUIDED_QUESTIONS.length - 1, i + 1))}
                className="p-2 rounded-xl border border-border disabled:opacity-30 hover:bg-surface-hover text-foreground min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer transition-colors"
                title="Next Question"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Question Details and Visuals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {/* Left / Main: Question Title, Prompt, and Points Selection (2 Cols) */}
          <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              {/* Question Label with Accent Indicator Bar */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-10 rounded-full bg-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                        <currentQ.icon size={15} />
                      </div>
                      <h3 className="text-xl font-extrabold text-foreground tracking-tight">
                        {currentQ.label}
                      </h3>
                    </div>
                    <p className="text-xs text-foreground-muted font-medium mt-0.5">
                      {currentQ.subtitle || 'Cognitive examination prompt'}
                    </p>
                  </div>
                </div>

                {currentQ.hasVisual === 'fullscreen_text' && (
                  <button
                    type="button"
                    onClick={() => setPatientModalText(currentQ.textToDisplay)}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
                  >
                    <Maximize2 size={14} /> Present to Patient
                  </button>
                )}
              </div>

              {/* Prompt Card Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50/70 to-blue-50/40 dark:from-slate-900 dark:to-slate-800/80 border border-sky-200/80 dark:border-slate-700 flex items-start gap-3.5 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <currentQ.icon size={20} />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                    Question Prompt
                  </span>
                  <p className="text-base sm:text-lg text-foreground font-bold leading-snug">
                    {currentQ.prompt}
                  </p>
                </div>
              </div>
            </div>

            {/* Select Points Radio Pill Buttons */}
            <div className="space-y-2 pt-3 border-t border-border/60">
              <span className="text-xs font-extrabold text-foreground-muted uppercase tracking-wider block">
                Select Points:
              </span>

              <div className="flex flex-wrap gap-2 sm:gap-2.5">
                {Array.from({ length: currentQ.max + 1 }, (_, idx) => {
                  const isSelected = currentScore === idx
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setQuestionScore(idx)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-extrabold border transition-all flex items-center gap-2 min-h-[44px] min-w-[62px] cursor-pointer shadow-2xs ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-sm ring-2 ring-primary/20'
                          : 'bg-background hover:bg-surface-hover text-foreground border-border'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-white bg-white' : 'border-slate-400 dark:border-slate-500'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </span>
                      <span>
                        {idx} {idx === currentQ.max ? '(Full)' : 'Pts'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Col: Calming Reference Illustration / Test Graphic */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-sky-50/50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900/90 dark:to-slate-800/80 border border-sky-200/60 dark:border-slate-700/80 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xs">
            {/* Ambient bubble glow */}
            <div className="absolute w-44 h-44 rounded-full bg-sky-300/20 dark:bg-sky-500/10 blur-2xl pointer-events-none" />

            {currentQ.hasVisual === 'naming' ? (
              <div className="w-full space-y-3 z-10">
                <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block">
                  Object Naming Reference
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-surface border border-border shadow-2xs flex flex-col items-center space-y-1">
                    <PenTool size={32} className="text-primary" />
                    <span className="text-xs font-bold text-foreground">1. Pencil</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border shadow-2xs flex flex-col items-center space-y-1">
                    <Clock size={32} className="text-amber-500" />
                    <span className="text-xs font-bold text-foreground">2. Watch</span>
                  </div>
                </div>
              </div>
            ) : currentQ.hasVisual === 'clock_drawing' ? (
              <div className="w-full space-y-2.5 z-10">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                  <Clock size={36} />
                </div>
                <span className="text-xs font-bold text-foreground block">
                  Clock Face Reference (11:10)
                </span>
                <p className="text-[11px] text-foreground-muted max-w-[200px] mx-auto">
                  Instruct patient to draw clock contour, numbers 1–12, and hands set to 11:10.
                </p>
              </div>
            ) : currentQ.hasVisual === '3d_cube' ? (
              <div className="w-full space-y-2.5 z-10">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
                  <Box size={36} />
                </div>
                <span className="text-xs font-bold text-foreground block">
                  3D Cube Structure Diagram
                </span>
                <p className="text-[11px] text-foreground-muted max-w-[200px] mx-auto">
                  Instruct patient to copy this 3D box structure onto paper.
                </p>
              </div>
            ) : (
              /* Calming Default Mindfulness / Health Graphic */
              <div className="space-y-3 z-10">
                <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-800 border border-sky-200 dark:border-slate-700 flex items-center justify-center mx-auto shadow-sm text-sky-500 dark:text-sky-400">
                  <Calendar size={38} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-serif italic text-sky-800 dark:text-sky-300">
                    "Small steps to a sharper you"
                  </p>
                  <span className="text-[10px] font-mono text-foreground-muted tracking-wider block mt-1">
                    Guidance for clinical assessor
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER BRAND TAGLINE ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60 text-xs text-foreground-muted font-medium">
          <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold">
            <Leaf size={14} className="text-emerald-500" />
            <span>Cognitive Health Assessment</span>
          </div>
          <span className="font-serif italic text-[11px]">
            Know Your Mind · Build a Brighter Tomorrow
          </span>
        </div>
      </div>
    </div>
  )
}
