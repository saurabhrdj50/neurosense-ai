import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User, Brain, MessageSquare, Mic, HeartPulse,
  ChevronRight, ChevronLeft, ShieldCheck,
  Save, Check, ArrowLeft, FileSpreadsheet, Zap, X, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { setAnalysisResults } from '../../context/ResultsStore';
import { PatientStep } from './components/PatientStep';
import { MRIStep } from './components/MRIStep';
import { CognitiveStep } from './components/CognitiveStep';
import { SpeechStep } from './components/SpeechStep';
import { RiskStep } from './components/RiskStep';
import { ReviewStep } from './components/ReviewStep';
import { analysisApi } from './api/analysisApi';
import { patientsApi } from '../../services';
import { AnalysisLoader, useAnalysisProgress } from './components/AnalysisLoader';

const STEPS = [
  { id: 'patient',   label: 'Patient Details',  icon: User,          required: true },
  { id: 'mri',       label: 'MRI Scan',         icon: Brain,         required: false },
  { id: 'cognitive', label: 'Cognitive Test',    icon: MessageSquare, required: false },
  { id: 'speech',    label: 'Speech Test',       icon: Mic,           required: false },
  { id: 'risk',      label: 'Risk Factors',      icon: HeartPulse,    required: false },
  { id: 'review',    label: 'Ready for Analysis',icon: ShieldCheck,   required: true },
];

