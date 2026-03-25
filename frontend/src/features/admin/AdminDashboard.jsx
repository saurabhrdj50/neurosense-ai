import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Users, UserCog, Activity, TrendingUp, Trash2, AlertTriangle, Brain, FileText, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'
import { useAuth } from '../auth/AuthProvider'
import { SectionSkeleton } from '../../components/ui/Skeleton'
import API_URL from '../../config/api'

async function adminApi(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Request failed')
  }
  return res.json()
}

function StatCard({ icon: Icon, label, value, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <GlassCard className="p-5" hover>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
            <Icon size={24} style={{ color }} />
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>{label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>{value}</p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

function DoctorCard({ doctor, onDelete, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-4 p-4 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
           style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white' }}>
        {(doctor.full_name || doctor.username || '?')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{doctor.full_name || doctor.username}</p>
        <p style={{ fontSize: 12, color: '#64748b' }}>{doctor.email}</p>
      </div>
      <button
        onClick={() => onDelete(doctor.id)}
        className="p-2 rounded-lg transition-colors hover:bg-red-500/20"
        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  )
}

function PatientCard({ patient, onDelete, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-4 p-4 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
           style={{ background: 'linear-gradient(135deg, #22c55e, #10b981)', color: 'white' }}>
        {(patient.name || '?')[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{patient.name}</p>
        <p style={{ fontSize: 12, color: '#64748b' }}>ID: {patient.patient_id} {patient.age && `· ${patient.age} yrs`}</p>
      </div>
      <button
        onClick={() => onDelete(patient.patient_id)}
        className="p-2 rounded-lg transition-colors hover:bg-red-500/20"
        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  )
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dashData, doctorsData, patientsData] = await Promise.all([
        adminApi('/api/admin/dashboard'),
        adminApi('/api/admin/doctors'),
        adminApi('/api/admin/patients'),
      ])
      setStats(dashData)
      setDoctors(doctorsData.doctors || [])
      setPatients(patientsData.patients || [])
    } catch (err) {
      toast.error('Failed to load admin data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDoctor = async (id) => {
    if (!confirm('Are you sure you want to delete this doctor?')) return
    try {
      await adminApi(`/api/admin/doctors/${id}`, { method: 'DELETE' })
      toast.success('Doctor deleted')
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDeletePatient = async (id) => {
    if (!confirm('Are you sure you want to delete this patient and all their records?')) return
    try {
      await adminApi(`/api/admin/patients/${id}`, { method: 'DELETE' })
      toast.success('Patient deleted')
      loadData()
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <SectionSkeleton rows={4} />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #f472b6, #db2777)' }}>
            <Shield size={24} style={{ color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 800, color: '#f1f5f9' }}>
              Admin Dashboard
            </h1>
            <p style={{ fontSize: 13, color: '#64748b' }}>Welcome, {user?.full_name || user?.username}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.total_users || 0} color="#6366f1" delay={0} />
        <StatCard icon={UserCog} label="Doctors" value={stats.total_doctors || 0} color="#06b6d4" delay={0.1} />
        <StatCard icon={Brain} label="Patients" value={stats.total_patients || 0} color="#22c55e" delay={0.2} />
        <StatCard icon={FileText} label="Analyses" value={stats.total_analyses || 0} color="#f59e0b" delay={0.3} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
              <UserCog size={18} style={{ marginRight: 8, color: '#06b6d4', display: 'inline' }} />
              Doctors ({doctors.length})
            </h2>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {doctors.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>No doctors registered</p>
            ) : (
              doctors.map((d, i) => (
                <DoctorCard key={d.id} doctor={d} onDelete={handleDeleteDoctor} delay={i * 0.05} />
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
              <Users size={18} style={{ marginRight: 8, color: '#22c55e', display: 'inline' }} />
              Patients ({patients.length})
            </h2>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {patients.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>No patients registered</p>
            ) : (
              patients.map((p, i) => (
                <PatientCard key={p.patient_id} patient={p} onDelete={handleDeletePatient} delay={i * 0.05} />
              ))
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 16 }}>
          <TrendingUp size={18} style={{ marginRight: 8, color: '#f59e0b', display: 'inline' }} />
          Analysis Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.stage_distribution || {}).map(([stage, count]) => (
            <div key={stage} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{stage}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{count}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
