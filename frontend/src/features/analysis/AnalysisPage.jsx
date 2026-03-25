import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { User, Brain, MessageSquare, PenTool, Mic, HeartPulse, ChevronRight, ChevronLeft, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import { setAnalysisResults } from '../../context/ResultsStore'
import { StepIndicator } from './components/StepIndicator'
import { PatientStep } from './components/PatientStep'
import { MRIStep } from './components/MRIStep'
import { CognitiveStep } from './components/CognitiveStep'
import { HandwritingStep } from './components/HandwritingStep'
import { SpeechStep } from './components/SpeechStep'
import { RiskStep } from './components/RiskStep'
import { analysisApi } from './api/analysisApi'
import { AnalysisLoader, useAnalysisProgress } from './components/AnalysisLoader'

const STEPS = [
  { id: 'patient',      label: 'Patient Info',    icon: User          },
  { id: 'mri',         label: 'MRI Scan',         icon: Brain         },
  { id: 'cognitive',   label: 'Cognitive Test',   icon: MessageSquare },
  { id: 'handwriting', label: 'Handwriting',      icon: PenTool       },
  { id: 'speech',      label: 'Speech',           icon: Mic           },
  { id: 'risk',        label: 'Risk Factors',     icon: HeartPulse    },
]

function Zap(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={props.size || 16} height={props.size || 16}
      fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function RadioButton({ label, description, selected, onClick }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.01, background: selected ? 'rgba(99,102,241,0.2)' : '#1F2937' }}
      whileTap={{ scale: 0.99 }}
      className="p-4 rounded-xl cursor-pointer transition-all"
      style={{
        background: selected ? 'rgba(99,102,241,0.15)' : '#1F2937',
        border: `2px solid ${selected ? '#6366f1' : '#374151'}`,
      }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
          style={{ 
            background: selected ? '#6366f1' : 'transparent', 
            border: selected ? 'none' : '2px solid #6B7280' 
          }}
        >
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>{label}</p>
          {description && <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{description}</p>}
        </div>
      </div>
    </motion.div>
  )
}

