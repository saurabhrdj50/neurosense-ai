import React from 'react'
import { motion } from 'framer-motion'

/** Skeleton shimmer block */
export function Skeleton({ width = '100%', height = 20, rounded = 8, className = '' }) {
  return (
    <div
      className={`shimmer ${className}`}
      style={{ width, height, borderRadius: rounded }}
    />
  )
}

/** Stat card skeleton */
export function StatCardSkeleton() {
  return (
    <div
      className="p-5 rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex justify-between items-start mb-4">
        <Skeleton width={40} height={40} rounded={12} />
        <Skeleton width={60} height={22} rounded={20} />
      </div>
      <Skeleton width="40%" height={32} rounded={6} className="mb-2" />
      <Skeleton width="60%" height={14} rounded={4} />
    </div>
  )
}

/** Full page section skeleton */
export function SectionSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <Skeleton height={60} rounded={12} />
        </motion.div>
      ))}
    </div>
  )
}

/** Results page skeleton */
export function ResultsPageSkeleton() {
  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex justify-between">
        <div>
          <Skeleton width={180} height={28} rounded={6} />
          <Skeleton width={250} height={16} rounded={4} className="mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton width={100} height={36} rounded={8} />
          <Skeleton width={80} height={36} rounded={8} />
        </div>
      </div>
      
      <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-8">
          <Skeleton width={130} height={130} rounded="50%" />
          <div className="flex-1">
            <Skeleton width={120} height={28} rounded={6} className="mb-3" />
            <Skeleton width="80%" height={40} rounded={8} />
            <Skeleton width="60%" height={20} rounded={4} className="mt-3" />
          </div>
          <Skeleton width={180} height={160} rounded={12} className="hidden sm:block" />
        </div>
      </div>
      
      <div className="p-6 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <Skeleton width={200} height={24} rounded={6} className="mb-4" />
        <Skeleton width="100%" height={80} rounded={8} />
      </div>
      
      {[1, 2, 3].map(i => (
        <div key={i} className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Skeleton width={150} height={20} rounded={4} className="mb-3" />
          <Skeleton width="100%" height={60} rounded={8} />
        </div>
      ))}
    </div>
  )
}

/** Patient row skeleton */
export function PatientRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <Skeleton width={80} height={16} rounded={4} />
      <div className="flex items-center gap-3">
        <Skeleton width={32} height={32} rounded={8} />
        <Skeleton width={120} height={16} rounded={4} />
      </div>
      <Skeleton width={40} height={16} rounded={4} />
      <Skeleton width={60} height={24} rounded={12} />
      <Skeleton width={100} height={16} rounded={4} />
      <div className="flex gap-2 ml-auto">
        <Skeleton width={32} height={32} rounded={8} />
        <Skeleton width={32} height={32} rounded={8} />
      </div>
    </div>
  )
}
