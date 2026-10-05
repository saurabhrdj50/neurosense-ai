import React from 'react'
import { Section, DataRow } from '../ResultSection'
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
          <DataRow label="Model" value={mri.model || 'Unavailable'} />
          {mri.decision_summary && (
            <div className="mt-4 p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-xs sm:text-sm text-foreground leading-relaxed font-medium">{mri.decision_summary}</p>
            </div>
          )}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Grad-CAM Classification Visualization</p>
            {gradcamImage ? (
              <div className="space-y-2">
                <div className="rounded-xl overflow-hidden border border-indigo-500/30 bg-black">
                  <img
                    src={`data:image/png;base64,${gradcamImage}`}
                    alt="Grad-CAM overlay for the MRI classification"
                    className="w-full h-48 object-contain"
                  />
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
    </Section>
  )
}
