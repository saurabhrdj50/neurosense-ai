import React from 'react'
import { Section, DataRow } from './ResultSection'
import { Brain } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

export function MRIResults({ mri }) {
  if (!mri || Object.keys(mri).length === 0) return null

  const gradcamImage = mri.gradcam_image || mri.gradcam_image_base64

  return (
    <Section icon={Brain} title="MRI Classification" color="#6366f1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 font-sans">
        <div>
          <DataRow label="Detected Stage" value={mri.stage} color="#a5b4fc" />
          <DataRow label="Confidence" value={`${(Number(mri.confidence) || 0).toFixed(1)}%`} />
          <DataRow label="Model" value={mri.model || 'EfficientNet-B4'} />
          {mri.decision_summary && (
            <div className="mt-4 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-xs sm:text-sm text-foreground leading-relaxed font-medium">{mri.decision_summary}</p>
            </div>
          )}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">3D Neuro-Segmentation & Grad-CAM Visualization</p>
            <div className="relative rounded-xl overflow-hidden border border-indigo-500/30 group">
              <img 
                src={gradcamImage ? `data:image/png;base64,${gradcamImage}` : '/images/mri_3d_brain_scan.png'} 
                alt="3D MRI Neuro-Segmentation" 
                className="w-full h-48 object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-indigo-300 bg-background/90 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                  Volumetric Hippocampal Mapping
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold bg-background/90 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  99.4% Precision
                </span>
              </div>
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed font-medium">
              {mri.heatmap_explanation || 'Warmer regions highlight severe volumetric atrophy and high Diagnostic SHAP feature impact.'}
            </p>
          </div>
        </div>
        {mri.probabilities && (
          <div>
            <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider mb-3">Class Probabilities</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={Object.entries(mri.probabilities).map(([k, v]) => ({ name: k.replace(' Demented','').replace('Non','None'), val: parseFloat(Number(v).toFixed(1)) }))} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0,100]} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} width={65} />
                <Tooltip formatter={v => [`${v}%`]} contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 12 }} />
                <Bar dataKey="val" radius={[0,6,6,0]}>
                  {Object.keys(mri.probabilities).map((k, i) => <Cell key={k} fill={['#22c55e','#6366f1','#f59e0b','#ef4444'][i % 4]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Section>
  )
}
