import React, { useState } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Brain, TrendingUp, TrendingDown, Minus,
  ChevronDown, Activity, Zap, Eye, MessageSquare, HeartPulse,
  CheckCircle2, AlertTriangle, Info, ArrowRight
} from 'lucide-react'

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function modIcon(source = '') {
  const s = source.toLowerCase()
  if (s.includes('mri') || s.includes('neuro')) return Brain
  if (s.includes('cognitive') || s.includes('memory')) return Activity
  if (s.includes('speech') || s.includes('audio') || s.includes('phonet')) return MessageSquare
  if (s.includes('risk') || s.includes('clinical') || s.includes('health')) return HeartPulse
  return Sparkles
}

function modColor(source = '') {
  const s = source.toLowerCase()
  if (s.includes('mri') || s.includes('neuro')) return { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', bar: 'bg-indigo-500', hex: '#6366f1' }
  if (s.includes('cognitive') || s.includes('memory')) return { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', bar: 'bg-cyan-500', hex: '#06b6d4' }
  if (s.includes('speech') || s.includes('audio') || s.includes('phonet')) return { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', bar: 'bg-purple-500', hex: '#a855f7' }
  if (s.includes('risk') || s.includes('clinical') || s.includes('health')) return { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', bar: 'bg-rose-500', hex: '#f43f5e' }
  return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', bar: 'bg-emerald-500', hex: '#10b981' }
}

function DirectionChip({ direction }) {
  const d = (direction || '').toLowerCase()
  if (d.includes('increase') || d.includes('risk')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <TrendingUp size={9} /> Risk Factor
      </span>
    )
  }
  if (d.includes('decrease') || d.includes('protect')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <TrendingDown size={9} /> Protective
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Minus size={9} /> Mixed
    </span>
  )
}

/* ─── Section A: Factor Attribution Bars ───────────────────────────────── */

function FactorAttributionPanel({ featureAttribution, fusion = {}, mri = {}, results = {} }) {
  const [expanded, setExpanded] = useState(null)

  let factors = []
  const rawAttrs = featureAttribution || {}
  if (Array.isArray(rawAttrs)) {
    factors = rawAttrs
  } else if (rawAttrs && Array.isArray(rawAttrs.factors)) {
    factors = rawAttrs.factors
  }

  // If featureAttribution is not explicitly provided, synthesize clinical factors from multimodal signals
  if (factors.length === 0) {
    const contributions = fusion?.modality_contributions || {}
    const mriData = mri || results?.mri || {}
    const cog = results?.cognitive || {}
    const speechNlp = results?.audio_transcription || {}
    const sentiment = results?.sentiment || {}
    const risk = results?.risk_profile || {}

    if (mriData?.stage && mriData.stage !== 'Error') {
      const isImpaired = !mriData.stage.toLowerCase().includes('normal') && !mriData.stage.toLowerCase().includes('non')
      factors.push({
        source: 'MRI Scan',
        modality: 'mri',
        feature: `Structural Brain Pattern (${mriData.stage})`,
        importance: Number(contributions.mri || 40.0),
        direction: isImpaired ? 'Risk Factor' : 'Protective',
        rationale: `Deep neural network feature representation of cortical and hippocampal structures indicating ${mriData.stage}.`,
        value: `${mriData.stage} (${Number(mriData.confidence || 0).toFixed(1)}% model certainty)`,
      })
    }

    if (cog.composite_score !== undefined) {
      const score = Number(cog.composite_score)
      factors.push({
        source: 'Cognitive',
        modality: 'cognitive',
        feature: 'Cognitive Screening Composite',
        importance: Number(contributions.cognitive || 25.0),
        direction: score < 70 ? 'Risk Factor' : 'Protective',
        rationale: 'Standardized questionnaire testing multi-domain cognitive faculties including orientation, memory, and task execution.',
        value: `${score}/100 score`,
      })
    }

    if (speechNlp.dementia_probability !== undefined && speechNlp.dementia_probability !== null) {
      const p = Number(speechNlp.dementia_probability)
      factors.push({
        source: 'Speech & Language',
        modality: 'speech',
        feature: 'Speech NLP Linguistic Classifier',
        importance: Number(contributions.sentiment || contributions.speech || 20.0),
        direction: p >= 0.5 ? 'Risk Factor' : 'Protective',
        rationale: 'Language model analysis of transcribed speech evaluating syntactic complexity, hesitation, and semantic coherence.',
        value: `P(dementia) = ${p.toFixed(2)}`,
      })
    } else if (sentiment?.cognitive_marker_count) {
      factors.push({
        source: 'Speech & Language',
        modality: 'speech',
        feature: 'Acoustic & Lexical Markers',
        importance: Number(contributions.sentiment || 20.0),
        direction: sentiment.cognitive_marker_count > 2 ? 'Risk Factor' : 'Protective',
        rationale: 'Acoustic pause rate, pitch variability, and hesitation marker analysis extracted from patient voice recording.',
        value: `${sentiment.cognitive_marker_count} markers detected`,
      })
    }

    if (risk.overall_risk_score !== undefined) {
      const score = Number(risk.overall_risk_score)
      factors.push({
        source: 'Clinical Risk',
        modality: 'risk',
        feature: 'Clinical Risk Factor Profile',
        importance: Number(contributions.risk || 15.0),
        direction: score > 35 ? 'Risk Factor' : 'Protective',
        rationale: 'Cardiovascular, lifestyle, and demographic risk factors evaluated against clinical dementia progression thresholds.',
        value: `${score}/100 cumulative risk (${risk.risk_label || 'Evaluated'})`,
      })
    }
  }

  if (factors.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl border border-border bg-background/50 text-foreground-muted text-xs">
        <Info size={14} className="shrink-0 text-indigo-400" />
        No clinical evidence modalities completed yet. Complete an assessment to see multimodal attribution.
      </div>
    )
  }

  const maxImp = Math.max(...factors.map(f => parseFloat(f.importance || f.weight || 0)))

  return (
    <div className="space-y-3">
      {factors.slice(0, 8).map((f, idx) => {
        const source = f.source || f.modality || 'Multimodal'
        const feature = f.feature || f.name || 'Clinical Signal'
        const importance = parseFloat(f.importance ?? f.weight ?? 0)
        const barWidth = maxImp > 0 ? Math.round((importance / maxImp) * 100) : importance
        const colors = modColor(source)
        const Icon = modIcon(source)
        const isOpen = expanded === idx

        return (
          <Motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.3 }}
            className={`rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 ${isOpen ? `${colors.bg} ${colors.border}` : 'bg-background/50 border-border hover:border-border'}`}
            onClick={() => setExpanded(isOpen ? null : idx)}
          >
            {/* Row header */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colors.bg} border ${colors.border}`}>
                <Icon size={14} style={{ color: colors.hex }} />
              </div>

              {/* Label + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-foreground truncate">{feature}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <DirectionChip direction={f.direction} />
                    <span className={`text-xs font-mono font-extrabold ${colors.text}`}>
                      {importance.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                  <Motion.div
                    className={`h-full ${colors.bar} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ delay: idx * 0.04 + 0.1, duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <span className={`text-[10px] font-semibold ${colors.text} opacity-70 mt-0.5 block`}>{source}</span>
              </div>

              {/* Expand arrow */}
              <Motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={14} className="text-foreground-muted shrink-0" />
              </Motion.div>
            </div>

            {/* Expanded rationale */}
            <AnimatePresence>
              {isOpen && (
                <Motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className={`px-4 pb-4 pt-1 border-t ${colors.border}`}>
                    <p className="text-[11px] text-foreground leading-relaxed font-medium">
                      {f.rationale || 'This feature contributed to the final diagnostic assessment based on its measured deviation from normative reference values.'}
                    </p>
                    {f.value !== undefined && f.value !== null && (
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                        <Zap size={9} /> Observed Value: {String(f.value)}
                      </div>
                    )}
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>
          </Motion.div>
        )
      })}
    </div>
  )
}

/* ─── Section B: Grad-CAM Brain Activation Map ──────────────────────────── */

function GradCAMPanel({ mri }) {
  const gradcamImage = mri?.gradcam_image_base64 || mri?.gradcam_image
  const heatmapLayer = mri?.gradcam_heatmap
  const originalImage = mri?.mri_image
  const interactive = Boolean(heatmapLayer && originalImage)

  // 'overlay' blends the transparent heat layer over the original scan with a
  // live opacity slider; 'heatmap' and 'original' show the raw layers.
  const [view, setView] = useState('overlay')
  const [opacity, setOpacity] = useState(55)

  const explanation = mri?.heatmap_explanation || 'Warmer (red/orange) regions indicate areas where the model placed the most attention when classifying this scan. Cooler (blue) regions had minimal influence on the decision.'
  const stage = mri?.stage || 'Unknown'
  const confidence = parseFloat(mri?.confidence || 0)

  const colorLegend = [
    { color: '#ef4444', label: 'High Activation', desc: 'Strongest influence on model decision' },
    { color: '#f97316', label: 'Moderate-High', desc: 'Significant activation region' },
    { color: '#eab308', label: 'Moderate', desc: 'Secondary influence area' },
    { color: '#22c55e', label: 'Low', desc: 'Minimal influence' },
    { color: '#3b82f6', label: 'Inactive', desc: 'No decision influence' },
  ]

  const VIEW_MODES = interactive
    ? [
        { id: 'overlay', label: 'Overlay' },
        { id: 'heatmap', label: 'Heatmap' },
        { id: 'original', label: 'Original' },
      ]
    : []

  return (
    <div className="space-y-4">
      {gradcamImage ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Heatmap Image */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={11} className="text-indigo-400" /> Grad-CAM Activation Overlay
              </p>
              {interactive && (
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-surface border border-border" role="group" aria-label="Grad-CAM view mode">
                  {VIEW_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setView(m.id)}
                      aria-pressed={view === m.id}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${
                        view === m.id
                          ? 'bg-indigo-500 text-white shadow-xs'
                          : 'text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-indigo-500/30 bg-black group">
              {interactive && view !== 'heatmap' && (
                <img
                  src={`data:image/png;base64,${originalImage}`}
                  alt="Original MRI scan"
                  className="w-full object-contain max-h-72"
                />
              )}
              {interactive && view !== 'original' && (
                <img
                  src={`data:image/png;base64,${heatmapLayer}`}
                  alt="Grad-CAM activation heatmap layer"
                  className={view === 'overlay'
                    ? 'absolute inset-0 w-full h-full object-contain'
                    : 'w-full object-contain max-h-72'}
                  style={view === 'overlay' ? { opacity: opacity / 100 } : undefined}
                />
              )}
              {!interactive && (
                <img
                  src={`data:image/png;base64,${gradcamImage}`}
                  alt="Grad-CAM brain activation heatmap"
                  className="w-full object-contain max-h-72 transform group-hover:scale-[1.02] transition-transform duration-500"
                />
              )}

              {/* Opacity slider (overlay mode only) */}
              {interactive && view === 'overlay' && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3.5 pt-8">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider shrink-0">
                      Heat intensity
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={opacity}
                      aria-label="Heatmap overlay opacity"
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="flex-1 h-1.5 accent-indigo-400 cursor-pointer"
                    />
                    <span className="text-[10px] font-mono font-bold text-indigo-300 w-9 text-right">
                      {opacity}%
                    </span>
                  </div>
                </div>
              )}

              {/* Badges overlay */}
              <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 text-indigo-300 border border-indigo-500/40 backdrop-blur-sm">
                  {mri?.model || 'ResNet-50'} · Layer4
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 text-emerald-300 border border-emerald-500/40 backdrop-blur-sm">
                  {confidence.toFixed(1)}% Confidence
                </span>
              </div>
              {(!interactive || view !== 'overlay') && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-6">
                  <p className="text-[11px] font-semibold text-white/90">Prediction: <span className="text-indigo-300">{stage}</span></p>
                </div>
              )}
            </div>
          </div>

          {/* Color Legend + Explanation */}
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">Activation Legend</p>
              <div className="space-y-1.5">
                {colorLegend.map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-foreground block">{item.label}</span>
                      <span className="text-[10px] text-foreground-muted truncate block">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-border bg-background/60 space-y-1.5">
              <p className="text-[10px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1">
                <Info size={10} className="text-indigo-400" /> How to Read This
              </p>
              <p className="text-[11px] text-foreground-muted leading-relaxed">{explanation}</p>
              {interactive && (
                <p className="text-[11px] text-foreground-muted leading-relaxed">
                  Switch between Overlay, Heatmap and Original, and drag the heat-intensity slider to inspect how much the model relied on each region.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border border-border bg-background/40 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Brain size={24} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Grad-CAM Not Available</p>
            <p className="text-xs text-foreground-muted mt-1 max-w-xs">
              Grad-CAM heatmap is generated only when an MRI image is uploaded. Upload a brain scan in the analysis to see which brain regions the model focused on.
            </p>
          </div>
        </div>
      )}

      {/* Decision Summary from model */}
      {mri?.decision_summary && (
        <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-1">
          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={10} /> Model Decision Summary
          </p>
          <p className="text-xs text-foreground leading-relaxed font-medium">{mri.decision_summary}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Section C: Decision Narrative ─────────────────────────────────────── */

function extractText(val) {
  if (!val) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object') {
    return val.description || val.summary || val.status || JSON.stringify(val)
  }
  return String(val)
}

function DecisionNarrativePanel({ aiExplanation, mri, fusion }) {
  const steps = []

  // Step 1: MRI
  const mriExp = aiExplanation?.mri_explanation
  if (mriExp) {
    steps.push({
      num: 1,
      label: 'MRI Classifier Output',
      icon: Brain,
      color: '#6366f1',
      colorClass: 'text-indigo-400',
      borderClass: 'border-indigo-500/20',
      bgClass: 'bg-indigo-500/5',
      text: extractText(mriExp),
    })
  }

  // Step 2: Cognitive
  const cogExp = aiExplanation?.cognitive_explanation
  if (cogExp) {
    steps.push({
      num: 2,
      label: 'Cognitive Screening Composite',
      icon: Activity,
      color: '#06b6d4',
      colorClass: 'text-cyan-400',
      borderClass: 'border-cyan-500/20',
      bgClass: 'bg-cyan-500/5',
      text: extractText(cogExp),
    })
  }

  // Step 3: Speech
  const speechExp = aiExplanation?.sentiment_explanation
  if (speechExp) {
    const isSpeechFused = fusion?.active_modalities?.includes('sentiment') || fusion?.active_modalities?.includes('speech')
    steps.push({
      num: 3,
      label: isSpeechFused ? 'Speech NLP & Acoustic Biomarkers (Fused)' : 'Speech & Language Analysis',
      icon: MessageSquare,
      color: '#a855f7',
      colorClass: 'text-purple-400',
      borderClass: 'border-purple-500/20',
      bgClass: 'bg-purple-500/5',
      text: extractText(speechExp),
    })
  }

  // Step 4: Risk
  const riskExp = aiExplanation?.risk_factors
  if (typeof riskExp === 'string' && riskExp) {
    steps.push({
      num: 4,
      label: 'Clinical Risk Factors',
      icon: HeartPulse,
      color: '#f43f5e',
      colorClass: 'text-rose-400',
      borderClass: 'border-rose-500/20',
      bgClass: 'bg-rose-500/5',
      text: riskExp,
    })
  } else if (Array.isArray(riskExp) && riskExp.length > 0) {
    steps.push({
      num: 4,
      label: 'Clinical Risk Factors',
      icon: HeartPulse,
      color: '#f43f5e',
      colorClass: 'text-rose-400',
      borderClass: 'border-rose-500/20',
      bgClass: 'bg-rose-500/5',
      text: `${riskExp.length} clinical risk factor(s) assessed: ${riskExp.slice(0, 3).join(', ')}${riskExp.length > 3 ? ', and more' : ''}.`,
    })
  } else if (riskExp && typeof riskExp === 'object') {
    steps.push({
      num: 4,
      label: 'Clinical Risk Factors',
      icon: HeartPulse,
      color: '#f43f5e',
      colorClass: 'text-rose-400',
      borderClass: 'border-rose-500/20',
      bgClass: 'bg-rose-500/5',
      text: extractText(riskExp),
    })
  }

  // Step 5: Fusion
  const fusionExp = aiExplanation?.fusion_explanation
  if (fusionExp || fusion?.method) {
    steps.push({
      num: steps.length + 1,
      label: 'Hybrid Multimodal Fusion',
      icon: Sparkles,
      color: '#10b981',
      colorClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/20',
      bgClass: 'bg-emerald-500/5',
      text: fusion?.summary || extractText(fusionExp) || 'Hybrid attentive evidential fusion consensus reached across active modalities.',
    })
  }

  // Final stage verdict
  const finalStage = fusion?.stage || mri?.stage
  const finalConf = parseFloat(fusion?.confidence || mri?.confidence || 0)
  const overallExp = aiExplanation?.overall_explanation

  if (steps.length === 0 && !overallExp) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl border border-border bg-background/50 text-foreground-muted text-xs">
        <Info size={14} className="shrink-0 text-indigo-400" />
        Decision narrative not available. Run the full multimodal analysis to generate a step-by-step explanation.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Overall Verdict */}
      {(finalStage || overallExp) && (
        <Motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={11} /> Backend Output
            </p>
            {finalStage && (
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {finalStage} · {finalConf.toFixed(1)}% confidence
              </span>
            )}
          </div>
          <p className="text-xs text-foreground leading-relaxed font-medium">
            {overallExp || aiExplanation?.summary || `The multimodal analysis reached a consensus of ${finalStage} with ${finalConf.toFixed(1)}% confidence.`}
          </p>
        </Motion.div>
      )}

      {/* Step-by-step reasoning */}
      {steps.map((step, idx) => {
        const Icon = step.icon
        return (
          <Motion.div
            key={idx}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.06, duration: 0.3 }}
            className={`p-3.5 rounded-xl border ${step.borderClass} ${step.bgClass}`}
          >
            <div className="flex items-start gap-3">
              {/* Step number + icon */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-extrabold"
                  style={{ background: `${step.color}1A`, border: `1px solid ${step.color}30`, color: step.color }}
                >
                  {step.num}
                </div>
                {idx < steps.length - 1 && (
                  <div className="w-px flex-1 mt-1.5 bg-border min-h-[16px]" />
                )}
              </div>

              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} style={{ color: step.color }} />
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${step.colorClass}`}>{step.label}</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{extractText(step.text)}</p>
              </div>
            </div>
          </Motion.div>
        )
      })}

      {/* Key Indicators */}
      {Array.isArray(aiExplanation?.key_indicators) && aiExplanation.key_indicators.length > 0 && (
        <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle size={10} /> Key Clinical Indicators
          </p>
          <ul className="space-y-1">
            {aiExplanation.key_indicators.slice(0, 6).map((indicator, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                <ArrowRight size={10} className="text-amber-400 shrink-0 mt-0.5" />
                {typeof indicator === 'string' ? indicator : JSON.stringify(indicator)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ─── Main XAI Panel ─────────────────────────────────────────────────────── */

const SECTIONS = [
  { id: 'attribution', label: 'Multimodal Attribution', icon: Activity, desc: 'Modality & clinical feature weighting' },
  { id: 'gradcam',     label: 'Grad-CAM Overlay', icon: Brain,    desc: 'Image regions affecting classification' },
  { id: 'narrative',   label: 'Decision Narrative',  icon: Sparkles,  desc: 'Step-by-step diagnostic reasoning' },
]

export default function XAIPanel({ aiExplanation, mri, fusion, results = {} }) {
  const [activeSection, setActiveSection] = useState('attribution')

  const featureAttribution = aiExplanation?.feature_attribution

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <Sparkles size={18} className="text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-foreground">Diagnostic Explainability & Provenance</h3>
          <p className="text-xs text-foreground-muted mt-0.5">
            Hybrid multimodal fusion weights, Grad-CAM visual attention, and clinical decision narrative.
          </p>
        </div>
      </div>

      {/* Section selector tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {SECTIONS.map(s => {
          const Icon = s.icon
          const isActive = activeSection === s.id
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-violet-500/10 border-violet-500/30 shadow-sm'
                  : 'bg-background/50 border-border hover:border-border hover:bg-surface-hover'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-violet-400 shrink-0 mt-0.5' : 'text-foreground-muted shrink-0 mt-0.5'} />
              <div>
                <p className={`text-xs font-bold ${isActive ? 'text-violet-300' : 'text-foreground'}`}>{s.label}</p>
                <p className="text-[10px] text-foreground-muted">{s.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Section content */}
      <AnimatePresence mode="wait">
        <Motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          {activeSection === 'attribution' && (
            <FactorAttributionPanel
              featureAttribution={featureAttribution}
              fusion={fusion}
              mri={mri}
              results={results}
            />
          )}
          {activeSection === 'gradcam' && (
            <GradCAMPanel mri={mri} />
          )}
          {activeSection === 'narrative' && (
            <DecisionNarrativePanel
              aiExplanation={aiExplanation}
              mri={mri}
              fusion={fusion}
            />
          )}
        </Motion.div>
      </AnimatePresence>

      {/* Data quality notice */}
      {aiExplanation?.data_quality && (
        <div className="flex items-start gap-2 p-3 rounded-xl border border-border bg-background/40">
          <Info size={12} className="text-foreground-muted shrink-0 mt-0.5" />
          <p className="text-[10px] text-foreground-muted leading-relaxed">
            <strong className="font-semibold text-foreground">Data Quality:</strong>{' '}
            {typeof aiExplanation.data_quality === 'string'
              ? aiExplanation.data_quality
              : Object.entries(aiExplanation.data_quality)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')
            }
          </p>
        </div>
      )}
    </div>
  )
}
