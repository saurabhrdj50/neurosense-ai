import React from 'react'

export function LabeledInput({ label, required, error, hint, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm text-foreground font-semibold block">
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
        {hint && <span className="text-xs text-foreground-muted">{hint}</span>}
      </div>
      <input
        className={`w-full px-3.5 py-2.5 rounded-xl text-base bg-surface text-foreground border border-border transition-all duration-150 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 ${
          error ? 'border-rose-500 focus:ring-rose-500/40' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-xs text-rose-500 mt-1 font-semibold">{error}</p>
      )}
    </div>
  )
}
