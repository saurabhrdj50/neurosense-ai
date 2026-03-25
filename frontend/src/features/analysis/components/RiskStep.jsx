import React from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Dna } from 'lucide-react'
import { SectionTitle } from './SharedComponents'
import DropZone from '../../../components/ui/DropZone'

const RISK_FIELDS = [
  { id: 'diabetes',          label: 'Diabetes',             type: 'bool' },
  { id: 'hypertension',       label: 'Hypertension',         type: 'bool' },
  { id: 'heart_disease',      label: 'Heart Disease',        type: 'bool' },
  { id: 'depression',         label: 'Depression/Anxiety',   type: 'bool' },
  { id: 'family_history',     label: "Family History of Alzheimer's", type: 'bool' },
  { id: 'smoking',            label: 'Smoking (current/past)', type: 'bool' },
  { id: 'sleep_issues',       label: 'Sleep Disorders',     type: 'bool' },
  { id: 'physical_activity',  label: 'Regular Physical Activity', type: 'bool' },
]

export function RiskStep({ risk, setRisk, dnaFile, setDnaFile }) {
  return (
    <div className="space-y-5">
      <SectionTitle>Risk Factor Assessment</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {RISK_FIELDS.map(f => (
          <motion.button key={f.id} whileHover={{ scale: 1.02, background: risk[f.id] ? 'rgba(99,102,241,0.15)' : '#1F2937' }} whileTap={{ scale: 0.98 }}
            onClick={() => setRisk(r => ({ ...r, [f.id]: !r[f.id] }))}
            className="flex items-center gap-3 p-4 rounded-xl text-left transition-colors"
            style={{ 
              background: risk[f.id] ? 'rgba(99,102,241,0.12)' : '#1F2937', 
              border: risk[f.id] ? '1px solid #6366f1' : '1px solid #374151', 
              cursor: 'pointer' 
            }}>
            <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
              style={{ 
                background: risk[f.id] ? 'linear-gradient(135deg, #6366f1, #a855f7)' : '#374151', 
                border: risk[f.id] ? 'none' : '1px solid #4B5563' 
              }}>
              {risk[f.id] && <Check size={12} color="white" />}
            </div>
            <span style={{ fontSize: 13, color: risk[f.id] ? '#a5b4fc' : '#E5E7EB', fontWeight: risk[f.id] ? 500 : 400 }}>{f.label}</span>
          </motion.button>
        ))}
      </div>
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-3">
          <Dna size={16} style={{ color: '#a855f7' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>Genomic Data (optional)</span>
        </div>
        <DropZone 
          accept={{ 'text/plain': ['.txt'], 'application/octet-stream': [] }} 
          label="Upload DNA File"
          hint="Raw DNA text file — APOE ε4 & TREM2 analysis" 
          file={dnaFile} 
          onFile={setDnaFile} 
          onClear={() => setDnaFile(null)} 
          type="default" 
        />
      </div>
    </div>
  )
}
