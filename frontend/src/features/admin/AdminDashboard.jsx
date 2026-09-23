import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Users, UserCog, Brain, FileText, TrendingUp, Activity, Shield,
  ArrowRight, RefreshCw, Search, Stethoscope, Building, ChevronRight, X, ExternalLink
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../auth/AuthProvider'
import { SectionSkeleton } from '../../components/ui/Skeleton'
import { adminApi } from '../../services'

// ── Stage → design token mapping ─────────────────────────────────────────
const STAGE_BADGE_VARIANT = {
  'Non-Demented':       'success',
  'Non Demented':       'success',
  'Very Mild Demented': 'purple',
  'Mild Demented':      'warning',
  'Moderate Demented':  'danger',
  'Normal':             'success',
  'Very Mild':          'purple',
  'Mild':               'warning',
  'Moderate':           'danger',
  'Severe':             'danger',
}

// Progress bar color per severity
const STAGE_BAR_COLOR = {
  'Non-Demented':       'bg-emerald-500',
  'Non Demented':       'bg-emerald-500',
  'Very Mild Demented': 'bg-violet-500',
  'Mild Demented':      'bg-amber-500',
  'Moderate Demented':  'bg-red-500',
  'Normal':             'bg-emerald-500',
  'Very Mild':          'bg-violet-500',
  'Mild':               'bg-amber-500',
  'Moderate':           'bg-orange-500',
  'Severe':             'bg-red-500',
}

