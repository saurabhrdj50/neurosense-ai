import React from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-2">
      {steps.map((s, i) => {
        const done   = i < current
        const active = i === current
        const Icon   = s.icon
        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <motion.div
                animate={{
                  background: done ? 'linear-gradient(135deg, #22c55e, #16a34a)' : active ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.04)',
                  borderColor: done ? '#22c55e' : active ? '#6366f1' : 'rgba(255,255,255,0.08)',
                  boxShadow: active ? '0 0 20px rgba(99,102,241,0.4)' : 'none',
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center border"
                transition={{ duration: 0.3 }}
              >
                {done ? <Check size={16} color="white" /> : <Icon size={16} color={active ? 'white' : '#475569'} />}
              </motion.div>
              <span style={{ fontSize: 11, color: active ? '#a5b4fc' : done ? '#22c55e' : '#334155', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <motion.div animate={{ background: done ? '#22c55e' : 'rgba(255,255,255,0.06)' }} className="flex-1 h-px mx-1" style={{ minWidth: 16 }} transition={{ duration: 0.4 }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
