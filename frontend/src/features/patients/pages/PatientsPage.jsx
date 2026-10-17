import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAnalysisResults, setAnalysisResults } from '../../../context/ResultsStore'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, Download, Eye, Plus, ArrowUpDown, ChevronUp, ChevronDown,
  Activity, FileText, Brain, Sparkles, MessageSquare, HeartPulse, ShieldCheck,
  CheckCircle2, Clock, Calendar, User, Filter, X, ArrowRight, ChevronRight,
  Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import Button from '../../../shared/components/ui/Button'
import Badge from '../../../shared/components/ui/Badge'
import Modal from '../../../shared/components/ui/Modal'
import Card from '../../../shared/components/ui/Card'
import { SectionSkeleton } from '../../../shared/components/ui/Skeleton'
import { useReducedMotionPref } from '../../../shared/motion'
import { patientsApi } from '../api/patientsApi'
import { historyApi } from '../../history/api/historyApi'
import LongitudinalTimeline from '../../history/components/LongitudinalTimeline'
import {
  getAnalysisStage,
  getAnalysisConfidence,
  getRiskLevel,
  doctorDisplayName,
} from '../../../shared/utils/clinicalMappers'

const STAGE_CONFIG = {
  'Cognitively Normal (CN)': { label: 'Normal / Healthy (CN)', variant: 'success', color: '#10B981' },
  'Non-Demented':       { label: 'Normal / Healthy', variant: 'success', color: '#10B981' },
  'Non Demented':       { label: 'Normal / Healthy', variant: 'success', color: '#10B981' },
  'Very Mild Demented': { label: 'Very Mild Decline', variant: 'purple',  color: '#7C3AED' },
  'Mild Cognitive Impairment (MCI)': { label: 'Mild Impairment (MCI)', variant: 'warning', color: '#F59E0B' },
  'Mild Demented':      { label: 'Mild Impairment (MCI)', variant: 'warning', color: '#F59E0B' },
  "Alzheimer's Disease (AD)": { label: "Alzheimer's Disease (AD)", variant: 'danger',  color: '#EF4444' },
  'Moderate Demented':  { label: 'Moderate Decline', variant: 'danger',  color: '#EF4444' },
  'Severe Demented':    { label: 'Severe Decline', variant: 'danger',  color: '#EF4444' },
  'Unassessed':         { label: 'Pending Assessment', variant: 'neutral', color: '#94A3B8' },
  'Unknown':            { label: 'Pending Assessment', variant: 'neutral', color: '#94A3B8' },
}

/* Biological sex display helper — 'Other' must not render as 'Female' */
const formatSex = (sex) => (sex === 'M' ? 'Male' : sex === 'F' ? 'Female' : (sex || '—'))

/* Escape a value for use inside a double-quoted CSV cell: embedded quotes are
   doubled, and cells starting with = + - @ get a leading apostrophe so
   spreadsheet applications do not execute them as formulas (CSV injection). */
