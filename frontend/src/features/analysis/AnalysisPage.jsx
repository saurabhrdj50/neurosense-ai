import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User, Brain, MessageSquare, Mic, HeartPulse,
  ChevronRight, ChevronLeft, ShieldCheck,
  Save, Check, ArrowLeft, FileSpreadsheet, Zap, X, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { requestAnalysisNotifyPermission, notifyAnalysisSuccess, notifyAnalysisFailure } from './notify';
import Button from '../../shared/components/ui/Button';
import Modal from '../../shared/components/ui/Modal';
import { setAnalysisResults } from '../../context/ResultsStore';
import { PatientStep } from './patient/PatientStep';
import { MRIStep } from './mri/MRIStep';
import { CognitiveStep } from './cognitive/CognitiveStep';
import { SpeechStep } from './speech/SpeechStep';
import { RiskStep } from './risk/RiskStep';
import { ReviewStep } from './review/ReviewStep';
import { analysisApi, runAnalysisWithProgress } from './api/analysisApi';
import { patientsApi } from '../patients/api/patientsApi';
import { AnalysisLoader, useAnalysisProgress } from './AnalysisLoader';
import {
  SAMPLE_PATIENT, SAMPLE_PATIENT_TEXT, SAMPLE_SPEECH_TEXT,
  buildSampleCognitive, loadSampleMriFile,
} from './sampleData';

const STEPS = [
  { id: 'patient',   label: 'Patient Details',  icon: User,          required: true },
  { id: 'mri',       label: 'MRI Scan',         icon: Brain,         required: false },
  { id: 'cognitive', label: 'Cognitive Test',    icon: MessageSquare, required: false },
  { id: 'speech',    label: 'Speech Test',       icon: Mic,           required: false },
  { id: 'risk',      label: 'Risk Factors',      icon: HeartPulse,    required: false },
  { id: 'review',    label: 'Ready for Analysis',icon: ShieldCheck,   required: true },
];

// Simplified (free-tier) deploy: heavy MRI / voice inference is off.
// Set VITE_ENABLE_MRI=false / VITE_ENABLE_VOICE=false in Vercel for the
// demo deploy; the backend enforces the same flags and answers 503, so
// these flags only change what the UI offers. Defaults (unset) = enabled.
const MRI_ENABLED = import.meta.env.VITE_ENABLE_MRI !== 'false';
const VOICE_ENABLED = import.meta.env.VITE_ENABLE_VOICE !== 'false';
const DEMO_DISABLED_MESSAGE =
  'Disabled in this demo deploy — this step needs a larger server and is off for now.';

/** Placeholder shown in place of a disabled MRI / voice step. */
function DisabledStep({ label }) {
  return (
    <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
      <p className="text-sm font-bold">{label} — disabled</p>
      <p className="text-xs mt-1 leading-relaxed">{DEMO_DISABLED_MESSAGE}</p>
      <p className="text-xs mt-2 text-foreground-muted">
        Cognitive test and risk factors still run, and the results combine
        whatever is available.
      </p>
    </div>
  );
}

const DRAFT_STORAGE_KEY = 'neurosense_analysis_draft';
const perPatientDraftKey = (patientId) => `${DRAFT_STORAGE_KEY}_${patientId}`;

