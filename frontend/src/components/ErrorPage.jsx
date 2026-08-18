import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, ArrowLeft, ShieldAlert, WifiOff, FileX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../../components/ui/GlassCard'
import Button from '../../components/ui/Button'

export default function ErrorPage({ type = '404', message, onRetry }) {
  const navigate = useNavigate()

  const CONFIG = {
    '404': {
      title: 'Resource Not Found',
      desc: message || 'The requested clinical resource, patient record, or diagnostic page could not be located.',
      icon: FileX,
      color: '#F59E0B',
    },
    '403': {
      title: 'Access Restricted',
      desc: message || 'Your clinician credentials do not have permission to view this administrative workspace.',
      icon: ShieldAlert,
      color: '#EF4444',
    },
    '500': {
      title: 'System Telemetry Error',
      desc: message || 'An internal AI cluster error occurred. Telemetry logs have been dispatched to IT.',
      icon: AlertTriangle,
      color: '#EF4444',
    },
    'network': {
      title: 'Connection Interrupted',
      desc: message || 'Unable to communicate with the NeuroSense AI API Gateway. Check network connection.',
      icon: WifiOff,
      color: '#06B6D4',
    },
  }

  const err = CONFIG[type] || CONFIG['500']
  const Icon = err.icon

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <GlassCard className="max-w-md text-center p-8 space-y-5">
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md">
          <Icon size={32} style={{ color: err.color }} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{err.title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{err.desc}</p>
        </div>

        <div className="flex gap-3 justify-center pt-2">
          {onRetry && (
            <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
              Retry Connection
            </Button>
          )}
          <Button icon={ArrowLeft} onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </GlassCard>
    </div>
  )
}
