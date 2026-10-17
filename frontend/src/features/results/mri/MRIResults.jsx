import React, { useState } from 'react'
import { Section, DataRow } from '../ResultSection'
import { Brain, Layers, Sparkles } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import { NiiVueViewer } from './NiiVueViewer'

export function MRIResults({ mri }) {
  const [viewMode, setViewMode] = useState('summary') // 'summary' | 'interactive'
  if (!mri || Object.keys(mri).length === 0) return null

  const gradcamImage = mri.gradcam_image || mri.gradcam_image_base64

  return (
    <Section icon={Brain} title="MRI Classification" color="#6366f1">
      <div className="space-y-5 font-sans">
        {/* View Switcher Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-border flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground-muted uppercase tracking-wider">
              Diagnostic Presentation
            </span>
          </div>
          <div className="flex items-center p-0.5 rounded-lg bg-surface border border-border">
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'summary'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Layers size={13} />
              <span>Summary & Metrics</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('interactive')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'interactive'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Sparkles size={13} />
              <span>Interactive 3D / NiiVue Viewer</span>
            </button>
          </div>
        </div>

        {viewMode === 'interactive' ? (
          <NiiVueViewer mri={mri} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <DataRow label="Detected Stage" value={mri.stage} color="#a5b4fc" />
              <DataRow label="Confidence" value={`${(Number(mri.confidence) || 0).toFixed(1)}%`} />
              <DataRow label="Model" value={mri.model || 'Unavailable'} />
              {mri.decision_summary && (
                <div className="mt-4 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-xs sm:text-sm text-foreground leading-relaxed font-medium">{mri.decision_summary}</p>
                </div>
              )}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Grad-CAM Classification Visualization</p>
                  <button
                    type="button"
                    onClick={() => setViewMode('interactive')}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                  >
                    <span>Launch 3D Explorer &rarr;</span>
                  </button>
                </div>
                {gradcamImage ? (
                  <div className="space-y-2">
                    <div
                      className="rounded-xl overflow-hidden border border-indigo-500/30 bg-black cursor-pointer group relative"
                      onClick={() => setViewMode('interactive')}
                      title="Click to open interactive 3D explorer"
                    >
                      <img
                        src={`data:image/png;base64,${gradcamImage}`}
                        alt="Grad-CAM overlay for the MRI classification"
                        className="w-full h-48 object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1.5 rounded-lg bg-black/80 text-white text-xs font-semibold backdrop-blur-xs border border-white/20">
                          Open Interactive Viewer
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-foreground-muted leading-relaxed font-medium">
                      {mri.heatmap_explanation || 'Grad-CAM shows image regions that influenced this classification output.'}
                    </p>
                  </div>
                ) : (
                  <div role="status" className="flex items-center gap-2 p-4 rounded-xl border border-border bg-background/50 text-xs text-foreground-muted">
                    <Brain size={16} className="shrink-0" /> Grad-CAM image unavailable for this result.
                  </div>
                )}
              </div>
            </div>
            {mri.probabilities && (
              <div>
                <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider mb-3">Class Probabilities</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={Object.entries(mri.probabilities).map(([k, v]) => ({ name: k.replace(' Demented','').replace('Non','None'), val: parseFloat(Number(v).toFixed(1)) }))} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                    <XAxis type="number" domain={[0,100]} tick={{ fill: 'rgb(var(--text-muted))', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'rgb(var(--text-muted))', fontSize: 12 }} axisLine={false} tickLine={false} width={65} />
                    <Tooltip formatter={v => [`${v}%`]} contentStyle={{ background: 'rgb(var(--surface-card))', border: '1px solid rgb(var(--border))', borderRadius: 10, color: 'rgb(var(--text-primary))', fontSize: 12 }} />
                    <Bar dataKey="val" radius={[0,6,6,0]}>
                      {Object.keys(mri.probabilities).map((k, i) => <Cell key={k} fill={['#22c55e','#6366f1','#f59e0b','#ef4444'][i % 4]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}

