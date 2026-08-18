import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Brain, Download, Scale, TrendingUp, TrendingDown, Minus, Info, Users, Activity, FileText
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ProgressBar from '../../components/ui/ProgressBar'
import { SectionSkeleton } from '../../components/ui/Skeleton'
import SpotlightCard from '../../components/ui/SpotlightCard'
import { patientsApi, historyApi } from '../../services'

const STAGE_COLORS = {
  'Normal': '#10B981',
  'Non-Demented': '#10B981',
  'Non Demented': '#10B981',
  'Very Mild Demented': '#7C3AED',
  'Mild Demented': '#F59E0B',
  'Moderate Demented': '#EF4444',
  'Unknown': '#94A3B8',
}

export default function ComparePatients() {
  const navigate = useNavigate()
  const location = useLocation()

  const [allPatients, setAllPatients] = useState([])
  const [patientAId, setPatientAId] = useState('')
  const [patientBId, setPatientBId] = useState('')

  const [dataA, setDataA] = useState(null)
  const [dataB, setDataB] = useState(null)
  const [loading, setLoading] = useState(false)

  // Parse initial IDs from URL search params
  useEffect(() => {
    patientsApi.getAll()
      .then(data => {
        const list = data.patients || []
        setAllPatients(list)

        const params = new URLSearchParams(location.search)
        const ids = params.get('ids')?.split(',') || []
        if (ids[0]) setPatientAId(ids[0])
        else if (list[0]) setPatientAId(list[0].patient_id)

        if (ids[1]) setPatientBId(ids[1])
        else if (list[1]) setPatientBId(list[1].patient_id)
        else if (list[0]) setPatientBId(list[0].patient_id)
      })
      .catch(() => toast.error('Failed to load patient roster'))
  }, [location.search])

  // Fetch profiles and history when IDs change
  useEffect(() => {
    if (!patientAId) return
    setLoading(true)
    historyApi.getPatientHistory(patientAId)
      .then(data => setDataA(data))
      .catch(() => toast.error(`Failed to fetch history for ${patientAId}`))
      .finally(() => {
        if (!patientBId) setLoading(false)
      })
  }, [patientAId])

  useEffect(() => {
    if (!patientBId) return
    setLoading(true)
    historyApi.getPatientHistory(patientBId)
      .then(data => setDataB(data))
      .catch(() => toast.error(`Failed to fetch history for ${patientBId}`))
      .finally(() => setLoading(false))
  }, [patientBId])

  // Retrieve basic info from roster list
  const patientInfoA = useMemo(() => allPatients.find(p => p.patient_id === patientAId), [allPatients, patientAId])
  const patientInfoB = useMemo(() => allPatients.find(p => p.patient_id === patientBId), [allPatients, patientBId])

  // Extract latest session metrics
  const latestSessionA = useMemo(() => dataA?.history?.[0] || null, [dataA])
  const latestSessionB = useMemo(() => dataB?.history?.[0] || null, [dataB])

  const chartData = useMemo(() => {
    if (!latestSessionA && !latestSessionB) return []

    const nameA = patientInfoA?.name || 'Patient A'
    const nameB = patientInfoB?.name || 'Patient B'

    return [
      {
        metric: 'Risk Score',
        [nameA]: latestSessionA?.results?.risk_profile?.overall_risk_score || 0,
        [nameB]: latestSessionB?.results?.risk_profile?.overall_risk_score || 0,
      },
      {
        metric: 'Cognitive Score',
        [nameA]: latestSessionA?.results?.cognitive?.composite_score || 0,
        [nameB]: latestSessionB?.results?.cognitive?.composite_score || 0,
      },
      {
        metric: 'MRI Confidence',
        [nameA]: latestSessionA?.results?.mri?.confidence || 0,
        [nameB]: latestSessionB?.results?.mri?.confidence || 0,
      }
    ]
  }, [latestSessionA, latestSessionB, patientInfoA, patientInfoB])

  const calculateDeviation = (valA, valB, format = 'percent') => {
    if (valA == null || valB == null || isNaN(valA) || isNaN(valB)) return '—'
    const diff = valA - valB
    if (format === 'percent') {
      if (valB === 0) return '—'
      const pct = (diff / valB) * 100
      const sign = pct > 0 ? '+' : ''
      return `${sign}${pct.toFixed(1)}%`
    }
    const sign = diff > 0 ? '+' : ''
    return `${sign}${diff.toFixed(2)}`
  }

  const getStageColor = (stage) => STAGE_COLORS[stage] || STAGE_COLORS['Unknown']

  const handleExportPDF = () => {
    if (!patientAId || !patientBId) {
      toast.error('Two patients must be selected to export report')
      return
    }
    const pdfUrl = `${API_URL}/api/patients/compare/report?ids=${patientAId},${patientBId}`
    window.open(pdfUrl, '_blank')
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 print:p-0 print:space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/patients')}>
            To Registry
          </Button>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <Scale size={16} className="text-blue-500" />
              Patient Comparison Workspace
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Side-by-side analysis of multi-modal biomarkers and clinical telemetry</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>Print View</Button>
          <Button variant="primary" size="sm" icon={Download} onClick={handleExportPDF}>
            Export Comparative PDF
          </Button>
        </div>
      </div>

      {/* Select Dropdowns (Clinician controls) */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3 grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
            Select Patient A (Left Sidebar)
          </label>
          <select
            value={patientAId}
            onChange={(e) => setPatientAId(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 cursor-pointer focus:outline-none"
          >
            {allPatients.map(p => (
              <option key={p.patient_id} value={p.patient_id} disabled={p.patient_id === patientBId}>
                {p.name} ({p.patient_id})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
            Select Patient B (Right Sidebar)
          </label>
          <select
            value={patientBId}
            onChange={(e) => setPatientBId(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 cursor-pointer focus:outline-none"
          >
            {allPatients.map(p => (
              <option key={p.patient_id} value={p.patient_id} disabled={p.patient_id === patientAId}>
                {p.name} ({p.patient_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Comparative View */}
      {loading ? (
        <div className="p-8"><SectionSkeleton rows={8} /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Patient A Card Details */}
          <SpotlightCard className="p-4 space-y-4 print:border-slate-300">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1.5">
                Patient Column A
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {patientInfoA?.name || 'Awaiting Selection'}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{patientAId || 'N/A'}</p>
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Age / Sex</span>
                <span className="font-semibold text-slate-800 dark:text-slate-300">
                  {patientInfoA?.age ? `${patientInfoA.age} yrs` : '—'} / {patientInfoA?.sex || '—'}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Education</span>
                <span className="font-semibold text-slate-800 dark:text-slate-300">
                  {patientInfoA?.education_years ? `${patientInfoA.education_years} yrs` : '—'}
                </span>
              </div>
            </div>

            {/* Diagnostics and Stages */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Modality Evaluation</h3>
              
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Diagnostic Stage</span>
                    <Badge variant={latestSessionA?.results?.final_stage?.stage ? 'warning' : 'neutral'}>
                      {latestSessionA?.results?.final_stage?.stage || latestSessionA?.results?.mri?.stage || 'No diagnostic run'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Overall Confidence</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {latestSessionA ? `${Number(latestSessionA?.results?.final_stage?.confidence || latestSessionA?.results?.mri?.confidence || 0).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <ProgressBar
                    value={latestSessionA?.results?.final_stage?.confidence || latestSessionA?.results?.mri?.confidence || 0}
                    color={getStageColor(latestSessionA?.results?.final_stage?.stage || latestSessionA?.results?.mri?.stage)}
                    height={3}
                    showPercent={false}
                  />
                </div>
              </div>
            </div>

            {/* Biomarker details stack */}
            <div className="space-y-3 pt-2">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Multi-Modal Details</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span className="text-slate-500 bg-transparent">Ventricles Volume</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-xs">
                    {latestSessionA?.results?.mri_features?.ventricles_vol ? `${Number(latestSessionA.results.mri_features.ventricles_vol).toFixed(1)} cm³` : '—'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span className="text-slate-500">Hippocampus Volume</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-xs">
                    {latestSessionA?.results?.mri_features?.hippocampus_vol ? `${Number(latestSessionA.results.mri_features.hippocampus_vol).toFixed(2)} cm³` : '—'}
                  </span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-500">Speech Assessment</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {latestSessionA?.results?.speech?.vocal_tremor ? 'Tremors Detected' : 'Stable'}
                  </span>
                </div>
              </div>
            </div>
          </SpotlightCard>

          {/* Comparative Metrics Workspace (Center) */}
          <SpotlightCard className="p-4 space-y-4 print:border-slate-300">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2.5 tracking-tight flex items-center gap-1.5">
              <Download size={14} className="text-emerald-500 print:hidden" />
              Comparative Telemetry & Deltas
            </h2>

            {/* Detailed Delta Table */}
            <div className="space-y-3.5">
              <p className="text-[11px] text-slate-500">Calculated deltas represent relative deviations (Column A vs Column B):</p>
              
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
                <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-800/60 p-2 font-semibold text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <span>Modality Metric</span>
                  <span className="text-center">Relative Delta</span>
                  <span className="text-right">Directional</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="grid grid-cols-3 p-2 font-medium">
                    <span className="text-slate-500">Risk Score</span>
                    <span className="text-center font-bold text-slate-900 dark:text-slate-100">
                      {calculateDeviation(latestSessionA?.results?.risk_profile?.overall_risk_score, latestSessionB?.results?.risk_profile?.overall_risk_score)}
                    </span>
                    <span className="text-right flex items-center justify-end">
                      {(latestSessionA?.results?.risk_profile?.overall_risk_score || 0) > (latestSessionB?.results?.risk_profile?.overall_risk_score || 0)
                        ? <TrendingUp size={12} className="text-red-500" />
                        : <TrendingDown size={12} className="text-emerald-500" />
                      }
                    </span>
                  </div>

                  <div className="grid grid-cols-3 p-2 font-medium">
                    <span className="text-slate-500">Cognitive Score</span>
                    <span className="text-center font-bold text-slate-900 dark:text-slate-100">
                      {calculateDeviation(latestSessionA?.results?.cognitive?.composite_score, latestSessionB?.results?.cognitive?.composite_score)}
                    </span>
                    <span className="text-right flex items-center justify-end">
                      {(latestSessionA?.results?.cognitive?.composite_score || 0) > (latestSessionB?.results?.cognitive?.composite_score || 0)
                        ? <TrendingUp size={12} className="text-emerald-500" />
                        : <TrendingDown size={12} className="text-red-500" />
                      }
                    </span>
                  </div>

                  <div className="grid grid-cols-3 p-2 font-medium">
                    <span className="text-slate-500">Ventricles Vol.</span>
                    <span className="text-center font-bold text-slate-900 dark:text-slate-100">
                      {calculateDeviation(latestSessionA?.results?.mri_features?.ventricles_vol, latestSessionB?.results?.mri_features?.ventricles_vol)}
                    </span>
                    <span className="text-right flex items-center justify-end">
                      {(latestSessionA?.results?.mri_features?.ventricles_vol || 0) > (latestSessionB?.results?.mri_features?.ventricles_vol || 0)
                        ? <TrendingUp size={12} className="text-red-500" />
                        : <TrendingDown size={12} className="text-emerald-500" />
                      }
                    </span>
                  </div>

                  <div className="grid grid-cols-3 p-2 font-medium flex-wrap">
                    <span className="text-slate-500">Hippocampus Vol.</span>
                    <span className="text-center font-bold text-slate-900 dark:text-slate-100">
                      {calculateDeviation(latestSessionA?.results?.mri_features?.hippocampus_vol, latestSessionB?.results?.mri_features?.hippocampus_vol)}
                    </span>
                    <span className="text-right flex items-center justify-end">
                      {(latestSessionA?.results?.mri_features?.hippocampus_vol || 0) > (latestSessionB?.results?.mri_features?.hippocampus_vol || 0)
                        ? <TrendingUp size={12} className="text-emerald-500" />
                        : <TrendingDown size={12} className="text-red-500" />
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recharts Comparison Chart */}
            <div className="h-60 pt-4 print:hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="metric" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: 'var(--surface-popover)', border: '1px solid var(--border)', fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey={patientInfoA?.name || 'Patient A'} fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={patientInfoB?.name || 'Patient B'} fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SpotlightCard>

          {/* Patient B Card Details */}
          <SpotlightCard className="p-4 space-y-4 print:border-slate-300">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                Patient Column B
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {patientInfoB?.name || 'Awaiting Selection'}
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{patientBId || 'N/A'}</p>
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Age / Sex</span>
                <span className="font-semibold text-slate-800 dark:text-slate-300">
                  {patientInfoB?.age ? `${patientInfoB.age} yrs` : '—'} / {patientInfoB?.sex || '—'}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Education</span>
                <span className="font-semibold text-slate-800 dark:text-slate-300">
                  {patientInfoB?.education_years ? `${patientInfoB.education_years} yrs` : '—'}
                </span>
              </div>
            </div>

            {/* Diagnostics and Stages */}
            <div className="space-y-3">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Modality Evaluation</h3>
              
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Diagnostic Stage</span>
                    <Badge variant={latestSessionB?.results?.final_stage?.stage ? 'warning' : 'neutral'}>
                      {latestSessionB?.results?.final_stage?.stage || latestSessionB?.results?.mri?.stage || 'No diagnostic run'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Overall Confidence</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {latestSessionB ? `${Number(latestSessionB?.results?.final_stage?.confidence || latestSessionB?.results?.mri?.confidence || 0).toFixed(1)}%` : '—'}
                    </span>
                  </div>
                  <ProgressBar
                    value={latestSessionB?.results?.final_stage?.confidence || latestSessionB?.results?.mri?.confidence || 0}
                    color={getStageColor(latestSessionB?.results?.final_stage?.stage || latestSessionB?.results?.mri?.stage)}
                    height={3}
                    showPercent={false}
                  />
                </div>
              </div>
            </div>

            {/* Biomarker details stack */}
            <div className="space-y-3 pt-2">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Multi-Modal Details</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span className="text-slate-500">Ventricles Volume</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-xs">
                    {latestSessionB?.results?.mri_features?.ventricles_vol ? `${Number(latestSessionB.results.mri_features.ventricles_vol).toFixed(1)} cm³` : '—'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5">
                  <span className="text-slate-500">Hippocampus Volume</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-xs">
                    {latestSessionB?.results?.mri_features?.hippocampus_vol ? `${Number(latestSessionB.results.mri_features.hippocampus_vol).toFixed(2)} cm³` : '—'}
                  </span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-500">Speech Assessment</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {latestSessionB?.results?.speech?.vocal_tremor ? 'Tremors Detected' : 'Stable'}
                  </span>
                </div>
              </div>
            </div>
          </SpotlightCard>
          
        </div>
      )}

      {/* Joint Timeline Audits */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3.5 print:border-slate-300">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2.5 tracking-tight flex items-center gap-1.5">
          <Activity size={14} className="text-blue-500" />
          Comparative Longitudinal Timelines (Historical Diagnostic Milestones)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 dark:text-slate-400">
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 truncate">
              {patientInfoA?.name || 'Patient A'} Active Logs
            </h4>
            <div className="space-y-2 border-l-2 border-slate-200 dark:border-slate-700 pl-3 py-1">
              {dataA?.history && dataA.history.length > 0 ? (
                dataA.history.slice(0, 3).map((s, idx) => (
                  <div key={idx} className="relative space-y-0.5 pb-2">
                    <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      {s.results?.final_stage?.stage || s.results?.mri?.stage || 'Diagnostic Run'}
                      {' · '}
                      <span className="text-slate-900 dark:text-slate-100">
                        {Number(s.results?.final_stage?.confidence || s.results?.mri?.confidence || 0).toFixed(1)}%
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(s.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs italic">No history logged.</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 truncate">
              {patientInfoB?.name || 'Patient B'} Active Logs
            </h4>
            <div className="space-y-2 border-l-2 border-slate-200 dark:border-slate-700 pl-3 py-1">
              {dataB?.history && dataB.history.length > 0 ? (
                dataB.history.slice(0, 3).map((s, idx) => (
                  <div key={idx} className="relative space-y-0.5 pb-2">
                    <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      {s.results?.final_stage?.stage || s.results?.mri?.stage || 'Diagnostic Run'}
                      {' · '}
                      <span className="text-slate-900 dark:text-slate-100">
                        {Number(s.results?.final_stage?.confidence || s.results?.mri?.confidence || 0).toFixed(1)}%
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(s.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs italic">No history logged.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
