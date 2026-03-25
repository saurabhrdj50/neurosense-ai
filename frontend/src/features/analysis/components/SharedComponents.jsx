import React from 'react'

export function SectionTitle({ children }) {
  return (
    <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
      {children}
    </h2>
  )
}

export function LabeledInput({ label, ...props }) {
  return (
    <div>
      <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>{label}</label>
      <input className="w-full px-4 py-3 rounded-xl text-sm" {...props} />
    </div>
  )
}

export function InfoBox({ children }) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.15)' }}>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#6366f1' }} />
      <span style={{ fontSize: 12, color: '#818cf8' }}>{children}</span>
    </div>
  )
}
