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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={STAGE_BADGE_VARIANT[stage] ?? 'neutral'}>{stage}</Badge>
        </div>
        <span className="text-[11px] font-semibold text-foreground-muted">
          {count} <span className="font-normal text-foreground-subtle">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-surface-secondary border border-border" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${stage}: ${pct}%`}>
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── System status item ────────────────────────────────────────────────────
function SystemStatusItem({ label, status, healthy }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-md bg-surface-secondary border border-border">
      <span className="text-xs font-medium text-foreground-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        <div
          className={`w-1.5 h-1.5 rounded-full ${healthy ? 'bg-emerald-500' : 'bg-amber-400'}`}
          aria-hidden="true"
        />
        <span className={`text-[11px] font-semibold ${healthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
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
  const [activeTab, setActiveTab] = useState('summary') // 'summary' | 'doctors'

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
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Activity size={17} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Admin Workstation</h1>
            <p className="text-xs text-slate-500 mt-0.5 animate-fade-in">
              {user?.full_name || user?.username}
              {lastUpdated && (
                <span className="ml-2 text-slate-400">
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
            className="p-1.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:hover:text-slate-350 transition-colors"
          >
            <RefreshCw size={14} aria-hidden="true" />
          </button>
          <button
            onClick={() => navigate('/admin/panel')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-750 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Shield size={13} aria-hidden="true" /> Admin Panel <ArrowRight size={12} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users}    iconVariant="blue"    label="Registered Users"   value={stats.total_users   || 0} />
        <StatCard icon={UserCog}  iconVariant="cyan"    label="Active Clinicians"  value={stats.total_doctors || 0} />
        <StatCard icon={Brain}    iconVariant="emerald" label="Patient Roster"     value={stats.total_patients || 0} />
        <StatCard icon={FileText} iconVariant="amber"   label="Executed Analyses"  value={totalAnalyses} />
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 my-4" role="tablist" aria-label="Workstation Tabs">
        <button
          onClick={() => setActiveTab('summary')}
          role="tab"
          aria-selected={activeTab === 'summary'}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'summary'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          }`}
        >
          System Overview
        </button>
        <button
          onClick={() => setActiveTab('doctors')}
          role="tab"
          aria-selected={activeTab === 'doctors'}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'doctors'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
          }`}
        >
          Clinician Roster & Assignments
          {doctors.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-medium border border-slate-250 dark:border-slate-700 text-slate-600 dark:text-slate-400">
              {doctors.length}
            </span>
          )}
        </button>
      </div>

      {/* Content panel */}
      {activeTab === 'summary' ? (
        <div className="grid lg:grid-cols-3 gap-4 animate-fade-in">
          {/* Stage Distribution */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-amber-500" aria-hidden="true" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Patient Stage Distribution</h2>
            </div>
            {Object.keys(stageDist).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No analysis telemetry recorded yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stageDist).map(([stage, count]) => (
                  <StageBar key={stage} stage={stage} count={count} total={totalAnalyses} />
                ))}
              </div>
            )}
          </div>

          {/* System Telemetry */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={15} className="text-emerald-500" aria-hidden="true" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">System Telemetry</h2>
            </div>
            <div className="space-y-2">
              {systemStatus.length > 0 ? (
                systemStatus.map(({ label, status, healthy }) => (
                  <SystemStatusItem key={label} label={label} status={status} healthy={healthy} />
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4" role="status">Unable to fetch service telemetry</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Doctor / Clinician List Tab */
        <div className="space-y-4 animate-fade-in">
          {/* Search bar row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" size={14} />
              <input
                type="text"
                placeholder="Search clinicians by name, department, or hospital..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs font-semibold text-indigo-650 dark:text-indigo-400 hover:text-indigo-805 px-2.5 py-1 rounded bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-150/40 dark:border-indigo-900/50"
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
                className={`p-4 rounded-xl bg-white dark:bg-slate-900 border transition-all duration-200 text-left cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                  selectedDoctor?.id === doc.id
                    ? 'border-indigo-500 ring-1 ring-indigo-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                      {doc.full_name?.split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase() || doc.username[0].toUpperCase()}
                    </div>
                    <div className="truncate">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-105 leading-tight truncate">
                        Dr. {doc.full_name || doc.username}
                      </h3>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5 truncate">{doc.email}</span>
                    </div>
                  </div>
                  <Badge variant="blue" className="text-[9px] px-1.5 py-0">
                    {doc.role === 'clinician' ? 'Clinician' : 'Doctor'}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Building className="text-slate-400 shrink-0" size={12} />
                    <span className="truncate">{doc.institution || 'Unknown Institution'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="text-slate-400 shrink-0" size={12} />
                    <span className="truncate">{doc.department || 'General Neurology'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="text-slate-400 shrink-0" size={12} />
                    <span className="font-semibold text-slate-755 dark:text-slate-350">
                      {doc.patient_count ?? 0} Managed {doc.patient_count === 1 ? 'Patient' : 'Patients'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-1.5 px-3 rounded-lg text-[10px] font-bold bg-slate-50 dark:bg-slate-850 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-650 dark:text-slate-350 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-800 transition-colors flex items-center justify-between"
                >
                  <span>View Managed Patients</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            ))}

            {filteredDoctors.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg">
                No clinicians match your search criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Doctor Roster Details Drawer Overlay */}
      {selectedDoctor && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSelectedDoctor(null)}
        >
          <div 
            className="w-full max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col p-6 shadow-2xl animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800 mb-5 shrink-0">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg shrink-0">
                  {selectedDoctor.full_name?.split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase() || selectedDoctor.username[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Patient Assignment Roster
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Dr. {selectedDoctor.full_name || selectedDoctor.username} · {selectedDoctor.department}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {selectedDoctor.institution} (ID: {selectedDoctor.id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="p-1 px-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close panel"
              >
                <X size={15} />
              </button>
            </div>

            {/* List and search details */}
            <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
              {loadingPatients ? (
                <div className="space-y-3 py-6">
                  {Array(3).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-850 h-16 rounded-lg border border-slate-200 dark:border-slate-800" />
                  ))}
                </div>
              ) : doctorPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500">
                  <Users size={32} className="text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">No assigned patients found</p>
                  <p className="text-[10px] text-slate-450 mt-1 max-w-[240px]">
                    This clinician has not registered or been assigned any patient profiles yet.
                  </p>
                </div>
              ) : (
                doctorPatients.map(pat => (
                  <div
                    key={pat.patient_id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-slate-350 dark:hover:border-slate-700 transition-all flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-2.5">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-105">
                          {pat.name}
                        </h4>
                        <p className="text-[10px] text-slate-450 mt-0.5">
                          ID: {pat.patient_id} · Registered {new Date(pat.created_at || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDoctor(null)
                          navigate(`/history/${pat.patient_id}`)
                        }}
                        className="p-1.5 rounded-lg border border-slate-150 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-450 hover:text-indigo-650 dark:hover:text-indigo-400 transition-all flex items-center justify-center"
                        title="View longitudinal clinical workspace"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 border-t border-slate-100 dark:border-slate-850 pt-2.5 text-[10px] text-slate-500">
                      <div>
                        <span className="block text-slate-400 text-[9px] uppercase tracking-wider font-semibold">Demographics</span>
                        <span className="font-semibold text-slate-705 dark:text-slate-350 mt-0.5 block">{pat.age} yrs · {pat.sex}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[9px] uppercase tracking-wider font-semibold">Education</span>
                        <span className="font-semibold text-slate-705 dark:text-slate-350 mt-0.5 block">{pat.education_years} Years</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[9px] uppercase tracking-wider font-semibold">Care Status</span>
                        <div className="mt-0.5">
                          <Badge variant={
                            pat.latest_stage?.includes('Moderate') || pat.latest_stage?.includes('Severe') || pat.latest_stage?.includes('High')
                              ? 'danger'
                              : pat.latest_stage?.includes('Mild')
                              ? 'warning'
                              : 'success'
                          } className="text-[9px] px-1 py-0 shadow-none leading-none tracking-normal">
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
            <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between text-xs mt-4 shrink-0">
              <span className="font-semibold text-slate-650 dark:text-slate-400">
                Total Patients: {doctorPatients.length}
              </span>
              <button
                onClick={() => {
                  const statePayload = { doctorFilter: selectedDoctor.id }
                  setSelectedDoctor(null)
                  navigate('/admin/panel', { state: statePayload })
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-650 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10 transition-all border border-indigo-500/20"
              >
                Manage Registry <ArrowRight size={11} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
