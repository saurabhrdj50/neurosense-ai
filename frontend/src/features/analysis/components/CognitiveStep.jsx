import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, Clock, ChevronLeft, ChevronRight, Check, Sparkles, RefreshCw, PenTool, Eraser } from 'lucide-react'

const GUIDED_QUESTIONS = [
  { id: 'orientation_time', test: 'MMSE', label: 'Orientation to Time', prompt: 'Ask: What is today’s year, season, date, day of week, and month?', max: 5 },
  { id: 'orientation_place', test: 'MMSE', label: 'Orientation to Place', prompt: 'Ask: Where are we now? (State, county, town, clinic, floor)', max: 5 },
  { id: 'registration', test: 'MMSE', label: '3-Word Registration', prompt: 'Name 3 objects: Apple, Table, Penny. Ask patient to repeat them immediately.', max: 3 },
  { id: 'attention_calc', test: 'MMSE', label: 'Attention & Serial 7s', prompt: 'Ask patient to count backwards from 100 by 7s (100, 93, 86, 79, 72, 65).', max: 5 },
  { id: 'recall', test: 'MMSE', label: '3-Word Delayed Recall', prompt: 'Ask patient to recall the 3 words given earlier (Apple, Table, Penny).', max: 3 },
  { id: 'naming', test: 'MMSE', label: 'Object Naming', prompt: 'Show a pencil and a wristwatch. Ask: What are these called?', max: 2 },
  { id: 'repetition', test: 'MMSE', label: 'Phrase Repetition', prompt: 'Ask patient to repeat: "No ifs, ands, or buts."', max: 1 },
  { id: 'three_stage_cmd', test: 'MMSE', label: '3-Stage Command', prompt: 'Instruct: Take this paper in your right hand, fold it in half, and put it on the floor.', max: 3 },
  { id: 'reading_exec', test: 'MMSE', label: 'Read & Obey', prompt: 'Show text "CLOSE YOUR EYES". Ask patient to read and perform.', max: 1 },
  { id: 'moca_visuospatial', test: 'MoCA', label: 'Visuospatial / Executive', prompt: 'Administer Trail Making B sequence and 3D Cube copy.', max: 5 },
  { id: 'moca_abstraction', test: 'MoCA', label: 'Abstraction Similarity', prompt: 'Ask similarities: Train-Bicycle (Transportation), Watch-Ruler (Measuring tools).', max: 2 },
]

const CDT_CRITERIA = [
  { id: 'cdt_contour', label: 'Closed Circular Contour (+1)', points: 1 },
  { id: 'cdt_numbers', label: 'All 12 Numbers Present & Ordered (+2)', points: 2 },
  { id: 'cdt_spacing', label: 'Symmetrical Spacing Across Quadrants (+1)', points: 1 },
  { id: 'cdt_hands', label: 'Two Distinct Hands From Center (+1)', points: 1 },
  { id: 'cdt_time', label: 'Accurate Target Time (10 past 11) (+1)', points: 1 },
]

