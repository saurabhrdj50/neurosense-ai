import React from 'react'
import { motion } from 'framer-motion'
import { Activity } from 'lucide-react'

export default function PageLoader() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: '#060a14', zIndex: 9999 }}
    >
      {/* Ambient glow */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-15"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)', filter: 'blur(100px)' }}
      />

      {/* Logo */}
      <div className="relative mb-10">
        <motion.div
          className="w-24 h-24 rounded-3xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
          animate={{
            boxShadow: [
              '0 0 20px rgba(99,102,241,0.25)',
              '0 0 60px rgba(99,102,241,0.5)',
              '0 0 20px rgba(99,102,241,0.25)',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <Activity size={42} color="white" strokeWidth={2} />
        </motion.div>
        {/* Rotating ring */}
        <motion.div
          className="absolute -inset-3 rounded-[28px]"
          style={{ border: '2px solid rgba(99,102,241,0.15)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -inset-6 rounded-[32px]"
          style={{ border: '1px solid rgba(99,102,241,0.06)' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Brand */}
      <h2
        className="gradient-text mb-2"
        style={{
          fontFamily: 'Space Grotesk',
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: '-0.03em',
        }}
      >
        NeuroSense Advanced
      </h2>
      <p style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>Initializing AI modules…</p>

      {/* Loading bar */}
      <div className="mt-10 rounded-full overflow-hidden" style={{ width: 180, height: 2, background: 'rgba(255,255,255,0.04)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7, #06b6d4)' }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Dots */}
      <div className="flex gap-1.5 mt-6">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#6366f1' }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  )
}
