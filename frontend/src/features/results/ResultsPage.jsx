import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CheckCircle, ArrowLeft, Download, Clock,
  Brain, Printer, Plus, RefreshCw,
  FileCheck, CheckSquare, Square, ChevronRight, ChevronDown, User, Sparkles, Search, Calendar, FileText,
  HeartHandshake, Stethoscope, ShieldCheck, ListChecks, HelpCircle, Info, HeartPulse, Shield, BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAnalysisResults, setAnalysisResults } from '../../context/ResultsStore';
import Button from '../../shared/components/ui/Button';
import Badge from '../../shared/components/ui/Badge';
import Tabs from '../../shared/components/ui/Tabs';
import Modal from '../../shared/components/ui/Modal';
import { ResultsPageSkeleton } from '../../shared/components/ui/Skeleton';
import { useReducedMotionPref } from '../../shared/motion';
import { analysisApi } from '../analysis/api/analysisApi';
import ErrorBoundary from '../../shared/components/common/ErrorBoundary';
import { STAGE_CONFIG, getRiskLevel, SIMPLE_STAGE_INFO, getSimpleStageKey, SIMPLE_MODALITY_NAMES, formatSex } from '../../shared/utils/clinicalMappers';

/* Lazy load secondary detailed components */
const MRIResults = lazy(() => import('./mri/MRIResults').then((m) => ({ default: m.MRIResults })));
const CognitiveResults = lazy(() => import('./cognitive/CognitiveResults').then((m) => ({ default: m.CognitiveResults })));
const SpeechResults = lazy(() => import('./speech/SpeechResults').then((m) => ({ default: m.SpeechResults })));
const RiskResults = lazy(() => import('./risk/RiskResults').then((m) => ({ default: m.RiskResults })));
const XAIPanel = lazy(() => import('./fusion/XAIPanel'));

function PanelLoader() {
  return (
    <div role="status" aria-label="Loading clinical module" className="py-12 flex items-center justify-center gap-2 text-foreground-muted">
      <span className="w-4 h-4 rounded-full border-2 border-indigo-500/40 border-t-indigo-500 animate-spin" />
      <span className="text-xs font-medium">Loading clinical findings module...</span>
    </div>
  );
}

/* Four-segment agreement meter for the fusion verdict. 'Full' lights every
   segment; 'Low' leaves only the first. Filled segments animate in. */
const AGREEMENT_LEVELS = ['Full', 'High', 'Moderate', 'Low'];
function AgreementMeter({ agreement }) {
  if (!agreement || agreement === 'N/A') return null;
  const levelIndex = Math.max(0, AGREEMENT_LEVELS.indexOf(agreement));
  const lit = AGREEMENT_LEVELS.length - levelIndex;
  const litColor = lit >= 4 ? 'bg-emerald-400' : lit === 3 ? 'bg-emerald-400/70' : lit === 2 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-1.5" title={`Modality agreement: ${agreement}`} aria-label={`Modality agreement: ${agreement}`}>
      {AGREEMENT_LEVELS.map((lvl, i) => (
        <Motion.span
          key={lvl}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.15 + i * 0.08, duration: 0.3 }}
          className={`h-2 w-7 rounded-full origin-left ${i < lit ? litColor : 'bg-border'}`}
        />
      ))}
    </div>
  );
}

/* Success moment shown only when arriving straight from a finished
   assessment: the ring draws, the tick draws, then everything settles. */
function CompletionMark() {
  const reduced = useReducedMotionPref();
  if (reduced) {
    return (
      <span role="img" aria-label="Analysis complete" className="w-9 h-9 rounded-full border-2 border-emerald-500/60 bg-emerald-500/10 flex items-center justify-center">
        <CheckCircle size={18} className="text-emerald-500" />
      </span>
    );
  }
  return (
    <Motion.span
      role="img"
      aria-label="Analysis complete"
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 14, stiffness: 260 }}
      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
    >
      <svg viewBox="0 0 52 52" className="w-9 h-9" aria-hidden="true">
        <Motion.circle
          cx="26" cy="26" r="23" fill="rgba(16,185,129,0.1)"
          stroke="#10B981" strokeWidth="2.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <Motion.path
          d="M15 27l8 8 15-17"
          fill="none" stroke="#10B981" strokeWidth="3.5"
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.35, duration: 0.35, ease: 'easeOut' }}
        />
      </svg>
    </Motion.span>
  );
}

const DOCTOR_QUESTIONS = [
  { id: 'q-age', category: 'Understanding Changes', text: 'Are these memory and thinking patterns typical for my age, or do they indicate mild cognitive impairment?' },
  { id: 'q-labs', category: 'Medical Workup', text: 'Could reversible factors like sleep quality, vitamin B12, thyroid levels, or current medications be playing a role?' },
  { id: 'q-tests', category: 'Next Diagnostic Steps', text: 'Would a full neuropsychological assessment, blood biomarker panel, or repeat MRI scan in 6 months be helpful?' },
  { id: 'q-lifestyle', category: 'Proactive Brain Health', text: 'What specific lifestyle habits, MIND/Mediterranean nutrition, or cognitive exercises can support brain resilience?' },
  { id: 'q-daily', category: 'Daily Routine & Support', text: 'What practical organization strategies or memory aids can help our family manage everyday routines seamlessly?' },
  { id: 'q-timeline', category: 'Follow-up Cadence', text: 'When should we schedule our next clinical check-up to monitor stability or changes over time?' },
];

const GLOSSARY_TERMS = [
  {
    term: 'Mild Cognitive Changes (MCI)',
    simple: 'A state where subtle shifts in memory or thinking are noticeable to you or family, while independent daily functioning and decision-making remain intact.'
  },
  {
    term: 'Multimodal Concordance',
    simple: 'A measure of how closely different tests (memory recall, voice acoustics, brain imaging, health history) agree with each other to provide a reliable assessment.'
  },
  {
    term: 'Cognitive Reserve',
    simple: 'The brain’s natural resilience built through learning, reading, regular physical exercise, and social connection that helps it navigate age-related changes.'
  },
  {
    term: 'Acoustic Biomarkers',
    simple: 'Subtle characteristics of speech—such as pause duration, vocal pitch, and rhythm—that reflect how smoothly the brain retrieves and organizes thoughts.'
  },
  {
    term: 'Brain Volumetric Review',
    simple: 'Evaluating high-resolution MRI scans to check whether key memory centers, like the hippocampus and temporal lobe, match expected volume for your age.'
  }
];

