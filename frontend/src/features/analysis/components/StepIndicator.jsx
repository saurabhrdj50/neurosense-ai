import React from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export function StepIndicator({ steps, current }) {
  const progressPercent = Math.round(((current) / steps.length) * 100)
  
  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: '#9CA3AF', fontWeight: 500 }}>
          Step {current + 1} of {steps.length}
        </span>
        <span style={{ color: '#6366f1', fontWeight: 600 }}>
          {progressPercent}% Complete
        </span>
      </div>
      
      {/* Progress bar track */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1E293B' }}>
        <motion.div 
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          style={{ 
            background: 'linear-gradient(90deg, #6366f1, #a855f7)',
            boxShadow: '0 0 10px rgba(99,102,241,0.5)'
          }}
        />
      </div>
      
      {/* Step indicators */}
      <div className="flex items-center gap-0 overflow-x-auto pb-2 pt-2 scrollbar-hide">
        {steps.map((s, i) => {
          const done   = i < current
          const active = i === current
          const Icon   = s.icon
          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                <motion.div
                  animate={{
                    background: done 
                      ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
                      : active 
                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                        : '#1E293B',
                    borderColor: done 
                      ? '#22c55e' 
                      : active 
                        ? '#6366f1' 
                        : '#374151',
                    boxShadow: active 
                      ? '0 0 20px rgba(99,102,241,0.5), 0 0 40px rgba(99,102,241,0.2)' 
                      : done 
                        ? '0 0 10px rgba(34,197,94,0.3)' 
                        : 'none',
                  }}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center border-2"
                  transition={{ duration: 0.3 }}
                >
                  {done ? (
                    <Check size={16} className="sm:w-[18px] sm:h-[18px]" color="white" />
                  ) : (
                    <Icon size={16} className="sm:w-[18px] sm:h-[18px]" color={active ? 'white' : '#6B7280'} />
                  )}
                </motion.div>
                <span 
                  className="hidden xs:inline"
                  style={{ 
                    fontSize: 10, 
                    color: active ? '#E5E7EB' : done ? '#22c55e' : '#6B7280', 
                    fontWeight: active ? 600 : 400, 
                    whiteSpace: 'nowrap' 
                  }}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <motion.div 
                  animate={{ 
                    background: done ? '#22c55e' : '#374151',
                  }} 
                  className="flex-1 h-0.5 mx-1 mb-6" 
                  style={{ minWidth: 10 }} 
                  transition={{ duration: 0.4 }} 
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @media (max-width: 480px) {
          .xs\\:inline { display: inline; }
        }
      `}</style>
    </div>
  )
}
