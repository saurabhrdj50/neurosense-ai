import React, { useRef } from 'react'
import { LabeledInput, SectionTitle } from './SharedComponents'
import { Camera, Upload, X } from 'lucide-react'

export function PatientStep({ patient, setPatient, patientText, setPatientText }) {
  const patSet = (k) => (e) => setPatient(p => ({ ...p, [k]: e.target.value }))
  const fileInputRef = useRef(null)

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPatient(p => ({ ...p, photo: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const removePhoto = () => {
    setPatient(p => ({ ...p, photo: null }))
  }

  return (
    <div className="space-y-5">
      <SectionTitle>Patient Demographics</SectionTitle>
      
      <div className="flex gap-6">
        <div className="flex-shrink-0">
          <label style={{ fontSize: 13, color: '#E5E7EB', display: 'block', marginBottom: 6, fontWeight: 500 }}>
            Patient Photo <span style={{ color: '#9CA3AF' }}>(optional)</span>
          </label>
          <div className="relative">
            {patient.photo ? (
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2" 
                   style={{ borderColor: '#6366f1' }}>
                <img src={patient.photo} alt="Patient" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: '#EF4444', color: '#fff' }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-105"
                style={{ 
                  background: '#1F2937', 
                  border: '2px dashed #6366f1',
                  color: '#9CA3AF'
                }}
              >
                <Camera size={24} />
                <span style={{ fontSize: 10 }}>Add Photo</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <LabeledInput label="Full Name"   value={patient.name}            onChange={patSet('name')}            placeholder="e.g. John Smith" />
            <LabeledInput label="Patient ID"  value={patient.patient_id}      onChange={patSet('patient_id')}      placeholder="e.g. P-1042" />
            <LabeledInput label="Age"         value={patient.age}             onChange={patSet('age')}             placeholder="Years" type="number" />
            <LabeledInput label="Education (years)" value={patient.education_years} onChange={patSet('education_years')} placeholder="12" type="number" />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#E5E7EB', display: 'block', marginBottom: 6, fontWeight: 500 }}>Sex</label>
            <div className="flex gap-3">
              {['M', 'F', 'Other'].map(s => (
                <button key={s} type="button" onClick={() => setPatient(p => ({ ...p, sex: s }))}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105"
                  style={{ 
                    background: patient.sex === s ? 'rgba(99,102,241,0.2)' : '#1F2937', 
                    border: patient.sex === s ? '1px solid #6366f1' : '1px solid #374151', 
                    color: patient.sex === s ? '#a5b4fc' : '#9CA3AF', 
                    cursor: 'pointer' 
                  }}>
                  {s === 'M' ? 'Male' : s === 'F' ? 'Female' : 'Other'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label style={{ fontSize: 13, color: '#E5E7EB', display: 'block', marginBottom: 6, fontWeight: 500 }}>Patient Notes / Symptoms (optional)</label>
        <textarea 
          value={patientText} 
          onChange={(e) => setPatientText(e.target.value)}
          placeholder="Describe patient's symptoms, behavior changes, memory issues…" 
          rows={3}
          className="w-full px-4 py-3 rounded-xl text-sm" 
          style={{ resize: 'vertical', background: '#1F2937', border: '1px solid #374151', color: '#FFFFFF' }} 
        />
      </div>
    </div>
  )
}
