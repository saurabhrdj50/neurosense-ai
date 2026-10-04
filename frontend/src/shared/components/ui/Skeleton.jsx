/**
 * @fileoverview Clinical skeleton shimmer placeholders.
 * No framer-motion, no dark rgba backgrounds — uses Tailwind shimmer animation.
 */
import React from 'react'

/**
 * Generic shimmer block.
 */
export function Skeleton({ width = '100%', height = 20, rounded = 6, className = '' }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700 ${className}`}
      style={{ width, height, borderRadius: rounded }}
      aria-hidden="true"
    />
  )
}

/**
 * Stat card skeleton.
 */
export function StatCardSkeleton() {
  return (
    <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
      <div className="flex justify-between items-start mb-4">
        <Skeleton width={36} height={36} rounded={8} />
        <Skeleton width={56} height={20} rounded={4} />
      </div>
      <Skeleton width="40%" height={28} rounded={4} className="mb-2" />
      <Skeleton width="60%" height={12} rounded={3} />
    </div>
  )
}

/**
 * Section list skeleton.
 */
export function SectionSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-2.5" role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={52} rounded={8} />
      ))}
    </div>
  )
}

/**
 * Results page full-layout skeleton.
 */
export function ResultsPageSkeleton() {
  return (
    <div className="space-y-4 max-w-6xl mx-auto" role="status" aria-label="Loading results">
      {/* Patient bar */}
      <Skeleton height={40} rounded={8} />

      {/* Verdict hero */}
      <div className="p-5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-5">
          <Skeleton width={96} height={96} rounded="50%" />
          <div className="flex-1 space-y-2">
            <Skeleton width={100} height={20} rounded={4} />
            <Skeleton width={200} height={28} rounded={4} />
            <Skeleton width="70%" height={16} rounded={4} />
          </div>
          <div className="hidden sm:flex flex-col gap-2">
            <Skeleton width={100} height={32} rounded={6} />
            <Skeleton width={100} height={32} rounded={6} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Skeleton height={40} rounded={6} />

      {/* Content panels */}
      {[1, 2].map(i => (
        <div key={i} className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <Skeleton width={150} height={18} rounded={4} />
          <Skeleton width="100%" height={60} rounded={6} />
        </div>
      ))}
    </div>
  )
}

/**
 * Patient table row skeleton.
 */
export function PatientRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-3.5 py-3 border-b border-slate-100 dark:border-slate-800">
      <Skeleton width={72} height={14} rounded={3} />
      <div className="flex items-center gap-2.5">
        <Skeleton width={28} height={28} rounded={6} />
        <Skeleton width={110} height={14} rounded={3} />
      </div>
      <Skeleton width={36} height={14} rounded={3} />
      <Skeleton width={56} height={20} rounded={4} />
      <Skeleton width={90} height={14} rounded={3} />
      <div className="flex gap-1.5 ml-auto">
        <Skeleton width={28} height={28} rounded={6} />
        <Skeleton width={28} height={28} rounded={6} />
      </div>
    </div>
  )
}