export function CognitiveStep({ cognData, setCognData }) {
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [drawingMode, setDrawingMode] = useState('pen')
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef(null)

  const mmseScores = cognData.mmse_breakdown || {}
  const mocaScores = cognData.moca_breakdown || {}
  const cdtScores = cognData.cdt_breakdown || {}

  /* Compute continuous running scores */
  const totalMMSE = Object.values(mmseScores).reduce((a, b) => a + Number(b || 0), 0)
  const totalMoCA = Object.values(mocaScores).reduce((a, b) => a + Number(b || 0), 0)
  const totalCDT = Object.values(cdtScores).reduce((a, b) => a + (b ? 1 : 0), 0) + (cdtScores.cdt_numbers ? 1 : 0)

  useEffect(() => {
    setCognData(prev => ({
      ...prev,
      mmse: totalMMSE,
      moca: totalMoCA,
      clock_draw: totalCDT
    }))
  }, [totalMMSE, totalMoCA, totalCDT, setCognData])

  const currentQ = GUIDED_QUESTIONS[currentQIndex]
  const currentScore = mmseScores[currentQ.id] !== undefined ? mmseScores[currentQ.id] : (mocaScores[currentQ.id] || 0)

  const setQuestionScore = (scoreVal) => {
    if (currentQ.test === 'MMSE') {
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

  const toggleCDTItem = (id) => {
    setCognData(p => ({
      ...p,
      cdt_breakdown: { ...(p.cdt_breakdown || {}), [id]: !p.cdt_breakdown?.[id] }
    }))
  }

  const applyPreset = (type) => {
    if (type === 'normal') {
      setCognData(p => ({
        ...p,
        mmse_breakdown: { orientation_time: 5, orientation_place: 5, registration: 3, attention_calc: 5, recall: 3, naming: 2, repetition: 1, three_stage_cmd: 3, reading_exec: 1 },
        moca_breakdown: { moca_visuospatial: 5, moca_abstraction: 2 },
        cdt_breakdown: { cdt_contour: true, cdt_numbers: true, cdt_spacing: true, cdt_hands: true, cdt_time: true }
      }))
    } else if (type === 'mci') {
      setCognData(p => ({
        ...p,
        mmse_breakdown: { orientation_time: 4, orientation_place: 4, registration: 3, attention_calc: 4, recall: 2, naming: 2, repetition: 1, three_stage_cmd: 3, reading_exec: 1 },
        moca_breakdown: { moca_visuospatial: 3, moca_abstraction: 1 },
        cdt_breakdown: { cdt_contour: true, cdt_numbers: true, cdt_spacing: false, cdt_hands: true, cdt_time: false }
      }))
    }
  }

  /* Canvas Handlers */
  const startDrawing = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const ctx = canvasRef.current.getContext('2d')
    ctx.strokeStyle = drawingMode === 'eraser' ? '#0F172A' : '#6366F1'
    ctx.lineWidth = drawingMode === 'eraser' ? 16 : 3
    ctx.lineCap = 'round'
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    ctx.fillStyle = '#0F172A'
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  return (
    <div className="space-y-5">
      {/* Continuous Running Scores Banner */}
      <div className="p-4 rounded-2xl bg-surface border border-border flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Guided Cognitive Assessment</h2>
          <p className="text-xs text-foreground-muted">Continuous score calculation for MMSE, MoCA, and Clock Drawing.</p>
        </div>

        {/* Live Running Scores Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
            <span className="text-[10px] font-bold text-indigo-400 block uppercase">MMSE</span>
            <span className="text-base font-extrabold text-foreground">{totalMMSE} <span className="text-xs text-foreground-muted">/ 30</span></span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
            <span className="text-[10px] font-bold text-cyan-400 block uppercase">MoCA</span>
            <span className="text-base font-extrabold text-foreground">{totalMoCA} <span className="text-xs text-foreground-muted">/ 30</span></span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <span className="text-[10px] font-bold text-amber-400 block uppercase">CDT</span>
            <span className="text-base font-extrabold text-foreground">{totalCDT} <span className="text-xs text-foreground-muted">/ 6</span></span>
          </div>

          <div className="flex gap-1 pl-2 border-l border-border">
            <button
              type="button"
              onClick={() => applyPreset('normal')}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-surface border border-border hover:bg-surface-hover"
            >
              Preset Normal
            </button>
            <button
              type="button"
              onClick={() => applyPreset('mci')}
              className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20"
            >
              Preset MCI
            </button>
          </div>
        </div>
      </div>

      {/* Guided Question Card Stepper */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
        <div className="flex items-center justify-between text-xs font-semibold text-foreground-muted">
          <span className="flex items-center gap-1.5">
            <Activity size={14} className="text-primary" />
            Question {currentQIndex + 1} of {GUIDED_QUESTIONS.length} ({currentQ.test} Sub-item)
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex(i => Math.max(0, i - 1))}
              className="p-1 rounded-lg border border-border disabled:opacity-30 hover:bg-surface-hover"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              disabled={currentQIndex === GUIDED_QUESTIONS.length - 1}
              onClick={() => setCurrentQIndex(i => Math.min(GUIDED_QUESTIONS.length - 1, i + 1))}
              className="p-1 rounded-lg border border-border disabled:opacity-30 hover:bg-surface-hover"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-bold text-foreground">{currentQ.label}</h3>
          <p className="text-xs text-foreground-muted bg-background p-3 rounded-xl border border-border/60">
            {currentQ.prompt}
          </p>
        </div>

        {/* Score Selection Buttons */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-foreground-muted block">Score Assigned:</label>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: currentQ.max + 1 }, (_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuestionScore(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
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

      {/* Clock Drawing Test (CDT) Canvas Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Canvas */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <h3 className="text-xs font-bold text-foreground">Clock Drawing Test (CDT) Canvas</h3>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDrawingMode('pen')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                  drawingMode === 'pen' ? 'bg-primary text-white' : 'bg-background border border-border text-foreground-muted'
                }`}
              >
                <PenTool size={11} /> Pen
              </button>
              <button
                type="button"
                onClick={() => setDrawingMode('eraser')}
                className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                  drawingMode === 'eraser' ? 'bg-rose-500 text-white' : 'bg-background border border-border text-foreground-muted'
                }`}
              >
                <Eraser size={11} /> Eraser
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                className="px-2 py-1 rounded-lg text-xs font-semibold bg-background border border-border text-foreground-muted hover:text-foreground"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="relative aspect-square max-w-[280px] mx-auto rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={280}
              height={280}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="w-full h-full cursor-crosshair"
            />
            <span className="absolute bottom-2 left-2 text-[10px] text-slate-500 font-mono">"Draw a Clock showing 10 past 11"</span>
          </div>
        </div>

        {/* Right: Sunderland Scoring Criteria Checklist */}
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-2">
            <Sparkles size={16} className="text-amber-400" />
            <h3 className="text-xs font-bold text-foreground">Sunderland Scoring Criteria Checklist</h3>
          </div>

          <div className="space-y-2">
            {CDT_CRITERIA.map(c => {
              const checked = !!cdtScores[c.id]
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCDTItem(c.id)}
                  className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-center justify-between ${
                    checked
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 font-semibold'
                      : 'bg-background border-border text-foreground-muted hover:text-foreground'
                  }`}
                >
                  <span>{c.label}</span>
                  <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                    checked ? 'bg-amber-500 border-amber-500 text-white' : 'border-border'
                  }`}>
                    {checked && <Check size={10} />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