export default function AnalysisPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  // Final verification checkbox on the Review step — gates submission.
  const [confirmChecked, setConfirmChecked] = useState(false);
  // Leaving the Review step always re-arms the confirmation.
  useEffect(() => {
    if (step !== STEPS.length - 1) setConfirmChecked(false);
  }, [step]);
  const [loading, setLoading] = useState(false);
  const [jobProgress, setJobProgress] = useState(null); // {stage, progress} from the background job
  const loadingRef = useRef(false);
  const { isAnalyzing, startAnalysis, stopAnalysis } = useAnalysisProgress();

  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  const [patient, setPatient] = useState({ name: '', age: '', sex: 'M', patient_id: '', education_years: '', photo: null });
  const [mriFile, setMriFile] = useState(null);
  const [cognData, setCognData] = useState({});
  const [speechText, setSpeechText] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [risk, setRisk] = useState({});
  const [patientText, setPatientText] = useState('');

  const [lastSavedTime, setLastSavedTime] = useState(null);

  /* ── Prefill Patient info if passed via location state ─────────── */
  useEffect(() => {
    const prefill = location.state?.patient_info || location.state?.prefillPatient;
    if (prefill) {
      setPatient({
        name: prefill.name || '',
        age: prefill.age || '',
        sex: prefill.sex || 'M',
        patient_id: prefill.patient_id || '',
        education_years: prefill.education_years || '',
        photo: null
      });
      setSelectedPatient(prefill);
      toast.success(`Loaded patient profile: ${prefill.name || prefill.patient_id}`);
    }
  }, [location.state]);

  /* ── Load Patient Roster ────────────────────────────────────────────── */
  // Fresh fetch every time the roster modal opens — a patient deleted (or
  // added) in another tab/session must never appear in the picker.
  useEffect(() => {
    if (!rosterModalOpen) return;
    setPatientsLoading(true);
    patientsApi.getAll()
      .then(d => {
        setPatients(d.patients || []);
        setPatientsLoading(false);
      })
      .catch(() => setPatientsLoading(false));
  }, [rosterModalOpen]);

  /* ── Load draft from localStorage (keyed by patient when one is selected) ──
     When a patient arrives via location.state, only a draft belonging to that
     same patient_id may be restored — a stale draft from another patient must
     never silently attach to a newly selected patient. The prefilled registry
     demographics always take precedence over draft demographics. */
  useEffect(() => {
    try {
      const prefill = location.state?.patient_info || location.state?.prefillPatient;
      const draftKey = prefill?.patient_id ? perPatientDraftKey(prefill.patient_id) : DRAFT_STORAGE_KEY;
      const savedDraft = localStorage.getItem(draftKey) || (prefill ? localStorage.getItem(DRAFT_STORAGE_KEY) : null);
      if (!savedDraft) return;
      const parsed = JSON.parse(savedDraft);
      const draftBelongsToOtherPatient =
        prefill?.patient_id && parsed.patient?.patient_id && parsed.patient.patient_id !== prefill.patient_id;
      if (draftBelongsToOtherPatient) return;

      if (!prefill && (parsed.patient?.patient_id || parsed.patient?.name)) {
        setPatient(parsed.patient || {});
      }
      setPatientText(parsed.patientText || '');
      setCognData(parsed.cognData || {});
      setSpeechText(parsed.speechText || '');
      setRisk(parsed.risk || {});
      if (parsed.savedAt) setLastSavedTime(parsed.savedAt);
    } catch {
      // Ignore draft parse errors
    }
  }, [location.state]);

  /* ── Auto-save draft (per-patient key when a patient is selected) ──────── */
  const saveDraft = useCallback((quiet = false) => {
    try {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const draft = { patient, patientText, cognData, speechText, risk, savedAt: nowStr };
      const draftKey = patient.patient_id ? perPatientDraftKey(patient.patient_id) : DRAFT_STORAGE_KEY;
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setLastSavedTime(nowStr);
      if (!quiet) toast.success(`Draft saved at ${nowStr}`);
    } catch {
      if (!quiet) toast.error('Failed to save draft');
    }
  }, [patient, patientText, cognData, speechText, risk]);

  const hasUnsavedChanges = useCallback(() => {
    if (patient.name || patient.patient_id || patient.age) return true;
    if (mriFile) return true;
    if (Object.keys(cognData).length > 0) return true;
    if (speechText || audioFile) return true;
    if (Object.keys(risk).length > 0) return true;
    if (patientText) return true;
    return false;
  }, [patient, mriFile, cognData, speechText, audioFile, risk, patientText]);

  /* Warn before closing/refreshing window if unsaved changes exist */
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'Unsaved changes in active assessment.';
        return 'Unsaved changes in active assessment.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleBackOrExit = () => {
    if (hasUnsavedChanges()) {
      setLeaveModalOpen(true);
    } else {
      confirmLeave();
    }
  };

  const confirmLeave = (targetPath) => {
    setLeaveModalOpen(false);
    const target = typeof targetPath === 'string' ? targetPath : (location.state?.from || '/dashboard');
    navigate(target, { replace: true });
  };

  /* ── Submit Handler ────────────────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    let currentPatient = { ...patient };
    if (!currentPatient.patient_id || !currentPatient.name) {
      toast.error('Patient name and patient ID are required before analysis.');
      return;
    }
    // The Review step's verification checkbox is the deliberate final gate —
    // it guards the submit button AND this handler (Ctrl+Enter path).
    if (step === STEPS.length - 1 && !confirmChecked) {
      toast.error('Please verify the patient identity and data, then tick the confirmation box.');
      return;
    }

    // Re-entrancy guard: keyboard shortcut + button can fire while a request
    // is already in flight — never submit twice.
    if (loadingRef.current) return;
    loadingRef.current = true;

    setLoading(true);
    setJobProgress(null);
    startAnalysis();
    requestAnalysisNotifyPermission();
    const tid = toast.loading('Executing Clinical Analysis…');
    try {
      const fd = new FormData();
      Object.entries(currentPatient).forEach(([k, v]) => {
        if (k === 'photo' && v) {
          fd.append('photo', v);
        } else if (k === 'safety_flags' && Array.isArray(v)) {
          fd.append('safety_flags', JSON.stringify(v));
        } else if (v !== null && v !== undefined && v !== '') {
          fd.append(k, v);
        }
      });
      if (patientText) fd.append('patient_text', patientText);
      if (mriFile) fd.append('mri_image', mriFile);
      if (Object.keys(cognData).length) {
        // Strip any mmse/moca inherited from old localStorage drafts — the
        // backend treats those keys as clinician-administered instrument
        // scores, which this screening workflow never performs.
        const cleanCogn = { ...cognData };
        delete cleanCogn.mmse;
        delete cleanCogn.moca;
        fd.append('cognitive_tests', JSON.stringify(cleanCogn));
      }
      if (audioFile) fd.append('audio_file', audioFile);
      else if (speechText) fd.append('audio_text', speechText);
      // Unticked risk factors are stored as `false` — only serialize the
      // factors actually asserted (true / non-empty values)
      const activeRiskFactors = Object.fromEntries(
        Object.entries(risk).filter(([, v]) => v !== false && v !== null && v !== undefined)
      );
      if (Object.keys(activeRiskFactors).length) fd.append('risk_factors', JSON.stringify(activeRiskFactors));

      // Prefer the background-job API: submit once, poll real pipeline
      // progress. Falls back to the sync endpoint only when the async API is
      // unavailable (nothing started server-side in that case).
      let data;
      try {
        data = await runAnalysisWithProgress(fd, (stage, progress) => {
          setJobProgress({ stage, progress });
        });
      } catch (err) {
        if (!err.fallback) throw err;
        data = await analysisApi.runFullAnalysis(fd);
      }
      setJobProgress(null);
      setAnalysisResults(data);

      stopAnalysis();
      // Clear the completed assessment's draft (per-patient + legacy generic key)
      localStorage.removeItem(perPatientDraftKey(currentPatient.patient_id));
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      toast.dismiss(tid);
      notifyAnalysisSuccess(currentPatient.name);
      navigate('/results', { state: { autoView: true, fromAssessment: true, results: data } });
    } catch (err) {
      stopAnalysis();
      setJobProgress(null);
      toast.dismiss(tid);
      notifyAnalysisFailure(currentPatient.name, err.message);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [patient, patientText, mriFile, cognData, audioFile, speechText, risk, confirmChecked, step, startAnalysis, stopAnalysis, navigate]);

  /* ── Step Progression Guard ───────────────────────────────────────── */
  const handleNextStep = useCallback(() => {
    if (step === 0 && (!patient.name?.trim() || !patient.patient_id?.trim())) {
      toast.error('Patient Name and Medical ID are required before proceeding.');
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    }
  }, [step, patient.name, patient.patient_id]);

  /* ── Keyboard Shortcuts (Arrow Left/Right, Ctrl+S, Ctrl+Enter) ────── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (loadingRef.current) return; // ignore shortcut while submitting
        if (step < STEPS.length - 1) {
          handleNextStep();
        } else {
          handleSubmit();
        }
      } else if (e.key === 'ArrowRight' && step < STEPS.length - 1) {
        handleNextStep();
      } else if (e.key === 'ArrowLeft' && step > 0) {
        setStep(s => s - 1);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDraft();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, saveDraft, handleSubmit, handleNextStep]);

  /* ── Sample Case Loader ─────────────────────────────────────────────── */
  const loadSampleClinicalCase = async () => {
    const toastId = toast.loading('Preparing sample patient…');
    try {
      // Bundled illustrative MRI so the demo showcases the full pipeline,
      // including Grad-CAM, without any real patient material. Skipped
      // when MRI is disabled in the simplified deploy.
      if (MRI_ENABLED) {
        const mri = await loadSampleMriFile();
        setMriFile(mri);
      }
      setPatient({ ...SAMPLE_PATIENT, handedness: 'Right' });
      setPatientText(SAMPLE_PATIENT_TEXT);
      // Fully derived cognitive profile — fields mirror CognitiveStep's own
      // computation so the report is consistent even if the step is skipped.
      setCognData(buildSampleCognitive());
      // Text-only speech sample: fillers/pauses/preserved content give the
      // annotated transcript and linguistic biomarkers something to show.
      // Skipped when voice is disabled in the simplified deploy.
      if (VOICE_ENABLED) setSpeechText(SAMPLE_SPEECH_TEXT);
      // Risk values must be booleans matching RiskStep's toggle ids — the
      // step UI cannot produce strings or numbers (a stale/foreign sample
      // used 'moderate' / 6 here once).
      setRisk({ hypertension: true, family_history: true, sleep_issues: true, physical_inactivity: false });
      toast.success('Sample patient loaded — every step is pre-filled. Press Analyze to run it!', { id: toastId, duration: 5000 });
    } catch (err) {
      console.warn('Failed to load sample MRI asset:', err);
      // Text-only fallback still demonstrates the full workflow.
      setPatient(SAMPLE_PATIENT);
      setPatientText(SAMPLE_PATIENT_TEXT);
      setCognData(buildSampleCognitive());
      if (VOICE_ENABLED) setSpeechText(SAMPLE_SPEECH_TEXT);
      setRisk({ hypertension: true, family_history: true, sleep_issues: true, physical_inactivity: false });
      toast.error('Sample scan could not be loaded — loaded the text-only sample instead.', { id: toastId });
    }
  };

  /* ── "Load Sample Case" deep link from the dashboard empty state ──────── */
  const sampleLoadedRef = useRef(false);
  useEffect(() => {
    if (!location.state?.loadSample || sampleLoadedRef.current) return;
    sampleLoadedRef.current = true;
    loadSampleClinicalCase();
  }, [location.state]);

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    setPatient({
      name: p.name || '',
      age: p.age?.toString() || '',
      sex: p.sex || 'M',
      patient_id: p.patient_id || '',
      education_years: p.education_years?.toString() || '',
      photo: p.photo || null
    });
    setRosterModalOpen(false);
    toast.success(`Selected patient file: ${p.name}`);
  };

  const isStepComplete = (index) => {
    switch (index) {
      case 0: return !!(patient.name && patient.patient_id);
      case 1: return !MRI_ENABLED || !!mriFile;
      case 2: return Object.keys(cognData).length > 0;
      case 3: return !VOICE_ENABLED || !!(audioFile || speechText);
      case 4: return Object.keys(risk).length > 0;
      case 5: return step === 5 && !!(patient.name && patient.patient_id);
      default: return false;
    }
  };

  const completedCount = STEPS.filter((_, i) => isStepComplete(i)).length;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <PatientStep
            patient={patient}
            setPatient={setPatient}
            patientText={patientText}
            setPatientText={setPatientText}
            onSelectRoster={() => setRosterModalOpen(true)}
            onLoadSample={loadSampleClinicalCase}
          />
        );
      case 1:
        return MRI_ENABLED
          ? <MRIStep mriFile={mriFile} setMriFile={setMriFile} />
          : <DisabledStep label="MRI Scan" />;
      case 2: return <CognitiveStep cognData={cognData} setCognData={setCognData} />;
      case 3:
        return VOICE_ENABLED
          ? <SpeechStep speechText={speechText} setSpeechText={setSpeechText} audioFile={audioFile} setAudioFile={setAudioFile} />
          : <DisabledStep label="Speech Test" />;
      case 4: return <RiskStep risk={risk} setRisk={setRisk} />;
      case 5:
        return (
          <ReviewStep
            patient={patient}
            mriFile={mriFile}
            cognData={cognData}
            speechText={speechText}
            audioFile={audioFile}
            risk={risk}
            patientText={patientText}
            confirmChecked={confirmChecked}
            onConfirmChange={setConfirmChecked}
            onGoToStep={setStep}
          />
        );
      default: return null;
    }
  };

  const selectedModalities = [
    patient.patient_id && 'Demographics',
    mriFile && 'MRI Scan',
    Object.keys(cognData).length > 0 && 'Cognition',
    (audioFile || speechText) && 'Speech Analysis',
    Object.keys(risk).length > 0 && 'Clinical Risk',
  ].filter(Boolean);

  const activePatientName = patient.name || selectedPatient?.name;

  return (
    <>
      <AnalysisLoader
        isLoading={isAnalyzing}
        patientName={activePatientName || 'current patient'}
        modalities={selectedModalities}
        job={jobProgress}
      />

      {/* ── Patient Roster Modal ────────────────────────────────────────── */}
      <Modal open={rosterModalOpen} onClose={() => setRosterModalOpen(false)} title="Select Registered Patient File" maxWidth={540}>
        <div className="space-y-3">
          <p className="text-xs text-foreground-muted">Select a registered clinical patient file to auto-populate demographic records:</p>
          {patientsLoading ? (
            <p className="py-8 text-center text-xs text-foreground-muted">Loading patient roster...</p>
          ) : patients.length === 0 ? (
            <p className="py-8 text-center text-xs text-foreground-muted">No patient files registered in database.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {patients.map((p) => (
                <div
                  key={p.patient_id}
                  onClick={() => handleSelectPatient(p)}
                  className="p-3 rounded-xl cursor-pointer flex items-center justify-between transition-all bg-surface hover:bg-surface-hover border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                      {(p.name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{p.name}</p>
                      <p className="text-[11px] font-mono text-foreground-muted">ID: {p.patient_id} {p.age && `· ${p.age} yrs`}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-foreground-muted" />
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Unsaved Changes Dialog ──────────────────────────────────────── */}
      <Modal open={leaveModalOpen} onClose={() => setLeaveModalOpen(false)} title="Leave Assessment?" maxWidth={480}>
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <AlertCircle size={20} className="shrink-0" />
            <p className="text-xs font-medium text-foreground">
              Leave assessment? Unsaved changes will be lost. Select destination:
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" onClick={() => confirmLeave('/results')}>
              Diagnostic Results
            </Button>
            <Button variant="outline" size="sm" onClick={() => confirmLeave('/dashboard')} className="text-rose-500 hover:text-rose-600 border-rose-500/30">
              Leave to Dashboard
            </Button>
            <Button variant="primary" size="sm" onClick={() => setLeaveModalOpen(false)}>
              Continue Assessment
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* ── Clinical Workspace Shell ────────────────────────────────────── */}
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50/25 to-blue-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-foreground">
        
        {/* Top Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 bg-surface/90 backdrop-blur-md border-b border-border/80 z-10 shadow-2xs">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBackOrExit}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-surface-secondary hover:bg-surface-hover text-foreground border border-border cursor-pointer transition-colors shadow-2xs"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <div className="h-5 w-px bg-border/80" />

            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-foreground tracking-tight font-heading">
                Examination Workspace
              </h1>

              {activePatientName && (
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5 shadow-2xs">
                  <User size={14} />
                  <span>{activePatientName}</span>
                  {patient.patient_id && <span className="font-mono opacity-80">({patient.patient_id})</span>}
                </span>
              )}
            </div>
          </div>

          {/* Stepper Status Pill */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-secondary/80 border border-border text-sm font-medium shadow-2xs">
              <span className="text-foreground-muted font-mono font-bold">
                Step {step + 1} of {STEPS.length}
              </span>
              <span className="text-foreground-muted">·</span>
              <span className="text-foreground font-bold">
                {STEPS[step].label}
              </span>
            </div>

            {lastSavedTime && (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5 shadow-2xs">
                <Check size={13} />
                Draft saved: {lastSavedTime}
              </span>
            )}
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="md" icon={FileSpreadsheet} onClick={() => navigate('/results')} className="hidden lg:inline-flex text-sm font-semibold">
              Results
            </Button>
            <Button variant="outline" size="md" icon={Save} onClick={() => saveDraft()} className="hidden sm:inline-flex text-sm font-semibold shadow-2xs">
              Save Draft
            </Button>
            <button
              type="button"
              onClick={handleBackOrExit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-surface-secondary hover:bg-rose-500/10 text-foreground hover:text-rose-500 border border-border cursor-pointer transition-colors min-h-[40px] shadow-2xs"
            >
              <X size={16} />
              <span>Exit</span>
            </button>
          </div>
        </header>

        {/* Workspace Body Grid */}
        <div className="flex-1 flex overflow-hidden w-full">

          {/* Left Navigation Sidebar */}
          <aside className="w-[275px] flex-shrink-0 hidden md:flex flex-col overflow-y-auto p-4 bg-surface/75 backdrop-blur-sm border-r border-border/80 space-y-4">
            <div className="space-y-1.5">
              <div className="px-2 py-1 flex items-center justify-between text-xs font-extrabold text-foreground-muted uppercase tracking-wider mb-2">
                <span>Examination Steps</span>
                <span className="font-mono text-primary font-bold text-xs bg-primary/10 px-2 py-0.5 rounded-md">{completedCount}/{STEPS.length} Completed</span>
              </div>

              {STEPS.map((s, idx) => {
                const Icon = s.icon;
                const active = step === idx;
                const complete = isStepComplete(idx);

                return (
                  <button
                    key={s.id}
                    onClick={() => setStep(idx)}
                    className={`relative w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all border min-h-[48px] cursor-pointer shadow-2xs ${
                      active
                        ? 'bg-transparent border-transparent font-bold'
                        : complete
                        ? 'bg-emerald-500/10 text-foreground border-emerald-500/30 hover:bg-surface-hover font-medium'
                        : 'bg-surface hover:bg-surface-hover text-foreground-muted border-border font-medium'
                    }`}
                  >
                    {active && (
                      /* Sliding active pill — glides between steps instead of hard-swapping */
                      <Motion.span
                        layoutId="wizard-step-active-pill"
                        transition={{ type: 'spring', damping: 30, stiffness: 420 }}
                        className="absolute inset-0 rounded-xl bg-primary border border-primary shadow-sm"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative z-1 flex items-center gap-3 min-w-0">
                      <Icon size={18} className={active ? 'text-primary-foreground' : complete ? 'text-emerald-500' : 'text-foreground-muted'} />
                      <span className={`truncate text-sm font-bold ${active ? 'text-primary-foreground' : 'text-foreground'}`}>{s.label}</span>
                    </div>

                    <span className="relative z-1 text-xs shrink-0 font-bold ml-1">
                      {active ? (
                        <span className="text-primary-foreground/90">● Active</span>
                      ) : complete ? (
                        <span className="text-emerald-500 flex items-center gap-0.5">✓ Done</span>
                      ) : (
                        <span className="text-foreground-muted opacity-60">○ Pending</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Primary Viewport Canvas */}
          <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 w-full">
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* Dynamic Step View */}
              <AnimatePresence mode="wait">
                <Motion.div
                  key={step}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {renderStep()}
                </Motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* Footer Navigation */}
        <footer className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-surface/90 backdrop-blur-md border-t border-border/80 z-10 shadow-2xs">
          <Button
            variant="outline"
            size="md"
            icon={ChevronLeft}
            disabled={step === 0 || loading}
            onClick={() => setStep(s => s - 1)}
            className="min-h-[44px] text-base font-semibold px-4 shadow-2xs"
          >
            Previous Step
          </Button>

          {/* Dots */}
          <div className="hidden sm:flex items-center gap-2.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="h-2.5 rounded-full transition-all cursor-pointer"
                style={{
                  width: i === step ? 28 : 10,
                  background: i === step ? 'rgb(var(--primary))' : isStepComplete(i) ? '#10B981' : 'rgb(var(--border))',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            {step < STEPS.length - 1 ? (
              <Button
                variant="primary"
                size="md"
                icon={ChevronRight}
                onClick={handleNextStep}
                disabled={loading}
                className="min-h-[44px] text-base font-bold px-5 shadow-xs"
              >
                Next Step
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                loading={loading}
                onClick={handleSubmit}
                disabled={!confirmChecked}
                icon={Zap}
                className="min-h-[44px] text-base font-bold px-6 shadow-md shadow-primary/20"
              >
                Run Analysis & Generate Report
              </Button>
            )}
          </div>
        </footer>
      </div>
    </>
  );
}
