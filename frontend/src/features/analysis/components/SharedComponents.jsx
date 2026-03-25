import React from 'react'

export function SectionTitle({ children }) {
  return (
    <h2 style={{ 
      fontFamily: 'Space Grotesk, sans-serif', 
      fontSize: 17, 
      fontWeight: 700, 
      color: '#FFFFFF', 
      marginBottom: 4 
    }}>
      {children}
    </h2>
  )
}

export function LabeledInput({ label, error, ...props }) {
  return (
    <div className="space-y-1.5">
      <label style={{ fontSize: 13, color: '#E5E7EB', display: 'block', marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      <input 
        className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none form-input"
        style={{ 
          background: '#1F2937',
          border: error ? '1px solid #EF4444' : '1px solid #374151',
          color: '#FFFFFF',
        }}
        {...props} 
      />
      {error && (
        <p style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{error}</p>
      )}
    </div>
  )
}

export function InfoBox({ children, type = 'info' }) {
  const colors = {
    info: { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', text: '#818cf8' },
    warning: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
    success: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: '#4ade80' },
    tip: { bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)', text: '#c084fc' },
  }
  const c = colors[type] || colors.info
  
  return (
    <div 
      className="flex items-center gap-2 p-3 rounded-xl" 
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.text }} />
      <span style={{ fontSize: 12, color: c.text }}>{children}</span>
    </div>
  )
}

export function LabeledSelect({ label, error, children, ...props }) {
  return (
    <div className="space-y-1.5">
      <label style={{ fontSize: 13, color: '#E5E7EB', display: 'block', marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      <select 
        className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none"
        style={{ 
          background: '#1F2937',
          border: error ? '1px solid #EF4444' : '1px solid #374151',
          color: '#FFFFFF',
        }}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{error}</p>
      )}
    </div>
  )
}

export function LabeledTextarea({ label, error, ...props }) {
  return (
    <div className="space-y-1.5">
      <label style={{ fontSize: 13, color: '#E5E7EB', display: 'block', marginBottom: 6, fontWeight: 500 }}>
        {label}
      </label>
      <textarea 
        className="w-full px-4 py-3 rounded-xl text-sm transition-all duration-200 focus:outline-none"
        style={{ 
          background: '#1F2937',
          border: error ? '1px solid #EF4444' : '1px solid #374151',
          color: '#FFFFFF',
          resize: 'vertical',
        }}
        {...props} 
      />
      {error && (
        <p style={{ fontSize: 11, color: '#EF4444', marginTop: 2 }}>{error}</p>
      )}
    </div>
  )
}
