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
