import React, { useEffect, useRef, useState } from 'react'
import { LabeledInput } from '../SharedComponents'
import { UserCheck, Sparkles, Mic, MicOff, Check, Plus, ShieldAlert, User, FileText, Camera, Trash2 } from 'lucide-react'
import { useAuth } from '../../../providers/AuthProvider'
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
  const [isListening, setIsListening] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const recognitionRef = useRef(null)
  // Required-field errors surface only after the user has interacted with a
  // field (on blur) — a freshly opened step must not scream "required" at
  // fields the clinician hasn't reached yet.
  const [touched, setTouched] = useState({})
  const markTouched = (k) => () => setTouched(t => ({ ...t, [k]: true }))

  // Doctor-scoped Patient ID generator (e.g. DOC-PAT-8492)
  const generateDoctorPatientId = () => {
    const docPrefix = user?.username ? user.username.slice(0, 4).toUpperCase() : 'DOC'
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    const newId = `${docPrefix}-PAT-${randomNum}`
    setPatient(p => ({ ...p, patient_id: newId }))
  }

  // One less field to think about: a fresh assessment starts with a valid
  // Medical ID already filled in (regenerate button stays for overrides;
  // drafts/prefills with an existing ID are never overwritten).
  useEffect(() => {
    if (!patient.patient_id) generateDoctorPatientId()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Photo: downscale client-side (max 512px JPEG) before it enters the draft
  // — the backend re-encodes avatars anyway, so this just keeps uploads small
  // and instant even from a phone camera.
  const MAX_PHOTO_BYTES = 5 * 1024 * 1024
  const photoInputRef = useRef(null)

  const handlePhotoSelect = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file (JPG, PNG, …)')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Photo is too large — please choose an image under 5 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, 512 / Math.max(img.width, img.height))
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        setPatient(p => ({ ...p, photo: canvas.toDataURL('image/jpeg', 0.85) }))
        toast.success('Patient photo added')
      }
      img.onerror = () => toast.error('Could not read that image — try another file')
      img.src = reader.result
    }
    reader.readAsDataURL(file)
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

      /* Interim results are retranscribed on every event; appending each one
         duplicated the text. Keep the interim tail separate and replace it:
         only isFinal results are committed permanently. */
      const interimRef = { current: '' }
      const committedFinalsRef = { current: 0 }

      const stripInterim = (prev) => {
        const withoutInterim = interimRef.current ? prev.slice(0, prev.length - interimRef.current.length) : prev
        return withoutInterim.replace(/\s+$/, '')
      }

      recognition.onresult = (event) => {
        const finals = []
        let interim = ''
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finals.push(result[0].transcript.replace(/\s+/g, ' ').trim())
          } else {
            interim += result[0].transcript
          }
        }

        const newFinals = finals.slice(committedFinalsRef.current)
        if (newFinals.length > 0) {
          committedFinalsRef.current = finals.length
          setPatientText(prev => {
            const base = stripInterim(prev)
            const addition = newFinals.filter(Boolean).join(' ').trim()
            if (!addition) return base
            return base ? `${base} ${addition}` : addition
          })
        }

        if (interim.trim()) {
          const nextInterim = interim.replace(/\s+/g, ' ').trim()
          setPatientText(prev => {
            const base = stripInterim(prev)
            return base ? `${base} ${nextInterim}` : nextInterim
          })
          interimRef.current = nextInterim
        } else {
          interimRef.current = ''
        }
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
      {/* ── Top Header Banner with Clinical Artwork & Quick Actions ──────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-50/80 via-blue-50/50 to-indigo-50/40 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-800/80 border border-sky-200/60 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <User size={28} className="drop-shadow" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                Patient Intake & Details
              </h2>
              <p className="text-sm text-foreground-muted font-medium mt-0.5">
                Enter primary demographics, medical ID, and chief presenting clinical observations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            {onSelectRoster && (
              <button
                type="button"
                onClick={onSelectRoster}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-surface border border-sky-200/80 dark:border-slate-700 text-foreground hover:bg-surface-hover transition-colors min-h-[42px] cursor-pointer shadow-2xs"
              >
                <UserCheck size={18} className="text-primary" />
                <span>{patient.patient_id ? 'Switch Patient' : 'Select Patient'}</span>
              </button>
            )}
            {onLoadSample && (
              <button
                type="button"
                onClick={onLoadSample}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-95 transition-opacity min-h-[42px] cursor-pointer shadow-xs"
              >
                <Sparkles size={18} />
                <span>Sample Case</span>
              </button>
            )}
          </div>
        </div>
      </div>



      {/* ── DEMOGRAPHICS CONTAINER CARD ────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-2xs">
        <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border/40 pb-2">
          <User size={16} className="text-primary" />
          Primary Demographic Indicators
        </h3>

        {/* Patient photo — stored with the record and shown in the registry */}
        <div className="flex items-center gap-4 p-3.5 rounded-xl bg-surface-secondary/50 border border-border/70">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-primary/10 border-2 border-primary/25 flex items-center justify-center shrink-0">
            {patient.photo ? (
              <img src={patient.photo} alt="Patient" className="w-full h-full object-cover" />
            ) : (
              <User size={26} className="text-primary/60" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-foreground">Patient Photo</p>
            <p className="text-[11px] text-foreground-muted font-medium">Optional — shown on the patient record</p>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handlePhotoSelect(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          {patient.photo ? (
            <button
              type="button"
              onClick={() => setPatient(p => ({ ...p, photo: null }))}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors min-h-[38px] flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} /> Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors min-h-[38px] flex items-center gap-1.5 cursor-pointer"
            >
              <Camera size={13} /> Upload
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="sm:col-span-2">
            <LabeledInput
              label="Full Patient Name"
              required
              autoFocus
              value={patient.name}
              onChange={patSet('name')}
              onBlur={markTouched('name')}
              placeholder="e.g. Eleanor Vance"
              error={touched.name && !patient.name ? 'Patient name is required' : ''}
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
              onBlur={markTouched('patient_id')}
              placeholder="e.g. DOC-PAT-9042"
              className={`w-full px-4 py-2.5 rounded-xl text-base bg-background text-foreground border transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono ${
                touched.patient_id && !patient.patient_id ? 'border-rose-500/50 bg-rose-500/5' : 'border-border'
              }`}
            />
            {touched.patient_id && !patient.patient_id && (
              <p className="text-xs text-rose-500 font-semibold mt-1">Medical ID is required</p>
            )}
          </div>

          <div>
            <LabeledInput
              label="Age (Years)"
              required
              value={patient.age}
              onChange={patSet('age')}
              onBlur={markTouched('age')}
              placeholder="e.g. 72"
              type="number"
              error={touched.age && !patient.age ? 'Age is required' : ''}
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
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
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
                      ? 'bg-primary text-primary-foreground font-extrabold shadow-sm'
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
                        patient.handedness === h ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground-muted'
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
