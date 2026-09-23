import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { UserCog, Users, Trash2, Shield, AlertTriangle, FileText, Activity, Eye, Download, LayoutGrid, List, Clock, ChevronDown } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import Tabs from '../../components/ui/Tabs'
import Badge from '../../components/ui/Badge'
import DataTable from '../../components/ui/DataTable'
import { SectionSkeleton } from '../../components/ui/Skeleton'
import Card from '../../components/ui/Card'
import { adminApi, patientsApi } from '../../services'

export default function AdminPanel() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading]       = useState(true)
  const [doctors, setDoctors]       = useState([])
  const [patients, setPatients]     = useState([])
  const [analyses, setAnalyses]     = useState([])
  const [auditLogs, setAuditLogs]   = useState([])
  const [health, setHealth]         = useState(null)
  const [activeTab, setActiveTab]   = useState('doctors')
  const [selectedDoctorId, setSelectedDoctorId] = useState(null)
  const [selectedDoctorName, setSelectedDoctorName] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [gridDownloadOpen, setGridDownloadOpen] = useState(false)
  const gridDownloadRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (gridDownloadRef.current && !gridDownloadRef.current.contains(event.target)) {
        setGridDownloadOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (location.state?.doctorFilter) {
      const docId = Number(location.state.doctorFilter)
      setSelectedDoctorId(docId)
      const cachedDoc = doctors.find(d => d.id === docId)
      if (cachedDoc) {
        setSelectedDoctorName(cachedDoc.full_name || cachedDoc.username)
      } else {
        setSelectedDoctorName(`Clinician #${docId}`)
      }
      setActiveTab('patients')
    }
  }, [location.state, doctors])



  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [doctorsData, patientsData] = await Promise.all([
        adminApi.getDoctors(),
        adminApi.getPatients(),
      ])
      setDoctors(doctorsData.doctors   || [])
      setPatients(patientsData.patients || [])
      const [analysesData, auditData, healthData] = await Promise.all([
        adminApi.getSessions().catch(() => ({ sessions: [] })),
        adminApi.getAuditLog().catch(() => ({ logs: [] })),
        adminApi.getHealth().catch(() => null),
      ])
      setAnalyses(analysesData.sessions || [])
      setAuditLogs(auditData.logs || [])
      setHealth(healthData)
    } catch (err) {
      toast.error('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleDeleteDoctor = useCallback(async (id) => {
    if (!confirm('Delete this doctor and all their data?')) return
    try {
      await adminApi.deleteDoctor(id)
      toast.success('Doctor deleted')
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }, [loadData])

  const handleDeletePatient = useCallback(async (id) => {
    if (!confirm('Delete this patient and all their records?')) return
    try {
      await adminApi.deletePatient(id)
      toast.success('Patient deleted')
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }, [loadData])

  const handleDeleteSession = useCallback(async (id) => {
    if (!confirm('Delete this analysis session? This cannot be undone.')) return
    try {
      await adminApi.deleteSession(id)
      toast.success('Session deleted')
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }, [loadData])

  const filteredPatients = useMemo(() => {
    if (!selectedDoctorId) return patients
    return patients.filter(p => p.created_by === selectedDoctorId)
  }, [patients, selectedDoctorId])

  const patientExtraExportOptions = useMemo(() => (
    <button
      type="button"
      onClick={() => patientsApi.exportReports ? patientsApi.exportReports() : window.open('/api/patients/export/reports', '_blank')}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-foreground hover:bg-hover rounded-lg transition-colors font-medium text-left"
    >
      <FileText size={14} className="text-amber-500 shrink-0" />
      <span>Download All Reports (.zip)</span>
    </button>
  ), [])

  const TABS = [
    { id: 'doctors',   label: `Doctors (${doctors.length})`,   icon: UserCog },
    { id: 'patients',  label: `Patients (${filteredPatients.length})`, icon: Users },
    { id: 'analyses',  label: `Analyses (${analyses.length})`, icon: FileText },
    { id: 'audit',     label: `Audit Trail (${auditLogs.length})`, icon: Shield },
  ]

  const doctorColumns = useMemo(() => [
    {
      id: 'id',
      label: 'ID',
      accessor: 'id',
      sortable: true,
      width: 100,
      render: (val) => <span className="font-mono text-xs text-foreground-subtle">{val}</span>
    },
    {
      id: 'avatar',
      label: 'Avatar',
      sortable: false,
      width: 60,
      render: (_, row) => (
        <div
          className="w-7 h-7 rounded bg-surface-secondary border border-border text-foreground-muted flex items-center justify-center text-xs font-semibold shrink-0"
          aria-hidden="true"
        >
          {(row.full_name || row.username || '?')[0].toUpperCase()}
        </div>
      )
    },
    {
      id: 'full_name',
      label: 'Full Name',
      accessor: 'full_name',
      sortable: true,
      width: 180,
      render: (val, row) => (
        <span className="font-semibold text-foreground text-xs">
          {val || row.username}
        </span>
      )
    },
    {
      id: 'email',
      label: 'Email Address',
      accessor: 'email',
      sortable: true,
      width: 220
    },
    {
      id: 'role',
      label: 'Access Role',
      accessor: 'role',
      sortable: true,
      width: 120,
      render: (val) => (
        <Badge variant={val === 'Doctor' ? 'info' : 'neutral'}>
          {val || 'Clinician'}
        </Badge>
      )
    },
    {
      id: 'patient_count',
      label: 'Managed Patients',
      accessor: 'patient_count',
      sortable: true,
      width: 140,
      render: (val) => (
        <span className="font-semibold text-foreground-muted text-xs">
          {val ?? 0} patients
        </span>
      )
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      width: 110,
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => {
              setSelectedDoctorId(row.id)
              setSelectedDoctorName(row.full_name || row.username)
              setActiveTab('patients')
            }}
            title="View patients managed by this doctor"
            className="p-1.5 rounded-md text-primary bg-primary-subtle border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            <Users size={13} aria-hidden="true" />
          </button>
          <button
            onClick={() => handleDeleteDoctor(row.id)}
            aria-label={`Delete ${row.full_name || row.username}`}
            className="p-1.5 rounded-md text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        </div>
      )
    }
  ], [handleDeleteDoctor, setSelectedDoctorId, setSelectedDoctorName, setActiveTab])

  const patientColumns = useMemo(() => [
    {
      id: 'patient_id',
      label: 'Patient ID',
      accessor: 'patient_id',
      sortable: true,
      width: 120,
      render: (val) => <span className="font-mono text-xs text-primary font-semibold">{val}</span>
    },
    {
      id: 'name',
      label: 'Name',
      accessor: 'name',
      sortable: true,
      width: 180,
      render: (val) => (
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded bg-surface-secondary border border-border text-foreground-muted flex items-center justify-center text-xs font-bold shrink-0"
            aria-hidden="true"
          >
            {(val || '?')[0].toUpperCase()}
          </div>
          <span className="font-semibold text-foreground text-xs">{val}</span>
        </div>
      )
    },
    {
      id: 'age',
      label: 'Age',
      accessor: 'age',
      sortable: true,
      width: 80,
      render: (val) => val ? `${val} yrs` : '—'
    },
    {
      id: 'sex',
      label: 'Sex',
      accessor: 'sex',
      sortable: true,
      width: 80,
      render: (val) => val || '—'
    },
    {
      id: 'doctor',
      label: 'Doctor',
      accessor: 'doctor_username',
      sortable: true,
      width: 140,
      render: (val, row) => (
        <span className="text-xs text-foreground-muted">
          {val ? `Dr. ${val}` : row.created_by ? `ID ${row.created_by}` : '—'}
        </span>
      )
    },
    {
      id: 'updated_at',
      label: 'Last Updated',
      accessor: 'updated_at',
      sortable: true,
      width: 130,
      render: (val, row) => {
        const d = val || row.created_at
        return d ? (
          <span className="flex items-center gap-1 text-xs text-foreground-subtle">
            <Clock size={10} className="shrink-0" />
            {new Date(d).toLocaleDateString()}
          </span>
        ) : '—'
      }
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      width: 120,
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/history/${row.patient_id}`)}
            title="View Patient History"
            className="p-1.5 rounded-md bg-surface-secondary border border-border text-foreground-muted hover:text-primary hover:border-primary/40 transition-colors"
          >
            <Eye size={13} aria-hidden="true" />
          </button>
          <button
            onClick={() => patientsApi.export(row.patient_id)}
            title="Export CSV"
            className="p-1.5 rounded-md bg-surface-secondary border border-border text-foreground-muted hover:text-emerald-500 hover:border-emerald-500/40 transition-colors"
          >
            <Download size={13} aria-hidden="true" />
          </button>
          <button
            onClick={() => handleDeletePatient(row.patient_id)}
            aria-label={`Delete ${row.name}`}
            className="p-1.5 rounded-md text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        </div>
      )
    }
  ], [handleDeletePatient, navigate])

  const analysisColumns = useMemo(() => [
    {
      id: 'session_id',
      label: 'Session ID',
      sortable: true,
      width: 80,
      render: (_, row) => <span className="font-mono text-xs text-foreground-subtle">#{row.id || row.session_id}</span>
    },
    {
      id: 'patient_name',
      label: 'Patient',
      sortable: true,
      width: 160,
      render: (_, row) => (
        <span className="font-semibold text-foreground text-xs">
          {row.patient_name || row.patient_info?.name || 'Unknown'}
        </span>
      )
    },
    {
      id: 'patient_id',
      label: 'Patient ID',
      sortable: true,
      width: 110,
      render: (_, row) => {
        const pid = row.patient_id || row.patient_info?.patient_id || 'N/A'
        return <span className="font-mono text-xs text-primary font-semibold">{pid}</span>
      }
    },
    {
      id: 'stage',
      label: 'Stage',
      sortable: true,
      width: 130,
      render: (_, row) => {
        const stage = row.stage || row.final_stage || row.mri_stage || 'Unknown'
        let variant = 'neutral'
        if (stage === 'Normal' || stage.toLowerCase().includes('non')) variant = 'success'
        else if (stage === 'Mild' && !stage.toLowerCase().includes('moderate')) variant = 'warning'
        else if (stage.toLowerCase().includes('moderate') || stage.toLowerCase().includes('severe')) variant = 'danger'
        return <Badge variant={variant}>{stage}</Badge>
      }
    },
    {
      id: 'confidence',
      label: 'Confidence',
      sortable: true,
      width: 110,
      render: (_, row) => {
        const conf = Number(row.confidence || row.final_confidence || row.mri_confidence || 0)
        return <span className="font-semibold text-xs text-foreground-muted">{conf.toFixed(1)}%</span>
      }
    },
    {
      id: 'created_at',
      label: 'Date',
      accessor: 'created_at',
      sortable: true,
      width: 110,
      render: (val, row) => {
        const d = val || row.timestamp
        return d ? (
          <span className="flex items-center gap-1 text-xs text-foreground-subtle">
            <Clock size={10} className="shrink-0" />
            {new Date(d).toLocaleDateString()}
          </span>
        ) : '—'
      }
    },
    {
      id: 'actions',
      label: 'Actions',
      sortable: false,
      width: 90,
      render: (_, row) => (
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/history/${row.patient_id || row.patient_info?.patient_id}`)}
            title="View Patient History"
            className="p-1.5 rounded-md bg-surface-secondary border border-border text-foreground-muted hover:text-primary transition-colors"
          >
            <Eye size={13} aria-hidden="true" />
          </button>
          <button
            onClick={() => handleDeleteSession(row.id || row.session_id)}
            title="Delete Session"
            className="p-1.5 rounded-md text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
          >
            <Trash2 size={13} aria-hidden="true" />
          </button>
        </div>
      )
    }
  ], [handleDeleteSession, navigate])

  const auditColumns = useMemo(() => [
    {
      id: 'timestamp',
      label: 'Timestamp',
      accessor: 'timestamp',
      sortable: true,
      width: 140,
      render: (val) => val ? (
        <span className="flex items-center gap-1 text-xs text-foreground-subtle font-mono">
          <Clock size={10} className="shrink-0" />
          {new Date(val).toLocaleString()}
        </span>
      ) : '—'
    },
    {
      id: 'actor',
      label: 'Admin Actor',
      sortable: true,
      width: 130,
      render: (_, row) => (
        <span className="font-bold text-xs text-foreground">
          {row.actor_username || `ID ${row.actor_id}` || 'System'}
        </span>
      )
    },
    {
      id: 'action',
      label: 'Action',
      accessor: 'action',
      sortable: true,
      width: 130,
      render: (val) => <Badge variant="danger">{val}</Badge>
    },
    {
      id: 'resource',
      label: 'Target Resource',
      sortable: true,
      width: 200,
      render: (_, row) => (
        <div className="text-xs">
          <span className="font-semibold text-foreground">{row.resource_name || row.resource_id}</span>
          <span className="text-[10px] text-foreground-subtle font-mono block">Type: {row.resource_type} · ID: {row.resource_id}</span>
        </div>
      )
    }
  ], [])

  if (loading) {
    return <div className="max-w-6xl mx-auto"><SectionSkeleton rows={4} /></div>
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
          <Shield size={20} aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Admin Panel & Access Governance</h1>
          <p className="text-xs font-medium text-foreground-muted mt-0.5">Manage clinician accounts, patient rosters & audit logs</p>
        </div>
      </div>

      {/* System health bar */}
      {health && (
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-medium ${
          health.status === 'healthy'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-50  dark:bg-amber-950/20  border-amber-200  dark:border-amber-800/50  text-amber-700  dark:text-amber-400'
        }`}>
          <Activity size={15} aria-hidden="true" />
          <span>
            System: <strong>{health.status}</strong>
            {' '}· MRI Model: {health.models?.['MRI Classification Model']?.loaded ? 'Loaded' : 'Offline'}
            {' '}· Database: {health.services?.database || 'Connected'}
          </span>
        </div>
      )}

      {/* Tab Navigation header with Layout switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} variant="segment" />
        
        {(activeTab === 'doctors' || activeTab === 'patients') && (
          <div className="flex items-center self-end sm:self-auto gap-1 p-1 rounded-xl bg-surface-secondary border border-border">
            <button
              onClick={() => setViewMode('grid')}
              type="button"
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-surface text-primary font-bold shadow-xs'
                  : 'text-foreground-subtle hover:text-foreground'
              }`}
              title="Grid Cards View"
              aria-label="Switch to Grid Cards View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              type="button"
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-surface text-primary font-bold shadow-xs'
                  : 'text-foreground-subtle hover:text-foreground'
              }`}
              title="Compact List View"
              aria-label="Switch to Compact List View"
            >
              <List size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Content panel */}
      <div className="mt-2">
        {activeTab === 'doctors' && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {doctors.map(doc => {
                const initials = (doc.full_name || doc.username || '?')[0].toUpperCase();
                return (
                  <Card
                    key={doc.id}
                    className="relative group flex flex-col justify-between p-5 transition-all duration-200 rounded-2xl"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-indigo-600 rounded-t-2xl" />
                    
                    <div>
                      <div className="flex items-start justify-between gap-3 mt-1.5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-surface-secondary border border-border text-foreground flex items-center justify-center text-base font-bold shadow-inner">
                            {initials}
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                              Dr. {doc.full_name || doc.username}
                            </h3>
                            <span className="text-xs text-foreground-subtle font-mono block mt-0.5">{doc.email}</span>
                          </div>
                        </div>
                        <Badge variant={doc.role === 'Doctor' ? 'info' : 'neutral'}>
                          {doc.role || 'Clinician'}
                        </Badge>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-border flex items-center justify-between text-xs font-medium">
                        <span className="text-foreground-subtle">ID: <span className="font-mono text-foreground font-bold">{doc.id}</span></span>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-subtle border border-primary/20 text-primary font-bold text-xs">
                          <Users size={13} />
                          <span>{doc.patient_count ?? 0} Patients</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setSelectedDoctorId(doc.id)
                          setSelectedDoctorName(doc.full_name || doc.username)
                          setActiveTab('patients')
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary-subtle hover:bg-primary/20 border border-primary/20 text-primary transition-colors min-h-[36px]"
                      >
                        <Users size={14} />
                        View Patients
                      </button>
                      <button
                        onClick={() => handleDeleteDoctor(doc.id)}
                        className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-colors"
                        title="Delete Doctor"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          ) : (
            <DataTable
              tableId="admin_doctors"
              columns={doctorColumns}
              data={doctors}
              searchPlaceholder="Search doctors by name, email, or role..."
              selectable={false}
            />
          )
        )}
        {activeTab === 'patients' && (
          <div className="space-y-3">
            {selectedDoctorId && (
              <div className="flex items-center justify-between px-4 py-2.5 bg-primary-subtle border border-primary/20 rounded-xl text-xs text-primary font-medium">
                <span>
                  Filtering patients managed by: <strong className="font-bold text-foreground text-sm">Dr. {selectedDoctorName}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDoctorId(null)
                    setSelectedDoctorName('')
                  }}
                  className="font-bold underline text-primary hover:text-primary-hover transition-colors"
                >
                  Clear Filter
                </button>
              </div>
            )}

            {viewMode === 'grid' ? (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <div className="relative" ref={gridDownloadRef}>
                    <button
                      type="button"
                      onClick={() => setGridDownloadOpen(!gridDownloadOpen)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-surface border border-border text-foreground hover:bg-surface-hover transition-colors shadow-2xs"
                    >
                      <Download size={14} />
                      <span>Download / Export</span>
                      <ChevronDown size={13} className="text-foreground-muted" />
                    </button>
                    {gridDownloadOpen && (
                      <div className="absolute right-0 mt-1.5 w-56 z-30 bg-card border border-border rounded-xl shadow-xl p-1.5 space-y-1 text-xs font-sans">
                        <button
                          type="button"
                          onClick={() => { setGridDownloadOpen(false); patientsApi.export(); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-foreground hover:bg-hover rounded-lg font-medium text-left"
                        >
                          <Download size={14} className="text-emerald-500 shrink-0" />
                          <span>Export CSV Roster (.csv)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setGridDownloadOpen(false); patientsApi.exportReports ? patientsApi.exportReports() : window.open('/api/patients/export/reports', '_blank'); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-foreground hover:bg-hover rounded-lg font-medium text-left"
                        >
                          <FileText size={14} className="text-amber-500 shrink-0" />
                          <span>Download All Reports (.zip)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {filteredPatients.length === 0 ? (
                  <EmptyState icon={Users} msg="No patients found matching filter." />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredPatients.map(pat => {
                      const initials = (pat.name || '?')[0].toUpperCase();
                      let statusVariant = 'neutral';
                      const statusStr = pat.latest_status || pat.status || 'No Diagnosis';
                      if (statusStr.toLowerCase().includes('normal')) statusVariant = 'success';
                      else if (statusStr.toLowerCase().includes('mild')) statusVariant = 'warning';
                      else if (statusStr.toLowerCase().includes('severe') || statusStr.toLowerCase().includes('high')) statusVariant = 'danger';

                      return (
                        <div
                          key={pat.patient_id}
                          onClick={() => navigate(`/history/${pat.patient_id}`)}
                          className="group p-5 rounded-2xl bg-surface border border-border shadow-xs hover:shadow hover:border-indigo-500/40 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-surface-secondary border border-border text-foreground flex items-center justify-center text-sm font-bold shadow-inner">
                                  {initials}
                                </div>
                                <div>
                                  <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors leading-tight">
                                    {pat.name}
                                  </h3>
                                  <span className="text-xs text-foreground-subtle font-mono block mt-0.5 font-semibold">{pat.patient_id}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3.5 flex items-center gap-2">
                              <span className="text-xs uppercase tracking-wider text-foreground-subtle font-bold block">Status:</span>
                              <Badge variant={statusVariant}>{statusStr}</Badge>
                            </div>

                            <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-foreground-subtle text-xs block font-medium">Age / Sex</span>
                                <span className="font-bold text-foreground">{pat.age ? `${pat.age} yrs` : '—'} · {pat.sex || '—'}</span>
                              </div>
                              <div>
                                <span className="text-foreground-subtle text-xs block font-medium">Education</span>
                                <span className="font-bold text-foreground">{pat.education_years ? `${pat.education_years} yrs` : '—'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between" onClick={e => e.stopPropagation()}>
                            <span className="text-xs text-foreground-subtle font-mono font-medium truncate max-w-[130px]">
                              {pat.doctor_username ? `Dr. ${pat.doctor_username}` : `ID: ${pat.created_by ?? '—'}`}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => navigate(`/history/${pat.patient_id}`)}
                                className="p-2 rounded-xl bg-surface-secondary hover:bg-surface-hover border border-border text-foreground-muted hover:text-primary transition-colors"
                                title="View History"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => patientsApi.export(pat.patient_id)}
                                className="p-2 rounded-xl bg-surface-secondary hover:bg-surface-hover border border-border text-foreground-muted hover:text-emerald-500 transition-colors"
                                title="Export Patient Data CSV"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                onClick={() => handleDeletePatient(pat.patient_id)}
                                className="p-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 border border-transparent hover:border-red-200 dark:hover:border-red-900/30 transition-colors"
                                title="Delete Patient"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <DataTable
                tableId="admin_patients"
                columns={patientColumns}
                data={filteredPatients}
                searchPlaceholder="Search patients by name or ID..."
                selectable={false}
                extraExportOptions={patientExtraExportOptions}
              />
            )}
          </div>
        )}
        {activeTab === 'analyses' && (
            <DataTable
            tableId="admin_analyses"
            columns={analysisColumns}
            data={analyses}
            searchPlaceholder="Search analyses by patient name, ID, or stage..."
            selectable={false}
          />
        )}
        {activeTab === 'audit' && (
            <DataTable
            tableId="admin_audit"
            columns={auditColumns}
            data={auditLogs}
            searchPlaceholder="Search audit log by action, actor, or resource..."
            selectable={false}
          />
        )}
      </div>

      {/* Permanent deletion warning */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50">
        <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-red-700 dark:text-red-400 font-medium leading-relaxed">
          Administrative deletions are permanent. All associated clinical records and session histories will be unrecoverable.
        </p>
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, msg }) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-12 text-center">
      <Icon size={28} className="text-foreground-subtle" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground-muted">{msg}</p>
    </div>
  )
}
