import React from 'react'
import { Section, DataRow } from './ResultSection'
import { Brain } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

export function MRIResults({ mri }) {
  if (!mri || Object.keys(mri).length === 0) return null

  return (
    <Section icon={Brain} title="MRI Classification" color="#6366f1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <DataRow label="Detected Stage" value={mri.stage} color="#a5b4fc" />
          <DataRow label="Confidence" value={`${(mri.confidence || 0).toFixed(1)}%`} />
          <DataRow label="Model" value={mri.model || 'EfficientNet-B4'} />
          {mri.gradcam_image && (
            <div className="mt-4">
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Grad-CAM Visualization</p>
              <img src={`data:image/png;base64,${mri.gradcam_image}`} alt="GradCAM" className="rounded-xl"
                style={{ width: '100%', maxHeight: 200, objectFit: 'cover', border: '1px solid rgba(99,102,241,0.3)' }} />
            </div>
          )}
        </div>
        {mri.probabilities && (
          <div>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>Class Probabilities</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={Object.entries(mri.probabilities).map(([k, v]) => ({ name: k.replace(' Demented','').replace('Non','None'), val: parseFloat((v*100).toFixed(1)) }))} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
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