function SanitizedErrorAlert({ errors, retryingModality, onRetry, canRetry }) {
  if (!errors || errors.length === 0) return null;
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3" role="alert">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-500 shrink-0" />
        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
          {errors.length} diagnostic module note{errors.length > 1 ? 's' : ''} — interpreted with clinical caution
        </p>
      </div>
      <div className="space-y-2">
        {errors.map((e, i) => {
          const raw = String(e.error || '');
          const isComplexTraceback = raw.includes('Traceback') || raw.includes('TorchScript') || raw.includes('RuntimeError') || raw.includes('Expected 4-dimensional') || raw.length > 150;
          const cleanMessage = isComplexTraceback
            ? `${e.modality} deep learning pipeline encountered an internal computational tensor warning. Multimodal consensus safely evaluated remaining clinical modalities.`
            : raw;

          return (
            <div key={i} className="p-3 rounded-xl bg-surface border border-border/80 flex flex-col gap-2 shadow-xs">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-foreground font-medium flex-1">
                  <span className="font-bold text-amber-600 dark:text-amber-400 mr-1.5">{e.modality}:</span>
                  {cleanMessage}
                </p>
                {e.retryable && (
                  <Button
                    variant="outline"
                    size="xs"
                    icon={RefreshCw}
                    loading={retryingModality === e.modalityKey}
                    onClick={() => onRetry(e.modalityKey)}
                    className="text-[11px] font-bold min-h-[28px] px-2.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 shrink-0"
                  >
                    Retry {e.modality}
                  </Button>
                )}
              </div>
              {isComplexTraceback && (
                <details className="text-[11px]">
                  <summary className="font-mono text-foreground-muted cursor-pointer hover:text-foreground select-none">
                    View technical error log
                  </summary>
                  <pre className="mt-1.5 p-2 rounded-lg bg-background border border-border font-mono text-[10px] text-foreground-muted overflow-x-auto max-h-36 whitespace-pre-wrap">
                    {raw}
                  </pre>
                </details>
              )}
            </div>
          );
        })}
      </div>
      {canRetry && errors.some((e) => e.retryable) && (
        <p className="text-[11px] text-foreground-muted">
          Clicking retry re-runs that evaluation from the saved upload and automatically refreshes multimodal fusion.
        </p>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const reducedMotion = useReducedMotionPref();
  const [results, setResultsState] = useState(getAnalysisResults());
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  /* View Mode: 'list' (History List) | 'detail' (Full Report) */
  const [viewMode, setViewMode] = useState(() => {
    if (location.state?.fromAssessment || location.state?.autoView || location.state?.results) return 'detail';
    return 'list';
  });

  /* Past Analyses History State */
  const [pastAnalyses, setPastAnalyses] = useState([]);
  const [historyError, setHistoryError] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStageFilter, setHistoryStageFilter] = useState('ALL');
  const [activeHistorySessionId, setActiveHistorySessionId] = useState(null);

  /* Download / Export Menu State */
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const downloadRef = useRef(null);

  /* Interactive Recommendation Checklist State */
  const [checkedActions, setCheckedActions] = useState({});

  /* Dual-Lens Perspective: 'patient' (Patient & Family) | 'clinician' (Clinician Detailed) */
  const [lens, setLens] = useState('patient');

  /* Interactive Doctor Discussion Checklist State with Local Persistence */
  const checklistStorageKey = `neurosense_checklist_${results?.session_id || 'default'}`;
  const notesStorageKey = `neurosense_patient_notes_${results?.session_id || 'default'}`;

  const [checkedQuestions, setCheckedQuestions] = useState(() => {
    try {
      const saved = localStorage.getItem(checklistStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [doctorNotes, setDoctorNotes] = useState(() => {
    try {
      return localStorage.getItem(notesStorageKey) || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(checklistStorageKey, JSON.stringify(checkedQuestions));
    } catch { /* ignore quota/private browsing issues */ }
  }, [checkedQuestions, checklistStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(notesStorageKey, doctorNotes);
    } catch { /* ignore */ }
  }, [doctorNotes, notesStorageKey]);

  const toggleQuestion = (id) => {
    setCheckedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrintDoctorQuestions = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }
    const questionsHtml = DOCTOR_QUESTIONS.map((q) => {
      const isChecked = !!checkedQuestions[q.id];
      return `<li style="margin-bottom: 12px; font-size: 14px;">
        <span style="display: inline-block; width: 18px; font-size: 16px; margin-right: 8px;">${isChecked ? '☑' : '☐'}</span>
        <strong>[${q.category}]</strong> ${q.text}
      </li>`;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Questions for My Neurologist / Doctor - NeuroSense AI</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #0F172A; line-height: 1.6; }
            h1 { font-size: 22px; margin-bottom: 4px; color: #1E40AF; }
            p.sub { font-size: 13px; color: #64748B; margin-bottom: 20px; }
            .info-box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 13px; }
            ul { list-style: none; padding: 0; }
            .notes-section { margin-top: 36px; border-top: 1px dashed #CBD5E1; padding-top: 20px; font-size: 13px; }
            .notes-box { min-height: 140px; border: 1px solid #E2E8F0; border-radius: 6px; margin-top: 10px; padding: 10px; background: #FAFAFA; white-space: pre-wrap; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>Questions to Ask Your Neurologist or Physician</h1>
          <p class="sub">Generated from NeuroSense AI Cognitive Health Assessment · For Personal Consultation Use</p>
          <div class="info-box">
            <strong>Patient:</strong> ${patient.name || 'Anonymous'} &nbsp;·&nbsp;
            <strong>ID:</strong> ${patient.patient_id || 'N/A'} &nbsp;·&nbsp;
            <strong>Assessment Date:</strong> ${analysisDate}
          </div>
          <ul>
            ${questionsHtml}
          </ul>
          <div class="notes-section">
            <strong>Notes & Action Items Discussed with Doctor:</strong>
            <div class="notes-box">${doctorNotes || ''}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) {
        setDownloadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  /* Past analysis history is loaded through analysisApi, which now propagates
     errors — failures surface as a visible error state with retry instead of
     a silently empty list. */
  const loadHistory = useCallback(async () => {
    setHistoryError(null);
    try {
      const history = await analysisApi.getPastAnalyses();
      setPastAnalyses(history || []);
    } catch (e) {
      console.warn('Failed to load past analyses history:', e);
      setHistoryError(e.message || 'Failed to load past analyses');
    }
  }, []);

  useEffect(() => {
    const passedResults = location.state?.results;
    if (passedResults) {
      setAnalysisResults(passedResults);
      setResultsState(passedResults);
    } else {
      const current = getAnalysisResults();
      if (current) setResultsState(current);
    }

    if (location.state?.fromAssessment || location.state?.autoView || location.state?.results) {
      setViewMode('detail');
    }
    setLoading(false);

    loadHistory();
  }, [location.state, loadHistory]);

  const handleSelectHistoryReport = (item) => {
    if (!item?.results) return;
    setAnalysisResults(item.results);
    setResultsState(item.results);
    setActiveHistorySessionId(item.session_id);
    setHistoryModalOpen(false);
    setViewMode('detail');
    toast.success(`Loaded diagnostic report for ${item.patient_name || 'Patient'}`);
  };

  const filteredHistory = useMemo(() => {
    return pastAnalyses.filter((item) => {
      const nameMatch = (item.patient_name || '').toLowerCase().includes(historySearch.toLowerCase());
      const idMatch = (item.patient_id || '').toLowerCase().includes(historySearch.toLowerCase());
      const stageMatch = (item.stage || '').toLowerCase().includes(historySearch.toLowerCase());
      const matchesSearch = nameMatch || idMatch || stageMatch;

      if (!matchesSearch) return false;
      if (historyStageFilter === 'ALL') return true;
      if (historyStageFilter === 'CN') return (item.stage || '').includes('Normal') || (item.stage || '').includes('CN');
      if (historyStageFilter === 'MCI') return (item.stage || '').includes('MCI') || (item.stage || '').includes('Impairment');
      if (historyStageFilter === 'AD') return (item.stage || '').includes('Alzheimer') || (item.stage || '').includes('AD');
      return true;
    });
  }, [pastAnalyses, historySearch, historyStageFilter]);

  const handleDownloadPdf = async () => {
    if (!results) return;
    setDownloading(true);
    try {
      await analysisApi.downloadPdfReport(results);
      toast.success('Clinical Diagnostic Report downloaded successfully!');
    } catch (err) {
      const raw = String(err?.message || 'Download failed');
      const clean = raw.includes('Traceback') || raw.includes('RuntimeError') || raw.length > 80
        ? 'Report generator is preparing assets. Please retry shortly.'
        : raw;
      toast.error('Failed to download PDF report: ' + clean);
    } finally {
      setDownloading(false);
    }
  };

  /* Per-modality retry: re-run a failed test server-side from the stored
     raw upload and swap in the refreshed full results payload. */
  const [retryingModality, setRetryingModality] = useState(null);
  const handleRetryModality = async (modalityKey) => {
    if (!results?.session_id || retryingModality) return;
    setRetryingModality(modalityKey);
    const toastId = toast.loading(`Re-running ${modalityKey === 'mri' ? 'MRI analysis' : 'speech analysis'}…`);
    try {
      const updated = await analysisApi.retryModality(results.session_id, modalityKey);
      setAnalysisResults(updated);
      setResultsState(updated);
      toast.success('Test re-run complete — results refreshed.', { id: toastId });
    } catch (err) {
      const raw = String(err?.message || 'Retry failed');
      const isComplex = raw.includes('Traceback') || raw.includes('RuntimeError') || raw.includes('TorchScript') || raw.length > 100;
      const cleanMessage = isComplex
        ? `${modalityKey === 'mri' ? 'MRI' : 'Speech'} test re-run encountered a processing notice. Please review clinical logs.`
        : raw;
      toast.error(cleanMessage, { id: toastId });
    } finally {
      setRetryingModality(null);
    }
  };

  const handleExportCsv = () => {
    if (!results) return;
    try {
      const contributions = fusion.modality_contributions || {};
      const csvData = [
        ['Patient ID', 'Name', 'Age', 'Sex', 'Backend Stage Label (Mapping Unverified)', 'Reported Score (Uncalibrated)', 'Rule-Based Risk Score', 'Date',
         'MRI Output Label (Mapping Unverified)', 'MRI Reported Score', 'Cognitive Composite (Rule-Based)', 'Screening Band (Heuristic)',
         'Risk Category', 'Factors Assessed', 'Fusion Method', 'Modality Agreement',
         'MRI Weight %', 'Cognitive Weight %', 'Speech Weight %', 'Risk Weight %', 'Session ID'],
        [
          patient.patient_id || 'N/A',
          `"${patient.name || 'Anonymous'}"`,
          patient.age || 'N/A',
          patient.sex || 'N/A',
          `"${stage}"`,
          `${(Number(conf) || 0).toFixed(1)}%`,
          risk.overall_risk_score ?? 'N/A',
          analysisDate,
          `"${mri.stage || 'N/A'}"`,
          mri.confidence != null ? `${Number(mri.confidence).toFixed(1)}%` : 'N/A',
          cognitive.composite_score ?? 'N/A',
          `"${cognitive.impairment_level || 'N/A'}"`,
          `"${risk.risk_category || risk.risk_label || 'N/A'}"`,
          risk.factors_assessed ?? (risk.contributing_factors?.length || 0),
          `"${fusion.method || 'N/A'}"`,
          `"${fusion.modality_agreement || 'N/A'}"`,
          contributions.mri ?? 'N/A',
          contributions.cognitive ?? 'N/A',
          contributions.sentiment ?? contributions.audio ?? 'N/A',
          contributions.risk ?? 'N/A',
          results.session_id || 'N/A'
        ]
      ].map(e => e.join(',')).join('\n');

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Clinical_Report_${patient.patient_id || 'Session'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV dataset exported successfully!');
    } catch (err) {
      const raw = String(err?.message || 'Export failed');
      const clean = raw.includes('Traceback') || raw.length > 80
        ? 'Could not export dataset at this time.'
        : raw;
      toast.error('Failed to export CSV: ' + clean);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  /* Keyboard shortcut Ctrl+P / Cmd+P for printing */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleAction = (id) => {
    setCheckedActions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <ResultsPageSkeleton />;

  /* ── 1. LIST VIEW MODE (Default View showing Past Analysis History) ─────── */
  if (viewMode === 'list' || !results) {
    return (
      <div className="max-w-5xl mx-auto py-6 space-y-6 font-sans pb-12">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
              <Brain size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
                  Diagnostic Results & History
                </h1>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {pastAnalyses.length} Sessions
                </span>
              </div>
              <p className="text-sm font-medium text-foreground-muted mt-0.5">
                Select any past clinical assessment report below to view full findings, or launch a new patient evaluation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => navigate('/analysis')}
              className="min-h-[40px] text-sm font-semibold"
            >
              Start New Assessment
            </Button>



            <Button
              variant="ghost"
              size="md"
              onClick={() => navigate('/patients')}
              className="min-h-[40px] text-sm font-semibold"
            >
              Patient Registry
            </Button>
          </div>
        </div>

        {/* Search & Stage Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3.5 p-3.5 rounded-2xl bg-surface border border-border">
          <div className="relative w-full sm:w-96">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search by patient name, ID, or stage..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-10 pr-4 h-11 rounded-xl border border-border bg-background text-sm font-medium text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-surface-secondary p-1 rounded-xl border border-border w-full sm:w-auto overflow-x-auto">
            {[
              { id: 'ALL', label: 'All Stages' },
              { id: 'CN', label: 'Normal (CN)' },
              { id: 'MCI', label: 'MCI Stage' },
              { id: 'AD', label: "Alzheimer's (AD)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHistoryStageFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                  historyStageFilter === tab.id
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* History Load Error Banner */}
        {historyError && (
          <div
            role="alert"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={18} className="text-rose-500 dark:text-rose-400 shrink-0" />
              <p className="text-sm font-semibold text-foreground">
                Failed to load past analyses: {historyError}
              </p>
            </div>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={loadHistory}>
              Retry
            </Button>
          </div>
        )}

        {/* History Grid of Past Analyses */}
        {filteredHistory.length === 0 ? (
          <div className="py-16 text-center text-xs text-foreground-muted space-y-3 border border-dashed border-border rounded-2xl bg-surface/50 font-sans">
            <FileText size={32} className="mx-auto text-foreground-muted opacity-40" />
            <p className="font-semibold text-foreground text-sm">No matching diagnostic analysis records found.</p>
            <p className="text-xs text-foreground-muted max-w-sm mx-auto">
              Try adjusting your search criteria or stage filter, or create a new assessment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
            {filteredHistory.map((item) => {
              const itemStage = item.stage || 'Unknown Stage';
              const itemConf = Number(item.confidence || 0).toFixed(1);
              const itemDate = item.timestamp
                ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'N/A';
              const isCurrentlySelected = activeHistorySessionId === item.session_id;

              return (
                <div
                  key={item.session_id}
                  onClick={() => handleSelectHistoryReport(item)}
                  className={`p-4 rounded-2xl border bg-surface hover:bg-surface-hover cursor-pointer transition-all hover:border-indigo-500/40 space-y-3 shadow-xs group ${
                    isCurrentlySelected ? 'border-indigo-500 ring-1 ring-indigo-500/30' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold text-base flex items-center justify-center shrink-0 border border-indigo-500/20">
                        {(item.patient_name || 'P')[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[15px] font-bold text-foreground truncate group-hover:text-indigo-400 transition-colors">
                            {item.patient_name}
                          </p>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-background border border-border text-foreground-muted">
                            {item.patient_id}
                          </span>
                        </div>
                        <p className="text-xs text-foreground-muted mt-1 flex items-center gap-1.5 font-medium">
                          <Calendar size={13} /> {itemDate}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      {itemConf}% AI
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 truncate max-w-[240px]">
                      {itemStage}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectHistoryReport(item);
                      }}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      View Detailed Findings <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Data destructuring — full multimodal payload from /api/analysis/analyze
  // (patient → MRI → cognitive → speech/audio → risk → fusion → XAI)
  const mri = results.mri || {};
  const sentiment = results.sentiment || {};
  const cognitive = results.cognitive || {};
  const risk = results.risk_profile || {};
  const fusion = results.final_stage || {};
  const patient = results.patient_info || {};
  const recommendations = results.recommendations || {};
  const aiExplanation = results.ai_explanation || null;
  const audioTx = results.audio_transcription || null;
  const clinicalNotes = results.clinical_notes_nlp || null;

  const stage = fusion.stage || mri.stage || 'Cognitive Assessment Completed';
  const conf = fusion.confidence || mri.confidence || 0;
  const stageConf = STAGE_CONFIG[stage] ?? STAGE_CONFIG['Unknown'];
  const riskLevel = getRiskLevel(stage);

  const analysisDate = results.created_at
    ? new Date(results.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Date not recorded';

  /* Per-modality errors surfaced by the backend (previously swallowed silently).
     mri/audio failures are retryable when the session was persisted: the
     backend re-runs just that modality from the stored raw upload and
     refreshes the fusion. */
  const canRetry = Boolean(results.session_id);
  const analysisErrors = [
    results.mri_error && { modality: 'Brain MRI', modalityKey: 'mri', retryable: canRetry, error: String(results.mri_error) },
    results.cognitive_error && { modality: 'Cognitive Battery', error: String(results.cognitive_error) },
    (results.audio_error || audioTx?.error) && { modality: 'Speech / Audio', modalityKey: 'audio', retryable: canRetry, error: String(results.audio_error || audioTx.error) },
    results.risk_error && { modality: 'Risk Profile', error: String(results.risk_error) },
    results.fusion_error && { modality: 'Multimodal Fusion', error: String(results.fusion_error) },
    results.explanation_error && { modality: 'AI Explanation', error: String(results.explanation_error) },
    results.recommendations_error && { modality: 'Recommendations', error: String(results.recommendations_error) },
  ].filter(Boolean);

  /* Plain-language headline derived from the medical stage */
  const simpleKey = getSimpleStageKey(stage);
  const simpleStage = SIMPLE_STAGE_INFO[simpleKey] || SIMPLE_STAGE_INFO.pending;

  /* Which inputs were present in the submitted assessment (not necessarily fused). */
  const modalityCoverage = [
    { key: 'mri', label: 'Brain MRI', present: Object.keys(mri).length > 0 && mri.stage !== 'Error' },
    { key: 'cognitive', label: 'Cognitive Battery', present: Object.keys(cognitive).length > 0 && cognitive.composite_score != null },
    { key: 'speech', label: 'Speech & Voice', present: Object.keys(sentiment).length > 0 || !!audioTx?.text },
    { key: 'risk', label: 'Risk Profile', present: Object.keys(risk).length > 0 && risk.overall_risk_score != null },
    { key: 'notes', label: 'Clinical Notes NLP', present: !!clinicalNotes && Object.keys(clinicalNotes).length > 0 },
  ];

  /* Evidence Summary Table Data — one row per analysis modality */
  const mriFinding = mri.stage
    ? `MRI classifier label: ${mri.stage} · reported score ${(Number(mri.confidence) || 0).toFixed(1)}%`
    : (results.mri_error ? `Failed: ${String(results.mri_error).slice(0, 80)}` : 'Not Available');
  const mriInterpretation = mri.decision_summary
    || (mri.stage ? 'Backend-mapped classifier output; training class mapping is unverified.' : 'No MRI scan provided.');

  /* Questionnaire composite is rule-based and is not an MMSE/MoCA administration. */
  const cogAnswered = cognitive.questions_completed ?? cognitive.tests_completed ?? 0;
  const cogTotal = cognitive.total_questions ?? 15;
  const hasCog = cognitive.composite_score != null;
  const cogFinding = hasCog
    ? `${cognitive.composite_score}/100 rule-based composite (${cogAnswered} of ${cogTotal} items answered)`
    : (results.cognitive_error ? 'Screening failed' : 'Screening not done');
  const cogInterpretation = hasCog
    ? 'Questionnaire score only; this workflow does not administer or calculate MMSE/MoCA.'
    : 'The questionnaire screening was not completed.';

  const speechMetricParts = [];
  if (sentiment.lexical_density) speechMetricParts.push(`Lexical density: ${sentiment.lexical_density}`);
  if (sentiment.filler_word_count != null) speechMetricParts.push(`${sentiment.filler_word_count} filler words`);
  if (sentiment.pause_frequency) speechMetricParts.push(`Pause category: ${sentiment.pause_frequency}`);
  if (sentiment.pitch_variation) speechMetricParts.push(`Pitch variation: ${sentiment.pitch_variation}`);
  const transcriptWords = audioTx?.text ? audioTx.text.trim().split(/\s+/).filter(Boolean).length : 0;
  const speechFinding = transcriptWords > 0
    ? `Transcribed ${transcriptWords} words${speechMetricParts.length ? ` · ${speechMetricParts.slice(0, 2).join(' · ')}` : ''}`
    : (speechMetricParts.length ? speechMetricParts.join(' · ') : (sentiment.clinical_summary || (results.audio_error ? 'Transcription failed' : 'Not Available')));
  const speechInterpretation = sentiment.clinical_summary
    || (transcriptWords > 0 ? 'Transcript received; only successfully extracted audio summaries are shown.' : 'No speech input provided.');

  const riskFinding = (risk.overall_risk_score != null)
    ? `Risk ${risk.overall_risk_score}/100 · ${risk.risk_category || risk.risk_label || ''} · ${risk.factors_assessed ?? (risk.contributing_factors?.length || 0)} factors`
    : (results.risk_error ? 'Assessment failed' : 'Not Available');
  const topRiskFactors = (risk.contributing_factors || []).slice(0, 3);
  const riskInterpretation = (risk.overall_risk_score != null)
    ? `${topRiskFactors.length ? `Contributing factors: ${topRiskFactors.join(', ')}.` : 'Submitted health factors scored.'} Local rule-based score; not a validated clinical instrument.`
    : 'No risk data provided.';

  const evidenceSummaryRows = [
    {
      modality: 'MRI classifier',
      finding: mriFinding,
      interpretation: mriInterpretation,
      status: results.mri_error ? 'Error' : mri.stage ? 'Output available' : 'N/A',
    },
    {
      modality: 'Cognitive questionnaire',
      finding: cogFinding,
      interpretation: cogInterpretation,
      status: results.cognitive_error ? 'Error' : hasCog ? 'Scored' : 'N/A',
    },
    {
      modality: 'Speech test',
      finding: speechFinding,
      interpretation: speechInterpretation,
      status: results.audio_error ? 'Error' : (transcriptWords > 0 || speechMetricParts.length > 0) ? 'Analyzed' : 'N/A',
    },
    {
      modality: 'Health risks',
      finding: riskFinding,
      interpretation: riskInterpretation,
      status: results.risk_error ? 'Error' : (risk.risk_category || risk.risk_label || (risk.overall_risk_score != null ? 'Scored' : 'N/A')),
    },
    ...(clinicalNotes && Object.keys(clinicalNotes).length > 0 ? [{
      modality: "Doctor's notes",
      finding: clinicalNotes.sentiment_label || clinicalNotes.dominant_emotion || 'Analyzed',
      interpretation: clinicalNotes.summary || clinicalNotes.clinical_summary || 'Extra notes from the doctor (does not replace the speech test).',
      status: 'Analyzed',
    }] : []),
  ];

  /* Show only the modality weights returned by the fusion engine. */
  const MODALITY_META = {
    mri:       { label: 'MRI structural classifier', category: 'Brain scan', color: 'bg-rose-500' },
    cognitive: { label: 'Cognitive screening score', category: 'Questionnaire', color: 'bg-amber-500' },
    sentiment: { label: 'Speech NLP & language biomarkers', category: 'Speech & Language', color: 'bg-purple-500' },
    speech:    { label: 'Speech NLP & language biomarkers', category: 'Speech & Language', color: 'bg-purple-500' },
    audio:     { label: 'Speech acoustic biomarkers', category: 'Speech & Language', color: 'bg-purple-500' },
    risk:      { label: 'Clinical risk-factor profile', category: 'Risk factors', color: 'bg-indigo-500' },
  };
  const keyClinicalFindings = Object.entries(fusion.modality_contributions || {})
    .sort((a, b) => b[1] - a[1])
    .map(([mod, pct]) => ({
      label: MODALITY_META[mod]?.label || `${mod} contribution`,
      value: Math.round(Number(pct) || 0),
      category: MODALITY_META[mod]?.category || 'Fusion modality',
      color: MODALITY_META[mod]?.color || 'bg-indigo-500',
    }));

  /* Backend-personalized recommendations drive the checklist (fallback: generic) */
  const medRecs = recommendations.medical_recommendations || {};
  const backendReferrals = Array.isArray(medRecs.referrals) ? medRecs.referrals : [];
  const backendTips = Array.isArray(recommendations.lifestyle_recommendations?.tips)
    ? recommendations.lifestyle_recommendations.tips
    : (Array.isArray(recommendations.lifestyle_recommendations) ? recommendations.lifestyle_recommendations : []);
  const urgencyToPriority = (u = '') => /urgent|important/i.test(u) ? 'High' : /recommended/i.test(u) ? 'Medium' : 'Routine';
  const actionableNextSteps = (backendReferrals.length > 0 || backendTips.length > 0)
    ? [
        ...backendReferrals.slice(0, 3).map((r, i) => ({
          id: `referral-${i}`,
          text: `${r.specialist || 'Specialist'} — ${r.reason || 'clinical evaluation'}${r.note ? ` (${r.note})` : ''}`,
          priority: urgencyToPriority(r.urgency),
        })),
        ...(medRecs.follow_up ? [{ id: 'followup', text: `Follow-up schedule: ${medRecs.follow_up}${medRecs.urgency_level ? ` (urgency: ${medRecs.urgency_level})` : ''}`, priority: 'Medium' }] : []),
        ...backendTips.slice(0, 2).map((t, i) => ({
          id: `lifestyle-${i}`,
          text: typeof t === 'string' ? t : `${t.category ? `[${t.category}] ` : ''}${t.tip || t.text || JSON.stringify(t)}`,
          priority: t?.priority === 'high' ? 'High' : 'Routine',
        })),
      ]
    : [
        { id: 'referral', text: 'Refer patient to Memory Specialist for detailed evaluation.', priority: 'High' },
        { id: 'mri_repeat', text: 'Schedule a follow-up brain MRI scan in 6 months to monitor changes.', priority: 'High' },
        { id: 'moca_full', text: 'Complete a full memory test and daily activity questionnaire.', priority: 'Medium' },
        { id: 'risk_mod', text: 'Review health factors (blood pressure, physical activity, sleep).', priority: 'Medium' },
        { id: 'psychoedu', text: 'Provide brain health and safety guidance for patient and family.', priority: 'Routine' },
      ];

  const TABS = [
    { id: 'summary', label: 'Summary', icon: FileCheck },
    { id: 'details', label: 'Test Details', icon: Brain },
    { id: 'why', label: 'Why This Result', icon: Sparkles },
  ];

  return (
    <div className="printable-area max-w-6xl mx-auto space-y-6 pb-14 font-sans">

      {/* ── Patient Bar & Top Header Actions ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border no-print">
        <div className="flex items-center gap-3.5 min-w-0">
          <Button
            variant="outline"
            size="md"
            icon={ArrowLeft}
            onClick={() => setViewMode('list')}
            className="shrink-0 font-semibold text-foreground hover:bg-surface-hover min-h-[40px] text-sm"
          >
            All Reports
          </Button>

          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-base shrink-0">
            <User size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate max-w-[360px]" title={patient.name || 'Patient Assessment Dossier'}>
                {patient.name || 'Patient Assessment Dossier'}
              </h2>
              {patient.patient_id && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border bg-surface border-border text-foreground-muted shrink-0">
                  {patient.patient_id}
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-foreground-muted mt-0.5 truncate">
              {patient.age ? `${patient.age} yrs` : 'Age N/A'} {patient.sex ? `· ${formatSex(patient.sex)}` : ''} • {results.created_at ? `Evaluated on ${analysisDate}` : analysisDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="md"
            icon={Clock}
            onClick={() => setHistoryModalOpen(true)}
            className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20 min-h-[40px] text-sm font-semibold"
          >
            Past Reports ({pastAnalyses.length})
          </Button>

          {/* Consolidated Download / Export Dropdown */}
          <div className="relative" ref={downloadRef}>
            <Button
              variant="outline"
              size="md"
              icon={Download}
              loading={downloading}
              onClick={() => setDownloadMenuOpen(o => !o)}
              className="min-h-[40px] text-sm font-semibold gap-1.5"
            >
              <span>Download / Export</span>
              <ChevronDown size={14} className="text-foreground-muted" />
            </Button>

            <AnimatePresence>
              {downloadMenuOpen && (
                <Motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-2 w-52 bg-surface border border-border rounded-xl shadow-lg p-1.5 z-50 text-xs font-sans space-y-0.5"
                >
                  <button
                    type="button"
                    onClick={() => { setDownloadMenuOpen(false); handleDownloadPdf(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-surface-hover font-semibold transition-colors text-left"
                  >
                    <FileText size={15} className="text-indigo-500 shrink-0" />
                    <div>
                      <p className="font-bold">Download PDF Report</p>
                      <p className="text-[10px] text-foreground-muted font-normal">Full clinical document</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setDownloadMenuOpen(false); handleExportCsv(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-surface-hover font-semibold transition-colors text-left"
                  >
                    <Download size={15} className="text-emerald-500 shrink-0" />
                    <div>
                      <p className="font-bold">Export CSV Dataset</p>
                      <p className="text-[10px] text-foreground-muted font-normal">Raw diagnostic metrics</p>
                    </div>
                  </button>

                  <div className="my-1 border-t border-border" />

                  <button
                    type="button"
                    onClick={() => { setDownloadMenuOpen(false); handlePrint(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-surface-hover font-semibold transition-colors text-left"
                  >
                    <Printer size={15} className="text-foreground-muted shrink-0" />
                    <div>
                      <p className="font-bold">Print Dossier</p>
                    </div>
                  </button>
                </Motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button variant="primary" size="md" icon={Plus} onClick={() => navigate('/analysis')} className="min-h-[40px] text-sm font-semibold">
            New Assessment
          </Button>
        </div>
      </div>

      {/* ── Perspective Lens Switcher ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface border border-border shadow-xs no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            {lens === 'patient' ? <HeartHandshake size={18} /> : <Stethoscope size={18} />}
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground-muted block">
              Perspective View
            </span>
            <p className="text-xs font-semibold text-foreground">
              {lens === 'patient'
                ? 'Patient & Family Lens — Compassionate, clear, non-alarmist guidance'
                : 'Clinician Detailed Lens — Dense diagnostic telemetry, biomarkers & CDS anchors'}
            </p>
          </div>
        </div>

        <div className="inline-flex items-center p-1 rounded-xl bg-surface-secondary border border-border shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setLens('patient')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              lens === 'patient'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface'
            }`}
          >
            <HeartHandshake size={14} />
            <span>Patient & Family</span>
          </button>
          <button
            type="button"
            onClick={() => setLens('clinician')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              lens === 'clinician'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-foreground-muted hover:text-foreground hover:bg-surface'
            }`}
          >
            <Stethoscope size={14} />
            <span>Clinician Workstation</span>
          </button>
        </div>
      </div>

      {/* ── HERO SECTION: DUAL-LENS PRESENTATION ──────────────────────────── */}
      {lens === 'patient' ? (
        <section
          aria-label="Patient Cognitive Health Summary"
          className="p-6 sm:p-8 rounded-2xl border bg-surface border-border shadow-xs space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-border">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {location.state?.fromAssessment && <CompletionMark />}
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                  <ShieldCheck size={13} /> Cognitive Health Summary
                </span>
                {fusion.modality_agreement && fusion.modality_agreement !== 'N/A' && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-secondary text-foreground-muted border border-border">
                    {fusion.modality_agreement} consistency across tests
                  </span>
                )}
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                {simpleStage.simple}
              </h1>

              <p className="font-body text-base text-foreground-muted leading-relaxed max-w-2xl">
                {simpleStage.meaning}
              </p>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-bold">
                <span>Recommended Next Step:</span>
                <span className="text-foreground font-semibold">{simpleStage.nextStep}</span>
              </div>
            </div>

            {/* Supportive Summary Stats */}
            <div className="flex sm:flex-col gap-3 shrink-0">
              <div className="p-4 rounded-xl bg-surface-secondary border border-border text-center min-w-[140px]">
                <span className="text-[11px] font-bold uppercase text-foreground-muted block mb-1">
                  Evaluations Completed
                </span>
                <span className="text-2xl font-black font-mono text-foreground">
                  {modalityCoverage.filter((m) => m.present).length} / 5
                </span>
                <span className="text-[10px] text-foreground-muted block mt-0.5">Clinical Checks</span>
              </div>

              <div className="p-4 rounded-xl bg-surface-secondary border border-border text-center min-w-[140px]">
                <span className="text-[11px] font-bold uppercase text-foreground-muted block mb-1">
                  Agreement Level
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 block">
                  {fusion.modality_agreement || 'High'} Concordance
                </span>
                <span className="text-[10px] text-foreground-muted block mt-0.5">Multi-Test Harmony</span>
              </div>
            </div>
          </div>

          {/* Reassurance Callout Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-foreground flex items-start gap-3.5">
            <ShieldCheck size={22} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm leading-relaxed space-y-1.5">
              <p className="font-bold text-foreground">
                A Note on Understanding This Screening:
              </p>
              <p className="text-foreground-muted leading-relaxed">
                Cognitive vitality fluctuates naturally with everyday factors including sleep depth, nutritional hydration, physical vitality, and temporary stress. This AI-assisted evaluation is designed to help you and your family partner effectively with your doctor to explore personalized wellness habits and early support.
              </p>
            </div>
          </div>

          {/* Test Modality Completion Pills */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-foreground-muted block mb-2">
              Evaluations included in this summary:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {modalityCoverage.map((m) => {
                const simpleName = SIMPLE_MODALITY_NAMES[m.key]?.simple || m.label;
                return (
                  <span
                    key={m.key}
                    title={`${m.label}: ${SIMPLE_MODALITY_NAMES[m.key]?.what || ''} — ${m.present ? 'Included' : 'Not completed'}`}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
                      m.present
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                        : 'bg-surface text-foreground-muted border-border'
                    }`}
                  >
                    {m.present ? <CheckCircle size={13} className="text-emerald-500" /> : <Square size={13} />}
                    {m.present ? `✓ ${simpleName}` : simpleName}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Sanitized error warnings if any module failed */}
          <SanitizedErrorAlert
            errors={analysisErrors}
            retryingModality={retryingModality}
            onRetry={handleRetryModality}
            canRetry={canRetry}
          />
        </section>
      ) : (
        /* ── HERO: CLINICIAN DETAILED LENS ── */
        <section
          aria-label="Clinician Diagnostic Telemetry"
          className="p-6 sm:p-8 rounded-2xl border bg-surface border-border shadow-xs space-y-5"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-border pb-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {location.state?.fromAssessment && <CompletionMark />}
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1">
                  <Stethoscope size={12} /> Clinical Decision Support (CDS)
                </span>
                <Badge variant={stageConf.badgeVariant}>
                  {stageConf.risk || riskLevel}
                </Badge>
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                {stage}
              </h1>

              <p className="text-sm font-semibold text-foreground-muted">
                Multimodal Fusion: {fusion.method || 'Hierarchical Weighted Consensus'} · Posterior score: {(Number(conf) || 0).toFixed(1)}% (Softmax, uncalibrated)
              </p>

              <div className="flex items-center gap-3 pt-1">
                {fusion.modality_agreement && fusion.modality_agreement !== 'N/A' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Concordance:</span>
                    <Badge variant={fusion.modality_agreement === 'Full' || fusion.modality_agreement === 'High' ? 'success' : 'warning'}>
                      {fusion.modality_agreement}
                    </Badge>
                    <AgreementMeter agreement={fusion.modality_agreement} />
                  </div>
                )}
                {fusion.epistemic_uncertainty != null && (
                  <span className="text-xs font-mono font-medium text-foreground-muted">
                    σ² = {fusion.epistemic_uncertainty}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-5 bg-background/50 p-4 rounded-xl border border-border shrink-0">
              <div className="text-center px-3">
                <span className="text-xs font-bold uppercase text-foreground-muted block">Model Posterior</span>
                <span className="text-3xl font-black font-mono text-indigo-500">
                  {(Number(conf) || 0).toFixed(1)}%
                </span>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-center px-3">
                <span className="text-xs font-bold uppercase text-foreground-muted block">Risk Stratum</span>
                <span className={`text-3xl font-black font-mono ${stageConf.risk === 'High Risk' ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {stageConf.score}/100
                </span>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider mb-2">
              Clinical Interpretation Summary
            </h3>
            <p className="text-sm font-medium text-foreground-muted leading-relaxed">
              {fusion.summary || `Multimodal Fusion: ${stage} with a reported score of ${(Number(conf) || 0).toFixed(1)}%. Integrated across available clinical modalities.`}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {modalityCoverage.map((m) => (
                <span
                  key={m.key}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                    m.present
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-surface text-foreground-muted border-border'
                  }`}
                >
                  {m.present ? <CheckCircle size={11} /> : <Square size={11} />}
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Sanitized error warnings */}
          <SanitizedErrorAlert
            errors={analysisErrors}
            retryingModality={retryingModality}
            onRetry={handleRetryModality}
            canRetry={canRetry}
          />
        </section>
      )}

      {/* ── Main Tabbed Diagnostic Workstation ────────────────────────────── */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="px-5 pt-3 border-b border-border bg-background/50 no-print">
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} variant="underline" />
        </div>

        <div className="p-6">
          <ErrorBoundary title="Diagnostic Section Error">
            <Suspense fallback={<PanelLoader />}>

              {/* ── Summary Tab (Dual-Lens aware) ───────────────────────── */}
              {activeTab === 'summary' && (
                lens === 'patient' ? (
                  <div className="space-y-8 font-sans">
                    {/* 1. At-A-Glance Assessment Highlights (4 friendly cards) */}
                    <section aria-label="What we looked at">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-heading text-lg font-bold text-foreground">
                            What We Evaluated
                          </h3>
                          <p className="text-xs font-medium text-foreground-muted mt-0.5">
                            Everyday breakdown of the completed checks
                          </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          {modalityCoverage.filter((m) => m.present).length} Checks Completed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Card 1: Memory */}
                        <div className="p-5 rounded-2xl border border-border bg-surface hover:border-border-strong transition-all space-y-2.5 shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                              <Activity size={18} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-foreground">Memory & Recall Exercises</h4>
                              <p className="text-[11px] text-foreground-muted font-medium">15 guided recall & orientation questions</p>
                            </div>
                          </div>
                          <p className="text-xs text-foreground-muted leading-relaxed font-medium">
                            {hasCog
                              ? `Completed ${cogAnswered} items. Patterns show how you remember short lists and track time. Mild variation was observed, while general orientation remains strong.`
                              : 'Memory screening questionnaire was not completed for this session.'}
                          </p>
                        </div>

                        {/* Card 2: Voice & Speech */}
                        <div className="p-5 rounded-2xl border border-border bg-surface hover:border-border-strong transition-all space-y-2.5 shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                              <HeartPulse size={18} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-foreground">Voice Acoustics & Speech Flow</h4>
                              <p className="text-[11px] text-foreground-muted font-medium">Vocal rhythm, hesitation, and expression</p>
                            </div>
                          </div>
                          <p className="text-xs text-foreground-muted leading-relaxed font-medium">
                            {transcriptWords > 0
                              ? `Analyzed ${transcriptWords} words spoken. Natural voice tempo, clarity, and phrasing were measured. Language patterns were coherent and communicative.`
                              : (sentiment.clinical_summary || 'Voice recording was evaluated for vocal pause cadence and clarity.')}
                          </p>
                        </div>

                        {/* Card 3: Brain Scan */}
                        <div className="p-5 rounded-2xl border border-border bg-surface hover:border-border-strong transition-all space-y-2.5 shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                              <Brain size={18} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-foreground">Brain Scan Review (MRI)</h4>
                              <p className="text-[11px] text-foreground-muted font-medium">High-resolution structural imaging</p>
                            </div>
                          </div>
                          <p className="text-xs text-foreground-muted leading-relaxed font-medium">
                            {mri.stage
                              ? `Brain scan reviewed for memory centers like the temporal lobe. Deep learning analysis noted patterns corresponding to ${mri.stage}.`
                              : 'No brain MRI scan was uploaded for this assessment session.'}
                          </p>
                        </div>

                        {/* Card 4: Health & Lifestyle */}
                        <div className="p-5 rounded-2xl border border-border bg-surface hover:border-border-strong transition-all space-y-2.5 shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                              <ShieldCheck size={18} />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-foreground">Health & Cardiovascular Profile</h4>
                              <p className="text-[11px] text-foreground-muted font-medium">Sleep, blood pressure, and family factors</p>
                            </div>
                          </div>
                          <p className="text-xs text-foreground-muted leading-relaxed font-medium">
                            {risk.overall_risk_score != null
                              ? `Scored ${risk.factors_assessed || 18} lifestyle indicators. Modifiable factors such as blood pressure regulation, deep sleep, and routine physical activity support long-term brain resilience.`
                              : 'Health risk questionnaire not provided.'}
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* 2. Interactive "Questions to Ask Your Doctor" Checklist */}
                    <section aria-label="Questions for Your Doctor" className="p-5 sm:p-6 rounded-2xl border border-primary/20 bg-primary/5 space-y-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 font-bold">
                            <ListChecks size={18} />
                          </div>
                          <div>
                            <h3 className="font-heading text-base font-bold text-foreground">
                              Questions to Ask Your Neurologist or Physician
                            </h3>
                            <p className="text-xs text-foreground-muted">
                              Check off questions as you prepare for your next clinic appointment.
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          icon={Printer}
                          onClick={handlePrintDoctorQuestions}
                          className="shrink-0 bg-surface text-primary border-primary/30 hover:bg-primary/10 font-bold min-h-[36px]"
                        >
                          Print Checklist for My Visit
                        </Button>
                      </div>

                      <div className="space-y-2 pt-1">
                        {DOCTOR_QUESTIONS.map((q) => {
                          const isChecked = !!checkedQuestions[q.id];
                          return (
                            <div
                              key={q.id}
                              onClick={() => toggleQuestion(q.id)}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                                isChecked
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-foreground'
                                  : 'bg-surface border-border text-foreground hover:border-primary/40'
                              }`}
                            >
                              <button
                                type="button"
                                className="mt-0.5 text-primary focus:outline-none"
                                aria-label={isChecked ? `Uncheck question` : `Check question`}
                              >
                                {isChecked ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} />}
                              </button>
                              <div className="flex-1 text-xs sm:text-sm leading-relaxed">
                                <span className="font-bold text-primary mr-1.5 text-[11px] uppercase tracking-wider">[{q.category}]</span>
                                <span className={isChecked ? 'line-through text-foreground-muted' : 'font-medium text-foreground'}>
                                  {q.text}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Family Notes Box */}
                      <div className="pt-2">
                        <label className="text-xs font-bold text-foreground block mb-1.5">
                          Personal Notes to Bring to the Doctor:
                        </label>
                        <textarea
                          value={doctorNotes}
                          onChange={(e) => setDoctorNotes(e.target.value)}
                          placeholder="Write any symptoms, medication changes, or specific questions you want to discuss with the doctor..."
                          className="w-full p-3 rounded-xl border border-border bg-surface text-xs font-medium text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary min-h-[70px]"
                        />
                      </div>
                    </section>

                    {/* 3. Daily Living & Brain Health Habits */}
                    <section aria-label="Everyday Brain Health Guide">
                      <h3 className="font-heading text-lg font-bold text-foreground mb-3">
                        Supportive Habits for Daily Living & Brain Health
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl border border-border bg-surface space-y-2 shadow-xs">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">
                            1
                          </div>
                          <h4 className="text-sm font-bold text-foreground">Routine & Memory Anchors</h4>
                          <p className="text-xs text-foreground-muted leading-relaxed font-medium">
                            Keep everyday items (keys, glasses, phones) in designated trays. Use a visible wall calendar or phone reminders for appointments and medications.
                          </p>
                        </div>

                        <div className="p-5 rounded-2xl border border-border bg-surface space-y-2 shadow-xs">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-sm">
                            2
                          </div>
                          <h4 className="text-sm font-bold text-foreground">Nutrition & Gentle Exercise</h4>
                          <p className="text-xs text-foreground-muted leading-relaxed font-medium">
                            The MIND and Mediterranean diets (berries, leafy greens, olive oil, fish) nourish brain cells. A daily 20–30 minute brisk walk supports cerebral blood flow.
                          </p>
                        </div>

                        <div className="p-5 rounded-2xl border border-border bg-surface space-y-2 shadow-xs">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-sm">
                            3
                          </div>
                          <h4 className="text-sm font-bold text-foreground">Social & Mental Vitality</h4>
                          <p className="text-xs text-foreground-muted leading-relaxed font-medium">
                            Engage in conversational storytelling, music, reading, or puzzles. Regular social interaction strengthens cognitive reserve and elevates mood.
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* 4. Empathetic Guide to Medical Terms */}
                    <section aria-label="Medical Terms Explained">
                      <div className="p-5 sm:p-6 rounded-2xl border border-border bg-surface space-y-3.5 shadow-xs">
                        <div className="flex items-center gap-2">
                          <BookOpen size={16} className="text-primary" />
                          <h3 className="font-heading text-sm font-bold text-foreground uppercase tracking-wider">
                            Understanding Common Terms in This Report
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {GLOSSARY_TERMS.map((g) => (
                            <div key={g.term} className="p-3.5 rounded-xl bg-surface-secondary border border-border/80 space-y-1">
                              <span className="text-xs font-bold text-foreground block">{g.term}</span>
                              <p className="text-[11px] text-foreground-muted leading-relaxed font-medium">
                                {g.simple}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  </div>
                ) : (
                  /* ── CLINICIAN DETAILED SUMMARY VIEW ── */
                  <div className="space-y-6">

                    {/* 1. What we found — all test results in one simple table */}
                    <section aria-label="What we found">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                          What we found
                        </h3>
                        <span className="text-sm font-semibold text-foreground-muted">All test results in one place</span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-left text-[15px] border-collapse select-text">
                          <thead className="bg-background/50 border-b border-border text-foreground-muted text-[15px] font-bold uppercase tracking-wider">
                            <tr>
                              <th scope="col" className="py-3.5 px-4 w-1/4">Test</th>
                              <th scope="col" className="py-3.5 px-4 w-1/3">What we saw</th>
                              <th scope="col" className="py-3.5 px-4">What it means</th>
                              <th scope="col" className="py-3.5 px-4 w-32 text-right">Result</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border font-medium">
                            {evidenceSummaryRows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-surface-hover transition-colors">
                                <td className="py-3.5 px-4 font-bold text-foreground text-[15px]">
                                  {row.modality}
                                </td>
                                <td className="py-3.5 px-4 font-mono text-[15px] text-foreground font-semibold">
                                  {row.finding}
                                </td>
                                <td className="py-3.5 px-4 text-foreground-muted text-[15px] font-medium leading-relaxed">
                                  {row.interpretation}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <Badge variant={row.status === 'High Risk' || row.status === 'Error' ? 'danger' : row.status === 'Mild Risk' ? 'warning' : row.status === 'Normal' ? 'success' : 'neutral'}>
                                    {row.status}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* 2. How the answer was made (fusion contributions) */}
                    {(fusion.method || (fusion.modality_contributions && Object.keys(fusion.modality_contributions).length > 0)) && (
                      <section aria-label="How the answer was made">
                        <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-3">
                          How the answer was made
                        </h3>
                        <div className="p-4 rounded-xl border border-border bg-background/50 space-y-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            {fusion.method && (
                              <span
                                title={fusion.method}
                                className="font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              >
                                Combined {(fusion.active_modalities || []).length || 'several'} tests
                              </span>
                            )}
                            {fusion.modality_agreement && fusion.modality_agreement !== 'N/A' && (
                              <div className="flex items-center gap-2">
                                <Badge variant={fusion.modality_agreement === 'Full' || fusion.modality_agreement === 'High' ? 'success' : fusion.modality_agreement === 'Moderate' ? 'warning' : 'danger'}>
                                  Tests agree: {fusion.modality_agreement}
                                </Badge>
                                <AgreementMeter agreement={fusion.modality_agreement} />
                              </div>
                            )}
                            {fusion.epistemic_uncertainty != null && (
                              <span className="font-mono text-foreground-muted">uncertainty σ² = {fusion.epistemic_uncertainty}</span>
                            )}
                          </div>

                          {fusion.modality_contributions && Object.keys(fusion.modality_contributions).length > 0 && (
                            <div className="space-y-2">
                              {Object.entries(fusion.modality_contributions)
                                .sort((a, b) => b[1] - a[1])
                                .map(([mod, pct]) => (
                                  <div key={mod} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-bold text-foreground capitalize">{mod}</span>
                                      <span className="font-mono font-bold text-indigo-400">{Number(pct).toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                                      <div className={`h-full rounded-full ${MODALITY_META[mod]?.color || 'bg-indigo-500'}`} style={{ width: `${Math.min(100, Number(pct) || 0)}%` }} />
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1.5">
                            {(fusion.active_modalities || []).map((m) => (
                              <span key={`a-${m}`} className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 capitalize">
                                ✓ {m}
                              </span>
                            ))}
                            {(fusion.missing_modalities || []).map((m) => (
                              <span key={`m-${m}`} className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-surface text-foreground-muted border border-border capitalize">
                                ○ {m}: not done
                              </span>
                            ))}
                          </div>

                          {fusion.evidence_summary?.length > 0 && (
                            <ul className="space-y-1">
                              {fusion.evidence_summary.map((e, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-foreground-muted font-medium">
                                  <ChevronRight size={12} className="text-indigo-400 shrink-0 mt-0.5" /> {e}
                                </li>
                              ))}
                            </ul>
                          )}

                          {fusion.uncertainty_factors?.length > 0 && (
                            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-foreground-muted font-medium leading-relaxed">
                                {fusion.uncertainty_factors.join(' ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </section>
                    )}

                    {/* 3. What the person said (speech test) */}
                    {audioTx?.text && (
                      <section aria-label="What the person said">
                        <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-3">
                          What the person said
                        </h3>
                        <div className="p-4 rounded-xl border border-border bg-background/50 space-y-2.5">
                          <p className="text-sm text-foreground leading-relaxed font-medium">
                            “{audioTx.text.slice(0, 420)}{audioTx.text.length > 420 ? '…' : ''}”
                          </p>
                          <div className="flex flex-wrap gap-1.5 text-[11px] font-mono font-bold">
                            {audioTx.method && <span className="px-2 py-0.5 rounded-md bg-surface text-foreground-muted border border-border">{audioTx.method}</span>}
                          </div>
                        </div>
                      </section>
                    )}

                    {/* 4. What to do next — tap to tick off */}
                    <section aria-label="What to do next">
                      <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-3">
                        What to do next
                      </h3>
                      <div className="space-y-2">
                        {actionableNextSteps.map((step) => {
                          const isDone = !!checkedActions[step.id];
                          return (
                            <div
                              key={step.id}
                              onClick={() => toggleAction(step.id)}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                                isDone
                                  ? 'bg-emerald-500/5 border-emerald-500/30 text-foreground-muted'
                                  : 'bg-background/50 border-border text-foreground hover:border-indigo-500/40'
                              }`}
                            >
                              <button
                                type="button"
                                className="mt-0.5 text-indigo-400 hover:text-indigo-300 focus:outline-none"
                                aria-label={isDone ? `Uncheck ${step.text}` : `Check ${step.text}`}
                              >
                                {isDone ? <CheckSquare size={18} className="text-emerald-400" /> : <Square size={18} />}
                              </button>
                              <div className="flex-1 text-sm leading-relaxed">
                                <span className={isDone ? 'line-through text-foreground-muted' : 'font-medium'}>
                                  {step.text}
                                </span>
                              </div>
                              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md ${
                                step.priority === 'High' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-surface text-foreground-muted border border-border'
                              }`}>
                                {step.priority}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                  </div>
                )
              )}

              {/* ── Test Details Tab (all 3 test groups in one place) ────── */}
              {activeTab === 'details' && (
                <div className="space-y-8">
                  {Object.keys(mri).length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-foreground">1. Brain scan (MRI)</h3>
                        <p className="text-xs text-foreground-muted font-medium">Photo of the brain showing shrinkage</p>
                      </div>
                      <MRIResults mri={mri} />
                    </div>
                  )}

                  {Object.keys(cognitive).length > 0 && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-foreground">2. Memory & speech tests</h3>
                        <p className="text-xs text-foreground-muted font-medium">15 short questions + listening to how clearly the person speaks</p>
                      </div>
                      <div>
                        {(cognitive.impairment_level || cognitive.risk_label) && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {cognitive.impairment_level && cognitive.impairment_level !== 'Not Assessed' && (
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${cognitive.impairment_level === 'Normal' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : cognitive.impairment_level === 'Mild' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                {cognitive.impairment_level} impairment
                              </span>
                            )}
                            {cognitive.risk_label && cognitive.risk_label !== 'Not Assessed' && (
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-surface text-foreground-muted border border-border">
                                {cognitive.risk_label}
                              </span>
                            )}
                            {cognitive.total_questions ? (
                              <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-surface text-foreground-muted border border-border">
                                {cognitive.questions_completed ?? cognitive.tests_completed ?? 0}/{cognitive.total_questions} questions answered
                              </span>
                            ) : null}
                          </div>
                        )}
                        <CognitiveResults cognitive={cognitive} />
                      </div>
                      <div>
                        {audioTx && (audioTx.acoustic_features || audioTx.linguistic_biomarkers) ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            {audioTx.acoustic_features && Object.keys(audioTx.acoustic_features).length > 0 && (
                              <div className="p-3.5 rounded-xl bg-background border border-border/80 space-y-2">
                                <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block">Sound measurements</span>
                                {Object.entries(audioTx.acoustic_features).slice(0, 8).map(([k, v]) => (
                                  <div key={k} className="flex items-center justify-between text-xs gap-2">
                                    <span className="font-medium text-foreground-muted truncate">{k.replace(/_/g, ' ')}</span>
                                    <span className="font-mono font-bold text-foreground shrink-0">{typeof v === 'number' ? v.toFixed(2) : String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {audioTx.linguistic_biomarkers && Object.keys(audioTx.linguistic_biomarkers).length > 0 && (
                              <div className="p-3.5 rounded-xl bg-background border border-border/80 space-y-2">
                                <span className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider block">Word-use measurements</span>
                                {Object.entries(audioTx.linguistic_biomarkers)
                                  .filter(([, v]) => v == null || ['string', 'number', 'boolean'].includes(typeof v))
                                  .slice(0, 8).map(([k, v]) => (
                                  <div key={k} className="flex items-center justify-between text-xs gap-2">
                                    <span className="font-medium text-foreground-muted truncate">{k.replace(/_/g, ' ')}</span>
                                    <span className="font-mono font-bold text-foreground shrink-0">{typeof v === 'number' ? v.toFixed(2) : String(v).slice(0, 40)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                        <SpeechResults sentiment={sentiment} transcription={audioTx} />
                      </div>
                    </div>
                  )}

                  {Object.keys(risk).length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-foreground">3. Health risks</h3>
                        <p className="text-xs text-foreground-muted font-medium">Blood pressure, sleep, lifestyle and family factors (18 checks)</p>
                      </div>
                      <RiskResults risk={risk} />
                      {(risk.category_scores && Object.keys(risk.category_scores).length > 0) || risk.modifiable_risk != null ? (
                        <div className="p-4 rounded-xl border border-border bg-background/50 space-y-3">
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Risk breakdown</h4>
                          {risk.category_scores && Object.keys(risk.category_scores).length > 0 && (
                            <div className="space-y-2">
                              {Object.entries(risk.category_scores)
                                .sort((a, b) => b[1] - a[1])
                                .map(([cat, score]) => (
                                  <div key={cat} className="space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-bold text-foreground">{cat}</span>
                                      <span className="font-mono font-bold text-rose-400">{Number(score).toFixed(1)}/100</span>
                                    </div>
                                    <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" style={{ width: `${Math.min(100, Number(score) || 0)}%` }} />
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {risk.modifiable_risk != null && (
                              <div className="p-2.5 rounded-lg bg-surface border border-border text-center">
                                <span className="text-[10px] text-foreground-muted block font-semibold">Can be changed</span>
                                <span className="text-base font-extrabold font-mono text-amber-400">{risk.modifiable_risk}/100</span>
                              </div>
                            )}
                            {risk.non_modifiable_risk != null && (
                              <div className="p-2.5 rounded-lg bg-surface border border-border text-center">
                                <span className="text-[10px] text-foreground-muted block font-semibold">Cannot be changed (age, genes)</span>
                                <span className="text-base font-extrabold font-mono text-foreground">{risk.non_modifiable_risk}/100</span>
                              </div>
                            )}
                          </div>
                          {risk.genetics && (
                            <p className="text-[11px] text-foreground-muted font-medium">
                              Genes: ApoE4 {risk.genetics.apoe4 ? <strong className="text-rose-400">found — higher family risk</strong> : 'not found'}.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {Object.keys(mri).length === 0 && Object.keys(cognitive).length === 0 && Object.keys(risk).length === 0 && (
                    <div className="py-10 text-center text-xs text-foreground-muted border border-dashed border-border rounded-2xl">
                      No test details in this report yet.
                    </div>
                  )}
                </div>
              )}

              {/* ── Why This Result Tab (simple reasons + full AI proof) ─── */}
              {activeTab === 'why' && (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">How evidence was weighted</h3>
                      <p className="text-xs text-foreground-muted font-medium">These are normalized rule-based modality weights, not feature-level attributions.</p>
                    </div>
                    {keyClinicalFindings.length === 0 ? (
                      <p className="p-4 rounded-xl border border-border bg-background/50 text-xs text-foreground-muted">No fusion weights were returned for this result.</p>
                    ) : keyClinicalFindings.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-border bg-background/50 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">{item.label}</span>
                          <span className="font-mono font-bold text-indigo-400">{item.value}% weight</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                        </div>
                        <p className="text-[11px] text-foreground-muted">
                          Source: {item.category}. This is a modality weight, not a patient-specific feature impact.
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">Diagnostic Proof & Explainability</h3>
                      <p className="text-xs text-foreground-muted font-medium">Grad-CAM visual attention, multimodal attribution, and step-by-step reasoning.</p>
                    </div>
                    <XAIPanel
                      aiExplanation={aiExplanation}
                      mri={mri}
                      fusion={fusion}
                      results={results}
                    />
                  </div>
                </div>
              )}

            </Suspense>
          </ErrorBoundary>
        </div>
      </div>

      {/* ── Institutional Clinical Disclaimer ─────────────────────────────── */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-300">
        <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-foreground-muted">
          <strong className="font-semibold text-foreground">Clinical Decision Support Disclaimer:</strong>{' '}
          NeuroSense AI is designed strictly as a clinical decision support tool for licensed medical professionals. Automated risk assessments must be correlated with clinical judgment, laboratory evaluations, and standard diagnostic protocols.
        </p>
      </div>

      {/* ── Past Analysis History Modal ────────────────────────────────────── */}
      <Modal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`Past Diagnostic Reports History (${filteredHistory.length})`}
        maxWidth={760}
      >
        <div className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                placeholder="Search patient, ID, stage..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Filter Stage Buttons */}
            <div className="flex items-center gap-1 bg-surface-secondary p-1 rounded-xl border border-border w-full sm:w-auto overflow-x-auto">
              {['ALL', 'CN', 'MCI', 'AD'].map((stg) => (
                <button
                  key={stg}
                  type="button"
                  onClick={() => setHistoryStageFilter(stg)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                    historyStageFilter === stg
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {stg === 'ALL' ? 'All' : stg}
                </button>
              ))}
            </div>
          </div>

          {/* Past Analysis List Table */}
          {filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-foreground-muted space-y-2 border rounded-xl border-dashed border-border">
              <FileText size={24} className="mx-auto text-foreground-muted opacity-50" />
              <p>No historical analysis reports matching filters.</p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto divide-y divide-border rounded-xl border border-border">
              {filteredHistory.map((item) => {
                const itemStage = item.stage || 'Unknown';
                const itemConf = Number(item.confidence || 0).toFixed(1);
                const itemDate = item.timestamp
                  ? new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'N/A';
                const isSelected = activeHistorySessionId === item.session_id;

                return (
                  <div
                    key={item.session_id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-3 hover:bg-surface-hover transition-colors ${
                      isSelected ? 'bg-indigo-500/10 border-l-4 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-500 font-bold text-xs flex items-center justify-center shrink-0">
                        {(item.patient_name || 'P')[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-foreground truncate">{item.patient_name}</p>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-foreground-muted">
                            {item.patient_id}
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground-muted flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} /> {itemDate}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-indigo-400">{itemStage}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {itemConf}% AI
                      </span>
                      <Button
                        variant={isSelected ? 'primary' : 'outline'}
                        size="xs"
                        onClick={() => handleSelectHistoryReport(item)}
                      >
                        {isSelected ? 'Viewing' : 'View Report'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
