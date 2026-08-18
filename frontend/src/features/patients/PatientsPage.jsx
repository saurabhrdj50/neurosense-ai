import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Users, Search, Download, Eye, UserPlus, Filter,
  LayoutGrid, List, AlertTriangle, ShieldCheck, CheckCircle2, X,
  Plus, ArrowUpDown, ChevronUp, ChevronDown, Activity, FileText, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { SectionSkeleton } from '../../components/ui/Skeleton';
import { patientsApi, historyApi } from '../../services';
import {
  stageToBadgeVariant,
  getAnalysisStage,
  getAnalysisConfidence,
  formatTimeAgo
} from '../../utils/clinicalMappers';

export default function PatientsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [patients, setPatients] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  /* Primary Interactions: Search & View Mode */
  const [search, setSearch] = useState('');
  const [chipFilter, setChipFilter] = useState('all');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('patient_view_mode') || 'table';
  });

  /* Table Sorting State */
  const [sortConfig, setSortConfig] = useState({ key: 'lastAnalysis', dir: 'desc' });

  /* Patient Modal State */
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_id: '',
    name: '',
    age: '',
    sex: 'M',
    education_years: '',
    notes: ''
  });

  useEffect(() => {
    localStorage.setItem('patient_view_mode', viewMode);
  }, [viewMode]);

  /* Keyboard shortcut '/' to auto-focus search input */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchEl = document.getElementById('patient-search-input');
        if (searchEl) searchEl.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStartAssessment = useCallback((patient, e) => {
    if (e) e.stopPropagation();
    navigate('/analysis', { state: { patient_info: patient } });
  }, [navigate]);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      patientsApi.getAll().catch(() => ({ patients: [] })),
      historyApi.getAllAnalyses().catch(() => ({ analyses: [] })),
    ])
      .then(([pData, aData]) => {
        setPatients(pData.patients || []);
        setAnalyses(aData.analyses || []);
      })
      .catch(() => toast.error('Failed to load patient registry'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === 'true') setAddOpen(true);
    const risk = params.get('risk');
    if (risk) setChipFilter(risk);
    const q = params.get('search') || params.get('q');
    if (q) setSearch(q);
  }, [location.search]);

  /* Enrich Patient Data with Latest Assessment Status */
  const enrichedPatients = useMemo(() => {
    return patients.map((p) => {
      const pAnalyses = analyses
        .filter((a) => a.patient_id === p.patient_id || a.patient_info?.patient_id === p.patient_id)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      if (!pAnalyses.length) {
        return {
          ...p,
          stage: 'Unassessed',
          risk: 'Normal',
          conf: 0,
          lastAnalysis: null,
          lastAnalysisTs: 0,
        };
      }

      const latest = pAnalyses[0];
      const stage = getAnalysisStage(latest);
      let risk = 'Normal';
      if (stage.includes('Mild') && !stage.includes('Moderate')) risk = 'Mild';
      else if (stage.includes('Moderate') || stage.includes('High') || stage.includes('Alzheimer')) risk = 'High';

      return {
        ...p,
        stage,
        risk,
        conf: Math.round(getAnalysisConfidence(latest)),
        lastAnalysis: latest.created_at,
        lastAnalysisTs: latest.created_at ? new Date(latest.created_at).getTime() : 0,
      };
    });
  }, [patients, analyses]);

  /* Cohort KPI Chip Totals */
  const chipCounts = useMemo(() => {
    const total = enrichedPatients.length;
    const high = enrichedPatients.filter((p) => p.risk === 'High').length;
    const mci = enrichedPatients.filter((p) => p.stage.toLowerCase().includes('mild') || p.risk === 'Mild').length;
    const ad = enrichedPatients.filter((p) => p.stage.toLowerCase().includes('alzheimer') || p.stage.toLowerCase().includes('moderate')).length;
    const normal = enrichedPatients.filter((p) => p.risk === 'Normal' && !p.stage.toLowerCase().includes('mild')).length;
    return { total, high, mci, ad, normal };
  }, [enrichedPatients]);

  /* Instant Filter & Multi-Criteria Search */
  const filteredPatients = useMemo(() => {
    let result = enrichedPatients;

    // Filter by KPI Chip Selection
    if (chipFilter === 'high') {
      result = result.filter((p) => p.risk === 'High');
    } else if (chipFilter === 'mci') {
      result = result.filter((p) => p.stage.toLowerCase().includes('mild') || p.risk === 'Mild');
    } else if (chipFilter === 'ad') {
      result = result.filter((p) => p.stage.toLowerCase().includes('alzheimer') || p.stage.toLowerCase().includes('moderate'));
    } else if (chipFilter === 'normal') {
      result = result.filter((p) => p.risk === 'Normal' && !p.stage.toLowerCase().includes('mild'));
    }

    // Instant Multi-Field Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.patient_id && p.patient_id.toLowerCase().includes(q)) ||
        (p.stage && p.stage.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      );
    }

    return result;
  }, [enrichedPatients, chipFilter, search]);

  /* Column Sort Handler */
  const sortedPatients = useMemo(() => {
    return [...filteredPatients].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'lastAnalysis') {
        aVal = a.lastAnalysisTs;
        bVal = b.lastAnalysisTs;
      }

      if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPatients, sortConfig]);

  const handleSortToggle = (key) => {
    setSortConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={11} className="text-foreground-muted opacity-40 shrink-0" />;
    return sortConfig.dir === 'asc' 
      ? <ChevronUp size={12} className="text-indigo-400 shrink-0" />
      : <ChevronDown size={12} className="text-indigo-400 shrink-0" />;
  };

  /* Add Patient Handler */
  const handleAddPatient = async () => {
    if (!form.patient_id || !form.name) {
      toast.error('Patient ID and Full Name are required');
      return;
    }
    setSaving(true);
    try {
      await patientsApi.create({
        ...form,
        age: Number(form.age) || 0,
        education_years: Number(form.education_years) || 0,
      });
      toast.success('Patient registered successfully!');
      setAddOpen(false);
      setForm({ patient_id: '', name: '', age: '', sex: 'M', education_years: '', notes: '' });
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to register patient');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No evaluations';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">

      {/* ── Page Header Bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            Patient Registry
            <span className="text-xs font-mono font-bold text-foreground-muted bg-surface px-2 py-0.5 rounded border border-border">
              {enrichedPatients.length} Files
            </span>
          </h1>
          <p className="text-xs text-foreground-muted mt-0.5">
            Search, triage, and launch diagnostic assessments across active patient files.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Grid vs Table View Mode Segmented Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-border" role="group" aria-label="View mode">
            <button
              onClick={() => setViewMode('table')}
              type="button"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
              title="Dense Clinical Table View"
              aria-label="Dense Clinical Table View"
              aria-pressed={viewMode === 'table'}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              type="button"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
              title="Card Grid View"
              aria-label="Card Grid View"
              aria-pressed={viewMode === 'grid'}
            >
              <LayoutGrid size={14} />
            </button>
          </div>

          <button
            onClick={() => window.open('/api/patients/export', '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-border text-foreground hover:bg-hover transition-colors"
          >
            <Download size={13} aria-hidden="true" />
            Export CSV
          </button>

          <Button icon={Plus} size="sm" variant="primary" onClick={() => setAddOpen(true)}>
            New Patient
          </Button>
        </div>
      </div>

      {/* ── Compact Interactive KPI Chips (One-Click Triage Filters) ────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Patient Triage Filters">
        {[
          { id: 'all', label: 'All Patients', count: chipCounts.total, activeColor: 'bg-indigo-600 text-white border-indigo-600' },
          { id: 'high', label: 'High Risk', count: chipCounts.high, activeColor: 'bg-rose-600 text-white border-rose-600' },
          { id: 'mci', label: 'MCI / Mild', count: chipCounts.mci, activeColor: 'bg-amber-600 text-white border-amber-600' },
          { id: 'ad', label: 'Alzheimer\'s / Mod', count: chipCounts.ad, activeColor: 'bg-purple-600 text-white border-purple-600' },
          { id: 'normal', label: 'Normal Stage', count: chipCounts.normal, activeColor: 'bg-emerald-600 text-white border-emerald-600' },
        ].map((chip) => {
          const isActive = chipFilter === chip.id;
          return (
            <button
              key={chip.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setChipFilter(chip.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shrink-0 cursor-pointer ${
                isActive
                  ? `${chip.activeColor} shadow-2xs`
                  : 'bg-surface border-border text-foreground-muted hover:text-foreground hover:border-border-strong'
              }`}
            >
              <span>{chip.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                isActive ? 'bg-white/20 text-white font-bold' : 'bg-background text-foreground-muted border border-border'
              }`}>
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Prominent Search Bar (Primary Interaction) ───────────────────── */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Patient Name, ID (P-XXXX), Diagnosis, or Clinical Notes..."
          aria-label="Search patients by name, ID, or diagnosis"
          className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs bg-surface border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors shadow-2xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
            title="Clear search"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Main View (Table vs Grid) ────────────────────────────────────── */}
      {loading ? (
        <div className="p-5 bg-surface rounded-xl border border-border"><SectionSkeleton rows={8} /></div>
      ) : sortedPatients.length === 0 ? (
        <div className="py-16 text-center bg-surface rounded-xl border border-border">
          <Users size={32} className="text-foreground-muted mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground">No patient records found</p>
          <p className="text-xs text-foreground-muted mt-1 max-w-[280px] mx-auto">
            Try adjusting your search terms or selecting a different risk tier filter.
          </p>
          {(search || chipFilter !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => { setSearch(''); setChipFilter('all'); }}
            >
              Reset Search & Filters
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (

        /* ── Dense Clinical Table (Primary View) ───────────────────────── */
        <div className="bg-surface rounded-xl border border-border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-background/50 border-b border-border text-foreground-muted text-[11px] font-semibold uppercase tracking-wider select-none">
                <tr>
                  <th scope="col" className="py-2.5 px-4 w-28">
                    <button onClick={() => handleSortToggle('patient_id')} className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase">
                      Patient ID {renderSortIcon('patient_id')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 min-w-[150px]">
                    <button onClick={() => handleSortToggle('name')} className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase">
                      Patient Name {renderSortIcon('name')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 w-24">
                    <button onClick={() => handleSortToggle('age')} className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase">
                      Age / Sex {renderSortIcon('age')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 min-w-[160px]">
                    <button onClick={() => handleSortToggle('stage')} className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase">
                      Current Diagnosis {renderSortIcon('stage')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 w-28 text-right pr-6">
                    <button onClick={() => handleSortToggle('conf')} className="flex items-center justify-end gap-1.5 w-full hover:text-foreground font-semibold uppercase">
                      AI Confidence {renderSortIcon('conf')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 w-28">
                    <button onClick={() => handleSortToggle('risk')} className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase">
                      Risk Level {renderSortIcon('risk')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 w-32">
                    <button onClick={() => handleSortToggle('lastAnalysis')} className="flex items-center gap-1.5 hover:text-foreground font-semibold uppercase">
                      Last Evaluated {renderSortIcon('lastAnalysis')}
                    </button>
                  </th>
                  <th scope="col" className="py-2.5 px-4 w-36 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {sortedPatients.map((pat) => (
                  <tr
                    key={pat.patient_id}
                    tabIndex={0}
                    role="button"
                    onClick={() => navigate(`/history/${pat.patient_id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/history/${pat.patient_id}`);
                      }
                    }}
                    className="hover:bg-surface-hover cursor-pointer transition-colors focus:outline-none focus:bg-surface-hover"
                    aria-label={`Open dossier for ${pat.name}`}
                  >
                    {/* Patient ID */}
                    <td className="py-2.5 px-4 font-mono text-[11px] font-bold text-foreground-muted">
                      {pat.patient_id}
                    </td>

                    {/* Patient Name */}
                    <td className="py-2.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {(pat.name || '?')[0].toUpperCase()}
                        </div>
                        <span className="truncate">{pat.name}</span>
                      </div>
                    </td>

                    {/* Age / Sex */}
                    <td className="py-2.5 px-4 text-foreground-muted text-[11px]">
                      {pat.age ? `${pat.age}y` : '—'} · {pat.sex || '—'}
                    </td>

                    {/* Current Diagnosis */}
                    <td className="py-2.5 px-4 text-foreground font-medium truncate">
                      {pat.stage}
                    </td>

                    {/* AI Confidence */}
                    <td className="py-2.5 px-4 text-right pr-6 font-mono font-bold text-foreground">
                      {pat.conf > 0 ? `${pat.conf}%` : '—'}
                    </td>

                    {/* Risk Level */}
                    <td className="py-2.5 px-4">
                      <Badge variant={pat.risk.toLowerCase()}>
                        {pat.risk}
                      </Badge>
                    </td>

                    {/* Last Assessment */}
                    <td className="py-2.5 px-4 text-foreground-muted text-[11px]">
                      {formatDate(pat.lastAnalysis)}
                    </td>

                    {/* Quick Row Actions */}
                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/history/${pat.patient_id}`)}
                          className="p-1 rounded-md bg-background border border-border text-foreground-muted hover:text-indigo-400 hover:border-indigo-500/40 transition-colors"
                          title="View Patient Dossier"
                          aria-label={`View Dossier for ${pat.name}`}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => navigate(`/analysis?patient_id=${pat.patient_id}`)}
                          className="p-1 rounded-md bg-background border border-border text-foreground-muted hover:text-indigo-400 hover:border-indigo-500/40 transition-colors"
                          title="Launch New Assessment"
                          aria-label={`Launch Assessment for ${pat.name}`}
                        >
                          <Activity size={13} />
                        </button>
                        <button
                          onClick={() => patientsApi.export(pat.patient_id)}
                          className="p-1 rounded-md bg-background border border-border text-foreground-muted hover:text-emerald-400 hover:border-emerald-500/40 transition-colors"
                          title="Export CSV"
                          aria-label={`Export CSV for ${pat.name}`}
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (

        /* ── Secondary Grid View ────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sortedPatients.map((pat) => (
            <div
              key={pat.patient_id}
              tabIndex={0}
              role="button"
              onClick={() => navigate(`/history/${pat.patient_id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/history/${pat.patient_id}`);
                }
              }}
              className="p-4 rounded-xl bg-surface border border-border hover:border-indigo-500/40 cursor-pointer flex flex-col justify-between transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                      {(pat.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground text-xs truncate leading-tight">{pat.name}</h3>
                      <span className="text-[10px] text-foreground-muted font-mono block mt-0.5">{pat.patient_id}</span>
                    </div>
                  </div>
                  <Badge variant={pat.risk.toLowerCase()}>{pat.risk}</Badge>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-foreground-muted text-[10px] block">Age / Sex</span>
                    <span className="font-semibold text-foreground">{pat.age ? `${pat.age}y` : '—'} · {pat.sex || '—'}</span>
                  </div>
                  <div>
                    <span className="text-foreground-muted text-[10px] block">Diagnosis</span>
                    <span className="font-semibold text-foreground truncate block">{pat.stage}</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                <span className="text-[10px] text-foreground-muted">{formatDate(pat.lastAnalysis)}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/history/${pat.patient_id}`)}
                    className="p-1.5 rounded-md bg-background border border-border text-foreground-muted hover:text-indigo-400"
                    title="View Dossier"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    onClick={() => navigate(`/analysis?patient_id=${pat.patient_id}`)}
                    className="p-1.5 rounded-md bg-background border border-border text-foreground-muted hover:text-indigo-400"
                    title="New Assessment"
                  >
                    <Activity size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Standardized New Patient Modal ───────────────────────────────── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Register New Patient File" maxWidth={500}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="patient-id" className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">
                Patient ID <span className="text-rose-400">*</span>
              </label>
              <input
                id="patient-id"
                type="text"
                value={form.patient_id}
                onChange={setField('patient_id')}
                placeholder="P-XXXX"
                className="w-full px-3 py-2 rounded-lg text-xs bg-background border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div>
              <label htmlFor="patient-name" className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                id="patient-name"
                type="text"
                value={form.name}
                onChange={setField('name')}
                placeholder="Jane Smith"
                className="w-full px-3 py-2 rounded-lg text-xs bg-background border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div>
              <label htmlFor="patient-age" className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">
                Age
              </label>
              <input
                id="patient-age"
                type="number"
                value={form.age}
                onChange={setField('age')}
                placeholder="68"
                min="0"
                max="120"
                className="w-full px-3 py-2 rounded-lg text-xs bg-background border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div>
              <label htmlFor="patient-education" className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">
                Education (Years)
              </label>
              <input
                id="patient-education"
                type="number"
                value={form.education_years}
                onChange={setField('education_years')}
                placeholder="16"
                className="w-full px-3 py-2 rounded-lg text-xs bg-background border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">Biological Sex</label>
            <div className="flex gap-2" role="group" aria-label="Biological sex selection">
              {['M', 'F', 'Other'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, sex: s }))}
                  aria-pressed={form.sex === s}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    form.sex === s
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                      : 'bg-background border-border text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {s === 'M' ? 'Male' : s === 'F' ? 'Female' : 'Other'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="patient-notes" className="block text-xs font-semibold text-foreground mb-1 uppercase tracking-wider">
              Clinical Intake Notes
            </label>
            <textarea
              id="patient-notes"
              value={form.notes}
              onChange={setField('notes')}
              rows={3}
              placeholder="Primary clinical observations, comorbidities, or referral notes..."
              className="w-full px-3 py-2 rounded-lg text-xs bg-background border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1" loading={saving} onClick={handleAddPatient}>Register Patient</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
