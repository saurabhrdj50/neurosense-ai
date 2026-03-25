import React from 'react'
import { SectionTitle } from './SharedComponents'

const COG_QUESTIONS = [
  { id: 'memory_recall',    label: 'Memory Recall',      question: 'Can the patient recall 3 words after 5 minutes?',      type: 'scale' },
  { id: 'orientation',      label: 'Orientation',        question: 'Is the patient oriented to time and place?',          type: 'scale' },
  { id: 'language',         label: 'Language',          question: 'Can the patient name common objects without difficulty?', type: 'scale' },
  { id: 'attention',        label: 'Attention & Calc',  question: 'Serial 7s: How many steps could the patient complete?', type: 'number' },
  { id: 'visuospatial',     label: 'Visuospatial',      question: 'Can the patient copy a simple figure?',              type: 'scale' },
  { id: 'delayed_recall',   label: 'Delayed Recall',   question: 'Number of words recalled after delay (0-5):',        type: 'number' },
]

export function CognitiveStep({ cognData, setCognData }) {
  return (
    <div className="space-y-5">
      <SectionTitle>Cognitive Assessment</SectionTitle>
      <p style={{ fontSize: 13, color: '#475569' }}>Mini‑Mental State Examination (MMSE) style questions. Rate each 0–10.</p>
      {COG_QUESTIONS.map(q => (
        <div key={q.id}>
          <div className="flex items-start justify-between mb-2 gap-3">
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{q.label}</p>
              <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{q.question}</p>
            </div>
            <input type="number" min={0} max={q.type === 'scale' ? 10 : 5}
              value={cognData[q.id] ?? ''}
              onChange={e => setCognData(d => ({ ...d, [q.id]: Number(e.target.value) }))}
              className="w-20 px-3 py-2 rounded-xl text-sm text-center flex-shrink-0" placeholder="0–10" />
          </div>
          {q.type === 'scale' && (
            <input type="range" min={0} max={10} step={1} value={cognData[q.id] ?? 5}
              onChange={e => setCognData(d => ({ ...d, [q.id]: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: '#6366f1' }} />
          )}
        </div>
      ))}
    </div>
  )
}
