import React from 'react'
import { LabeledInput, SectionTitle } from './SharedComponents'

export function PatientStep({ patient, setPatient }) {
  const patSet = (k) => (e) => setPatient(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="space-y-4">
      <SectionTitle>Patient Demographics</SectionTitle>
      <div className="grid grid-cols-2 gap-4">
        <LabeledInput label="Full Name"   value={patient.name}            onChange={patSet('name')}            placeholder="e.g. John Smith" />
        <LabeledInput label="Patient ID"  value={patient.patient_id}      onChange={patSet('patient_id')}      placeholder="e.g. P-1042" />
        <LabeledInput label="Age"         value={patient.age}             onChange={patSet('age')}             placeholder="Years" type="number" />
        <LabeledInput label="Education (years)" value={patient.education_years} onChange={patSet('education_years')} placeholder="12" type="number" />
      </div>
      <div>
        <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Sex</label>
        <div className="flex gap-3">
          {['M', 'F', 'Other'].map(s => (
            <button key={s} type="button" onClick={() => setPatient(p => ({ ...p, sex: s }))}
              className="px-5 py-2 rounded-xl text-sm font-medium"
              style={{ background: patient.sex === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', border: patient.sex === s ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)', color: patient.sex === s ? '#a5b4fc' : '#64748b', cursor: 'pointer' }}>
              {s === 'M' ? 'Male' : s === 'F' ? 'Female' : 'Other'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Patient Notes / Symptoms (optional)</label>
        <textarea placeholder="Describe patient's symptoms, behavior changes, memory issues…" rows={3}
          className="w-full px-4 py-3 rounded-xl text-sm" style={{ resize: 'vertical' }} />
      </div>
    </div>
  )
}
