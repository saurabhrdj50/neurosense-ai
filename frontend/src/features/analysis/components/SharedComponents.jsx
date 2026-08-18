import React from 'react'

export function SectionTitle({ children, subtitle }) {
  return (
    <div className="mb-3">
      <h2 className="font-sans text-xs font-bold text-foreground tracking-wider uppercase flex items-center gap-2">
        {children}
      </h2>
      {subtitle && <p className="text-[11px] text-foreground-muted mt-0.5 font-medium leading-relaxed">{subtitle}</p>}
    </div>
  )
}

export function LabeledInput({ label, required, error, hint, className = '', ...props }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs text-foreground-muted font-semibold block">
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
        {hint && <span className="text-[10px] text-foreground-muted">{hint}</span>}
      </div>
      <input 
        className={`w-full px-3 py-2 rounded-xl text-xs bg-surface text-foreground border border-border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 ${
          error ? 'border-rose-500 focus:ring-rose-500/40' : ''
        } ${className}`}
        {...props} 
      />
      {error && (
        <p className="text-[10px] text-rose-500 mt-0.5 font-medium">{error}</p>
      )}
    </div>
  )
}

export function InfoBox({ children, type = 'info' }) {
  const badgeStyles = {
    info: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-cyan-300',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    tip: 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300',
  }
  const dotStyles = {
    info: 'bg-indigo-500 dark:bg-cyan-400',
    warning: 'bg-amber-500',
    success: 'bg-emerald-500',
    tip: 'bg-purple-500',
  }
  
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-medium ${badgeStyles[type] || badgeStyles.info}`}>
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotStyles[type] || dotStyles.info}`} />
      <span className="leading-relaxed text-[11px]">{children}</span>
    </div>
  )
}

export function SuggestionPanel({ title = 'Clinical Guidance', items = [] }) {
  if (!items.length) return null

  return (
    <div className="rounded-xl p-3.5 bg-surface border border-border/80 space-y-2">
      <p className="text-[10px] text-foreground-muted uppercase tracking-wider font-bold">
        {title}
      </p>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2">
            <div className="mt-1.5 h-1 w-1 rounded-full flex-shrink-0 bg-indigo-500" />
            <p className="text-xs text-foreground-muted leading-relaxed font-medium">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LabeledSelect({ label, required, error, children, className = '', ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-foreground-muted font-semibold block">
        {label} {required && <span className="text-rose-500 font-bold">*</span>}
      </label>
      <select 
        className={`w-full px-3 py-2 rounded-xl text-xs bg-surface text-foreground border border-border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 ${
          error ? 'border-rose-500 focus:ring-rose-500/40' : ''
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="text-[10px] text-rose-500 mt-0.5 font-medium">{error}</p>
      )}
    </div>
  )
}

export function LabeledTextarea({ label, required, error, className = '', ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-foreground-muted font-semibold block">
        {label} {required && <span className="text-rose-500 font-bold">*</span>}
      </label>
      <textarea 
        className={`w-full px-3 py-2 rounded-xl text-xs bg-surface text-foreground border border-border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-y ${
          error ? 'border-rose-500 focus:ring-rose-500/40' : ''
        } ${className}`}
        {...props} 
      />
      {error && (
        <p className="text-[10px] text-rose-500 mt-0.5 font-medium">{error}</p>
      )}
    </div>
  )
}


