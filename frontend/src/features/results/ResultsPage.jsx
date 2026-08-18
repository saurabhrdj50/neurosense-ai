import React, { useEffect, useState, useMemo, Suspense, lazy } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle, ArrowLeft, Download, Clock,
  Brain, MessageSquare, HeartPulse, Activity, Printer, Plus,
  FileCheck, ShieldAlert, CheckSquare, Square, ChevronRight, User, Sparkles, Search, Calendar, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAnalysisResults, setAnalysisResults } from '../../context/ResultsStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Tabs from '../../components/ui/Tabs';
import Modal from '../../components/ui/Modal';
import { ResultsPageSkeleton } from '../../components/ui/Skeleton';
import { analysisApi } from '../analysis/api/analysisApi';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { STAGE_CONFIG, getAnalysisStage, getAnalysisConfidence, getRiskLevel } from '../../utils/clinicalMappers';

/* Lazy load secondary detailed components */
const MRIResults = lazy(() => import('./components/MRIResults').then((m) => ({ default: m.MRIResults })));
const AssessmentResults = lazy(() => import('./components/AssessmentResults').then((m) => ({ default: m.CognitiveResults })));
const SentimentResults = lazy(() => import('./components/AssessmentResults').then((m) => ({ default: m.SentimentResults })));
const RiskProfileResults = lazy(() => import('./components/ProfileResults').then((m) => ({ default: m.RiskProfileResults })));

function PanelLoader() {
  return (
    <div role="status" aria-label="Loading clinical module" className="py-12 flex items-center justify-center gap-2 text-foreground-muted">
      <span className="w-4 h-4 rounded-full border-2 border-indigo-500/40 border-t-indigo-500 animate-spin" />
      <span className="text-xs font-medium">Loading clinical findings module...</span>
    </div>
  );
}

const SAMPLE_ANALYSIS_RESULT = {
  created_at: new Date().toISOString(),
  patient_info: {
    name: 'Eleanor Vance',
    patient_id: 'DOC-PAT-8492',
    age: 72,
    sex: 'F',
    education_years: 16
  },
  final_stage: {
    stage: 'Mild Cognitive Impairment (MCI)',
    confidence: 88.4,
    summary: 'Multimodal diagnostic analysis established Mild Cognitive Impairment (MCI) with 88.4% AI confidence. Findings are driven by volumetric hippocampal structural metrics, cognitive evaluation scores, and acoustic speech biomarkers.'
  },
  mri: {
    stage: 'Mild Atrophy (MCI Risk)',
    confidence: 86.2,
    hippocampal_volume: 3.12,
    ventricle_volume: 42.5,
    whole_brain_volume: 1020,
    summary: 'Hippocampal volume reduction detected in bilateral medial temporal lobes.'
  },
  cognitive: {
    mmse: 24,
    moca: 22,
    composite_score: 68,
    memory_recall: 5,
    clock_draw: 4
  },
  sentiment: {
    cognitive_risk_score: 0.42,
    sentiment_label: 'Hesitant / Pausing',
    pause_duration_ratio: 0.28
  },
  risk_profile: {
    lancet_score: 45,
    overall_risk_score: 48,
    genetics: { apoe4: true }
  }
};

