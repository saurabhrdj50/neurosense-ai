import React from 'react'

export default function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 transition-all hover:shadow-md ${className}`}>
      {children}
    </div>
  )
}