// ── Stage distribution bar ────────────────────────────────────────────────
function StageBar({ stage, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const barColor = STAGE_BAR_COLOR[stage] ?? 'bg-primary'
  return (
    <div className="space-y-1.5 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={STAGE_BADGE_VARIANT[stage] ?? 'neutral'}>{stage}</Badge>
        </div>
        <span className="text-xs font-semibold text-foreground-muted">
          {count} <span className="font-normal text-foreground-subtle">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden bg-surface-secondary border border-border" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${stage}: ${pct}%`}>
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── System status item ────────────────────────────────────────────────────
function SystemStatusItem({ label, status, healthy }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-surface-secondary border border-border font-sans">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${healthy ? 'bg-emerald-500' : 'bg-amber-400'}`}
          aria-hidden="true"
        />
        <span className={`text-xs font-bold ${healthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {status}
        </span>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  // Dashboard & Loading States
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [systemStatus, setSystemStatus] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  
  // Clinicians States
  const [doctors, setDoctors] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [doctorPatients, setDoctorPatients] = useState([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [activeTab, setActiveTab] = useState('doctors') // Default: 'doctors' | 'summary'

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [dashData, healthData, doctorsData] = await Promise.all([
        adminApi.getDashboard(),
        adminApi.getHealth().catch(() => null),
        adminApi.getDoctors().catch(() => ({ doctors: [] })),
      ])
      setStats(dashData)
      setDoctors(doctorsData.doctors || [])

      const services = []
      if (healthData) {
        services.push({
          label: 'API Gateway',
          status: healthData.status === 'healthy' ? 'Operational' : 'Degraded',
          healthy: healthData.status === 'healthy',
        })
        services.push({ label: 'Database Cluster', status: 'Connected', healthy: true })
        if (healthData.models) {
          Object.entries(healthData.models).forEach(([name, info]) => {
            services.push({ label: name, status: info.loaded ? 'Loaded' : 'Offline', healthy: info.loaded })
          })
        }
      }
      setSystemStatus(services)
      setLastUpdated(new Date())
    } catch (err) {
      toast.error('Failed to load dashboard data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Filter doctors list based on search term
  const filteredDoctors = useMemo(() => {
    if (!searchTerm.trim()) return doctors
    const term = searchTerm.toLowerCase()
    return doctors.filter(doc => 
      (doc.full_name || '').toLowerCase().includes(term) ||
      (doc.username || '').toLowerCase().includes(term) ||
      (doc.department || '').toLowerCase().includes(term) ||
      (doc.institution || '').toLowerCase().includes(term)
    )
  }, [doctors, searchTerm])

  // Handle drill-down: fetch assignment details
  const handleSelectDoctor = async (doctor) => {
    setSelectedDoctor(doctor)
    setLoadingPatients(true)
    try {
      const data = await adminApi.getDoctorPatients(doctor.id)
      setDoctorPatients(data.patients || [])
    } catch (err) {
      console.error('Failed to load doctor patients:', err)
      toast.error('Failed to retrieve patient assignments')
    } finally {
      setLoadingPatients(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-5">
        <SectionSkeleton rows={4} />
      </div>
    )
  }

  const totalAnalyses = stats.total_analyses || 0
  const stageDist     = stats.stage_distribution || {}

  return (
    <div className="max-w-6xl mx-auto space-y-5 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-subtle border border-primary/20 text-primary flex items-center justify-center font-bold">
            <Activity size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">Admin Workstation</h1>
            <p className="text-xs font-medium text-foreground-muted mt-0.5 animate-fade-in">
              {user?.full_name || user?.username}
              {lastUpdated && (
                <span className="ml-2 text-foreground-subtle">
                  · Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            aria-label="Refresh dashboard data"
            className="p-2 rounded-xl bg-surface border border-border text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
          <button
            onClick={() => navigate('/admin/panel')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface border border-border text-foreground hover:bg-surface-hover transition-colors min-h-[40px]"
          >
            <Shield size={14} aria-hidden="true" /> Admin Panel <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}    iconVariant="blue"    label="Registered Users"   value={stats.total_users   || 0} />
        <StatCard icon={UserCog}  iconVariant="cyan"    label="Active Clinicians"  value={stats.total_doctors || 0} />
        <StatCard icon={Brain}    iconVariant="emerald" label="Patient Roster"     value={stats.total_patients || 0} />
        <StatCard icon={FileText} iconVariant="amber"   label="Executed Analyses"  value={totalAnalyses} />
      </div>

      {/* Tab Switcher: Clinician Roster & Assignments FIRST */}
      <div className="flex border-b border-border my-4" role="tablist" aria-label="Workstation Tabs">
        <button
          onClick={() => setActiveTab('doctors')}
          role="tab"
          aria-selected={activeTab === 'doctors'}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === 'doctors'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          }`}
        >
          Clinician Roster & Assignments
          {doctors.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-surface-secondary text-xs font-mono font-bold border border-border text-foreground-muted">
              {doctors.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          role="tab"
          aria-selected={activeTab === 'summary'}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'summary'
              ? 'border-primary text-primary'
              : 'border-transparent text-foreground-muted hover:text-foreground'
          }`}
        >
          System Overview
        </button>
      </div>

      {/* Content panel */}
      {activeTab === 'summary' ? (
        <div className="grid lg:grid-cols-3 gap-5 animate-fade-in">
          {/* Stage Distribution */}
          <div className="bg-surface border border-border rounded-2xl p-5 lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <TrendingUp size={18} className="text-amber-500" aria-hidden="true" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Patient Stage Distribution</h2>
            </div>
            {Object.keys(stageDist).length === 0 ? (
              <p className="text-xs text-foreground-subtle text-center py-8">No analysis telemetry recorded yet</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(stageDist).map(([stage, count]) => (
                  <StageBar key={stage} stage={stage} count={count} total={totalAnalyses} />
                ))}
              </div>
            )}
          </div>

          {/* System Telemetry */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Activity size={18} className="text-emerald-500" aria-hidden="true" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">System Telemetry</h2>
            </div>
            <div className="space-y-2.5">
              {systemStatus.length > 0 ? (
                systemStatus.map(({ label, status, healthy }) => (
                  <SystemStatusItem key={label} label={label} status={status} healthy={healthy} />
                ))
              ) : (
                <p className="text-xs text-foreground-subtle text-center py-4" role="status">Unable to fetch service telemetry</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Doctor / Clinician List Tab */
        <div className="space-y-4 animate-fade-in">
          {/* Search bar row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface border border-border rounded-2xl p-3.5">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-subtle shrink-0" size={16} />
              <input
                type="text"
                placeholder="Search clinicians by name, department, or hospital..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-surface-secondary border border-border focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-foreground transition-all placeholder:text-foreground-subtle font-medium"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs font-semibold text-primary hover:text-primary-hover px-3 py-1.5 rounded-lg bg-primary-subtle border border-primary/20"
              >
                Clear Search
              </button>
            )}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDoctors.map(doc => (
              <div
                key={doc.id}
                onClick={() => handleSelectDoctor(doc)}
                className={`p-4 rounded-2xl bg-surface border transition-all duration-200 text-left cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                  selectedDoctor?.id === doc.id
                    ? 'border-primary ring-1 ring-primary/20'
                    : 'border-border hover:border-indigo-500/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-subtle border border-primary/20 flex items-center justify-center text-primary font-bold text-base">
                      {doc.full_name?.split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase() || doc.username[0].toUpperCase()}
                    </div>
                    <div className="truncate">
                      <h3 className="text-sm font-bold text-foreground leading-tight truncate">
                        Dr. {doc.full_name || doc.username}
                      </h3>
                      <span className="text-xs text-foreground-subtle font-mono block mt-0.5 truncate">{doc.email}</span>
                    </div>
                  </div>
                  <Badge variant="blue" className="text-xs px-2 py-0.5">
                    {doc.role === 'clinician' ? 'Clinician' : 'Doctor'}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs text-foreground-muted border-t border-border pt-3 mb-4 font-medium">
                  <div className="flex items-center gap-2">
                    <Building className="text-foreground-subtle shrink-0" size={14} />
                    <span className="truncate">{doc.institution || 'Unknown Institution'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="text-foreground-subtle shrink-0" size={14} />
                    <span className="truncate">{doc.department || 'General Neurology'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="text-foreground-subtle shrink-0" size={14} />
                    <span className="font-bold text-foreground">
                      {doc.patient_count ?? 0} Managed {doc.patient_count === 1 ? 'Patient' : 'Patients'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-surface-secondary hover:bg-primary-subtle text-foreground-muted hover:text-primary border border-border transition-colors flex items-center justify-between"
                >
                  <span>View Managed Patients</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            ))}

            {filteredDoctors.length === 0 && (
              <div className="col-span-full py-12 text-center text-foreground-muted bg-surface border border-border rounded-2xl text-sm font-medium">
                No clinicians match your search criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Doctor Roster Details Drawer Overlay */}
      {selectedDoctor && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm transition-opacity duration-300 font-sans"
          onClick={() => setSelectedDoctor(null)}
        >
          <div 
            className="w-full max-w-xl h-full bg-surface border-l border-border flex flex-col p-6 shadow-2xl animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border mb-5 shrink-0">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-subtle border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                  {selectedDoctor.full_name?.split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase() || selectedDoctor.username[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-foreground">
                    Patient Assignment Roster
                  </h2>
                  <p className="text-sm text-foreground-muted font-semibold mt-0.5">
                    Dr. {selectedDoctor.full_name || selectedDoctor.username} · {selectedDoctor.department}
                  </p>
                  <p className="text-xs text-foreground-subtle mt-0.5">
                    {selectedDoctor.institution} (ID: {selectedDoctor.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="p-2 rounded-xl border border-border text-foreground-muted hover:text-foreground bg-surface-secondary hover:bg-surface-hover transition-colors"
                aria-label="Close panel"
              >
                <X size={16} />
              </button>
            </div>

            {/* List and search details */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
              {loadingPatients ? (
                <div className="space-y-3 py-6">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse bg-surface-secondary h-16 rounded-xl border border-border" />
                  ))}
                </div>
              ) : doctorPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-foreground-muted">
                  <Users size={32} className="text-foreground-subtle mb-2" />
                  <p className="text-sm font-semibold">No assigned patients found</p>
                  <p className="text-xs text-foreground-subtle mt-1 max-w-[240px]">
                    This clinician has not registered or been assigned any patient profiles yet.
                  </p>
                </div>
              ) : (
                doctorPatients.map(pat => (
                  <div
                    key={pat.patient_id}
                    className="p-4 rounded-2xl border border-border bg-surface shadow-xs hover:border-indigo-500/40 transition-all flex flex-col space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          {pat.name}
                        </h4>
                        <p className="text-xs text-foreground-subtle mt-0.5">
                          ID: {pat.patient_id} · Registered {new Date(pat.created_at || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDoctor(null)
                          navigate(`/history/${pat.patient_id}`)
                        }}
                        className="p-2 rounded-lg border border-border hover:bg-surface-hover text-foreground-muted hover:text-primary transition-all flex items-center justify-center"
                        title="View longitudinal clinical workspace"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 border-t border-border pt-2.5 text-xs text-foreground-muted">
                      <div>
                        <span className="block text-foreground-subtle text-xs uppercase tracking-wider font-bold">Demographics</span>
                        <span className="font-bold text-foreground mt-0.5 block">{pat.age} yrs · {pat.sex}</span>
                      </div>
                      <div>
                        <span className="block text-foreground-subtle text-xs uppercase tracking-wider font-bold">Education</span>
                        <span className="font-bold text-foreground mt-0.5 block">{pat.education_years} Years</span>
                      </div>
                      <div>
                        <span className="block text-foreground-subtle text-xs uppercase tracking-wider font-bold">Care Status</span>
                        <div className="mt-0.5">
                          <Badge variant={
                            pat.latest_stage?.includes('Moderate') || pat.latest_stage?.includes('Severe') || pat.latest_stage?.includes('High')
                              ? 'danger'
                              : pat.latest_stage?.includes('Mild')
                              ? 'warning'
                              : 'success'
                          }>
                            {pat.latest_stage || 'Normal'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary / Navigation Actions */}
            <div className="pt-4 border-t border-border flex items-center justify-between text-sm mt-4 shrink-0">
              <span className="font-bold text-foreground-muted">
                Total Patients: {doctorPatients.length}
              </span>
              <button
                onClick={() => {
                  const statePayload = { doctorFilter: selectedDoctor.id }
                  setSelectedDoctor(null)
                  navigate('/admin/panel', { state: statePayload })
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs transition-all border border-primary/20 min-h-[38px]"
              >
                Manage Registry <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
