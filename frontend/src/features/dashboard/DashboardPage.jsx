import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Plus, RefreshCw, ChevronRight, CheckCircle2,
  ArrowUpDown, ChevronUp, ChevronDown
} from 'lucide-react';
import { patientsApi, historyApi } from '../../services';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useTheme } from '../../context/ThemeProvider';
import { useAuth } from '../../features/auth/AuthProvider';
import {
  RISK_COLORS,
  getRiskLevel,
  getAnalysisStage,
  getAnalysisConfidence,
  formatTimeAgo
} from '../../utils/clinicalMappers';

/* ── High-Contrast Clinical Tooltip ──────────────────────────────────────── */
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
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date().toLocaleTimeString());
  
  /* Sort States for Clinical Tables */
  const [recentSort, setRecentSort] = useState({ key: 'time', dir: 'desc' });
  const [prioritySort, setPrioritySort] = useState({ key: 'conf', dir: 'desc' });

  const [stats, setStats] = useState({
    totalPatients: 0,
    totalAnalyses: 0,
    highRiskCount: 0,
    recentActivity: 0,
  });
  const [riskDistribution, setRiskDistribution] = useState([]);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [priorityAnalyses, setPriorityAnalyses] = useState([]);
  const [trendData, setTrendData] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [patientsData, analysesData] = await Promise.all([
        patientsApi.getAll().catch(() => ({ patients: [] })),
        historyApi.getAllAnalyses().catch(() => ({ analyses: [] })),
      ]);

      const patients = patientsData.patients || [];
      const analyses = analysesData.analyses || [];

      const riskCounts = { Normal: 0, Mild: 0, Moderate: 0, High: 0 };
      analyses.forEach((a) => {
        const stage = getAnalysisStage(a);
        if (stage.includes('Non') || stage.includes('Very Mild')) riskCounts.Normal++;
        else if (stage.includes('Mild')) riskCounts.Mild++;
        else if (stage.includes('Moderate')) riskCounts.Moderate++;
        else riskCounts.High++;
      });

      const totalRisk = riskCounts.Normal + riskCounts.Mild + riskCounts.Moderate + riskCounts.High;
      const distribution = totalRisk > 0 ? [
        { name: 'Normal', value: Math.round((riskCounts.Normal / totalRisk) * 100), count: riskCounts.Normal, color: RISK_COLORS.Normal },
        { name: 'Mild (MCI)', value: Math.round((riskCounts.Mild / totalRisk) * 100), count: riskCounts.Mild, color: RISK_COLORS.Mild },
        { name: 'Moderate', value: Math.round((riskCounts.Moderate / totalRisk) * 100), count: riskCounts.Moderate, color: RISK_COLORS.Moderate },
        { name: 'Severe AD', value: Math.round((riskCounts.High / totalRisk) * 100), count: riskCounts.High, color: RISK_COLORS.High },
      ] : [];

      const recent = analyses.slice(0, 6).map((a) => ({
        id: a.id || a.analysis_id || a.patient_info?.patient_id || a.patient_id || 'P-0000',
        patientId: a.patient_info?.patient_id || a.patient_id || 'P-0000',
        name: a.patient_info?.name || a.patient_name || a.name || 'Unknown Patient',
        stage: getAnalysisStage(a),
        risk: getRiskLevel(getAnalysisStage(a)),
        time: formatTimeAgo(a.created_at),
        timestamp: a.created_at ? new Date(a.created_at).getTime() : 0,
        date: a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Today',
        conf: Math.round(getAnalysisConfidence(a)),
      }));

      const priority = analyses
        .filter((a) => getRiskLevel(getAnalysisStage(a)) === 'High')
        .slice(0, 5)
        .map((a) => ({
          id: a.id || a.analysis_id || a.patient_info?.patient_id || a.patient_id || 'P-0000',
          patientId: a.patient_info?.patient_id || a.patient_id || 'P-0000',
          name: a.patient_info?.name || a.patient_name || a.name || 'Unknown Patient',
          stage: getAnalysisStage(a),
          time: formatTimeAgo(a.created_at),
          timestamp: a.created_at ? new Date(a.created_at).getTime() : 0,
          date: a.created_at ? new Date(a.created_at).toLocaleDateString() : 'Today',
          conf: Math.round(getAnalysisConfidence(a)),
        }));

      const monthKeys = Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        return {
          key: `${date.getFullYear()}-${date.getMonth()}`,
          label: date.toLocaleDateString('en-US', { month: 'short' }),
        };
      });
      const monthlyData = monthKeys.map(({ key, label }) => ({ key, month: label, normal: 0, mild: 0, moderate: 0 }));
      analyses.forEach((a) => {
        const stage = getAnalysisStage(a);
        const date = new Date(a.created_at || Date.now());
        const monthIdx = monthKeys.findIndex((m) => m.key === `${date.getFullYear()}-${date.getMonth()}`);
        if (monthIdx >= 0 && monthIdx < 6) {
          if (stage.includes('Non') || stage.includes('Very Mild')) monthlyData[monthIdx].normal++;
          else if (stage.includes('Mild')) monthlyData[monthIdx].mild++;
          else if (stage.includes('Moderate')) monthlyData[monthIdx].moderate++;
        }
      });
      const hasTrendData = monthlyData.some((m) => m.normal > 0 || m.mild > 0 || m.moderate > 0);

      setStats({
        totalPatients: patients.length,
        totalAnalyses: analyses.length,
        highRiskCount: riskCounts.High,
        recentActivity: analyses.filter((a) => {
          const created = new Date(a.created_at);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return created > dayAgo;
        }).length,
      });
      setRiskDistribution(distribution);
      setRecentAnalyses(recent);
      setPriorityAnalyses(priority);
      setTrendData(hasTrendData ? monthlyData : []);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setReady(true);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-8">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Clinical Dashboard</h1>
          <p className="text-sm text-foreground-muted mt-0.5 font-medium">
            {user?.institution ? `${user.institution} • ` : ''}Last synced at {lastRefreshed}
          </p>
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
            Patient Roster
          </Button>

          <Button variant="primary" size="md" icon={Plus} onClick={() => navigate('/analysis')}>
            New Assessment
          </Button>
        </div>
      </div>

      {/* ── PRIMARY FOCUS: High-Risk Urgent Triage Section ──────────────── */}
      <section 
        aria-label="Urgent Clinical Triage" 
        className="bg-card rounded-2xl border border-rose-500/30 overflow-hidden shadow-xs"
      >
        <div className="px-5 py-3.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={20} className="text-rose-500 dark:text-rose-400 shrink-0" />
            <h2 className="text-base font-extrabold text-foreground uppercase tracking-wider">
              Urgent Attention — High Risk Patients ({stats.highRiskCount})
            </h2>
          </div>
          {stats.highRiskCount > 0 && (
            <button
              onClick={() => navigate('/patients')}
              className="text-sm font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 rounded-sm"
            >
              View All High-Risk <ArrowRight size={15} />
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
                      Diagnosis Stage {renderSortIcon(prioritySort, 'stage')}
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
                    onClick={() => navigate(`/history/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/history/${item.id}`)
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
            <span>Zero high-risk cases currently require urgent clinical intervention.</span>
          </div>
        )}
      </section>

      {/* ── Compact Information-Dense KPI Grid ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        {[
          { label: 'Total Patients', value: stats.totalPatients, sub: 'Active registry', color: 'text-foreground' },
          { label: 'Evaluations Run', value: stats.totalAnalyses, sub: 'Full assessments', color: 'text-foreground' },
          { label: 'High-Risk Alerts', value: stats.highRiskCount, sub: stats.highRiskCount > 0 ? 'Action required' : 'All clear', color: stats.highRiskCount > 0 ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-emerald-600 dark:text-emerald-400 font-bold' },
          { label: '24h New Cases', value: stats.recentActivity, sub: 'Recent evaluations', color: 'text-primary font-extrabold' },
        ].map((kpi, idx) => (
          <div key={idx} className="p-6 rounded-2xl bg-card border border-border space-y-3 shadow-xs hover:border-border-strong transition-all duration-150">
            <span className="text-lg font-bold text-foreground block truncate">{kpi.label}</span>
            <div className="flex items-baseline justify-between gap-2">
              <span className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${kpi.color}`}>{ready ? kpi.value : '...'}</span>
              <span className="text-[15px] font-semibold text-foreground-muted shrink-0">{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Compact Analytics Charts ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Longitudinal Progression Area Chart */}
        <div className="lg:col-span-2 bg-card p-5 rounded-2xl border border-border shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-extrabold text-foreground uppercase tracking-wider">Diagnostic Progression Trajectories</h3>
            <span className="text-sm font-mono font-semibold text-foreground-muted bg-surface-secondary px-3 py-1 rounded-lg border border-border">
              6-Month Window
            </span>
          </div>

          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: textColor, fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="normal" name="Normal" stroke="#10B981" strokeWidth={2} fill="#10B981" fillOpacity={0.15} />
                <Area type="monotone" dataKey="mild" name="Mild (MCI)" stroke="#F59E0B" strokeWidth={2} fill="#F59E0B" fillOpacity={0.15} />
                <Area type="monotone" dataKey="moderate" name="Moderate/Severe" stroke="#EF4444" strokeWidth={2} fill="#EF4444" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-10 text-center text-sm font-medium text-foreground-muted">No trend data available</div>
          )}
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
                    onClick={() => navigate(`/history/${item.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/history/${item.id}`)
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
          <div className="py-8 text-center text-sm font-medium text-foreground-muted">
            No recent patient assessments found.
          </div>
        )}
      </section>

    </div>
  );
}
