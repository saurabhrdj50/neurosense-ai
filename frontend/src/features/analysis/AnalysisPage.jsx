import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { User, Brain, MessageSquare, PenTool, Mic, HeartPulse, ChevronRight, ChevronLeft } from 'lucide-react'
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

export default function AnalysisPage() {
  const navigate = useNavigate()
  const [step, setStep]   = useState(0)
  const [loading, setLoading] = useState(false)

  const [patient, setPatient]     = useState({ name: '', age: '', sex: 'M', patient_id: '', education_years: '' })
  const [mriFile, setMriFile]     = useState(null)
  const [cognData, setCognData]   = useState({})
  const [hwFile, setHwFile]       = useState(null)
  const [hwCanvas, setHwCanvas]   = useState('')
  const [hwMode, setHwMode]       = useState('draw')
  const [speechText, setSpeechText] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [risk, setRisk]           = useState({})
  const [patientText, setPatientText] = useState('')
  const [dnaFile, setDnaFile]     = useState(null)

  const handleSubmit = async () => {
    setLoading(true)
    const tid = toast.loading('Running multimodal AI analysis…')
    try {
      const fd = new FormData()
      Object.entries(patient).forEach(([k, v]) => v && fd.append(k, v))
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
      toast.dismiss(tid)
      toast.success('Analysis complete!')
      navigate('/results')
    } catch (err) {
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
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Multimodal Analysis</h1>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Complete the wizard to run a comprehensive Alzheimer's risk assessment.</p>
      </motion.div>

      <GlassCard className="p-6">
        <StepIndicator steps={STEPS} current={step} />
      </GlassCard>

      <GlassCard className="p-6" hover={false}>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}>
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </GlassCard>

      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" icon={ChevronLeft} disabled={step === 0 || loading} onClick={() => setStep(s => s - 1)}>Back</Button>
        <div className="flex items-center gap-2">
          {STEPS.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{ width: i === step ? 16 : 6, height: 6, background: i === step ? '#6366f1' : i < step ? '#22c55e' : 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>
        {step < STEPS.length - 1 ? (
          <Button icon={ChevronRight} onClick={() => setStep(s => s + 1)} disabled={loading}>Next</Button>
        ) : (
          <Button loading={loading} onClick={handleSubmit} icon={Zap}>Run Analysis</Button>
        )}
      </div>
    </div>
  )
}
