import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Search, Download, Eye, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { SectionSkeleton } from '../../components/ui/Skeleton'

function LabelInput({ label, ...props }) {
  return (
    <div>
      <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 5 }}>{label}</label>
      <input className="w-full px-3 py-2.5 rounded-xl text-sm" {...props} />
    </div>
  )
}

export default function PatientsPage() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [addOpen, setAddOpen]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ patient_id: '', name: '', age: '', sex: 'M', education_years: '', notes: '' })

  const loadPatients = () => {
    setLoading(true)
    fetch('/api/patients', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setPatients(d.patients || []))
      .catch(() => toast.error('Failed to load patients'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadPatients() }, [])

  const filtered = patients.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.patient_id?.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async () => {
    if (!form.patient_id || !form.name) { toast.error('Patient ID and Name are required'); return }
    setSaving(true)
    const res = await fetch('/api/patients', {
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
      loadPatients()
    } else {
      toast.error(data.message || 'Failed to add patient')
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const COLS = ['Patient ID', 'Name', 'Age', 'Sex', 'Actions']

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Patient Registry</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>{patients.length} patients registered</p>
        </div>
        <Button icon={UserPlus} onClick={() => setAddOpen(true)}>Add Patient</Button>
      </div>

      <GlassCard className="p-4 flex items-center gap-3">
        <Search size={16} style={{ color: '#475569', flexShrink: 0 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or patient ID…"
          className="flex-1 bg-transparent text-sm" style={{ border: 'none', outline: 'none', color: '#f1f5f9' }} />
        {search && <button onClick={() => setSearch('')} style={{ color: '#475569', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>}
      </GlassCard>

      <GlassCard className="overflow-hidden">
        {loading ? (
          <div className="p-6"><SectionSkeleton rows={5} /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <Users size={28} style={{ color: '#6366f1' }} />
            </div>
            <p style={{ fontSize: 14, color: '#475569' }}>{search ? 'No patients match your search' : 'No patients yet. Add your first patient.'}</p>
            {!search && <Button icon={UserPlus} onClick={() => setAddOpen(true)}>Add First Patient</Button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {COLS.map(c => (
                    <th key={c} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr key={p.patient_id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/[0.03] transition-colors">
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', fontFamily: 'monospace' }}>{p.patient_id}</span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white' }}>{(p.name || '?')[0].toUpperCase()}</div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#f1f5f9' }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#94a3b8' }}>{p.age || '—'}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#94a3b8' }}>{p.sex || '—'}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <div className="flex items-center gap-2">
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => navigate(`/history/${p.patient_id}`)}
                          className="p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', cursor: 'pointer' }}>
                          <Eye size={14} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => window.open(`/api/export/${p.patient_id}`, '_blank')}
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
