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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Clinical Dashboard</h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            {user?.institution ? `${user.institution} • ` : ''}Last synced at {lastRefreshed}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="p-2 rounded-lg border bg-surface border-border text-foreground-muted hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-indigo-400' : ''} />
          </button>

          <Button variant="outline" size="sm" onClick={() => navigate('/patients')}>
            Patient Roster
          </Button>

          <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/analysis')}>
            New Assessment
          </Button>
        </div>
      </div>

      {/* ── PRIMARY FOCUS: High-Risk Urgent Triage Section ──────────────── */}
      <section 
        aria-label="Urgent Clinical Triage" 
        className="bg-surface rounded-xl border border-rose-500/30 overflow-hidden shadow-xs"
      >
        <div className="px-4 py-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Urgent Clinical Triage — High-Risk Cases ({stats.highRiskCount})
            </h2>
          </div>
          {stats.highRiskCount > 0 && (
            <button
              onClick={() => navigate('/patients')}
              className="text-[11px] font-semibold text-rose-400 hover:underline flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              View All High-Risk <ArrowRight size={12} />
            </button>
          )}
        </div>

        {priorityAnalyses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-background/50 border-b border-border text-foreground-muted text-[11px] font-semibold uppercase tracking-wider select-none">
                <tr>
                  <th scope="col" className="py-2.5 px-4 w-28">
                    <button 
                      onClick={() => handleSortToggle('priority', 'patientId')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase"
                    >
                      Patient ID {renderSortIcon(prioritySort, 'patientId')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 min-w-[140px]">
                    <button 
                      onClick={() => handleSortToggle('priority', 'name')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase"
                    >
                      Patient Name {renderSortIcon(prioritySort, 'name')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 min-w-[160px]">
                    <button 
                      onClick={() => handleSortToggle('priority', 'stage')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase"
                    >
                      Diagnostic Classification {renderSortIcon(prioritySort, 'stage')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 w-28 text-right pr-6">
                    <button 
                      onClick={() => handleSortToggle('priority', 'conf')} 
                      className="flex items-center justify-end gap-1.5 w-full hover:text-foreground font-semibold uppercase"
                    >
                      AI Confidence {renderSortIcon(prioritySort, 'conf')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 w-32">
                    <button 
                      onClick={() => handleSortToggle('priority', 'time')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase"
                    >
                      Evaluated {renderSortIcon(prioritySort, 'time')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 w-28 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
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
                    className="hover:bg-rose-500/5 cursor-pointer transition-colors focus:outline-none focus:bg-rose-500/10"
                    aria-label={`Open history dossier for patient ${item.name}`}
                  >
                    <td className="py-2.5 px-4 font-mono text-[11px] font-bold text-foreground-muted">
                      {item.patientId}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-foreground">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-4 text-rose-400 font-semibold">
                      {item.stage}
                    </td>
                    <td className="py-2.5 px-4 text-right pr-6 font-mono font-bold text-foreground">
                      {item.conf > 0 ? `${item.conf}%` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-foreground-muted text-[11px]">
                      {item.time}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:underline">
                        Review Dossier <ChevronRight size={12} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 px-4 text-center text-xs text-foreground-muted flex items-center justify-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>Zero high-risk cases currently require urgent clinical intervention.</span>
          </div>
        )}
      </section>

      {/* ── Compact Information-Dense KPI Grid ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Patients', value: stats.totalPatients, sub: 'Active registry', color: 'text-foreground' },
          { label: 'Evaluations Run', value: stats.totalAnalyses, sub: 'Full assessments', color: 'text-foreground' },
          { label: 'High-Risk Alerts', value: stats.highRiskCount, sub: stats.highRiskCount > 0 ? 'Action required' : 'All clear', color: stats.highRiskCount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400' },
          { label: '24h New Cases', value: stats.recentActivity, sub: 'Recent evaluations', color: 'text-indigo-400' },
        ].map((kpi, idx) => (
          <div key={idx} className="p-3.5 rounded-xl bg-surface border border-border space-y-1">
            <span className="text-[11px] font-semibold text-foreground-muted block truncate uppercase tracking-wider">{kpi.label}</span>
            <div className="flex items-baseline justify-between">
              <span className={`text-xl font-bold font-mono ${kpi.color}`}>{ready ? kpi.value : '...'}</span>
              <span className="text-[10px] font-medium text-foreground-muted">{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Compact Analytics Charts (Reduced Height) ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Longitudinal Progression Area Chart */}
        <div className="lg:col-span-2 bg-surface p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-foreground">Diagnostic Progression Trajectories</h3>
            <span className="text-[10px] font-mono text-foreground-muted bg-background px-2 py-0.5 rounded border border-border">
              6-Month Window
            </span>
          </div>

          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="normal" name="Normal" stroke="#10B981" strokeWidth={1.5} fill="#10B981" fillOpacity={0.15} />
                <Area type="monotone" dataKey="mild" name="Mild (MCI)" stroke="#F59E0B" strokeWidth={1.5} fill="#F59E0B" fillOpacity={0.15} />
                <Area type="monotone" dataKey="moderate" name="Moderate/Severe" stroke="#EF4444" strokeWidth={1.5} fill="#EF4444" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-10 text-center text-xs text-foreground-muted">No trend data available</div>
          )}
        </div>

        {/* Stage Spectrum Pie Chart */}
        <div className="bg-surface p-4 rounded-xl border border-border flex flex-col justify-between">
          <h3 className="text-xs font-bold text-foreground mb-2">Cohort Risk Spectrum</h3>

          {riskDistribution.length > 0 ? (
            <div className="flex items-center justify-between gap-2">
              <div className="w-1/2 h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
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

              <div className="w-1/2 space-y-1.5 text-xs">
                {riskDistribution.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-xs shrink-0" style={{ background: d.color }} />
                      <span className="text-foreground-muted truncate">{d.name}</span>
                    </div>
                    <span className="font-mono font-bold text-foreground">{d.value}% ({d.count})</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-foreground-muted">No distribution data</div>
          )}
        </div>
      </div>

      {/* ── Recent Assessments (Structured Data Table) ───────────────────── */}
      <section 
        aria-label="Recent Patient Assessments"
        className="bg-surface rounded-xl border border-border overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Recent Patient Assessments ({recentAnalyses.length})
          </h3>
          <button
            onClick={() => navigate('/patients')}
            className="text-[11px] font-semibold text-indigo-400 hover:underline flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            All Patient Dossiers <ArrowRight size={12} />
          </button>
        </div>

        {recentAnalyses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-background/50 border-b border-border text-foreground-muted text-[11px] font-semibold uppercase tracking-wider select-none">
                <tr>
                  <th scope="col" className="py-2.5 px-4 w-28">
                    <button 
                      onClick={() => handleSortToggle('recent', 'patientId')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase"
                    >
                      Patient ID {renderSortIcon(recentSort, 'patientId')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 min-w-[140px]">
                    <button 
                      onClick={() => handleSortToggle('recent', 'name')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase"
                    >
                      Patient Name {renderSortIcon(recentSort, 'name')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 min-w-[160px]">
                    <button 
                      onClick={() => handleSortToggle('recent', 'stage')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase"
                    >
                      Diagnostic Classification {renderSortIcon(recentSort, 'stage')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 w-28 text-right pr-6">
                    <button 
                      onClick={() => handleSortToggle('recent', 'conf')} 
                      className="flex items-center justify-end gap-1.5 w-full hover:text-foreground font-semibold uppercase"
                    >
                      AI Confidence {renderSortIcon(recentSort, 'conf')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 w-32">
                    <button 
                      onClick={() => handleSortToggle('recent', 'risk')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase"
                    >
                      Risk Level {renderSortIcon(recentSort, 'risk')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 w-32">
                    <button 
                      onClick={() => handleSortToggle('recent', 'time')} 
                      className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase"
                    >
                      Date Evaluated {renderSortIcon(recentSort, 'time')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
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
                    className="hover:bg-surface-hover cursor-pointer transition-colors focus:outline-none focus:bg-surface-hover"
                    aria-label={`Open history dossier for patient ${item.name}`}
                  >
                    <td className="py-2.5 px-4 font-mono text-[11px] text-foreground-muted">
                      {item.patientId}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-foreground">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-4 text-foreground">
                      {item.stage}
                    </td>
                    <td className="py-2.5 px-4 text-right pr-6 font-mono font-bold text-foreground">
                      {item.conf > 0 ? `${item.conf}%` : 'N/A'}
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant={item.risk.toLowerCase()}>
                        {item.risk}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-foreground-muted text-[11px]">
                      {item.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-foreground-muted">
            No recent patient assessments found.
          </div>
        )}
      </section>

    </div>
  );
}
