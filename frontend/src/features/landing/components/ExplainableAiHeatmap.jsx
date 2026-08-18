import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Cpu, Brain, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

export default function ExplainableAiHeatmap() {
  const [selectedRegion, setSelectedRegion] = useState('hippocampus')

  const regions = [
    {
      id: 'hippocampus',
      name: 'Hippocampal Formation',
      impact: 'High Positive Driver (+0.42 SHAP)',
      color: '#6366f1',
      coords: { x: 45, y: 52 },
      desc: 'Bilateral volume reduction detected via 3D voxel segmentation. Primary driver for early AD / MCI classification.',
      signal: 'MRI Voxel Atrophy'
    },
    {
      id: 'temporal',
      name: 'Temporal Cortex',
      impact: 'Moderate Driver (+0.28 SHAP)',
      color: '#38bdf8',
      coords: { x: 68, y: 48 },
      desc: 'Cortical thinning observed across superior temporal gyrus, correlating with acoustic speech pause frequencies.',
      signal: 'Cortical Thinning & Speech'
    },
    {
      id: 'parietal',
      name: 'Parietal Association Lobe',
      impact: 'Subtle Driver (+0.14 SHAP)',
      color: '#10b981',
      coords: { x: 34, y: 38 },
      desc: 'Mild parietal hypometabolism correlates with psychometric spatial latency sub-scores.',
      signal: 'Psychometric Sub-score'
    },
    {
      id: 'frontal',
      name: 'Prefrontal Executive Cortex',
      impact: 'Neutral / Protective (-0.05 SHAP)',
      color: '#a855f7',
      coords: { x: 50, y: 26 },
      desc: 'Preserved frontal cortical thickness provides negative weighting against advanced stage AD staging.',
      signal: 'Preserved Executive Matrix'
    }
  ]

  const shapFeatures = [
    { name: 'Hippocampal Volume Atrophy', category: '3D MRI Imaging', weight: '+0.42', positive: true, percent: 84 },
    { name: 'Delayed Recall Score Drop', category: 'Psychometric Index', weight: '+0.28', positive: true, percent: 56 },
    { name: 'Acoustic Micro-pause Frequency', category: 'Speech Processing', weight: '+0.22', positive: true, percent: 44 },
    { name: 'Clinical Risk Profile Score', category: 'Risk Assessment', weight: '+0.14', positive: true, percent: 28 },
    { name: 'Frontal Cortical Thickness', category: '3D MRI Imaging', weight: '-0.05', positive: false, percent: 10 }
  ]

  const activeRegion = regions.find(r => r.id === selectedRegion) || regions[0]

  return (
    <div className="space-y-10">
      {/* SECTION HEADER */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider border border-purple-500/20">
          <Cpu size={13} className="text-purple-500" /> Explainable AI (XAI) Architecture
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
          Don't Just Show the Prediction. Explain It.
        </h2>
        <p className="text-foreground-muted text-sm sm:text-base leading-relaxed">
          Transparent AI-assisted reasoning helps clinicians understand which input features influenced model output, eliminating black-box opacity in medical decision support.
        </p>
      </div>

      {/* TWO COLUMN INTERACTIVE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* LEFT COLUMN: SHAP FEATURE ATTRIBUTIONS LIST */}
        <div className="lg:col-span-6 bg-surface-card border border-border rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              SHAP Local Feature Attributions
            </h3>
            <span className="text-[10px] font-mono font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
              Shapley Value Vector
            </span>
          </div>

          <div className="space-y-4">
            {shapFeatures.map((feat, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${feat.positive ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                    <span className="font-bold text-foreground">{feat.name}</span>
                  </div>
                  <span className={`font-mono font-bold ${feat.positive ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {feat.weight}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${feat.percent}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                    className={`h-full rounded-full ${feat.positive ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                  />
                </div>
                <span className="text-[10px] text-foreground-muted block">{feat.category}</span>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-xs text-foreground-muted leading-relaxed">
            <strong className="text-foreground font-semibold">Clinician Transparency Guarantee:</strong> Every prediction probability is accompanied by mathematical feature weights derived via Game-Theoretic Shapley Additive Explanations (SHAP).
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE VOLUMETRIC REGIONAL HEATMAP */}
        <div className="lg:col-span-6 bg-surface-card border border-border rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              3D Volumetric Regional Brain Heatmap
            </h3>
            <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Click Region Node
            </span>
          </div>

          {/* SVG Heatmap Container */}
          <div className="relative w-full aspect-[4/3] rounded-2xl bg-surface border border-border/80 overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />

            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {/* Brain Outline */}
              <path
                d="M 50 16 C 28 16 14 28 14 48 C 14 66 26 80 40 80 C 45 80 47 78 50 78 C 53 78 55 80 60 80 C 74 80 86 66 86 48 C 86 28 72 16 50 16 Z"
                fill="none"
                stroke="currentColor"
                className="text-purple-500/30 dark:text-purple-400/30"
                strokeWidth="1"
              />

              {/* Heatmap Gradient Overlay Blobs */}
              <circle cx="45" cy="52" r="14" fill="#6366f1" opacity="0.35" className="animate-pulse" />
              <circle cx="68" cy="48" r="11" fill="#38bdf8" opacity="0.3" className="animate-pulse" />
              <circle cx="34" cy="38" r="9" fill="#10b981" opacity="0.25" />
            </svg>

            {/* Clickable Region Marker Buttons */}
            {regions.map((reg) => {
              const isSelected = selectedRegion === reg.id
              return (
                <motion.button
                  key={reg.id}
                  onClick={() => setSelectedRegion(reg.id)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    left: `${reg.coords.x}%`,
                    top: `${reg.coords.y}%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: reg.color
                  }}
                  className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg transition-all ${
                    isSelected ? 'ring-4 ring-offset-2 ring-purple-500/60 z-20 scale-125' : 'opacity-80 hover:opacity-100 z-10'
                  }`}
                >
                  <Brain className="w-3.5 h-3.5" />
                </motion.button>
              )
            })}
          </div>

          {/* Active Region Information Card */}
          <motion.div
            key={activeRegion.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-surface border border-border space-y-1.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground">{activeRegion.name}</h4>
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                style={{ backgroundColor: `${activeRegion.color}15`, color: activeRegion.color, borderColor: `${activeRegion.color}40` }}
              >
                {activeRegion.impact}
              </span>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">{activeRegion.desc}</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

