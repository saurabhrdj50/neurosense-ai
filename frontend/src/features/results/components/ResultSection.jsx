import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import GlassCard from '../../../components/ui/GlassCard'

export function Section({ icon: Icon, title, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <GlassCard className="overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-4.5"
        style={{ background: 'none', border: 'none', cursor: 'pointer', borderBottom: open ? '1px solid var(--border)' : 'none' }}>
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}1A`, border: `1px solid ${color}30` }}>
            <Icon size={20} style={{ color }} />
          </div>
          <span className="font-sans font-bold text-lg text-foreground">{title}</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={20} className="text-foreground-muted" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }} className="overflow-hidden">
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}

export function DataRow({ label, value, color }) {
  return (
    <div className="flex items-baseline justify-between py-3 border-b border-border">
      <span className="text-[15px] text-foreground-muted font-semibold">{label}</span>
      <span className="text-[15px] font-extrabold" style={{ color: color || 'var(--text-primary)' }}>{value ?? '—'}</span>
    </div>
  )
}