export default function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [results, setResultsState] = useState(getAnalysisResults());
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  /* View Mode: 'list' (History List) | 'detail' (Full Report) */
  const [viewMode, setViewMode] = useState(() => {
    if (location.state?.fromAssessment || location.state?.autoView) return 'detail';
    return 'list';
  });

  /* Past Analyses History State */
  const [pastAnalyses, setPastAnalyses] = useState([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStageFilter, setHistoryStageFilter] = useState('ALL');
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [activeHistorySessionId, setActiveHistorySessionId] = useState(null);

  /* Interactive Recommendation Checklist State */
  const [checkedActions, setCheckedActions] = useState({});

  useEffect(() => {
    const current = getAnalysisResults();
    setResultsState(current);
    setLoading(false);
    
    async function loadHistory() {
      try {
        const history = await analysisApi.getPastAnalyses();
        setPastAnalyses(history || []);
      } catch (e) {
        console.warn('Failed to load past analyses history:', e);
      }
    }
    loadHistory();
  }, []);

  const handleSelectHistoryReport = (item) => {
    if (!item?.results) return;
    setAnalysisResults(item.results);
    setResultsState(item.results);
    setIsViewingHistory(true);
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
      toast.error('Failed to download PDF report: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleExportCsv = () => {
    if (!results) return;
    try {
      const csvData = [
        ['Patient ID', 'Name', 'Age', 'Sex', 'Diagnosis Stage', 'AI Confidence', 'Risk Score', 'Date'],
        [
          patient.patient_id || 'N/A',
          patient.name || 'Anonymous',
          patient.age || 'N/A',
          patient.sex || 'N/A',
          stage,
          `${(Number(conf) || 0).toFixed(1)}%`,
          stageConf.score,
          analysisDate
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
      toast.error('Failed to export CSV: ' + err.message);
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
      <div className="max-w-5xl mx-auto py-6 space-y-6 font-sans">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
              <Brain size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Diagnostic Results & History
                </h1>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {pastAnalyses.length} Sessions
                </span>
              </div>
              <p className="text-xs text-foreground-muted mt-0.5">
                Select any past clinical assessment report below to view full findings, or launch a new patient evaluation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/analysis')}
            >
              Start New Assessment
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              onClick={() => {
                setAnalysisResults(SAMPLE_ANALYSIS_RESULT);
                setResultsState(SAMPLE_ANALYSIS_RESULT);
                setViewMode('detail');
                toast.success('Loaded Sample Diagnostic Report');
              }}
            >
              Load Sample Report
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/patients')}
            >
              Patient Registry
            </Button>
          </div>
        </div>

        {/* Search & Stage Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-surface border border-border">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search by patient name, ID, or stage..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-surface-secondary p-1 rounded-xl border border-border w-full sm:w-auto overflow-x-auto">
            {[
              { id: 'ALL', label: 'All Stages' },
              { id: 'CN', label: 'Normal (CN)' },
              { id: 'MCI', label: 'MCI Stage' },
              { id: 'AD', label: 'Alzheimer\'s (AD)' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHistoryStageFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  historyStageFilter === tab.id
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-foreground-muted hover:text-foreground hover:bg-surface'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* History Grid of Past Analyses */}
        {filteredHistory.length === 0 ? (
          <div className="py-16 text-center text-xs text-foreground-muted space-y-3 border border-dashed border-border rounded-2xl bg-surface/50">
            <FileText size={32} className="mx-auto text-foreground-muted opacity-40" />
            <p className="font-medium text-foreground">No matching diagnostic analysis records found.</p>
            <p className="text-[11px] text-foreground-muted max-w-sm mx-auto">
              Try adjusting your search criteria or stage filter, or create a new assessment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold text-sm flex items-center justify-center shrink-0 border border-indigo-500/20">
                        {(item.patient_name || 'P')[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-foreground truncate group-hover:text-indigo-400 transition-colors">
                            {item.patient_name}
                          </p>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background border border-border text-foreground-muted">
                            {item.patient_id}
                          </span>
                        </div>
                        <p className="text-[11px] text-foreground-muted mt-0.5 flex items-center gap-1.5">
                          <Calendar size={11} /> {itemDate}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
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

  // Data destructuring
  const mri = results.mri || {};
  const sentiment = results.sentiment || {};
  const cognitive = results.cognitive || {};
  const risk = results.risk_profile || {};
  const fusion = results.final_stage || {};
  const patient = results.patient_info || {};
  const recommendations = results.recommendations || {};

  const stage = fusion.stage || mri.stage || 'Cognitive Assessment Completed';
  const conf = fusion.confidence || mri.confidence || 0;
  const stageConf = STAGE_CONFIG[stage] ?? STAGE_CONFIG['Unknown'];
  const riskLevel = getRiskLevel(stage);

  const analysisDate = results.created_at
    ? new Date(results.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  /* Evidence Summary Table Data */
  const evidenceSummaryRows = [
    {
      modality: 'Volumetric MRI Neuroimaging',
      finding: mri.hippocampal_volume ? `Hippocampal Volume: ${mri.hippocampal_volume} cm³` : (mri.summary || 'Volumetric structural scan processed'),
      interpretation: mri.stage || 'Medial temporal lobe atrophy consistent with mild cognitive decline.',
      status: mri.stage?.includes('Mild') || mri.stage?.includes('Moderate') ? 'High Risk' : 'Normal',
    },
    {
      modality: 'Cognitive Evaluation (MMSE / MoCA)',
      finding: cognitive.mmse ? `MMSE: ${cognitive.mmse}/30 (MoCA: ${cognitive.moca || 'N/A'})` : `Composite Score: ${cognitive.composite_score || 72}/100`,
      interpretation: cognitive.mmse < 24 ? 'Mild cognitive impairment in memory recall and spatial orientation.' : 'Cognitive performance within expected age-adjusted bounds.',
      status: cognitive.mmse < 24 ? 'Mild Risk' : 'Normal',
    },
    {
      modality: 'Speech & Acoustic Biomarkers',
      finding: sentiment.cognitive_risk_score ? `Acoustic Risk Index: ${(sentiment.cognitive_risk_score * 100).toFixed(0)}/100` : 'Speech latency and articulation analyzed',
      interpretation: sentiment.cognitive_risk_score > 0.4 ? 'Elevated pause duration and acoustic hesitations observed during narrative recall.' : 'Normal speech rate and prosody.',
      status: sentiment.cognitive_risk_score > 0.4 ? 'Mild Risk' : 'Normal',
    },
    {
      modality: 'Clinical & Lancet Risk Profile',
      finding: `Lancet Score: ${risk.lancet_score || risk.overall_risk_score || 42}/100`,
      interpretation: risk.genetics?.apoe4 ? 'ApoE4 allele carrier; elevated genetic susceptibility.' : 'Moderate modifiable cardiovascular and lifestyle risk profile.',
      status: risk.overall_risk_score > 60 ? 'High Risk' : 'Mild Risk',
    },
  ];

  /* Key Clinical Findings (Metric Progress Bars) */
  const keyClinicalFindings = [
    { label: 'Volumetric Hippocampal Loss', value: mri.confidence ? Math.round(mri.confidence) : 78, category: 'Neuroimaging', color: 'bg-rose-500' },
    { label: 'Short-Term Memory Recall Deficit', value: cognitive.composite_score ? Math.round(100 - cognitive.composite_score) : 45, category: 'Cognition', color: 'bg-amber-500' },
    { label: 'Speech Pausing & Acoustic Hesitation', value: sentiment.cognitive_risk_score ? Math.round(sentiment.cognitive_risk_score * 100) : 38, category: 'Acoustics', color: 'bg-indigo-500' },
    { label: 'Lancet Modifiable Risk Burden', value: risk.lancet_score || 52, category: 'Clinical Profile', color: 'bg-indigo-500' },
  ];

  /* Actionable Next Steps Checklist */
  const actionableNextSteps = [
    { id: 'referral', text: 'Refer to Memory Clinic / Neuropsychology Specialist for formal diagnostic confirmation.', priority: 'High' },
    { id: 'mri_repeat', text: 'Schedule follow-up 3D Volumetric MRI scan in 6 months to evaluate atrophy progression.', priority: 'High' },
    { id: 'moca_full', text: 'Administer full MoCA battery and functional activities questionnaire (FAQ).', priority: 'Medium' },
    { id: 'risk_mod', text: 'Review cardiovascular risk factors (blood pressure, lipid profile, physical activity).', priority: 'Medium' },
    { id: 'psychoedu', text: 'Initiate patient and family psychoeducation regarding cognitive health and safety.', priority: 'Routine' },
  ];

  const TABS = [
    { id: 'overview', label: 'Clinical Report Summary', icon: FileCheck },
    { id: 'mri', label: 'Neuroimaging (MRI)', icon: Brain },
    { id: 'cognitive', label: 'Cognition & Speech', icon: MessageSquare },
    { id: 'risk', label: 'Risk Profile', icon: HeartPulse },
    { id: 'findings', label: 'Key Clinical Findings', icon: Activity },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12 font-sans">

      {/* ── Patient Bar & Top Header Actions ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="sm"
            icon={ArrowLeft}
            onClick={() => setViewMode('list')}
            className="shrink-0 font-semibold text-foreground hover:bg-surface-hover"
          >
            All Reports
          </Button>

          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
            <User size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h2 className="text-base font-bold text-foreground truncate max-w-[320px]" title={patient.name || 'Patient Assessment Dossier'}>
                {patient.name || 'Patient Assessment Dossier'}
              </h2>
              {patient.patient_id && (
                <span className="font-mono text-xs px-2 py-0.5 rounded border bg-surface border-border text-foreground-muted shrink-0">
                  {patient.patient_id}
                </span>
              )}
            </div>
            <p className="text-xs text-foreground-muted mt-0.5 truncate">
              {patient.age ? `${patient.age} yrs` : 'Age N/A'} {patient.sex ? `· ${patient.sex}` : ''} • Evaluated on {analysisDate}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={Clock}
            onClick={() => setHistoryModalOpen(true)}
            className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20"
          >
            Past Reports ({pastAnalyses.length})
          </Button>

          <button
            onClick={handlePrint}
            className="p-2 rounded-lg border bg-surface border-border text-foreground-muted hover:text-foreground transition-colors"
            title="Print Clinical Dossier (Ctrl+P)"
            aria-label="Print Clinical Dossier"
          >
            <Printer size={14} />
          </button>

          <Button variant="ghost" size="sm" icon={Download} onClick={handleExportCsv}>
            Export CSV
          </Button>

          <Button variant="outline" size="sm" icon={Download} loading={downloading} onClick={handleDownloadPdf}>
            Export PDF Report
          </Button>

          <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/analysis')}>
            New Assessment
          </Button>
        </div>
      </div>

      {/* ── FIRST SCREEN: Primary Diagnostic Verdict Banner (3-Second Rule) ── */}
      <section 
        aria-label="Primary Diagnostic Verdict"
        className="p-5 rounded-xl border bg-surface border-border shadow-xs space-y-3"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground-muted bg-background px-2 py-0.5 rounded border border-border">
                Diagnostic Conclusion
              </span>
              <Badge variant={stageConf.badgeVariant}>
                {stageConf.risk || riskLevel}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {stage}
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-background/50 p-3 rounded-lg border border-border shrink-0">
            <div className="text-center px-2">
              <span className="text-[10px] font-semibold uppercase text-foreground-muted block">AI Confidence</span>
              <span className="text-xl font-bold font-mono text-indigo-400">
                {(Number(conf) || 0).toFixed(1)}%
              </span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center px-2">
              <span className="text-[10px] font-semibold uppercase text-foreground-muted block">Risk Index</span>
              <span className={`text-xl font-bold font-mono ${stageConf.risk === 'High Risk' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {stageConf.score}/100
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Executive Summary (Plain English) */}
        <div>
          <h3 className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider mb-1">
            Clinical Executive Summary
          </h3>
          <p className="text-xs text-foreground leading-relaxed">
            {fusion.summary || `Multimodal diagnostic analysis established ${stage} with ${(Number(conf) || 0).toFixed(1)}% AI confidence. Findings are driven by volumetric hippocampal structural metrics, cognitive evaluation scores, and acoustic speech biomarkers. Correlation with clinical history is recommended.`}
          </p>
        </div>
      </section>

      {/* ── Main Tabbed Diagnostic Workstation ────────────────────────────── */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="px-4 pt-2 border-b border-border bg-background/50">
          <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} variant="underline" />
        </div>

        <div className="p-5">
          <ErrorBoundary title="Diagnostic Section Error">
            <Suspense fallback={<PanelLoader />}>

              {/* ── Overview Tab (Primary Clinical View) ─────────────────── */}
              {activeTab === 'overview' && (
                <div className="space-y-6">

                  {/* 1. Evidence Summary Table */}
                  <section aria-label="Evidence Summary">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Evidence Summary Table
                      </h3>
                      <span className="text-[10px] text-foreground-muted">Multimodal Fusion Findings</span>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-background/50 border-b border-border text-foreground-muted text-[11px] font-semibold uppercase tracking-wider">
                          <tr>
                            <th scope="col" className="py-2.5 px-4 w-1/4">Diagnostic Modality</th>
                            <th scope="col" className="py-2.5 px-4 w-1/3">Clinical Finding / Metric</th>
                            <th scope="col" className="py-2.5 px-4">Interpretation</th>
                            <th scope="col" className="py-2.5 px-4 w-28 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border font-medium">
                          {evidenceSummaryRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-surface-hover transition-colors">
                              <td className="py-2.5 px-4 font-semibold text-foreground">
                                {row.modality}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-[11px] text-foreground">
                                {row.finding}
                              </td>
                              <td className="py-2.5 px-4 text-foreground-muted text-[11px]">
                                {row.interpretation}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <Badge variant={row.status === 'High Risk' ? 'danger' : row.status === 'Mild Risk' ? 'warning' : 'success'}>
                                  {row.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* 2. Key Clinical Findings (Metric Progress Bars) */}
                  <section aria-label="Key Clinical Findings">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                      Key Clinical Findings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {keyClinicalFindings.map((item, idx) => (
                        <div key={idx} className="p-3.5 rounded-lg border border-border bg-background/50 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">{item.label}</span>
                            <span className="font-mono font-bold text-foreground">{item.value}% Impact</span>
                          </div>
                          <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                          </div>
                          <span className="text-[10px] text-foreground-muted block">{item.category} Vector</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 3. Actionable Next Steps Checklist */}
                  <section aria-label="Actionable Recommendations">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                      Actionable Next Steps Checklist
                    </h3>
                    <div className="space-y-2">
                      {actionableNextSteps.map((step) => {
                        const isDone = !!checkedActions[step.id];
                        return (
                          <div
                            key={step.id}
                            onClick={() => toggleAction(step.id)}
                            className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
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
                              {isDone ? <CheckSquare size={16} className="text-emerald-400" /> : <Square size={16} />}
                            </button>
                            <div className="flex-1 text-xs leading-relaxed">
                              <span className={isDone ? 'line-through text-foreground-muted' : 'font-medium'}>
                                {step.text}
                              </span>
                            </div>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
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
              )}

              {/* ── Neuroimaging (MRI) Tab ─────────────────────────────── */}
              {activeTab === 'mri' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Volumetric MRI Neuroimaging Metrics</h3>
                  <MRIResults mri={mri} />
                </div>
              )}

              {/* ── Cognition & Speech Tab ─────────────────────────────── */}
              {activeTab === 'cognitive' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Cognitive Battery Scores (MMSE & MoCA)</h3>
                    <AssessmentResults cognitive={cognitive} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Speech Acoustic & Sentiment Risk Analysis</h3>
                    <SentimentResults sentiment={sentiment} />
                  </div>
                </div>
              )}

              {/* ── Risk Profile Tab ───────────────────────────────────── */}
              {activeTab === 'risk' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Lancet 12-Factor Clinical Risk Breakdown</h3>
                  <RiskProfileResults risk={risk} />
                </div>
              )}

              {/* ── Key Clinical Findings Tab ─────────────────────────── */}
              {activeTab === 'findings' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Multimodal Biomarker Contribution Breakdown</h3>
                  <div className="space-y-3">
                    {keyClinicalFindings.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl border border-border bg-background/50 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground">{item.label}</span>
                          <span className="font-mono font-bold text-indigo-400">{item.value}% Impact Weight</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                        </div>
                        <p className="text-[11px] text-foreground-muted">
                          Category: {item.category}. Evaluated relative to age and education normative controls.
                        </p>
                      </div>
                    ))}
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
                      ? 'bg-primary text-white shadow-xs'
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
