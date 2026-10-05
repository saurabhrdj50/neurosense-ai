import React, { useState, useEffect } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, BookOpen, Maximize2, X,
  PenTool, Clock, Calendar, Brain, Target, Activity, Info, Sparkles,
  MessageSquare, Eye, Leaf, MapPin, Hash, ListOrdered, Scale,
  Lightbulb, KeyRound, Phone, AlertTriangle, Trash2, CheckCircle2
} from 'lucide-react'

/* ── Cognitive domains covered by the screening profile ─────────────── */
const DOMAIN_CONFIG = {
  orientation:        { label: 'Orientation',        color: 'text-indigo-600 dark:text-indigo-400',  bg: 'bg-indigo-50 dark:bg-indigo-950',      border: 'border-indigo-200 dark:border-indigo-900', bar: 'from-indigo-400 to-indigo-600' },
  immediate_memory:   { label: 'Immediate Memory',   color: 'text-purple-600 dark:text-purple-400',  bg: 'bg-purple-50 dark:bg-purple-950',      border: 'border-purple-200 dark:border-purple-900', bar: 'from-purple-400 to-purple-600' },
  delayed_memory:     { label: 'Delayed Memory',     color: 'text-fuchsia-600 dark:text-fuchsia-400',bg: 'bg-fuchsia-50 dark:bg-fuchsia-950',    border: 'border-fuchsia-200 dark:border-fuchsia-900', bar: 'from-fuchsia-400 to-fuchsia-600' },
  working_memory:     { label: 'Working Memory',     color: 'text-cyan-600 dark:text-cyan-400',      bg: 'bg-cyan-50 dark:bg-cyan-950',          border: 'border-cyan-200 dark:border-cyan-900', bar: 'from-cyan-400 to-cyan-600' },
  attention:          { label: 'Attention',          color: 'text-emerald-600 dark:text-emerald-400',bg: 'bg-emerald-50 dark:bg-emerald-950',    border: 'border-emerald-200 dark:border-emerald-900', bar: 'from-emerald-400 to-emerald-600' },
  verbal_fluency:     { label: 'Verbal Fluency',     color: 'text-teal-600 dark:text-teal-400',      bg: 'bg-teal-50 dark:bg-teal-950',          border: 'border-teal-200 dark:border-teal-900', bar: 'from-teal-400 to-teal-600' },
  language:           { label: 'Language',           color: 'text-rose-600 dark:text-rose-400',      bg: 'bg-rose-50 dark:bg-rose-950',          border: 'border-rose-200 dark:border-rose-900', bar: 'from-rose-400 to-rose-600' },
  executive_function: { label: 'Executive Function', color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-950',      border: 'border-orange-200 dark:border-orange-900', bar: 'from-orange-400 to-orange-600' },
  reasoning:          { label: 'Reasoning',          color: 'text-blue-600 dark:text-blue-400',      bg: 'bg-blue-50 dark:bg-blue-950',          border: 'border-blue-200 dark:border-blue-900', bar: 'from-blue-400 to-blue-600' },
  problem_solving:    { label: 'Problem Solving',    color: 'text-amber-600 dark:text-amber-400',    bg: 'bg-amber-50 dark:bg-amber-950',        border: 'border-amber-200 dark:border-amber-900', bar: 'from-amber-400 to-amber-600' },
  episodic_memory:    { label: 'Episodic Memory',    color: 'text-pink-600 dark:text-pink-400',      bg: 'bg-pink-50 dark:bg-pink-950',          border: 'border-pink-200 dark:border-pink-900', bar: 'from-pink-400 to-pink-600' },
}

/* ── 15-question multi-domain cognitive screening battery ───────────── */
const GUIDED_QUESTIONS = [
  {
    id: 'orient_date', domain: 'orientation', label: "Today's Date",
    subtitle: 'Temporal orientation prompt',
    prompt: "What is today's date, including the day, month, and year?",
    assesses: 'Temporal orientation',
    max: 4, icon: Calendar, visualType: 'calendar_clock',
  },
  {
    id: 'orient_place', domain: 'orientation', label: 'Current Location',
    subtitle: 'Spatial orientation prompt',
    prompt: 'Can you tell me where we are right now? Please name the place, city, and country.',
    assesses: 'Spatial orientation',
    max: 4, icon: MapPin, visualType: 'location',
  },
  {
    id: 'register_3words', domain: 'immediate_memory', label: '3-Word Registration',
    subtitle: 'Immediate registration & attention',
    prompt: 'I will say three words: Apple, Table, River. Please repeat all three words back to me.',
    assesses: 'Immediate registration and attention',
    max: 4, icon: Brain, wordbank: ['Apple', 'Table', 'River'], visualType: 'words_register',
  },
  {
    id: 'delay_recall', domain: 'delayed_memory', label: '3-Word Delayed Recall',
    subtitle: 'Short-term memory after a delay',
    prompt: 'Earlier, I asked you to remember three words. What were those three words?',
    assesses: 'Short-term/delayed memory',
    max: 4, icon: Brain, wordbank: ['Apple', 'Table', 'River'], visualType: 'words_recall',
    clinicianNote: 'For a valid test, do not show the original words again before asking this question.',
  },
  {
    id: 'digit_span_fwd', domain: 'working_memory', label: 'Digit Span (Forward)',
    subtitle: 'Working memory & attention',
    prompt: 'Please repeat these numbers in the same order: 7 – 2 – 9 – 4 – 1.',
    assesses: 'Working memory and attention',
    max: 4, icon: Hash, digits: ['7', '2', '9', '4', '1'], visualType: 'digits',
    reference: ['A reverse version can be added later: repeat 3 – 8 – 1 – 6 backwards.'],
  },
  {
    id: 'serial_7', domain: 'attention', label: 'Serial Subtraction',
    subtitle: 'Sustained attention & mental calculation',
    prompt: 'Starting from 100, subtract 7 repeatedly. What do you get each time?',
    assesses: 'Sustained attention, working memory and mental calculation',
    max: 4, icon: Sparkles, expected: ['93', '86', '79', '72', '65'], visualType: 'serial7',
  },
  {
    id: 'animal_fluency', domain: 'verbal_fluency', label: 'Verbal Fluency',
    subtitle: 'Semantic memory, language retrieval & executive function',
    prompt: 'In one minute, tell me as many different animals as you can think of.',
    assesses: 'Semantic memory, language retrieval and executive function',
    max: 4, icon: MessageSquare, visualType: 'fluency',
    scoring: '11+ animals = 4 · 8–10 = 3 · 5–7 = 1–2 · fewer than 5 = 0',
    record: ['number of unique animals', 'repetitions', 'long pauses', 'response time'],
  },
  {
    id: 'object_naming', domain: 'language', label: 'Object Naming',
    subtitle: 'Naming ability & lexical retrieval',
    prompt: 'What is this object called?',
    assesses: 'Naming ability and lexical retrieval',
    max: 4, icon: Eye, objects: [
      { name: 'Watch', Icon: Clock },
      { name: 'Key', Icon: KeyRound },
      { name: 'Pen', Icon: PenTool },
      { name: 'Telephone', Icon: Phone },
    ], visualType: 'naming',
    record: ['Spoken response contains information beyond simply correct/incorrect.'],
  },
  {
    id: 'sentence_compreh', domain: 'language', label: 'Sentence Comprehension',
    subtitle: 'Language comprehension & attention',
    prompt: '"Before you touch the blue card, point to the red card." What should you do first?',
    assesses: 'Language comprehension and attention',
    max: 4, icon: MessageSquare, visualType: 'sentence',
    reference: ['Expected concept: point to the red card first.'],
  },
  {
    id: 'multi_step_cmd', domain: 'executive_function', label: 'Multi-Step Instructions',
    subtitle: 'Comprehension, sequencing & working memory',
    prompt: 'Please pick up this paper, fold it in half, and place it on the table.',
    assesses: 'Comprehension, sequencing, working memory and executive functioning',
    max: 4, icon: ListOrdered, steps: ['Pick up paper', 'Fold it in half', 'Place it on the table'], visualType: 'multi_step',
  },
  {
    id: 'logical_reason', domain: 'reasoning', label: 'Logical Reasoning',
    subtitle: 'Deductive reasoning prompt',
    prompt: 'If all roses are flowers, and some flowers are red, can we conclude that all roses are red?',
    assesses: 'Logical reasoning',
    max: 4, icon: Scale, visualType: 'logic',
    reference: ['Expected concept: No.'],
  },
  {
    id: 'abstraction', domain: 'reasoning', label: 'Abstraction',
    subtitle: 'Abstract thinking & conceptualization',
    prompt: 'What is similar about a train and a car?',
    assesses: 'Abstract thinking and conceptualization',
    max: 4, icon: Brain, visualType: 'abstraction',
    reference: ['Strong response identifies the shared category: "Both are means of transportation."'],
  },
  {
    id: 'months_reverse', domain: 'executive_function', label: 'Months in Reverse',
    subtitle: 'Working memory & executive sequencing',
    prompt: 'Tell me the months of the year in reverse order, starting with December.',
    assesses: 'Working memory, attention and executive sequencing',
    max: 4, icon: Calendar, months: ['Dec', 'Nov', 'Oct', 'Sep', 'Aug', 'Jul', 'Jun', 'May', 'Apr', 'Mar', 'Feb', 'Jan'], visualType: 'months',
    scoring: '12 correct = 4 · 8–11 = 3 · 4–7 = 1–2 · fewer than 4 = 0',
  },
  {
    id: 'problem_solve', domain: 'problem_solving', label: 'Situational Problem Solving',
    subtitle: 'Reasoning, planning, judgment & problem solving',
    prompt: 'Imagine that you are at home and suddenly realize that you have left your house keys inside the locked house. What would you do?',
    assesses: 'Reasoning, planning, judgment and problem solving',
    max: 4, icon: Lightbulb, visualType: 'problem',
    record: ['Do not score only the final answer — record the reasoning expressed in the response.'],
  },
  {
    id: 'auto_memory', domain: 'episodic_memory', label: 'Everyday Memory',
    subtitle: 'Episodic memory, sequencing & narrative',
    prompt: 'Can you describe what you did yesterday from the time you woke up until you went to sleep?',
    assesses: 'Episodic memory, sequencing, narrative organization and temporal consistency',
    max: 4, icon: BookOpen, visualType: 'chronology',
    record: ['pauses', 'repetitions', 'incomplete sentences', 'lexical diversity', 'speech rate', 'hesitation', 'semantic coherence', 'narrative structure', 'information density'],
  },
]

const QUESTION_BY_ID = Object.fromEntries(GUIDED_QUESTIONS.map(q => [q.id, q]))

export function CognitiveStep({ cognData, setCognData }) {
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [patientModalText, setPatientModalText] = useState(null)
  const [revealWords, setRevealWords] = useState(false)

  const breakdown = cognData.screening_breakdown || {}

  const answeredIds = GUIDED_QUESTIONS
    .map(q => q.id)
    .filter(id => breakdown[id] !== undefined && breakdown[id] !== '' && breakdown[id] !== null)

  const questionsCompleted = answeredIds.length
  const rawTotal = answeredIds.reduce((s, id) => s + Number(breakdown[id] || 0), 0)
  const rawMax = answeredIds.reduce((s, id) => s + QUESTION_BY_ID[id].max, 0)
  const compositeScore = rawMax > 0 ? Math.round((rawTotal / rawMax) * 100) : 0

  const computeBrainStage = (completed, score) => {
    if (completed === 0) {
      return {
        stage: 'Pending Assessment',
        color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        iconColor: 'text-amber-500',
        message: 'Complete the assessment to see your results'
      }
    }
    if (completed < GUIDED_QUESTIONS.length) {
      return {
        stage: 'Screening In Progress',
        color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20',
        badgeBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
        iconColor: 'text-sky-500',
        message: `Score all ${GUIDED_QUESTIONS.length} items before interpreting this screening profile`
      }
    }
    if (score >= 80) {
      return {
        stage: 'Normal Cognition',
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
        iconColor: 'text-emerald-500',
        message: 'Screening profile indicates healthy functioning across cognitive domains'
      }
    }
    if (score >= 70) {
      return {
        stage: 'Subtle Decline',
        color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
        iconColor: 'text-cyan-500',
        message: 'Slight variations noted; consistent with mild age-associated changes'
      }
    }
    if (score >= 50) {
      return {
        stage: 'Mild Memory Loss (MCI)',
        color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
        iconColor: 'text-amber-500',
        message: 'Screening profile aligns with mild cognitive impairment criteria'
      }
    }
    if (score >= 30) {
      return {
        stage: 'Moderate Decline',
        color: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20',
        badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
        iconColor: 'text-orange-500',
        message: 'Moderate cognitive deficit across several domains'
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

  const brainStage = computeBrainStage(questionsCompleted, compositeScore)

  useEffect(() => {
    const bd = cognData.screening_breakdown || {}
    const answered = GUIDED_QUESTIONS.filter(
      q => bd[q.id] !== undefined && bd[q.id] !== '' && bd[q.id] !== null
    )
    const rawTotal = answered.reduce((s, q) => s + Number(bd[q.id] || 0), 0)
    const rawMax = answered.reduce((s, q) => s + q.max, 0)
    const comp = rawMax > 0 ? Math.round((rawTotal / rawMax) * 100) : 0
    const mmse = Math.round(comp * 0.3)
    const stage = computeBrainStage(answered.length, comp)

    const domains = {}
    GUIDED_QUESTIONS.forEach(q => {
      const val = bd[q.id]
      if (val === undefined || val === '' || val === null) return
      const d = domains[q.domain] || { score: 0, max: 0 }
      d.score += Number(val)
      d.max += q.max
      domains[q.domain] = d
    })
    Object.keys(domains).forEach(k => {
      domains[k].pct = domains[k].max > 0 ? Math.round((domains[k].score / domains[k].max) * 100) : 0
    })

    setCognData(prev => {
      const unchanged =
        prev.composite_score === comp &&
        prev.questions_completed === answered.length &&
        prev.nia_aa_stage === stage.stage &&
        prev.mmse === mmse &&
        prev.moca === mmse &&
        JSON.stringify(prev.domains) === JSON.stringify(domains) &&
        (prev.screening_breakdown || {}) === bd
      if (unchanged) return prev
      return {
        ...prev,
        screening_breakdown: bd,
        domains,
        composite_score: comp,
        questions_completed: answered.length,
        nia_aa_stage: stage.stage,
        mmse,
        moca: mmse,
      }
    })
    // Only re-run when the actual answers change — depending on the whole
    // cognData object while calling setCognData inside caused an infinite
    // render loop (stage object identity never matched), freezing the UI
    // so points could not be selected.
    }, [cognData.screening_breakdown, setCognData])

  const currentQ = GUIDED_QUESTIONS[currentQIndex]
  const isCurrentAnswered = Object.prototype.hasOwnProperty.call(breakdown, currentQ.id)
  const currentScore = breakdown[currentQ.id]

  const setQuestionScore = (questionId, scoreVal) => {
    setCognData(p => ({
      ...p,
      screening_breakdown: { ...(p.screening_breakdown || {}), [questionId]: scoreVal }
    }))
  }

  const clearCurrentScore = () => {
    setCognData(prev => {
      const nextBreakdown = { ...(prev.screening_breakdown || {}) }
      delete nextBreakdown[currentQ.id]
      return { ...prev, screening_breakdown: nextBreakdown }
    })
  }

  const clearAssessment = () => {
    setCognData({})
    setCurrentQIndex(0)
    setRevealWords(false)
  }

  const progressPercentage = Math.round(((currentQIndex + 1) / GUIDED_QUESTIONS.length) * 100)

  /* ── Right-column reference visual for the current question ────────── */
  const renderReferenceVisual = () => {
    if (currentQ.visualType === 'naming') {
      return (
        <div className="w-full space-y-3 z-10">
          <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block">
            Object Naming Reference
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {currentQ.objects.map((obj, i) => {
              const ObjIcon = obj.Icon
              return (
                <div key={obj.name} className="p-3 rounded-xl bg-surface border border-border shadow-2xs flex flex-col items-center space-y-1">
                  <ObjIcon size={32} className="text-primary" />
                  <span className="text-xs font-bold text-foreground">{i + 1}. {obj.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    if (currentQ.visualType === 'words_recall') {
      return (
        <div className="w-full space-y-3 z-10">
          <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block">
            Delayed Recall
          </span>
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 text-left space-y-1.5">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Clinician Note
            </span>
            <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300 leading-snug">
              {currentQ.clinicianNote}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setRevealWords(v => !v)}
            className="text-xs font-bold text-sky-600 dark:text-sky-400 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 hover:bg-sky-500/20 cursor-pointer transition-colors"
          >
            {revealWords ? 'Hide' : 'Reveal'} original words (clinician only)
          </button>
          <AnimatePresence>
            {revealWords && (
              <Motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 overflow-hidden"
              >
                {currentQ.wordbank.map(w => (
                  <span key={w} className="px-3 py-1.5 rounded-full bg-surface border border-border text-sm font-extrabold text-foreground shadow-2xs">
                    {w}
                  </span>
                ))}
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }

    if (currentQ.visualType === 'words_register') {
      return (
        <div className="w-full space-y-3 z-10">
          <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block">
            3 Words to Register
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {currentQ.wordbank.map(w => (
              <span key={w} className="px-3.5 py-2 rounded-xl bg-surface border border-border text-base font-extrabold text-foreground shadow-2xs">
                {w}
              </span>
            ))}
          </div>
        </div>
      )
    }

    if (currentQ.visualType === 'digits') {
      return (
        <div className="w-full space-y-3 z-10">
          <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block">
            Digit String
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {currentQ.digits.map(d => (
              <span key={d} className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xl font-extrabold flex items-center justify-center font-mono shadow-2xs">
                {d}
              </span>
            ))}
          </div>
          {currentQ.reference?.map(r => (
            <p key={r} className="text-[11px] text-foreground-muted max-w-[220px] mx-auto font-medium">{r}</p>
          ))}
        </div>
      )
    }

    if (currentQ.visualType === 'serial7') {
      return (
        <div className="w-full space-y-3 z-10">
          <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block">
            Expected Sequence
          </span>
          <div className="flex flex-wrap justify-center gap-1.5">
            <span className="px-3 py-1.5 rounded-lg bg-surface border border-border text-base font-extrabold text-foreground font-mono shadow-2xs">100</span>
            <span className="text-slate-400 self-center font-bold">→</span>
            {currentQ.expected.map(d => (
              <span key={d} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm font-extrabold font-mono shadow-2xs">
                {d}
              </span>
            ))}
          </div>
        </div>
      )
    }

    if (currentQ.visualType === 'months') {
      return (
        <div className="w-full space-y-3 z-10">
          <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block">
            Starting Point: December
          </span>
          <div className="flex flex-wrap justify-center gap-1">
            {currentQ.months.map(m => (
              <span key={m} className="px-2 py-1 rounded-md bg-surface border border-border text-[11px] font-extrabold text-foreground shadow-2xs">
                {m}
              </span>
            ))}
          </div>
          {currentQ.scoring && (
            <p className="text-[11px] text-foreground-muted max-w-[240px] mx-auto font-medium">{currentQ.scoring}</p>
          )}
        </div>
      )
    }

    if (currentQ.visualType === 'multi_step') {
      return (
        <div className="w-full space-y-2.5 z-10">
          <span className="text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block">
            3 Steps in Order
          </span>
          {currentQ.steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-surface border border-border shadow-2xs">
              <span className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-extrabold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-xs font-bold text-foreground">{s}</span>
            </div>
          ))}
        </div>
      )
    }

    return (
      <div className="space-y-3 z-10 w-full">
        {currentQ.reference?.length > 0 && (
          <div className="w-full space-y-1.5">
            <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider block">
              Assessor Reference
            </span>
            {currentQ.reference.map(r => (
              <p key={r} className="text-[11px] font-medium text-sky-800 dark:text-sky-300 bg-sky-500/5 border border-sky-500/20 rounded-lg px-3 py-2 text-left">
                {r}
              </p>
            ))}
          </div>
        )}

        {currentQ.record?.length > 0 && (
          <div className="w-full space-y-1.5">
            <span className="text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider block">
              Record from Speech
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {currentQ.record.map(r => (
                <span key={r} className="px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-[10px] font-bold text-violet-700 dark:text-violet-300 shadow-2xs">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {currentQ.scoring && !currentQ.record && currentQ.reference?.length === 0 && (
          <p className="text-[11px] text-foreground-muted max-w-[240px] mx-auto font-medium">{currentQ.scoring}</p>
        )}

        {!currentQ.reference?.length && !currentQ.record?.length && (
          <div className="space-y-3">
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
    )
  }

  const currentDomain = DOMAIN_CONFIG[currentQ.domain] || { label: 'Cognitive' }

  return (
    <div className="space-y-5 select-none">
      {/* ── FULLSCREEN PATIENT PRESENTATION MODAL ───────────────────────── */}
      <AnimatePresence>
        {patientModalText && (
          <Motion.div
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
                <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-wide leading-tight">
                  {patientModalText}
                </h1>
              </div>

              <p className="text-sm text-slate-400 font-medium">
                Present this prompt to the patient. Click X or press Escape to close.
              </p>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP HEADER ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-50/80 via-blue-50/50 to-indigo-50/40 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-800/80 border border-sky-200/60 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="absolute top-0 right-0 w-96 h-full pointer-events-none opacity-40 dark:opacity-20 bg-radial from-cyan-400/20 via-blue-400/10 to-transparent" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Brain size={28} className="drop-shadow" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                Cognitive Screening Assessment
              </h2>
              <p className="text-sm text-foreground-muted font-medium mt-0.5">
                {GUIDED_QUESTIONS.length}-question battery spanning multiple cognitive domains
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 self-start lg:self-auto pt-1 lg:pt-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs italic font-semibold text-sky-700 dark:text-sky-300 font-serif">
                A healthier mind,
              </p>
              <p className="text-xs italic font-semibold text-indigo-700 dark:text-indigo-300 font-serif">
                brighter tomorrows
              </p>
            </div>

            <div className="relative w-11 h-11 rounded-xl bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-xs">
              <Leaf size={20} className="text-emerald-500" />
              <Sparkles size={12} className="absolute -top-1 -right-1 text-sky-400 animate-pulse" />
            </div>
          </div>
        </div>

        {questionsCompleted > 0 && (
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={clearAssessment}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 size={14} /> Clear scores
            </button>
          </div>
        )}

        {/* ── TOP SUMMARY CARDS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
          <div className="p-4 rounded-xl bg-surface/90 dark:bg-slate-900/90 border border-sky-200/70 dark:border-slate-800 space-y-2.5 shadow-xs hover:border-sky-300 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <BookOpen size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">Questions Completed</span>
                <span className="text-[11px] text-foreground-muted">Of {GUIDED_QUESTIONS.length} screening items</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground">{questionsCompleted}</span>
                <span className="text-sm font-bold text-foreground-muted">/ {GUIDED_QUESTIONS.length}</span>
              </div>
              <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                {Math.round((questionsCompleted / GUIDED_QUESTIONS.length) * 100)}%
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-sky-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(4, (questionsCompleted / GUIDED_QUESTIONS.length) * 100))}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface/90 dark:bg-slate-900/90 border border-purple-200/70 dark:border-slate-800 space-y-2.5 shadow-xs hover:border-purple-300 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Target size={18} />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">Composite Screening Score</span>
                <span className="text-[11px] text-foreground-muted">Normalized across answered domains</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground">{compositeScore}</span>
                <span className="text-sm font-bold text-foreground-muted">/ 100</span>
              </div>
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                {compositeScore}%
              </span>
            </div>

            <div className="h-1.5 w-full rounded-full bg-purple-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(4, compositeScore))}%` }}
              />
            </div>
          </div>

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

      {/* ── QUESTION STEPPER ────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border space-y-5 shadow-xs">
        <div className="flex flex-wrap gap-1.5" aria-label="Assessment questions">
          {GUIDED_QUESTIONS.map((question, index) => {
            const answered = Object.prototype.hasOwnProperty.call(breakdown, question.id)
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => { setCurrentQIndex(index); setRevealWords(false) }}
                aria-label={`Question ${index + 1}: ${question.label}${answered ? ', scored' : ', not scored'}`}
                className={`w-8 h-8 rounded-lg text-xs font-extrabold border transition-colors ${
                  currentQIndex === index
                    ? 'bg-primary text-primary-foreground border-primary'
                    : answered
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-background text-foreground-muted border-border hover:bg-surface-hover'
                }`}
              >
                {answered ? <CheckCircle2 size={15} className="mx-auto" /> : index + 1}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <BookOpen size={18} />
            </div>
            <div>
              <span className="text-sm font-extrabold text-foreground">
                Question {currentQIndex + 1} of {GUIDED_QUESTIONS.length}
              </span>
              <span className={`text-xs font-semibold ml-2 px-2 py-0.5 rounded-full ${currentDomain.bg} ${currentDomain.color} border ${currentDomain.border}`}>
                {currentDomain.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-secondary border border-border text-xs font-mono font-bold text-foreground">
              <div className="w-20 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span>{currentQIndex + 1} / {GUIDED_QUESTIONS.length}</span>
            </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
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
                      {currentQ.subtitle || 'Cognitive screening prompt'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPatientModalText(currentQ.prompt)}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
                >
                  <Maximize2 size={14} /> Present to Patient
                </button>
              </div>

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
                  <span className="text-[11px] font-semibold text-foreground-muted block pt-1">
                    <span className="text-sky-700 dark:text-sky-300 font-bold uppercase tracking-wider pr-1">Assesses:</span>
                    {currentQ.assesses}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-border/60">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-xs font-extrabold text-foreground-muted uppercase tracking-wider block">
                  Select Points:
                </span>
                {currentQ.scoring && (
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                    {currentQ.scoring}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Points for ${currentQ.label}`}>
                  {Array.from({ length: currentQ.max + 1 }, (_, score) => {
                    const active = isCurrentAnswered && Number(currentScore) === score
                    return (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setQuestionScore(currentQ.id, score)}
                        aria-pressed={active}
                        className={`min-h-[44px] min-w-[44px] px-3 rounded-xl text-sm font-extrabold border transition-colors cursor-pointer ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-background text-foreground border-border hover:border-primary hover:text-primary'
                        }`}
                      >
                        {score}
                      </button>
                    )
                  })}
                </div>
                <select
                  aria-label={`Points for ${currentQ.label} (dropdown)`}
                  value={isCurrentAnswered ? String(currentScore) : ''}
                  onChange={(event) => {
                    if (event.target.value === '') return
                    setQuestionScore(currentQ.id, Number(event.target.value))
                  }}
                  className="min-h-[48px] min-w-[210px] rounded-xl border border-border bg-background px-3 text-sm font-extrabold text-foreground cursor-pointer outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
                >
                  <option value="" disabled>Select score (0–{currentQ.max})</option>
                  {Array.from({ length: currentQ.max + 1 }, (_, score) => (
                    <option key={score} value={String(score)}>{score} / {currentQ.max} {score === currentQ.max ? '(Full points)' : ''}</option>
                  ))}
                </select>
                {isCurrentAnswered && (
                  <button
                    type="button"
                    onClick={clearCurrentScore}
                    className="px-3 py-2.5 rounded-xl text-sm font-bold border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors min-h-[44px]"
                  >
                    Clear item
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-b from-sky-50/50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900/90 dark:to-slate-800/80 border border-sky-200/60 dark:border-slate-700/80 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xs">
            <div className="absolute w-44 h-44 rounded-full bg-sky-300/20 dark:bg-sky-500/10 blur-2xl pointer-events-none" />
            {renderReferenceVisual()}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60 text-xs text-foreground-muted font-medium">
          <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold">
            <Leaf size={14} className="text-emerald-500" />
            <span>Cognitive Screening Assessment</span>
          </div>
          <span className="font-serif italic text-[11px]">
            Know Your Mind · Build a Brighter Tomorrow
          </span>
        </div>
      </div>
    </div>
  )
}
