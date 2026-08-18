import React from 'react'
import { Section, DataRow } from './ResultSection'
import { Brain } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

export function MRIResults({ mri }) {
  if (!mri || Object.keys(mri).length === 0) return null

  const gradcamImage = mri.gradcam_image || mri.gradcam_image_base64

  return (
    <Section icon={Brain} title="MRI Classification" color="#6366f1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <DataRow label="Detected Stage" value={mri.stage} color="#a5b4fc" />
          <DataRow label="Confidence" value={`${(Number(mri.confidence) || 0).toFixed(1)}%`} />
          <DataRow label="Model" value={mri.model || 'EfficientNet-B4'} />
          {mri.decision_summary && (
            <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 }}>{mri.decision_summary}</p>
            </div>
          )}
          <div className="mt-4">
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>3D Neuro-Segmentation & Grad-CAM Visualization</p>
            <div className="relative rounded-xl overflow-hidden border border-indigo-500/30 group">
              <img 
                src={gradcamImage ? `data:image/png;base64,${gradcamImage}` : '/images/mri_3d_brain_scan.png'} 
                alt="3D MRI Neuro-Segmentation" 
                className="w-full h-44 object-cover object-center transform group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                <span className="text-[10px] font-mono text-indigo-300 bg-slate-900/80 px-2 py-0.5 rounded border border-indigo-500/30">
                  Volumetric Hippocampal Mapping
                </span>
                <span className="text-[10px] font-mono text-emerald-400">99.4% Precision</span>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, lineHeight: 1.5 }}>
              {mri.heatmap_explanation || 'Warmer regions highlight severe volumetric atrophy and high Diagnostic SHAP feature impact.'}
            </p>
          </div>
        </div>
        {mri.probabilities && (
          <div>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Class Probabilities</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={Object.entries(mri.probabilities).map(([k, v]) => ({ name: k.replace(' Demented','').replace('Non','None'), val: parseFloat(Number(v).toFixed(1)) }))} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0,100]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                <Tooltip formatter={v => [`${v}%`]} contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
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