const escapeCsvCell = (value) => {
  const str = String(value ?? '')
  const escaped = str.replace(/"/g, '""')
  return /^[=+\-@]/.test(str) ? `'${escaped}` : escaped
}

export default function PatientsPage() {
  const navigate = useNavigate()
  const location = useLocation()

  // Server state lives in TanStack Query; mutations invalidate the cache
  // instead of manually re-fetching both lists.
  const queryClient = useQueryClient()
  // Query errors are NOT swallowed — a failed fetch must show the error
  // banner below, never a silent "empty registry".
  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const res = await patientsApi.getAll()
      return { patients: res.patients || [], total: res.total ?? res.patients?.length ?? 0 }
    },
  })
  const analysesQuery = useQuery({
    queryKey: ['analyses'],
    queryFn: async () => {
      const res = await historyApi.getAllAnalyses()
      return { analyses: res.analyses || [], total: res.total ?? res.analyses?.length ?? 0 }
    },
  })
  const patients = useMemo(() => patientsQuery.data?.patients || [], [patientsQuery.data])
  const analyses = useMemo(() => analysesQuery.data?.analyses || [], [analysesQuery.data])
  const loading = patientsQuery.isLoading || analysesQuery.isLoading

  /* Primary State: Selected Patient for Detail View */
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [activeTab, setActiveTab]                 = useState('history') // 'history' | 'profile'

  /* Search State */
  const [search, setSearch] = useState('')

  /* Modal State */
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [formErrors, setFormErrors] = useState({})

  /* Deep-link from the Dashboard onboarding card ("Register First Patient"
     navigates here with openAddModal: true). State is cleared after opening
     so a refresh doesn't re-open the modal. */
  useEffect(() => {
    if (location.state?.openAddModal) {
      setAddOpen(true)
      navigate(location.pathname + location.search, { replace: true, state: null })
    }
  }, [location.state, location.pathname, location.search, navigate])
  const [form, setForm]       = useState({
    patient_id: '',
    name: '',
    age: '',
    sex: 'M',
    education_years: '',
    notes: ''
  })

  /* Delete with undo: the record vanishes immediately (optimistic cache
     update), the API call is deferred behind a 7s toast window offering
     Undo, and failures roll the optimistic removal back. Several deletes
     can be pending at once, hence the per-patient map. */
  const pendingDeletesRef = useRef(new Map()) // patient_id -> {patient, snapshots, timer}
  const reduced = useReducedMotionPref()

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        const searchEl = document.getElementById('patient-search-input')
        if (searchEl) searchEl.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['patients'] })
    queryClient.invalidateQueries({ queryKey: ['analyses'] })
  }, [queryClient])

  /* Enrich Patients with Latest Diagnostic Stage & Sort Recent Analysis to Top */
  const enrichedPatients = useMemo(() => {
    const list = patients.map((p) => {
      const pAnalyses = analyses
        .filter((a) => a.patient_id === p.patient_id || a.patient_info?.patient_id === p.patient_id)
        .sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0))

      if (!pAnalyses.length) {
        return {
          ...p,
          stage: 'Unassessed',
          risk: 'Unknown',
          conf: 0,
          lastAnalysis: null,
          history: [],
          latestResults: null
        }
      }

      const latest = pAnalyses[0]
      const stage  = getAnalysisStage(latest)
      /* Risk tier comes from the shared stage mapper — an unrecognized or
         unassessed stage maps to 'Unknown', never a fabricated tier. */
      const risk = getRiskLevel(stage)

      return {
        ...p,
        stage,
        risk,
        conf: Math.round(getAnalysisConfidence(latest)),
        lastAnalysis: latest.created_at || latest.timestamp,
        history: pAnalyses,
        latestResults: latest.results || latest
      }
    })

    // Sort by recent analysis date descending (most recent evaluated patient sits on top!)
    return list.sort((a, b) => {
      if (a.lastAnalysis && b.lastAnalysis) {
        return new Date(b.lastAnalysis) - new Date(a.lastAnalysis)
      }
      if (a.lastAnalysis && !b.lastAnalysis) return -1
      if (!a.lastAnalysis && b.lastAnalysis) return 1
      return (a.name || '').localeCompare(b.name || '')
    })
  }, [patients, analyses])

  /* Filtered Patients List */
  const filteredPatients = useMemo(() => {
    let result = enrichedPatients

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter((p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.patient_id && p.patient_id.toLowerCase().includes(q)) ||
        (p.stage && p.stage.toLowerCase().includes(q))
      )
    }

    return result
  }, [enrichedPatients, search])

  /* Auto-select patient with most recent analysis on first load */
  useEffect(() => {
    if (enrichedPatients.length > 0 && !selectedPatientId) {
      const params = new URLSearchParams(location.search)
      const targetId = params.get('patient_id') || enrichedPatients[0].patient_id
      setSelectedPatientId(targetId)
    }
  }, [enrichedPatients, selectedPatientId, location.search])

  /* Currently Selected Patient Object */
  const activePatient = useMemo(() => {
    if (!selectedPatientId) return filteredPatients[0] || null
    return enrichedPatients.find((p) => p.patient_id === selectedPatientId) || filteredPatients[0] || null
  }, [enrichedPatients, filteredPatients, selectedPatientId])

  /* Add Patient Handler (real form submit with client-side validation) */
  const handleAddPatient = async (e) => {
    e?.preventDefault?.()
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = 'Full name is required'
    if (!form.patient_id.trim()) {
      newErrors.patient_id = 'Patient ID is required'
    } else if (!/^[A-Za-z0-9\-_]+$/.test(form.patient_id.trim())) {
      newErrors.patient_id = 'Only letters, numbers, hyphens (-) and underscores (_) are allowed'
    }
    if (form.age === '' || form.age === null) {
      newErrors.age = 'Age is required'
    } else {
      const ageNum = Number(form.age)
      if (!Number.isFinite(ageNum) || !Number.isInteger(ageNum) || ageNum < 1 || ageNum > 120) {
        newErrors.age = 'Age must be a whole number between 1 and 120'
      }
    }
    setFormErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setSaving(true)
    try {
      await patientsApi.create({
        ...form,
        age: Number(form.age) || 0,
        education_years: Number(form.education_years) || 0,
      })
      toast.success('Patient registered successfully!')
      setAddOpen(false)
      setSelectedPatientId(form.patient_id)
      setForm({ patient_id: '', name: '', age: '', sex: 'M', education_years: '', notes: '' })
      setFormErrors({})
      loadData()
    } catch (err) {
      toast.error(err.message || 'Failed to register patient')
    } finally {
      setSaving(false)
    }
  }

  /* Restore the pre-deletion cache snapshots and drop the pending delete. */
  const handleUndoDelete = useCallback((pid) => {
    const pending = pendingDeletesRef.current.get(pid)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingDeletesRef.current.delete(pid)
    if (pending.snapshots.prevPatients !== undefined) {
      queryClient.setQueryData(['patients'], pending.snapshots.prevPatients)
    }
    if (pending.snapshots.prevAnalyses !== undefined) {
      queryClient.setQueryData(['analyses'], pending.snapshots.prevAnalyses)
    }
    setSelectedPatientId(pid)
    toast.success(`Deletion cancelled — ${pending.patient.name}'s record restored.`)
  }, [queryClient])

  const handleDeletePatient = useCallback((target) => {
    if (!target || pendingDeletesRef.current.has(target.patient_id)) return
    const pid = target.patient_id

    /* Optimistic removal from both cached lists (the registry and the
       analysis feed), keeping snapshots for rollback. */
    const prevPatients = queryClient.getQueryData(['patients'])
    const prevAnalyses = queryClient.getQueryData(['analyses'])
    queryClient.setQueryData(['patients'], (old) => {
      if (!old) return old
      const list = (old.patients || []).filter((p) => p.patient_id !== pid)
      return { ...old, patients: list, total: Math.max(0, (old.total ?? list.length + 1) - 1) }
    })
    queryClient.setQueryData(['analyses'], (old) => {
      if (!old) return old
      const list = (old.analyses || []).filter(
        (a) => (a.patient_info?.patient_id || a.patient_id) !== pid
      )
      return { ...old, analyses: list }
    })

    const remaining = enrichedPatients.filter((p) => p.patient_id !== pid)
    setSelectedPatientId(remaining[0]?.patient_id || null)

    toast((t) => (
      <div className="flex items-start gap-3 min-w-[280px]">
        <span className="w-8 h-8 rounded-lg bg-danger/10 border border-danger/20 text-danger flex items-center justify-center shrink-0" aria-hidden="true">
          <Trash2 size={15} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">Patient {target.name} deleted</p>
          <p className="text-[11px] text-foreground-muted font-medium mt-0.5">Removes the profile and all assessment history.</p>
        </div>
        <button
          type="button"
          onClick={() => { toast.dismiss(t.id); handleUndoDelete(pid) }}
          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-primary bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-colors cursor-pointer"
        >
          Undo
        </button>
      </div>
    ), { duration: 7000 })

    const timer = setTimeout(async () => {
      pendingDeletesRef.current.delete(pid)
      try {
        await patientsApi.delete(pid)
        toast.success('Patient record permanently deleted.')
        // Everywhere = every cached dataset: registry, analysis feed, every
        // patient-history query, and the last-result store if it holds the
        // deleted patient's report.
        queryClient.invalidateQueries({ queryKey: ['patients'] })
        queryClient.invalidateQueries({ queryKey: ['analyses'] })
        queryClient.invalidateQueries({ queryKey: ['patient-history'] })
        const stored = getAnalysisResults()
        if (stored && (stored.patient_info?.patient_id || stored.patient_id) === pid) {
          setAnalysisResults(null)
        }
      } catch (err) {
        /* Never let a failed delete silently swallow the record — roll back. */
        if (prevPatients !== undefined) queryClient.setQueryData(['patients'], prevPatients)
        if (prevAnalyses !== undefined) queryClient.setQueryData(['analyses'], prevAnalyses)
        setSelectedPatientId(pid)
        toast.error(err.message || 'Failed to delete patient record — changes reverted.')
      }
    }, 7100)
    pendingDeletesRef.current.set(pid, { patient: target, snapshots: { prevPatients, prevAnalyses }, timer })
  }, [enrichedPatients, handleUndoDelete, queryClient])

  /* Clear any pending delete timers when leaving the page. */
  useEffect(() => {
    const pending = pendingDeletesRef.current
    return () => pending.forEach((p) => clearTimeout(p.timer))
  }, [])

  /* Download single analysis CSV report */
  const handleDownloadAnalysis = (analysis) => {
    if (!activePatient) return
    const stageInfo = STAGE_CONFIG[analysis.stage] || { label: analysis.stage || 'Unassessed' }
    const res = analysis.results || {}
    const csvContent = [
      'Field,Value',
      `Patient Name,"${escapeCsvCell(activePatient.name)}"`,
      `Patient ID,"${escapeCsvCell(activePatient.patient_id)}"`,
      `Test Date,"${escapeCsvCell(formatDate(analysis.timestamp || analysis.date))}"`,
      `Overall Stage,"${escapeCsvCell(stageInfo.label)}"`,
      `Reported Score (Uncalibrated),${escapeCsvCell(analysis.conf ?? analysis.confidence ?? 'N/A')}`,
      `MRI Classifier Output,"${escapeCsvCell(res.mri?.stage || 'Not available')}"`,
      `Cognitive Screening Composite,${escapeCsvCell(res.cognitive?.composite_score != null ? `${res.cognitive.composite_score}/100` : 'Not available')}`,
      `Speech Transcript,"${escapeCsvCell(res.audio_transcription?.text ? 'Available (not fused)' : 'Not available')}"`,
      `Rule-Based Risk Factor Score,${escapeCsvCell(res.risk_profile?.overall_risk_score != null ? `${res.risk_profile.overall_risk_score}/100` : 'Not available')}`,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Neurosense_Report_${activePatient.patient_id}_${(analysis.timestamp || 'test').slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Analysis report downloaded successfully!')
  }

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (formErrors[key]) setFormErrors((er) => ({ ...er, [key]: undefined }))
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No evaluation yet'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const activeStageInfo = STAGE_CONFIG[activePatient?.stage] || STAGE_CONFIG['Unknown']

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 pb-10 font-sans">

      {/* ── Top Bar Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            Patient Workspace
            <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              {patientsQuery.data?.total ?? enrichedPatients.length} Active Patients
            </span>
          </h1>
          <p className="text-xs text-foreground-muted font-medium mt-0.5">
            All patient records, test history, and health reports in one simple view
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            icon={Download}
            onClick={() => patientsApi.exportAll()}
            className="min-h-[38px] text-xs font-bold px-3"
          >
            Export All CSV
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={Plus}
            onClick={() => { setFormErrors({}); setAddOpen(true) }}
            className="min-h-[38px] text-xs font-bold px-3.5"
          >
            New Patient
          </Button>
        </div>
      </div>

      {/* ── Split-Pane Grid Layout (Left Registry 4-Cols, Right Dossier 8-Cols) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT SIDEBAR: Master Patient Registry (4 Cols with vertical divider border) ────────── */}
        <div className="lg:col-span-4 space-y-3 lg:pr-5 lg:border-r lg:border-border">
          
          {/* Search Box */}
          <div className="bg-card border border-border rounded-2xl p-3 shadow-2xs">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
              <input
                id="patient-search-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient name or ID..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl text-xs bg-background border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Patient Card List — rows animate in, reflow on filter, and
              fade-collapse out when a delete (or search) removes them */}
          <div className="space-y-2.5 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
            {patientsQuery.isError ? (
              <div role="alert" className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-center space-y-3">
                <p className="text-xs font-semibold text-foreground">
                  Could not load the patient registry.
                </p>
                <button
                  onClick={() => patientsQuery.refetch()}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : loading ? (
              <SectionSkeleton rows={5} />
            ) : filteredPatients.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-6 text-center text-xs text-foreground-muted font-medium">
                No patients match search criteria.
              </div>
            ) : (
              <AnimatePresence initial={false} mode="popLayout">
                {filteredPatients.map((pat) => {
                  const isSelected = activePatient?.patient_id === pat.patient_id
                  const stageInfo = STAGE_CONFIG[pat.stage] || STAGE_CONFIG['Unknown']
                  const isEvaluated = Boolean(pat.lastAnalysis)

                  return (
                    <motion.div
                      key={pat.patient_id}
                      layout={!reduced}
                      initial={reduced ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      onClick={() => setSelectedPatientId(pat.patient_id)}
                      className={`relative p-4 rounded-2xl border cursor-pointer space-y-2.5 overflow-hidden ${
                        isSelected
                          ? 'bg-primary/5 border-2 border-primary shadow-sm ring-2 ring-primary/20'
                          : 'bg-card border-border hover:border-primary/40 hover:shadow-2xs'
                      }`}
                    >
                    {isSelected && (
                      <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary rounded-l-2xl" />
                    )}

                    <div className="flex items-center justify-between gap-2 pl-1">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 ${
                          isSelected ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-primary/10 border border-primary/20 text-primary'
                        }`}>
                          {(pat.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-foreground text-sm truncate leading-tight">{pat.name}</h4>
                          <span className="text-xs font-mono font-semibold text-foreground-muted block mt-0.5">{pat.patient_id}</span>
                        </div>
                      </div>

                      <Badge variant={isEvaluated ? stageInfo.variant : 'neutral'}>
                        {isEvaluated ? stageInfo.label : 'Awaiting Assessment'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs font-medium pt-2 border-t border-border/70 pl-1 text-foreground-muted">
                      <span>{pat.age ? `${pat.age}y` : '—'} · {formatSex(pat.sex)}</span>
                      <span className={`font-semibold ${isEvaluated ? 'text-primary' : 'text-foreground-muted'}`}>
                        {formatDate(pat.lastAnalysis)}
                      </span>
                    </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </div>

        </div>

        {/* ── RIGHT PANEL: Patient Diagnostic Dossier & Results (8 Cols) ─ */}
        <div className="lg:col-span-8 space-y-5">
          {!activePatient ? (
            <div className="bg-card border border-border rounded-2xl py-20 text-center text-foreground-muted font-medium">
              Select a patient from the left registry to view diagnostic dossier.
            </div>
          ) : (
            <>
              {/* Active Patient Clinical Banner */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground font-extrabold text-lg flex items-center justify-center shadow-xs">
                      {(activePatient.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-extrabold text-foreground tracking-tight">{activePatient.name}</h2>
                        <Badge variant={activeStageInfo.variant}>{activeStageInfo.label}</Badge>
                      </div>
                      <p className="text-xs text-foreground-muted font-medium mt-1">
                        Patient ID: <span className="font-mono font-bold text-foreground">{activePatient.patient_id}</span> · {activePatient.age}y {formatSex(activePatient.sex)} · Education: {activePatient.education_years != null ? `${activePatient.education_years} yrs` : 'not recorded'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Trash2}
                      onClick={() => handleDeletePatient(activePatient)}
                      className="min-h-[38px] text-xs font-bold px-3 text-danger border-danger/30 hover:bg-danger/10 hover:border-danger"
                    >
                      Delete Patient
                    </Button>

                    <Button
                      size="sm"
                      variant="primary"
                      icon={Activity}
                      onClick={() => navigate('/analysis', { state: { patient_info: activePatient } })}
                      className="min-h-[38px] text-xs font-bold px-3.5"
                    >
                      Start New Assessment
                    </Button>
                  </div>
                </div>

                {/* Dossier Navigation Tabs (2 Streamlined Tabs) — active pill slides between tabs */}
                <div className="flex items-center gap-2 border-t border-border pt-3">
                  {[
                    { id: 'history', label: `Test History & Reports (${activePatient.history.length})`, icon: Clock },
                    { id: 'profile', label: 'Patient Details', icon: User },
                  ].map((tab) => {
                    const TabIcon  = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        aria-pressed={isActive}
                        className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors min-h-[36px] ${
                          isActive
                            ? 'text-primary-foreground'
                            : 'bg-surface border border-border text-foreground-muted hover:text-foreground'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="dossier-tab-pill"
                            transition={{ type: 'spring', damping: 30, stiffness: 420 }}
                            className="absolute inset-0 rounded-xl bg-primary shadow-xs"
                            aria-hidden="true"
                          />
                        )}
                        <TabIcon size={14} className="relative z-1" />
                        <span className="relative z-1">{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* TAB 1: ALL TEST HISTORY & INDIVIDUAL DOWNLOADABLE REPORTS */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {/* Health Trend Timeline Chart */}
                  <LongitudinalTimeline history={activePatient.history} patientId={activePatient.patient_id} />

                  {/* Individual Analysis Records & Download Cards */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <FileText size={16} className="text-primary" />
                        Diagnostic Evaluation Records ({activePatient.history.length})
                      </h4>
                      <span className="text-xs text-foreground-muted font-medium">Sorted by most recent</span>
                    </div>

                    {activePatient.history.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-3">
                        <Clock size={32} className="mx-auto text-foreground-muted" />
                        <p className="text-sm text-foreground-muted font-medium">No test evaluations recorded for this patient yet.</p>
                        <Button
                          size="sm"
                          variant="primary"
                          icon={Activity}
                          onClick={() => navigate('/analysis', { state: { patient_info: activePatient } })}
                        >
                          Perform First Assessment
                        </Button>
                      </div>
                    ) : (
                      activePatient.history.map((item, idx) => {
                        const itemStage = STAGE_CONFIG[item.stage] || { label: item.stage || 'Unassessed', variant: 'neutral' }
                        const res       = item.results || {}
                        /* Use ONLY this item's own results — falling back to the
                           currently selected patient's latest analysis made older
                           cards display values from the newest one. */
                        const itemMri   = res.mri || {}
                        const itemCog   = res.cognitive || {}
                        const itemSp    = res.speech || res.sentiment || {}
                        const itemRisk  = res.risk_profile || {}

                        return (
                          <div key={item.session_id || idx} className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-2xs">
                            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-foreground bg-surface px-2.5 py-1 rounded-lg border border-border">
                                  📅 {formatDate(item.timestamp || item.date)}
                                </span>
                                <Badge variant={itemStage.variant}>{itemStage.label}</Badge>
                                <span className="text-xs font-mono font-bold text-indigo-500 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                                  {item.conf ?? item.confidence ?? 'N/A'} Reported Score
                                </span>
                              </div>

                              <Button
                                size="sm"
                                variant="outline"
                                icon={Download}
                                onClick={() => handleDownloadAnalysis(item)}
                                className="min-h-[34px] text-xs font-bold px-3 border-primary/30 text-primary hover:bg-primary/10"
                              >
                                Download Report (CSV)
                              </Button>
                            </div>

                            {/* Key Pillar Badges with Soft Color-Coded Background Tints */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-extrabold block">🧠 Brain Scan (MRI)</span>
                                <strong className="text-foreground font-extrabold text-xs">
                                  {itemMri.stage || 'Not available'}
                                </strong>
                              </div>

                              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <span className="text-amber-600 dark:text-amber-400 text-[11px] font-extrabold block">📝 Memory Test</span>
                                <strong className="text-foreground font-extrabold text-xs">
                                  {itemCog.composite_score != null ? `${itemCog.composite_score}/100` : 'Not available'}
                                </strong>
                              </div>

                              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                                <span className="text-cyan-600 dark:text-cyan-400 text-[11px] font-extrabold block">🎤 Speech Check</span>
                                <strong className="text-foreground font-extrabold text-xs">
                                  {itemSp.pause_frequency || itemSp.pitch_variation || (res.audio_transcription?.text ? 'Transcript available (not fused)' : 'Not available')}
                                </strong>
                              </div>

                              <div className={`p-2.5 rounded-xl border ${
                                itemRisk.risk_category === 'High Risk'
                                  ? 'bg-rose-500/10 border-rose-500/20'
                                  : 'bg-emerald-500/10 border-emerald-500/20'
                              }`}>
                                <span className={`text-[11px] font-extrabold block ${
                                  itemRisk.risk_category === 'High Risk' ? 'text-rose-600 dark:text-rose-400' : 'text-foreground-muted'
                                }`}>
                                  🧬 Health Factors
                                </span>
                                <strong className="text-foreground font-extrabold text-xs">
                                  {itemRisk.risk_category || (itemRisk.overall_risk_score != null ? `${itemRisk.overall_risk_score}/100 (rule-based)` : 'Not assessed')}
                                </strong>
                              </div>
                            </div>

                            {/* Summary Note */}
                            <p className="text-xs text-foreground-muted font-medium bg-surface/50 p-2.5 rounded-xl border border-border/60">
                              Backend stage label <strong className="text-foreground font-bold">{itemStage.label}</strong>; reported score {item.conf ?? item.confidence ?? 'N/A'} (uncalibrated). This is not a diagnosis.
                            </p>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: PATIENT DETAILS & CLINICAL PROFILE */}
              {activeTab === 'profile' && (
                <div className="bg-card border border-border rounded-2xl p-5 space-y-5 shadow-2xs text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <h3 className="text-base font-extrabold text-foreground tracking-tight">Patient Demographic Details</h3>
                      <p className="text-xs text-foreground-muted font-medium mt-0.5">Primary medical file information and background notes.</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Download}
                      onClick={() => patientsApi.export(activePatient.patient_id)}
                      className="min-h-[36px] text-xs font-bold px-3.5"
                    >
                      Export Patient File
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                      <span className="text-foreground-muted font-bold block text-[11px] uppercase tracking-wider">Patient Identifier</span>
                      <strong className="text-foreground font-mono text-sm">{activePatient.patient_id}</strong>
                    </div>

                    <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                      <span className="text-foreground-muted font-bold block text-[11px] uppercase tracking-wider">Full Legal Name</span>
                      <strong className="text-foreground text-sm font-bold">{activePatient.name}</strong>
                    </div>

                    <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                      <span className="text-foreground-muted font-bold block text-[11px] uppercase tracking-wider">Age & Biological Sex</span>
                      <strong className="text-foreground text-sm">{activePatient.age} years · {formatSex(activePatient.sex)}</strong>
                    </div>

                    <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                      <span className="text-foreground-muted font-bold block text-[11px] uppercase tracking-wider">Education Level</span>
                      <strong className="text-foreground text-sm">{activePatient.education_years != null ? `${activePatient.education_years} years of formal education` : 'Not recorded'}</strong>
                    </div>

                    <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                      <span className="text-foreground-muted font-bold block text-[11px] uppercase tracking-wider">Attending Physician</span>
                      <strong className="text-foreground text-sm">{doctorDisplayName(activePatient.doctor_username)}</strong>
                    </div>

                    <div className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
                      <span className="text-foreground-muted font-bold block text-[11px] uppercase tracking-wider">Total Evaluated Sessions</span>
                      <strong className="text-foreground text-sm">{activePatient.history.length} completed diagnostic assessment(s)</strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-surface border border-border space-y-1.5">
                    <span className="text-foreground-muted font-bold block text-[11px] uppercase tracking-wider">Clinical Intake & Referral Notes</span>
                    <p className="text-foreground leading-relaxed font-medium text-xs">
                      {activePatient.notes || 'No intake or referral notes recorded for this patient.'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* ── New Patient Modal (real form with client-side validation) ───── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Register New Patient File" maxWidth={500}>
        <form onSubmit={handleAddPatient} noValidate className="space-y-4 text-xs font-sans">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="patient-id" className="block font-semibold text-foreground mb-1 uppercase tracking-wider">
                Patient ID <span className="text-rose-400">*</span>
              </label>
              <input
                id="patient-id"
                type="text"
                value={form.patient_id}
                onChange={setField('patient_id')}
                placeholder="P-XXXX"
                aria-invalid={Boolean(formErrors.patient_id)}
                className={`w-full px-3 py-2 rounded-lg text-xs bg-background border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                  formErrors.patient_id ? 'border-rose-500/60 bg-rose-500/5' : 'border-border'
                }`}
              />
              {formErrors.patient_id && <p className="text-[11px] font-medium text-rose-500 mt-1">{formErrors.patient_id}</p>}
            </div>

            <div>
              <label htmlFor="patient-name" className="block font-semibold text-foreground mb-1 uppercase tracking-wider">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="patient-name"
                type="text"
                value={form.name}
                onChange={setField('name')}
                placeholder="Jane Smith"
                aria-invalid={Boolean(formErrors.name)}
                className={`w-full px-3 py-2 rounded-lg text-xs bg-background border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                  formErrors.name ? 'border-rose-500/60 bg-rose-500/5' : 'border-border'
                }`}
              />
              {formErrors.name && <p className="text-[11px] font-medium text-rose-500 mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label htmlFor="patient-age" className="block font-semibold text-foreground mb-1 uppercase tracking-wider">
                Age <span className="text-rose-400">*</span>
              </label>
              <input
                id="patient-age"
                type="number"
                value={form.age}
                onChange={setField('age')}
                placeholder="68"
                min="1"
                max="120"
                aria-invalid={Boolean(formErrors.age)}
                className={`w-full px-3 py-2 rounded-lg text-xs bg-background border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                  formErrors.age ? 'border-rose-500/60 bg-rose-500/5' : 'border-border'
                }`}
              />
              {formErrors.age && <p className="text-[11px] font-medium text-rose-500 mt-1">{formErrors.age}</p>}
            </div>

            <div>
              <label htmlFor="patient-education" className="block font-semibold text-foreground mb-1 uppercase tracking-wider">
                Education (Years)
              </label>
              <input
                id="patient-education"
                type="number"
                value={form.education_years}
                onChange={setField('education_years')}
                placeholder="16"
                className="w-full px-3 py-2 rounded-lg text-xs bg-background border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-foreground mb-1.5 uppercase tracking-wider">Biological Sex</label>
            <div className="flex gap-2" role="group" aria-label="Biological sex selection">
              {['M', 'F', 'Other'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, sex: s }))}
                  aria-pressed={form.sex === s}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    form.sex === s
                      ? 'bg-primary border-primary text-primary-foreground shadow-2xs'
                      : 'bg-background border-border text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {s === 'M' ? 'Male' : s === 'F' ? 'Female' : 'Other'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="patient-notes" className="block font-semibold text-foreground mb-1 uppercase tracking-wider">
              Clinical Intake Notes
            </label>
            <textarea
              id="patient-notes"
              value={form.notes}
              onChange={setField('notes')}
              rows={3}
              placeholder="Primary clinical observations, comorbidities, or referral notes..."
              className="w-full px-3 py-2 rounded-lg text-xs bg-background border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="flex-1" loading={saving}>Register Patient</Button>
          </div>
        </form>
      </Modal>

      {/* Deletion is now a Gmail-style optimistic delete with a 7s undo toast
          (see handleDeletePatient) instead of a blocking confirm modal. */}

    </div>
  )
}
