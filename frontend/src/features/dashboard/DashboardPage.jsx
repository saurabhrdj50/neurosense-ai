import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CountUp, StaggerGrid, StaggerCell } from '../../shared/motion';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Plus, RefreshCw, ChevronRight, CheckCircle2,
  ArrowUpDown, ChevronUp, ChevronDown, Users, FileText, HeartPulse, CalendarClock, Sparkles
} from 'lucide-react';
import { patientsApi } from '../patients/api/patientsApi';
import { historyApi } from '../history/api/historyApi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import Button from '../../shared/components/ui/Button';
import Badge from '../../shared/components/ui/Badge';
import { Skeleton } from '../../shared/components/ui/Skeleton';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import {
  RISK_COLORS,
  getRiskLevel,
  getAnalysisStage,
  getAnalysisConfidence,
  formatTimeAgo
} from '../../shared/utils/clinicalMappers';

/* ── High-Contrast Clinical Tooltip ──────────────────────────────────────── */
const UNKNOWN_RISK_COLOR = '#94A3B8';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border shadow-md text-foreground text-xs rounded-lg p-2.5 min-w-[130px] z-50">
      <p className="font-semibold text-foreground-muted border-b border-border pb-1 mb-1.5 text-[11px]">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3 py-0.5 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-xs shrink-0" style={{ background: p.color }} />
            <span className="text-foreground-muted truncate">{p.name}</span>
          </div>
          <span className="font-bold text-foreground font-mono">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { user } = useAuth();
  // Server state via TanStack Query; derived metrics are a pure computation
  // over the two cached datasets. Query errors are NOT swallowed here —
  // failures surface in the error banner below. Keys are namespaced so the
  // dashboard's payload shape never collides with PatientsPage's under the
  // same cache entry (prefix invalidation via ['patients'] still matches).
  const patientsQuery = useQuery({
    queryKey: ['patients', 'dashboard'],
    queryFn: () => patientsApi.getAll(),
  });
  const analysesQuery = useQuery({
    queryKey: ['analyses', 'dashboard'],
    queryFn: () => historyApi.getAllAnalyses(),
  });
  const patients = useMemo(() => patientsQuery.data?.patients || [], [patientsQuery.data]);
  // API-reported total, not the (row-capped) array length.
  const patientsTotal = patientsQuery.data?.total ?? patients.length;
  const analyses = useMemo(() => analysesQuery.data?.analyses || [], [analysesQuery.data]);
  const analysesTotal = analysesQuery.data?.total ?? analyses.length;
  const analysesTruncated = Boolean(analysesQuery.data?.truncated);
  const refreshing = patientsQuery.isFetching || analysesQuery.isFetching;
  const ready = !patientsQuery.isLoading && !analysesQuery.isLoading;
  const lastRefreshed = useMemo(() => {
    const ts = Math.max(patientsQuery.dataUpdatedAt || 0, analysesQuery.dataUpdatedAt || 0);
    return ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [patientsQuery.dataUpdatedAt, analysesQuery.dataUpdatedAt]);
  const fetchDashboardData = useMemo(() => {
    return () => {
      patientsQuery.refetch();
      analysesQuery.refetch();
    };
  }, [patientsQuery, analysesQuery]);
  
  /* Sort States for Clinical Tables */
  const [recentSort, setRecentSort] = useState({ key: 'time', dir: 'desc' });
  const [prioritySort, setPrioritySort] = useState({ key: 'conf', dir: 'desc' });

  const [fetchError, setFetchError] = useState(null);

  // Derive a visible error from query failures (both failed → hard error).
  useEffect(() => {
    const failed = [patientsQuery.error, analysesQuery.error].filter(Boolean);
    if (failed.length === 2) setFetchError('Could not load dashboard data (patients and analyses).');
    else if (failed.length === 1) setFetchError('Some dashboard data failed to load.');
    else setFetchError(null);
  }, [patientsQuery.error, analysesQuery.error]);

  // Pure computation over the cached datasets — no fetching, no setState.
  const derived = useMemo(() => {
    // 3-stage cohort buckets mirroring the 3-class MRI model (CN / MCI / AD).
    // Legacy 4-stage labels from older records fold into their nearest bucket.
    const riskCounts = { Normal: 0, Mild: 0, AD: 0, Unknown: 0 };
      analyses.forEach((a) => {
        const stage = getAnalysisStage(a).toLowerCase();
        if (stage.includes('non') || stage.includes('cognitively normal') || stage === 'cn'
            || stage.includes('normal cognition')) riskCounts.Normal++;
        else if (stage.includes('mild') || stage.includes('mci')) riskCounts.Mild++;
        else if (stage.includes('moderate') || stage.includes('severe')
            || stage.includes('alzheimer') || stage === 'ad') riskCounts.AD++;
        else riskCounts.Unknown++;
      });

      const totalRisk = riskCounts.Normal + riskCounts.Mild + riskCounts.AD + riskCounts.Unknown;
      const distribution = totalRisk > 0 ? [
        { name: 'Normal', value: Math.round((riskCounts.Normal / totalRisk) * 100), count: riskCounts.Normal, color: RISK_COLORS.Normal },
        { name: 'Mild (MCI)', value: Math.round((riskCounts.Mild / totalRisk) * 100), count: riskCounts.Mild, color: RISK_COLORS.Mild },
        { name: "Alzheimer's (AD)", value: Math.round((riskCounts.AD / totalRisk) * 100), count: riskCounts.AD, color: RISK_COLORS.AD },
        ...(riskCounts.Unknown > 0 ? [{ name: 'Unknown', value: Math.round((riskCounts.Unknown / totalRisk) * 100), count: riskCounts.Unknown, color: UNKNOWN_RISK_COLOR }] : []),
      ] : [];

      const toRow = (a) => ({
        id: a.id || a.analysis_id || a.session_id || `${a.patient_info?.patient_id || a.patient_id || 'P'}-${a.created_at || ''}`,
        patientId: a.patient_info?.patient_id || a.patient_id || null,
        name: a.patient_info?.name || a.patient_name || a.name || 'Unknown Patient',
        stage: getAnalysisStage(a),
        risk: getRiskLevel(getAnalysisStage(a)),
        time: formatTimeAgo(a.created_at),
        timestamp: a.created_at ? new Date(a.created_at).getTime() : 0,
        date: a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Today',
        conf: Math.round(getAnalysisConfidence(a)),
      });

      const recent = analyses.slice(0, 6).map(toRow);

      const priority = analyses
        .filter((a) => getRiskLevel(getAnalysisStage(a)) === 'High')
        .slice(0, 5)
        .map(toRow);

      // Wall-clock-relative by design: the trend window and 24h KPI are
      // anchored to "now" and recompute whenever the data refreshes.
      // eslint-disable-next-line react-hooks/purity
      const nowTs = Date.now();
      const monthKeys = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(nowTs);
        date.setMonth(date.getMonth() - (5 - i));
        return {
          key: `${date.getFullYear()}-${date.getMonth()}`,
          label: date.toLocaleDateString('en-US', { month: 'short' }),
        };
      });
      const monthlyData = monthKeys.map(({ key, label }) => ({ key, month: label, normal: 0, mild: 0, ad: 0 }));
      analyses.forEach((a) => {
        const stage = getAnalysisStage(a).toLowerCase();
        const date = new Date(a.created_at || nowTs);
        const monthIdx = monthKeys.findIndex((m) => m.key === `${date.getFullYear()}-${date.getMonth()}`);
        if (monthIdx >= 0 && monthIdx < 6) {
          if (stage.includes('non') || stage.includes('cognitively normal') || stage === 'cn'
              || stage.includes('normal cognition')) monthlyData[monthIdx].normal++;
          else if (stage.includes('mild') || stage.includes('mci')) monthlyData[monthIdx].mild++;
          else if (stage.includes('moderate') || stage.includes('severe')
              || stage.includes('alzheimer') || stage === 'ad') monthlyData[monthIdx].ad++;
        }
      });
      const hasTrendData = monthlyData.some((m) => m.normal > 0 || m.mild > 0 || m.ad > 0);

      return {
        stats: {
          totalPatients: patientsTotal,
          totalAnalyses: analysesTotal,
          highRiskCount: riskCounts.AD,
          recentActivity: analyses.filter((a) => {
            const created = new Date(a.created_at);
            const dayAgo = new Date(nowTs - 24 * 60 * 60 * 1000);
            return created > dayAgo;
          }).length,
        },
        truncatedFeed: analysesTruncated,
        riskDistribution: distribution,
        recentAnalyses: recent,
        priorityAnalyses: priority,
        trendData: hasTrendData ? monthlyData : [],
      };
  }, [analyses, analysesTotal, analysesTruncated, patientsTotal]);

  const { stats, truncatedFeed, riskDistribution, recentAnalyses, priorityAnalyses, trendData } = derived;

  /* Sorted Datasets */
  const sortedRecentAnalyses = useMemo(() => {
    return [...recentAnalyses].sort((a, b) => {
      let aVal = a[recentSort.key]
      let bVal = b[recentSort.key]
      if (recentSort.key === 'time') { aVal = a.timestamp; bVal = b.timestamp; }
      if (aVal < bVal) return recentSort.dir === 'asc' ? -1 : 1
      if (aVal > bVal) return recentSort.dir === 'asc' ? 1 : -1
      return 0
    })
  }, [recentAnalyses, recentSort])

  const sortedPriorityAnalyses = useMemo(() => {
    return [...priorityAnalyses].sort((a, b) => {
      let aVal = a[prioritySort.key]
      let bVal = b[prioritySort.key]
      if (prioritySort.key === 'time') { aVal = a.timestamp; bVal = b.timestamp; }
      if (aVal < bVal) return prioritySort.dir === 'asc' ? -1 : 1
      if (aVal > bVal) return prioritySort.dir === 'asc' ? 1 : -1
      return 0
    })
  }, [priorityAnalyses, prioritySort])

  const handleSortToggle = (table, key) => {
    if (table === 'recent') {
      setRecentSort(prev => ({
        key,
        dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
      }))
    } else {
      setPrioritySort(prev => ({
        key,
        dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
      }))
    }
  }

  const renderSortIcon = (currentSort, key) => {
    if (currentSort.key !== key) return <ArrowUpDown size={11} className="text-foreground-muted opacity-40 shrink-0" />
    return currentSort.dir === 'asc' 
      ? <ChevronUp size={12} className="text-indigo-400 shrink-0" />
      : <ChevronDown size={12} className="text-indigo-400 shrink-0" />
  }

  const gridColor = isDark ? '#1F2937' : '#E2E8F0';
  const textColor = isDark ? '#9CA3AF' : '#64748B';

  // Time-of-day greeting — wall-clock by design; re-evaluated on data refresh
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
     
  }, []);
  const displayName = user?.full_name || user?.username || 'Doctor';

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-8">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-3.5">
          <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary-hover text-primary-foreground items-center justify-center shadow-sm shadow-primary/25 shrink-0">
            <Sparkles size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              {greeting}, <span className="text-primary">{displayName}</span>
            </h1>
            <p className="text-sm text-muted mt-0.5 font-medium">
              {user?.institution ? `${user.institution} • ` : ''}Last synced at {lastRefreshed}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="p-2.5 rounded-xl border bg-surface border-border text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin text-primary' : ''} />
          </button>

          <Button variant="outline" size="md" onClick={() => navigate('/patients')}>
            Patient List
          </Button>

          <Button variant="primary" size="md" icon={Plus} data-tour="new-assessment" onClick={() => navigate('/analysis')}>
            New Assessment
          </Button>
        </div>
      </div>

      {/* ── First-Run Onboarding: empty registry gets a path forward ─────── */}
      {/* Suppressed while a fetch failed — "your registry is empty" would be
          a lie when the data simply didn't load. */}
      {ready && patients.length === 0 && !fetchError && (
        <StaggerGrid className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-8 sm:p-10 text-center space-y-4 shadow-xs">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[360px] h-[180px] bg-primary/10 blur-[80px] rounded-full pointer-events-none" aria-hidden="true" />
          <StaggerCell>
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-soft border border-primary/25 text-primary flex items-center justify-center" aria-hidden="true">
              <Users size={26} />
            </div>
          </StaggerCell>
          <StaggerCell>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Welcome, {displayName.split(' ')[0]} — let's set up your workspace
            </h2>
            <p className="text-sm text-muted font-medium mt-1.5 max-w-md mx-auto">
              Your patient registry is empty. Register your first patient, or load a fully
              pre-filled sample case to explore the assessment workflow end-to-end.
            </p>
          </StaggerCell>
          <StaggerCell className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
            <Button variant="primary" size="md" icon={Plus} onClick={() => navigate('/patients', { state: { openAddModal: true } })}>
              Register First Patient
            </Button>
            <Button variant="secondary" size="md" icon={Sparkles} onClick={() => navigate('/analysis', { state: { loadSample: true } })}>
              Load Sample Case
            </Button>
            <Button variant="ghost" size="md" icon={ArrowRight} onClick={() => navigate('/analysis')}>
              Start an Assessment
            </Button>
          </StaggerCell>
        </StaggerGrid>
      )}

      {/* ── Data Load Error Banner ───────────────────────────────────────── */}
      {fetchError && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="text-rose-500 dark:text-rose-400 shrink-0" />
            <p className="text-sm font-semibold text-foreground">
              {fetchError} Values shown below may be incomplete.
            </p>
          </div>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchDashboardData} disabled={refreshing}>
            Retry
          </Button>
        </div>
      )}

      {/* ── PRIMARY FOCUS: High-Risk Urgent Triage Section ──────────────── */}
      <section 
        aria-label="Priority Clinical Attention" 
        className="bg-card rounded-2xl border border-rose-500/30 overflow-hidden shadow-xs"
      >
        <div className="px-5 py-3.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={20} className="text-rose-500 dark:text-rose-400 shrink-0" />
            <h2 className="text-base font-extrabold text-foreground uppercase tracking-wider">
              Priority Clinical Attention — Follow-up Advised ({stats.highRiskCount})
            </h2>
          </div>
          {stats.highRiskCount > 0 && (
            <button
              onClick={() => navigate('/patients')}
              className="text-sm font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 rounded-sm"
            >
              Review Priority Cohort <ArrowRight size={15} />
            </button>
          )}
        </div>

        {priorityAnalyses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-surface-secondary/80 border-b border-border text-foreground-muted text-[15px] font-bold uppercase tracking-wider select-none">
                <tr>
                  <th scope="col" className="py-3.5 px-4 w-32">
                    <button 
                      onClick={() => handleSortToggle('priority', 'patientId')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-bold uppercase"
                    >
                      Patient ID {renderSortIcon(prioritySort, 'patientId')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-4 min-w-[160px]">
                    <button 
                      onClick={() => handleSortToggle('priority', 'name')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-bold uppercase"
                    >
                      Patient Name {renderSortIcon(prioritySort, 'name')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-4 min-w-[180px]">
                    <button 
                      onClick={() => handleSortToggle('priority', 'stage')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-bold uppercase"
                    >
                      Diagnostic Classification {renderSortIcon(prioritySort, 'stage')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-4 w-32 text-right pr-6">
                    <button 
                      onClick={() => handleSortToggle('priority', 'conf')} 
                      className="flex items-center justify-end gap-1.5 w-full hover:text-foreground font-bold uppercase"
                    >
                      AI Confidence {renderSortIcon(prioritySort, 'conf')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-4 w-36">
                    <button 
                      onClick={() => handleSortToggle('priority', 'time')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-bold uppercase"
                    >
                      Evaluated {renderSortIcon(prioritySort, 'time')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-4 w-32 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[15px] font-medium">
                {sortedPriorityAnalyses.map((item) => (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => { if (item.patientId) navigate(`/history/${item.patientId}`) }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        if (item.patientId) navigate(`/history/${item.patientId}`)
                      }
                    }}
                    className="hover:bg-rose-500/5 dark:hover:bg-rose-500/10 cursor-pointer transition-colors focus:outline-none focus:bg-rose-500/10"
                    aria-label={`Open history dossier for patient ${item.name}`}
                  >
                    <td className="py-3.5 px-4 font-mono text-sm font-bold text-foreground-muted">
                      {item.patientId}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 text-rose-600 dark:text-rose-400 font-bold">
                      {item.stage}
                    </td>
                    <td className="py-3.5 px-4 text-right pr-6 font-mono font-extrabold text-foreground">
                      {item.conf > 0 ? `${item.conf}%` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-foreground-muted text-sm font-medium">
                      {item.time}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-rose-600 dark:text-rose-400 hover:underline">
                        Review Dossier <ChevronRight size={15} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 px-4 text-center text-sm font-medium text-foreground-muted flex items-center justify-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <span>No active patients currently require priority follow-up intervention.</span>
          </div>
        )}
      </section>

      {/* ── Compact Information-Dense KPI Grid ───────────────────────────── */}
      <StaggerGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {[
          { label: 'Total Patients', value: stats.totalPatients, sub: 'Active registry', icon: Users, tile: 'bg-primary-soft text-primary border-primary/20' },
          { label: 'Evaluations Run', value: stats.totalAnalyses, sub: 'Full assessments', icon: FileText, tile: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20' },
          { label: 'Priority Alerts', value: stats.highRiskCount, sub: stats.highRiskCount > 0 ? 'Review advised' : 'All clear', icon: HeartPulse, tile: stats.highRiskCount > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
          { label: '24h New Cases', value: stats.recentActivity, sub: 'Recent evaluations', icon: CalendarClock, tile: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
        ].map((kpi, idx) => (
          <StaggerCell key={idx} className="p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-border-strong hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-muted">{kpi.label}</span>
              <span className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${kpi.tile}`} aria-hidden="true">
                <kpi.icon size={17} />
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${idx === 2 && stats.highRiskCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                {ready ? <CountUp value={kpi.value} /> : <Skeleton width={64} height={34} rounded={8} />}
              </span>
              <span className="text-xs font-semibold text-muted shrink-0">{kpi.sub}</span>
            </div>
          </StaggerCell>
        ))}
      </StaggerGrid>

      {/* ── Compact Analytics Charts ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Longitudinal Progression Area Chart */}
        <div className="lg:col-span-2 bg-card p-5 rounded-2xl border border-border shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[15px] font-extrabold text-foreground uppercase tracking-wider font-heading">Diagnostic Progression Trajectories</h3>
                <p className="text-xs text-foreground-muted font-medium mt-0.5">Cohort progression trends with multi-modal agreement</p>
              </div>
              <span className="text-xs font-mono font-bold text-foreground-muted bg-surface-secondary px-3 py-1 rounded-lg border border-border">
                6-Month Window
              </span>
            </div>

            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradNormal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradMild" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradModerate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: textColor, fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="normal" name="Normal" stroke="#10B981" strokeWidth={2.5} fill="url(#gradNormal)" animationDuration={900} animationEasing="ease-out" />
                  <Area type="monotone" dataKey="mild" name="Mild (MCI)" stroke="#F59E0B" strokeWidth={2.5} fill="url(#gradMild)" animationDuration={900} animationEasing="ease-out" animationBegin={120} />
                  <Area type="monotone" dataKey="ad" name="Alzheimer's (AD)" stroke="#EF4444" strokeWidth={2.5} fill="url(#gradModerate)" animationDuration={900} animationEasing="ease-out" animationBegin={240} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-10 text-center text-sm font-medium text-muted">No trend data available</div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-border/60 text-xs text-foreground-muted">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" aria-hidden="true" /> Typical (CN)
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" aria-hidden="true" /> Mild Changes (MCI)
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" aria-hidden="true" /> Notable (AD)
              </span>
            </div>
            <span className="text-[11px] font-mono text-foreground-muted">
              Tri-modal concordance tracking active
            </span>
          </div>
        </div>

        {/* Stage Spectrum Pie Chart */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-2xs flex flex-col justify-between">
          <h3 className="text-[15px] font-extrabold text-foreground mb-3 uppercase tracking-wider">Cohort Risk Spectrum</h3>

          {riskDistribution.length > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <div className="w-1/2 h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={60}
                      dataKey="value"
                      strokeWidth={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                      animationBegin={150}
                    >
                      {riskDistribution.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v}%`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-1/2 space-y-2.5 text-sm">
                {riskDistribution.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ background: d.color }} />
                      <span className="text-foreground-muted font-medium truncate">{d.name}</span>
                    </div>
                    <span className="font-mono font-bold text-foreground">{d.value}% ({d.count})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-sm font-medium text-foreground-muted">No distribution data</div>
          )}
        </div>
      </div>

      {/* ── Recent Assessments (Structured Data Table) ───────────────────── */}
      <section 
        aria-label="Recent Patient Assessments"
        className="bg-card rounded-2xl border border-border overflow-hidden shadow-2xs"
      >
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-[15px] font-extrabold text-foreground uppercase tracking-wider">
            Recent Patient Assessments ({recentAnalyses.length})
          </h3>
          {truncatedFeed && (
            <span className="text-[11px] font-semibold text-foreground-muted">
              KPIs &amp; charts cover the latest 1,000 sessions
            </span>
          )}
          <button
            onClick={() => navigate('/patients')}
            className="text-sm font-bold text-primary hover:underline flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-sm"
          >
            All Patient Dossiers <ArrowRight size={15} />
          </button>
        </div>

        {recentAnalyses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-surface-secondary/80 border-b border-border text-foreground-muted text-[15px] font-bold uppercase tracking-wider select-none">
                <tr>
                  <th scope="col" className="py-3.5 px-4 w-32">
                    <button 
                      onClick={() => handleSortToggle('recent', 'patientId')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-bold uppercase"
                    >
                      Patient ID {renderSortIcon(recentSort, 'patientId')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-4 min-w-[160px]">
                    <button 
                      onClick={() => handleSortToggle('recent', 'name')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-bold uppercase"
                    >
                      Patient Name {renderSortIcon(recentSort, 'name')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-4 min-w-[180px]">
                    <button 
                      onClick={() => handleSortToggle('recent', 'stage')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-bold uppercase"
                    >
                      Diagnostic Classification {renderSortIcon(recentSort, 'stage')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-4 w-32 text-right pr-6">
                    <button 
                      onClick={() => handleSortToggle('recent', 'conf')} 
                      className="flex items-center justify-end gap-1.5 w-full hover:text-foreground font-bold uppercase"
                    >
                      AI Confidence {renderSortIcon(recentSort, 'conf')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-4 w-36">
                    <button 
                      onClick={() => handleSortToggle('recent', 'risk')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-bold uppercase"
                    >
                      Risk Level {renderSortIcon(recentSort, 'risk')}
                    </button>
                  </th>
                  <th scope="col" className="py-3.5 px-4 w-36">
                    <button 
                      onClick={() => handleSortToggle('recent', 'time')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-bold uppercase"
                    >
                      Date Evaluated {renderSortIcon(recentSort, 'time')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-[15px] font-medium">
                {sortedRecentAnalyses.map((item) => (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => { if (item.patientId) navigate(`/history/${item.patientId}`) }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        if (item.patientId) navigate(`/history/${item.patientId}`)
                      }
                    }}
                    className="hover:bg-surface-hover/80 cursor-pointer transition-colors focus:outline-none focus:bg-surface-hover"
                    aria-label={`Open history dossier for patient ${item.name}`}
                  >
                    <td className="py-3.5 px-4 font-mono text-sm font-bold text-foreground-muted">
                      {item.patientId}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {item.name}
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-medium">
                      {item.stage}
                    </td>
                    <td className="py-3.5 px-4 text-right pr-6 font-mono font-extrabold text-foreground">
                      {item.conf > 0 ? `${item.conf}%` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={item.risk.toLowerCase()}>
                        {item.risk}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-foreground-muted text-sm font-medium">
                      {item.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 px-4 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary-soft border border-primary/20 text-primary flex items-center justify-center" aria-hidden="true">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">No recent assessments</p>
              <p className="text-xs text-muted mt-0.5">Run a new assessment to see results appear here.</p>
            </div>
            <Button variant="outline" size="sm" icon={Plus} onClick={() => navigate('/analysis')}>
              Start New Assessment
            </Button>
          </div>
        )}
      </section>

    </div>
  );
}