export default function AnalysisPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const { isAnalyzing, currentStep, startAnalysis, stopAnalysis } = useAnalysisProgress();

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
  useEffect(() => {
    patientsApi.getAll()
      .then(d => {
        setPatients(d.patients || []);
        setPatientsLoading(false);
      })
      .catch(() => setPatientsLoading(false));
  }, []);

  /* ── Load draft from localStorage ──────────────────────────────────── */
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('neurosense_analysis_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.patient?.patient_id || parsed.patient?.name) {
          setPatient(parsed.patient || {});
          setPatientText(parsed.patientText || '');
          setCognData(parsed.cognData || {});
          setSpeechText(parsed.speechText || '');
          setRisk(parsed.risk || {});
          if (parsed.savedAt) setLastSavedTime(parsed.savedAt);
        }
      }
    } catch (e) {
      // Ignore draft parse errors
    }
  }, []);

  /* ── Auto-save draft ────────────────────────────────────────────────── */
  const saveDraft = useCallback((quiet = false) => {
    try {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const draft = { patient, patientText, cognData, speechText, risk, savedAt: nowStr };
      localStorage.setItem('neurosense_analysis_draft', JSON.stringify(draft));
      setLastSavedTime(nowStr);
      if (!quiet) toast.success(`Draft saved at ${nowStr}`);
    } catch (e) {
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
      const fallbackId = `PAT-${Math.floor(1000 + Math.random() * 9000)}`;
      currentPatient = {
        name: currentPatient.name || 'Eleanor Vance',
        patient_id: currentPatient.patient_id || fallbackId,
        age: currentPatient.age || '72',
        sex: currentPatient.sex || 'F',
        education_years: currentPatient.education_years || '16',
      };
      setPatient(currentPatient);
      toast.success(`Assigned patient profile: ${currentPatient.name} (${currentPatient.patient_id})`);
    }
    
    setLoading(true);
    startAnalysis();
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
      if (Object.keys(cognData).length) fd.append('cognitive_tests', JSON.stringify(cognData));
      if (audioFile) fd.append('audio_file', audioFile);
      else if (speechText) fd.append('audio_text', speechText);
      if (Object.keys(risk).length) fd.append('risk_factors', JSON.stringify(risk));

      const data = await analysisApi.runFullAnalysis(fd);
      setAnalysisResults(data);
      
      // Allow multi-stage loader animation to complete smoothly (~1.2s delay)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      stopAnalysis();
      localStorage.removeItem('neurosense_analysis_draft');
      toast.dismiss(tid);
      toast.success('Diagnostic evaluation complete!');
      navigate('/results', { state: { autoView: true, fromAssessment: true, results: data } });
    } catch (err) {
      stopAnalysis();
      toast.dismiss(tid);
      toast.error('Analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [patient, patientText, mriFile, cognData, audioFile, speechText, risk, startAnalysis, stopAnalysis, navigate]);

  /* ── Keyboard Shortcuts (Arrow Left/Right, Ctrl+S, Ctrl+Enter) ────── */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (step < STEPS.length - 1) {
          setStep(s => s + 1);
        } else {
          handleSubmit();
        }
      } else if (e.key === 'ArrowRight' && step < STEPS.length - 1) {
        setStep(s => s + 1);
      } else if (e.key === 'ArrowLeft' && step > 0) {
        setStep(s => s - 1);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDraft();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, saveDraft, handleSubmit]);

  /* ── Sample Case Loader ─────────────────────────────────────────────── */
  const loadSampleClinicalCase = () => {
    const docPrefix = 'DOC';
    const sampleId = `${docPrefix}-PAT-` + Math.floor(1000 + Math.random() * 9000);
    setPatient({
      name: 'Eleanor Vance',
      age: '72',
      sex: 'F',
      patient_id: sampleId,
      education_years: '16',
      photo: null,
      handedness: 'Right',
      ethnicity: 'Caucasian / European'
    });
    setPatientText('Patient presents with mild short-term memory complaints and occasional word-finding pauses. Independent in activities of daily living.');
    setCognData({ mmse: 24, moca: 22, memory_recall: 5, clock_draw: 4 });
    setSpeechText('I spent the morning walking through the botanical garden with my daughter. We noticed the hydrangeas were beginning to bloom.');
    setRisk({ hypertension: true, family_history: true, physical_activity: 'moderate', sleep_hours: 6 });
    toast.success('Loaded Clinical Evaluation Sample Case!');
  };

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
      case 1: return !!mriFile;
      case 2: return Object.keys(cognData).length > 0;
      case 3: return !!(audioFile || speechText);
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
      case 1: return <MRIStep mriFile={mriFile} setMriFile={setMriFile} />;
      case 2: return <CognitiveStep cognData={cognData} setCognData={setCognData} patient={patient} />;
      case 3: return <SpeechStep speechText={speechText} setSpeechText={setSpeechText} audioFile={audioFile} setAudioFile={setAudioFile} />;
      case 4: return <RiskStep risk={risk} setRisk={setRisk} />;
      case 5:
        return (
          <ReviewStep
            patient={patient}
            patientText={patientText}
            mriFile={mriFile}
            cognData={cognData}
            speechText={speechText}
            audioFile={audioFile}
            risk={risk}
            onGoToStep={setStep}
            onSubmit={handleSubmit}
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
        currentStep={currentStep}
        patientName={activePatientName || 'current patient'}
        modalities={selectedModalities}
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
                    <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-xs">
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
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
        
        {/* Top Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 bg-surface border-b border-border z-10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleBackOrExit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-secondary hover:bg-surface-hover text-foreground border border-border cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <div className="h-5 w-px bg-border" />

            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold text-foreground tracking-tight">
                Examination Workspace
              </h1>

              {activePatientName && (
                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                  <User size={14} />
                  {activePatientName}
                  {patient.patient_id && <span className="font-mono opacity-85">({patient.patient_id})</span>}
                </span>
              )}
            </div>
          </div>

          {/* Stepper Status Pill */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-secondary border border-border text-sm font-medium">
              <span className="text-foreground-muted font-mono font-bold">
                Step {step + 1} of {STEPS.length}
              </span>
              <span className="text-foreground-muted">·</span>
              <span className="text-foreground font-bold">
                {STEPS[step].label}
              </span>
            </div>

            {lastSavedTime && (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5">
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
            <Button variant="outline" size="md" icon={Save} onClick={() => saveDraft()} className="hidden sm:inline-flex text-sm font-semibold">
              Save Draft
            </Button>
            <button
              type="button"
              onClick={handleBackOrExit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-surface-secondary hover:bg-rose-500/10 text-foreground hover:text-rose-500 border border-border cursor-pointer transition-colors min-h-[40px]"
            >
              <X size={16} />
              <span>Exit</span>
            </button>
          </div>
        </header>

        {/* Workspace Body Grid */}
        <div className="flex-1 flex overflow-hidden w-full">

          {/* Left Navigation Sidebar */}
          <aside className="w-[270px] flex-shrink-0 hidden md:flex flex-col overflow-y-auto p-4 bg-surface border-r border-border space-y-4">
            <div className="space-y-1.5">
              <div className="px-2 py-1 flex items-center justify-between text-xs font-bold text-foreground-muted uppercase tracking-wider mb-2">
                <span>Examination Steps</span>
                <span className="font-mono text-primary font-bold text-sm">{completedCount}/{STEPS.length}</span>
              </div>

              {STEPS.map((s, idx) => {
                const Icon = s.icon;
                const active = step === idx;
                const complete = isStepComplete(idx);

                return (
                  <button
                    key={s.id}
                    onClick={() => setStep(idx)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all border min-h-[48px] ${
                      active
                        ? 'bg-primary/10 text-primary border-primary/40 font-bold shadow-sm'
                        : complete
                        ? 'bg-emerald-500/5 text-foreground border-emerald-500/20 hover:bg-surface-hover font-medium'
                        : 'bg-transparent text-foreground-muted border-transparent hover:bg-surface-hover hover:text-foreground font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon size={18} className={active ? 'text-primary' : complete ? 'text-emerald-500' : 'text-foreground-muted'} />
                      <span className="truncate text-sm font-semibold">{s.label}</span>
                    </div>

                    <span className="text-xs shrink-0 font-bold ml-1">
                      {active ? (
                        <span className="text-primary">● Active</span>
                      ) : complete ? (
                        <span className="text-emerald-500 flex items-center gap-0.5">✓ Complete</span>
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
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* Footer Navigation */}
        <footer className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-surface border-t border-border z-10">
          <Button
            variant="outline"
            size="md"
            icon={ChevronLeft}
            disabled={step === 0 || loading}
            onClick={() => setStep(s => s - 1)}
            className="min-h-[44px] text-base font-semibold px-4"
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
                  background: i === step ? 'var(--primary, #6366F1)' : isStepComplete(i) ? '#10B981' : 'var(--border, #94A3B8)',
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden lg:inline-flex items-center gap-1 text-xs text-foreground-muted font-mono bg-surface-secondary px-3 py-1.5 rounded-lg border border-border font-bold">
              Ctrl + Enter ↵
            </span>
            {step < STEPS.length - 1 ? (
              <Button
                variant="primary"
                size="md"
                icon={ChevronRight}
                onClick={() => setStep(s => s + 1)}
                disabled={loading}
                className="min-h-[44px] text-base font-bold px-5"
              >
                Next Step
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                loading={loading}
                onClick={handleSubmit}
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
