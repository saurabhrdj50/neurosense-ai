import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import GlassCard from '../../shared/components/ui/GlassCard'

export function Section({ icon: Icon, title, color, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <GlassCard className="overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 cursor-pointer border-b transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background"
        style={{
          background: 'none',
          borderBottom: open ? '1px solid rgb(var(--border))' : 'none'
        }}
      >
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}1A`, border: `1px solid ${color}30` }}>
            <Icon size={18} style={{ color }} />
          </div>
          <span className="font-sans font-bold text-base sm:text-lg text-foreground text-left">{title}</span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-foreground-muted" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-6 py-4 sm:py-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}

export function DataRow({ label, value, color }) {
  return (
    <div className="flex items-baseline justify-between py-2.5 sm:py-3 border-b border-border/80 gap-2">
      <span className="text-xs sm:text-[14px] text-foreground-muted font-semibold">{label}</span>
      <span className="text-xs sm:text-[14px] font-mono font-extrabold text-right truncate" style={{ color: color || 'rgb(var(--text-primary))' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}
