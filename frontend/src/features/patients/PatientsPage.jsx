import React, { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, Search, Download, Eye, UserPlus, Filter, ArrowUpDown, X, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { SectionSkeleton } from '../../components/ui/Skeleton'
import API_URL from '../../config/api'

function LabelInput({ label, ...props }) {
  return (
    <div>
      <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 5 }}>{label}</label>
      <input className="w-full px-3 py-2.5 rounded-xl text-sm" {...props} />
    </div>
  )
}

function StatusBadge({ status }) {
  const config = {
    Normal: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'rgba(34,197,94,0.3)', label: 'Normal' },
    Mild: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)', label: 'Mild' },
    High: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)', label: 'High Risk' },
  }
  const c = config[status] || config.Normal
  return (
    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold" 
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  )
}

export default function PatientsPage() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  const [addOpen, setAddOpen]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ patient_id: '', name: '', age: '', sex: 'M', education_years: '', notes: '' })

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetch(`${API_URL}/api/patients`, { credentials: 'include' }),
      fetch(`${API_URL}/api/analyses`, { credentials: 'include' }).catch(() => ({ json: () => ({ analyses: [] }) }))
    ])
      .then(([patientsRes, analysesRes]) => Promise.all([patientsRes.json(), analysesRes.json()]))
      .then(([patientsData, analysesData]) => {
        setPatients(patientsData.patients || [])
        setAnalyses(analysesData.analyses || [])
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const getPatientStatus = (patientId) => {
    const patientAnalyses = analyses.filter(a => 
      a.patient_info?.patient_id === patientId || a.patient_id === patientId
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    
    if (patientAnalyses.length === 0) return { status: 'Normal', lastAnalysis: null }
    
    const latest = patientAnalyses[0]
    const stage = latest.final_stage?.stage || latest.stage || ''
    let status = 'Normal'
    if (stage.includes('Non') || stage.includes('Very Mild')) status = 'Normal'
    else if (stage.includes('Mild')) status = 'Mild'
    else if (stage.includes('Moderate') || stage.includes('High')) status = 'High'
    
    return { status, lastAnalysis: latest.created_at }
  }

  const enrichedPatients = useMemo(() => {
    return patients.map(p => ({
      ...p,
      ...getPatientStatus(p.patient_id)
    }))
  }, [patients, analyses])

  const filtered = useMemo(() => {
    let result = enrichedPatients.filter(p =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.patient_id?.toLowerCase().includes(search.toLowerCase())
    )

    if (riskFilter !== 'all') {
      result = result.filter(p => p.status === riskFilter)
    }

    result.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = a.lastAnalysis ? new Date(a.lastAnalysis) : new Date(0)
        const dateB = b.lastAnalysis ? new Date(b.lastAnalysis) : new Date(0)
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
      }
      if (sortBy === 'name') {
        return sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)
      }
      if (sortBy === 'age') {
        return sortOrder === 'desc' ? (b.age || 0) - (a.age || 0) : (a.age || 0) - (b.age || 0)
      }
      return 0
    })

    return result
  }, [enrichedPatients, search, riskFilter, sortBy, sortOrder])

  const handleAdd = async () => {
    if (!form.patient_id || !form.name) { toast.error('Patient ID and Name are required'); return }
    setSaving(true)
    const res = await fetch(`${API_URL}/api/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...form, age: Number(form.age), education_years: Number(form.education_years) }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.success) {
      toast.success('Patient added!')
      setAddOpen(false)
      setForm({ patient_id: '', name: '', age: '', sex: 'M', education_years: '', notes: '' })
      loadData()
    } else {
      toast.error(data.message || 'Failed to add patient')
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(s => s === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const COLS = ['Patient ID', 'Name', 'Age', 'Status', 'Last Analysis', 'Actions']

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Patient Registry</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>{patients.length} patients registered</p>
        </div>
        <Button icon={UserPlus} onClick={() => setAddOpen(true)}>Add Patient</Button>
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3">
            <Search size={16} style={{ color: '#475569', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or patient ID…"
              className="flex-1 bg-transparent text-sm" style={{ border: 'none', outline: 'none', color: '#f1f5f9' }} />
            {search && (
              <button onClick={() => setSearch('')} style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={14} style={{ color: '#64748b' }} />
              <select 
                value={riskFilter} 
                onChange={e => setRiskFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm"
                style={{ background: '#1F2937', border: '1px solid #374151', color: '#f1f5f9', cursor: 'pointer' }}
              >
                <option value="all">All Risks</option>
                <option value="Normal">Normal</option>
                <option value="Mild">Mild</option>
                <option value="High">High Risk</option>
              </select>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => toggleSort('date')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ 
                  background: sortBy === 'date' ? 'rgba(99,102,241,0.15)' : 'transparent', 
                  border: `1px solid ${sortBy === 'date' ? '#6366f1' : '#374151'}`,
                  color: sortBy === 'date' ? '#a5b4fc' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                <ArrowUpDown size={12} /> Date {sortBy === 'date' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
              <button 
                onClick={() => toggleSort('name')}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ 
                  background: sortBy === 'name' ? 'rgba(99,102,241,0.15)' : 'transparent', 
                  border: `1px solid ${sortBy === 'name' ? '#6366f1' : '#374151'}`,
                  color: sortBy === 'name' ? '#a5b4fc' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                Name {sortBy === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
              </button>
            </div>
          </div>
        </div>
        
        {riskFilter !== 'all' && (
          <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Filter:</span>
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs" 
              style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
              {riskFilter} Risk
              <button onClick={() => setRiskFilter('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a5b4fc' }}>
                <X size={12} />
              </button>
            </span>
            <span style={{ fontSize: 12, color: '#475569' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </GlassCard>

      <GlassCard className="overflow-hidden">
        {loading ? (
          <div className="p-6"><SectionSkeleton rows={5} /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <Users size={28} style={{ color: '#6366f1' }} />
            </div>
            <p style={{ fontSize: 14, color: '#475569' }}>{search || riskFilter !== 'all' ? 'No patients match your filters' : 'No patients yet. Add your first patient.'}</p>
            {!search && riskFilter === 'all' && <Button icon={UserPlus} onClick={() => setAddOpen(true)}>Add First Patient</Button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {COLS.map(c => (
                    <th key={c} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr key={p.patient_id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/[0.03] transition-colors">
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', fontFamily: 'monospace' }}>{p.patient_id}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white' }}>{(p.name || '?')[0].toUpperCase()}</div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9' }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8' }}>{p.age || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={p.status} />
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b' }}>
                      {p.lastAnalysis ? (
                        <div className="flex items-center gap-1">
                          <TrendingUp size={12} style={{ color: '#6366f1' }} />
                          {formatDate(p.lastAnalysis)}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div className="flex items-center gap-2">
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => navigate(`/history/${p.patient_id}`)}
                          className="p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', cursor: 'pointer' }}>
                          <Eye size={14} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => window.open(`${API_URL}/api/export/${p.patient_id}`, '_blank')}
                          className="p-2 rounded-xl" style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4', cursor: 'pointer' }}>
                          <Download size={14} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add New Patient" maxWidth={500}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <LabelInput label="Patient ID *" value={form.patient_id} onChange={set('patient_id')} placeholder="P-XXXX" />
            <LabelInput label="Full Name *"  value={form.name}       onChange={set('name')}       placeholder="John Smith" />
            <LabelInput label="Age"          value={form.age}        onChange={set('age')}        placeholder="Years" type="number" />
            <LabelInput label="Education (years)" value={form.education_years} onChange={set('education_years')} placeholder="12" type="number" />
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Sex</label>
            <div className="flex gap-3">
              {['M', 'F', 'Other'].map(s => (
                <button key={s} onClick={() => setForm(f => ({ ...f, sex: s }))} className="flex-1 py-2 rounded-xl text-sm"
                  style={{ background: form.sex === s ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', border: form.sex === s ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)', color: form.sex === s ? '#a5b4fc' : '#64748b', cursor: 'pointer' }}>
                  {s === 'M' ? 'Male' : s === 'F' ? 'Female' : 'Other'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Optional clinical notes…" className="w-full px-4 py-3 rounded-xl text-sm" style={{ resize: 'none' }} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleAdd}>Add Patient</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
