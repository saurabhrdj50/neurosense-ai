import React, { useRef, useState } from 'react'
import { LabeledInput } from './SharedComponents'
import { UserCheck, FileCode, Sparkles, Mic, MicOff, Check, Plus, ShieldAlert, Upload } from 'lucide-react'
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
    <div className="space-y-5">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div>
          <h2 className="text-sm font-bold text-foreground">Patient Information Intake</h2>
          <p className="text-xs text-foreground-muted">Essential demographic baseline and chief presenting complaint.</p>
        </div>

        <div className="flex items-center gap-2">
          {onSelectRoster && (
            <button
              type="button"
              onClick={onSelectRoster}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface border border-border text-foreground hover:bg-surface-hover transition-colors"
            >
              <UserCheck size={13} className="text-primary" />
              {patient.patient_id ? 'Switch Patient' : 'Select Roster'}
            </button>
          )}
          {onLoadSample && (
            <button
              type="button"
              onClick={onLoadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
            >
              <Sparkles size={13} />
              Sample Case
            </button>
          )}
          <button
            type="button"
            onClick={() => jsonImportRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface border border-border text-foreground hover:bg-surface-hover transition-colors"
          >
            <FileCode size={13} className="text-primary" />
            Import FHIR
          </button>
          <input ref={jsonImportRef} type="file" accept=".json" onChange={handleJsonImport} className="hidden" />
        </div>
      </div>

      {/* Essential Fields Grid */}
      <div className="space-y-4">
        {/* Row 1: Essential Demographics */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="sm:col-span-2">
            <LabeledInput
              label="Patient Name"
              required
              autoFocus
              value={patient.name}
              onChange={patSet('name')}
              placeholder="e.g. Eleanor Vance"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-foreground-muted block">
                Medical ID <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={generateDoctorPatientId}
                className="text-[10px] text-primary hover:underline font-semibold"
              >
                Auto ID
              </button>
            </div>
            <input
              value={patient.patient_id}
              onChange={patSet('patient_id')}
              placeholder="e.g. DOC-9042"
              className="w-full px-3 py-2 rounded-xl text-xs bg-surface text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <LabeledInput
            label="Age (Years)"
            required
            value={patient.age}
            onChange={patSet('age')}
            placeholder="e.g. 72"
            type="number"
          />

          <div>
            <label className="text-xs block mb-1 font-semibold text-foreground-muted">
              Sex <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-1">
              {['M', 'F', 'Other'].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPatient(p => ({ ...p, sex: s }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${
                    patient.sex === s
                      ? 'bg-primary/10 text-primary border-primary font-bold'
                      : 'bg-surface hover:bg-surface-hover text-foreground-muted border-border'
                  }`}
                >
                  {s === 'M' ? 'Male' : s === 'F' ? 'Female' : 'Other'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Education & Chief Complaint */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <LabeledInput
              label="Education (Years)"
              value={patient.education_years}
              onChange={patSet('education_years')}
              placeholder="e.g. 16"
              type="number"
            />
          </div>

          <div className="sm:col-span-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground-muted">
                Chief Complaint / Presenting Symptoms
              </label>
              <button
                type="button"
                onClick={toggleDictation}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all ${
                  isListening
                    ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50 animate-pulse'
                    : 'bg-surface border border-border text-foreground-muted hover:text-foreground'
                }`}
              >
                {isListening ? <MicOff size={11} /> : <Mic size={11} />}
                {isListening ? 'Listening...' : 'Dictate'}
              </button>
            </div>

            {/* Symptom Chips */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              {ESSENTIAL_SYMPTOM_CHIPS.map(chip => {
                const active = patientText.includes(chip)
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => toggleSymptomChip(chip)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
                      active
                        ? 'bg-primary text-white font-bold shadow-sm'
                        : 'bg-surface hover:bg-surface-hover text-foreground border border-border'
                    }`}
                  >
                    {active ? <Check size={11} /> : <Plus size={11} />}
                    {chip}
                  </button>
                )
              })}
            </div>

            <textarea
              value={patientText}
              onChange={(e) => setPatientText(e.target.value)}
              placeholder="Describe symptom onset, memory complaints, speech pauses, or caregiver observations…"
              rows={2}
              className="w-full px-3 py-2 rounded-xl text-xs bg-surface text-foreground border border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* More Details Drawer */}
      <div className="border-t border-border/80 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs font-semibold text-foreground-muted hover:text-foreground transition-colors"
        >
          <span className="text-primary font-bold">{showAdvanced ? '−' : '+'}</span>
          <span>{showAdvanced ? 'Hide Optional Details' : 'More Details (Photo, MRI Safety, Handedness, Ancestry)'}</span>
        </button>

        {showAdvanced && (
          <div className="mt-3 p-4 rounded-2xl bg-surface border border-border space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs block mb-1 font-semibold text-foreground-muted">Handedness</label>
                <div className="flex gap-1">
                  {['Right', 'Left', 'Ambi'].map(h => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setPatient(p => ({ ...p, handedness: h }))}
                      className={`flex-1 py-1 rounded-lg text-xs font-medium border ${
                        patient.handedness === h ? 'bg-primary/20 text-primary border-primary' : 'bg-background border-border'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs block mb-1 font-semibold text-foreground-muted">Ancestry / Cohort</label>
                <select
                  value={patient.ethnicity || ''}
                  onChange={patSet('ethnicity')}
                  className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-background text-foreground border border-border"
                >
                  <option value="">Select Ancestry</option>
                  {ETHNICITIES.map(eth => (
                    <option key={eth} value={eth}>{eth}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs block mb-1 font-semibold text-foreground-muted">Patient Photo (Optional)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs bg-background hover:bg-surface-hover flex items-center gap-1.5"
                  >
                    <Upload size={12} /> Upload Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) {
                        const r = new FileReader()
                        r.onloadend = () => setPatient(p => ({ ...p, photo: r.result }))
                        r.readAsDataURL(f)
                      }
                    }}
                    className="hidden"
                  />
                  {patient.photo && <span className="text-[10px] text-emerald-500 font-bold">Photo Attached</span>}
                </div>
              </div>
            </div>

            {/* MRI Safety Checklist */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-xs">
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ShieldAlert size={14} /> MRI Safety Clearance Flags
              </span>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={!!patient.pacemaker_flag}
                    onChange={(e) => setPatient(p => ({ ...p, pacemaker_flag: e.target.checked }))}
                    className="rounded accent-rose-500"
                  />
                  <span>Pacemaker / Metal Implants</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={!!patient.claustrophobia_flag}
                    onChange={(e) => setPatient(p => ({ ...p, claustrophobia_flag: e.target.checked }))}
                    className="rounded accent-amber-500"
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
