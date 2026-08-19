import React, { useRef, useState } from 'react'
import { LabeledInput } from './SharedComponents'
import { UserCheck, FileCode, Sparkles, Mic, MicOff, Check, Plus, ShieldAlert, Upload, User, FileText, Zap } from 'lucide-react'
import { useAuth } from '../../auth/AuthProvider'
import toast from 'react-hot-toast'

const ESSENTIAL_SYMPTOM_CHIPS = [
  'Memory loss',
  'Word finding difficulty',
  'Confusion',
  'Sleep problems',
  'Mood changes',
  'Executive dysfunction',
  'Spatial disorientation',
  'Caregiver concerns'
]

const ETHNICITIES = [
  'Caucasian / European',
  'African / African American',
  'East Asian',
  'South Asian',
  'Hispanic / Latino',
  'Native / Indigenous',
  'Other / Mixed Ancestry'
]

const CLINICAL_PRESETS = [
  {
    label: '72yo F - Amnestic MCI Profile',
    data: {
      name: 'Eleanor Vance',
      patient_id: 'DOC-PAT-7042',
      age: '72',
      sex: 'F',
      education_years: '16',
      ethnicity: 'Caucasian / European',
      handedness: 'Right',
      notes: 'Progressive short-term memory loss over 14 months. Frequent word-finding pauses and spatial disorientation when driving at night. Family reports repetitive questions.'
    }
  },
  {
    label: '78yo M - Early AD Profile',
    data: {
      name: 'Robert Chen',
      patient_id: 'DOC-PAT-8194',
      age: '78',
      sex: 'M',
      education_years: '18',
      ethnicity: 'East Asian',
      handedness: 'Right',
      notes: 'Notable executive dysfunction, misplacing household items, and mild agitation in evenings. MoCA impairment suspected.'
    }
  },
  {
    label: '68yo M - Vascular Risk Profile',
    data: {
      name: 'Marcus Brody',
      patient_id: 'DOC-PAT-6201',
      age: '68',
      sex: 'M',
      education_years: '14',
      ethnicity: 'African / African American',
      handedness: 'Right',
      notes: 'History of poorly controlled hypertension and type 2 diabetes. Reports psychomotor slowing and step-wise cognitive decline.'
    }
  }
]