function PatientCard({ patient, selected, onSelect }) {
  return (
    <motion.div
      onClick={onSelect}
      whileHover={{ scale: 1.01, background: selected ? 'rgba(99,102,241,0.2)' : '#1F2937' }}
      whileTap={{ scale: 0.99 }}
      className="p-4 rounded-xl cursor-pointer transition-all"
      style={{
        background: selected ? 'rgba(99,102,241,0.15)' : '#1F2937',
        border: `2px solid ${selected ? '#6366f1' : '#374151'}`,
      }}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-5 h-5 rounded-full flex items-center justify-center transition-colors"
          style={{ 
            background: selected ? '#6366f1' : 'transparent', 
            border: selected ? 'none' : '2px solid #6B7280' 
          }}
        >
          {selected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
             style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white' }}>
          {(patient.name || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>{patient.name}</p>
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>ID: {patient.patient_id} {patient.age && `· ${patient.age} yrs`}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default function AnalysisPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const { isAnalyzing, currentStep, startAnalysis, stopAnalysis } = useAnalysisProgress()

  const [patientMode, setPatientMode] = useState('new')
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientsLoading, setPatientsLoading] = useState(true)

  const [patient, setPatient] = useState({ name: '', age: '', sex: 'M', patient_id: '', education_years: '', photo: null })
  const [mriFile, setMriFile] = useState(null)
  const [cognData, setCognData] = useState({})
  const [hwFile, setHwFile] = useState(null)
  const [hwCanvas, setHwCanvas] = useState('')
  const [hwMode, setHwMode] = useState('draw')
  const [speechText, setSpeechText] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [risk, setRisk] = useState({})
  const [patientText, setPatientText] = useState('')
  const [dnaFile, setDnaFile] = useState(null)

  useEffect(() => {
    fetch('/api/patients', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setPatients(d.patients || [])
        setPatientsLoading(false)
      })
      .catch(() => setPatientsLoading(false))
  }, [])

  const handlePatientModeChange = (mode) => {
    setPatientMode(mode)
    if (mode === 'existing') {
      setPatient({ name: '', age: '', sex: 'M', patient_id: '', education_years: '', photo: null })
    } else {
      setSelectedPatient(null)
    }
  }

  const handleSelectPatient = (p) => {
    setSelectedPatient(p)
    setPatient({
      name: p.name || '',
      age: p.age?.toString() || '',
      sex: p.sex || 'M',
      patient_id: p.patient_id || '',
      education_years: p.education_years?.toString() || '',
      photo: p.photo || null
    })
  }

  const handleSubmit = async () => {
    if (!patient.patient_id || !patient.name) {
      toast.error('Please enter patient ID and name')
      return
    }
    
    setLoading(true)
    startAnalysis()
    const tid = toast.loading('Running multimodal AI analysis…')
    try {
      const fd = new FormData()
      Object.entries(patient).forEach(([k, v]) => {
        if (k === 'photo' && v) {
          fd.append('photo', v)
        } else if (v) {
          fd.append(k, v)
        }
      })
      if (patientText) fd.append('patient_text', patientText)
      if (mriFile) fd.append('mri_image', mriFile)
      if (Object.keys(cognData).length) fd.append('cognitive_tests', JSON.stringify(cognData))
      if (hwFile) fd.append('handwriting_image', hwFile)
      else if (hwCanvas) fd.append('handwriting_canvas', hwCanvas)
      if (audioFile) fd.append('audio_file', audioFile)
      else if (speechText) fd.append('audio_text', speechText)
      if (Object.keys(risk).length) fd.append('risk_factors', JSON.stringify(risk))
      if (dnaFile) fd.append('dna_file', dnaFile)

      const data = await analysisApi.runFullAnalysis(fd)
      setAnalysisResults(data)
      stopAnalysis()
      toast.dismiss(tid)
      toast.success('Analysis complete! Patient data saved.')
      navigate('/results')
    } catch (err) {
      stopAnalysis()
      toast.dismiss(tid)
      toast.error('Analysis failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 0: return <PatientStep patient={patient} setPatient={setPatient} patientText={patientText} setPatientText={setPatientText} />
      case 1: return <MRIStep mriFile={mriFile} setMriFile={setMriFile} />
      case 2: return <CognitiveStep cognData={cognData} setCognData={setCognData} />
      case 3: return <HandwritingStep hwFile={hwFile} setHwFile={setHwFile} hwCanvas={hwCanvas} setHwCanvas={setHwCanvas} hwMode={hwMode} setHwMode={setHwMode} />
      case 4: return <SpeechStep speechText={speechText} setSpeechText={setSpeechText} audioFile={audioFile} setAudioFile={setAudioFile} />
      case 5: return <RiskStep risk={risk} setRisk={setRisk} dnaFile={dnaFile} setDnaFile={setDnaFile} />
      default: return null
    }
  }

  return (
    <>
      <AnalysisLoader isLoading={isAnalyzing} currentStep={currentStep} />
      
      <div className="max-w-3xl mx-auto space-y-6 px-4 sm:px-0">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 800, color: '#FFFFFF' }}>Multimodal Analysis</h1>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full self-start sm:self-auto" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
              <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>AI Ready</span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>Complete the wizard to run a comprehensive Alzheimer's risk assessment.</p>
        </motion.div>
        
        {/* AI Tips */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-3 rounded-xl"
          style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 14 }}>💡</span>
            <span style={{ fontSize: 12, color: '#c084fc' }}>
              <strong style={{ color: '#e9d5ff' }}>AI Tip:</strong> Patients above age 65 have significantly higher Alzheimer's risk. Consider additional cognitive tests for this age group.
            </span>
          </div>
        </motion.div>

        {step === 0 && (
          <GlassCard className="p-6">
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#FFFFFF', marginBottom: 16 }}>Select Patient Type</h2>
            
            <div className="space-y-3 mb-6">
              <RadioButton
                label="New Patient"
                description="Register a new patient for analysis"
                selected={patientMode === 'new'}
                onClick={() => handlePatientModeChange('new')}
              />
              <RadioButton
                label="Existing Patient"
                description="Select from previously registered patients"
                selected={patientMode === 'existing'}
                onClick={() => handlePatientModeChange('existing')}
              />
            </div>

            {patientMode === 'existing' && (
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E7EB', marginBottom: 12 }}>Select Patient:</p>
                {patientsLoading ? (
                  <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 20 }}>Loading patients...</p>
                ) : patients.length === 0 ? (
                  <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 20 }}>No patients found. Add a new patient.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {patients.map((p) => (
                      <PatientCard
                        key={p.patient_id}
                        patient={p}
                        selected={selectedPatient?.patient_id === p.patient_id}
                        onSelect={() => handleSelectPatient(p)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        )}

        {step > 0 && (
          <GlassCard className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                   style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white' }}>
                {(patient.name || 'P')[0].toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>{patient.name || 'Patient'}</p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>ID: {patient.patient_id || '—'}</p>
              </div>
              <button
                onClick={() => setStep(0)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13 }}
              >
                Change
              </button>
            </div>
          </GlassCard>
        )}

        <GlassCard className="p-6">
          <StepIndicator steps={STEPS} current={step} />
        </GlassCard>

        <GlassCard className="p-6" hover={false}>
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}>
            {renderStep()}
          </motion.div>
        </GlassCard>

        <div className="flex items-center justify-between gap-3">
          <Button 
            variant="ghost" 
            icon={ChevronLeft} 
            disabled={step === 0 || loading} 
            onClick={() => setStep(s => s - 1)}
            style={{ border: step === 0 ? 'none' : '1px solid #374151' }}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <div key={i} className="rounded-full transition-all duration-300"
                style={{ 
                  width: i === step ? 16 : 6, 
                  height: 6, 
                  background: i === step ? 'linear-gradient(90deg, #6366f1, #a855f7)' : i < step ? '#22c55e' : '#374151',
                  boxShadow: i === step ? '0 0 8px rgba(99,102,241,0.5)' : 'none'
                }} />
            ))}
          </div>
          {step < STEPS.length - 1 ? (
            <Button 
              icon={ChevronRight} 
              onClick={() => setStep(s => s + 1)} 
              disabled={loading}
              style={{ minWidth: 100 }}
            >
              Next
            </Button>
          ) : (
            <Button 
              loading={loading} 
              onClick={handleSubmit} 
              icon={Zap}
              style={{ minWidth: 140 }}
            >
              Run Analysis
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