export function PatientStep({ patient, setPatient, patientText, setPatientText, onSelectRoster, onLoadSample }) {
  const { user } = useAuth()
  const patSet = (k) => (e) => setPatient(p => ({ ...p, [k]: e.target.value }))
  const fileInputRef = useRef(null)
  const jsonImportRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const recognitionRef = useRef(null)

  // Doctor-scoped Patient ID generator (e.g. DOC-PAT-8492)
  const generateDoctorPatientId = () => {
    const docPrefix = user?.username ? user.username.slice(0, 4).toUpperCase() : 'DOC'
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    const newId = `${docPrefix}-PAT-${randomNum}`
    setPatient(p => ({ ...p, patient_id: newId }))
  }

  // 1-Tap Clinical Profile Pre-fill
  const applyPreset = (preset) => {
    setPatient(prev => ({
      ...prev,
      name: preset.data.name,
      patient_id: preset.data.patient_id,
      age: preset.data.age,
      sex: preset.data.sex,
      education_years: preset.data.education_years,
      ethnicity: preset.data.ethnicity,
      handedness: preset.data.handedness
    }))
    setPatientText(preset.data.notes)
    toast.success(`Loaded profile: ${preset.data.name}`)
  }

  // FHIR / JSON Patient Import Handler
  const handleJsonImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result)
        const name = imported.name || imported.entry?.[0]?.resource?.name?.[0]?.text || ''
        const id = imported.patient_id || imported.id || ''
        const age = imported.age || ''
        const sex = imported.sex || (imported.gender === 'female' ? 'F' : imported.gender === 'male' ? 'M' : 'M')
        const edu = imported.education_years || imported.education || ''
        const notes = imported.clinical_notes || imported.notes || ''

        setPatient(prev => ({
          ...prev,
          name: name || prev.name,
          patient_id: id ? `DOC-FHIR-${id.slice(0, 6)}` : prev.patient_id,
          age: age?.toString() || prev.age,
          sex: sex || prev.sex,
          education_years: edu?.toString() || prev.education_years,
        }))
        if (notes) setPatientText(notes)
        toast.success('Patient record imported')
      } catch (err) {
        toast.error('Invalid JSON/FHIR patient file')
      }
    }
    reader.readAsText(file)
  }

  // Voice-to-Text Speech Recognition Dictation
  const toggleDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Voice dictation unavailable in this browser')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      toast('Dictation stopped')
    } else {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        setPatientText(prev => (prev ? `${prev} ${transcript}` : transcript))
      }

      recognition.onerror = () => {
        setIsListening(false)
        toast.error('Voice dictation error')
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognition.start()
      recognitionRef.current = recognition
      setIsListening(true)
      toast.success('Listening… Speak observations aloud')
    }
  }

  const toggleSymptomChip = (chip) => {
    if (patientText.includes(chip)) {
      setPatientText(prev => prev.replace(chip, '').replace(/,\s*,/g, ',').replace(/^,\s*|\s*,\s*$/g, '').trim())
    } else {
      setPatientText(prev => prev ? `${prev}, ${chip}` : chip)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <User className="text-primary w-7 h-7" />
            Patient Identification & Intake
          </h2>
          <p className="text-sm text-foreground-muted font-medium mt-0.5">
            Enter primary demographics, medical ID, and chief presenting clinical observations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onSelectRoster && (
            <button
              type="button"
              onClick={onSelectRoster}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-surface border border-border text-foreground hover:bg-surface-hover transition-colors min-h-[42px] cursor-pointer shadow-2xs"
            >
              <UserCheck size={18} className="text-primary" />
              {patient.patient_id ? 'Switch Patient' : 'Select Patient'}
            </button>
          )}
          {onLoadSample && (
            <button
              type="button"
              onClick={onLoadSample}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition-colors min-h-[42px] cursor-pointer shadow-2xs"
            >
              <Sparkles size={18} />
              Sample Case
            </button>
          )}

        </div>
      </div>



      {/* ── DEMOGRAPHICS CONTAINER CARD ────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-2xs">
        <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/40 pb-2">
          <User size={16} className="text-primary" />
          Primary Demographic Indicators
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="sm:col-span-2">
            <LabeledInput
              label="Full Patient Name"
              required
              autoFocus
              value={patient.name}
              onChange={patSet('name')}
              placeholder="e.g. Eleanor Vance"
              error={!patient.name ? 'Patient name is required' : ''}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-foreground block">
                Medical ID <span className="text-rose-500 font-bold">*</span>
              </label>
              <button
                type="button"
                onClick={generateDoctorPatientId}
                className="text-xs text-primary hover:underline font-extrabold cursor-pointer"
              >
                Auto Generate
              </button>
            </div>
            <input
              value={patient.patient_id}
              onChange={patSet('patient_id')}
              placeholder="e.g. DOC-PAT-9042"
              className={`w-full px-4 py-2.5 rounded-xl text-base bg-background text-foreground border transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono ${
                !patient.patient_id ? 'border-rose-500/50 bg-rose-500/5' : 'border-border'
              }`}
            />
            {!patient.patient_id && (
              <p className="text-xs text-rose-500 font-semibold mt-1">Medical ID is required</p>
            )}
          </div>

          <div>
            <LabeledInput
              label="Age (Years)"
              required
              value={patient.age}
              onChange={patSet('age')}
              placeholder="e.g. 72"
              type="number"
              error={!patient.age ? 'Age is required' : ''}
            />
          </div>

          <div>
            <label className="text-sm block mb-1.5 font-bold text-foreground">
              Biological Sex <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="flex gap-1.5">
              {['M', 'F', 'Other'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPatient(p => ({ ...p, sex: s }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-extrabold transition-all border min-h-[44px] cursor-pointer ${
                    patient.sex === s
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-background hover:bg-surface-hover text-foreground-muted border-border'
                  }`}
                >
                  {s === 'M' ? 'Male' : s === 'F' ? 'Female' : 'Other'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── PRESENTING SYMPTOMS & CHIEF COMPLAINT CARD ─────────────────────── */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText size={16} className="text-indigo-400" />
            Chief Clinical Complaint & Symptom Intake
          </h3>

          <button
            type="button"
            onClick={toggleDictation}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all min-h-[38px] cursor-pointer ${
              isListening
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse'
                : 'bg-background border border-border text-foreground hover:border-primary/40'
            }`}
          >
            {isListening ? <MicOff size={15} /> : <Mic size={15} className="text-primary" />}
            {isListening ? 'Stop Dictating' : 'Voice Dictate Notes'}
          </button>
        </div>

        {/* Essential Symptom Quick Chips */}
        <div className="space-y-2">
          <span className="text-xs font-extrabold text-foreground-muted uppercase tracking-wider block">
            Click to Toggle Presenting Symptoms:
          </span>
          <div className="flex flex-wrap gap-2">
            {ESSENTIAL_SYMPTOM_CHIPS.map(chip => {
              const active = patientText.includes(chip)
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleSymptomChip(chip)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[40px] cursor-pointer ${
                    active
                      ? 'bg-primary text-white font-extrabold shadow-sm'
                      : 'bg-background hover:bg-surface-hover text-foreground border border-border'
                  }`}
                >
                  {active ? <Check size={15} /> : <Plus size={15} />}
                  {chip}
                </button>
              )
            })}
          </div>
        </div>

        {/* Clinical Observations Textarea */}
        <textarea
          value={patientText}
          onChange={(e) => setPatientText(e.target.value)}
          placeholder="Describe symptom onset timeline, memory complaints, speech pauses, or caregiver observations…"
          rows={3}
          className="w-full px-4 py-3 rounded-xl text-base bg-background text-foreground border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[110px]"
        />
      </div>

      {/* ── OPTIONAL ADVANCED DETAILS DRAWER ──────────────────────────────── */}
      <div className="border-t border-border/80 pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-extrabold text-foreground-muted hover:text-foreground transition-colors min-h-[44px] cursor-pointer"
        >
          <span className="text-primary text-lg font-extrabold">{showAdvanced ? '−' : '+'}</span>
          <span>{showAdvanced ? 'Hide Secondary Demographics & MRI Clearance' : 'Show Secondary Demographics & MRI Safety Clearance'}</span>
        </button>

        {showAdvanced && (
          <div className="mt-3 p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <LabeledInput
                  label="Education (Years)"
                  value={patient.education_years}
                  onChange={patSet('education_years')}
                  placeholder="e.g. 16"
                  type="number"
                />
              </div>

              <div>
                <label className="text-sm block mb-1.5 font-bold text-foreground">Handedness</label>
                <div className="flex gap-1.5">
                  {['Right', 'Left', 'Ambi'].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setPatient(p => ({ ...p, handedness: h }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-extrabold border min-h-[44px] cursor-pointer ${
                        patient.handedness === h ? 'bg-primary text-white border-primary' : 'bg-background border-border text-foreground-muted'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm block mb-1.5 font-bold text-foreground">Ancestry / Population Cohort</label>
                <select
                  value={patient.ethnicity || ''}
                  onChange={patSet('ethnicity')}
                  className="w-full px-4 py-2.5 rounded-xl text-base bg-background text-foreground border border-border min-h-[44px] cursor-pointer"
                >
                  <option value="">Select Ancestry</option>
                  {ETHNICITIES.map(eth => (
                    <option key={eth} value={eth}>{eth}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* MRI Safety Clearance Flags */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-sm">
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2 text-sm">
                <ShieldAlert size={18} /> MRI Safety Clearance Flags
              </span>
              <div className="flex flex-wrap gap-6 pt-1 text-sm">
                <label className="flex items-center gap-2.5 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={!!patient.pacemaker_flag}
                    onChange={(e) => setPatient(p => ({ ...p, pacemaker_flag: e.target.checked }))}
                    className="rounded accent-rose-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Pacemaker / Metallic Implants</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={!!patient.claustrophobia_flag}
                    onChange={(e) => setPatient(p => ({ ...p, claustrophobia_flag: e.target.checked }))}
                    className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Severe Claustrophobia</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
