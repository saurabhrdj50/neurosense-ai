import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Bell, CheckCheck, Trash2, AlertCircle, CheckCircle2, FileText, Brain, UserPlus, X } from 'lucide-react'

const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    title: 'MRI Analysis Completed',
    desc: 'Patient P-8821 MRI scan processed. Stage: Moderate Demented (89% conf)',
    time: '10m ago',
    category: 'Today',
    unread: true,
    type: 'analysis',
    icon: Brain,
    color: '#EF4444',
  },
  {
    id: 2,
    title: 'Patient Registered',
    desc: 'New patient Eleanor Vance registered under Dr. Vance roster',
    time: '45m ago',
    category: 'Today',
    unread: true,
    type: 'patient',
    icon: UserPlus,
    color: '#10B981',
  },
  {
    id: 3,
    title: 'Report Export Ready',
    desc: 'Diagnostic Report #R-904 ready for PDF download',
    time: '2h ago',
    category: 'Today',
    unread: false,
    type: 'report',
    icon: FileText,
    color: '#5B5CEB',
  },
  {
    id: 4,
    title: 'System Maintenance Scheduled',
    desc: 'PyTorch model cluster maintenance at 02:00 UTC',
    time: '1d ago',
    category: 'Yesterday',
    unread: false,
    type: 'system',
    icon: AlertCircle,
    color: '#F59E0B',
  },
  {
    id: 5,
    title: 'Model Updated',
    desc: 'Multi-modal fusion weights updated to v2.4.1 accuracy benchmark',
    time: '3d ago',
    category: 'Earlier',
    unread: false,
    type: 'system',
    icon: CheckCircle2,
    color: '#06B6D4',
  },
]

export default function NotificationCenter({ isOpen, onClose }) {
  const [items, setItems] = useState(INITIAL_NOTIFICATIONS)
  const [filter, setFilter] = useState('All')
  const parentRef = useRef(null)

  const filteredItems = items.filter(i => {
    if (filter === 'All') return true
    return i.category === filter
  })

  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 3,
  })

  if (!isOpen) return null

  const unreadCount = items.filter(i => i.unread).length

  const markAllRead = () => {
    setItems(items.map(i => ({ ...i, unread: false })))
  }

  const clearAll = () => {
    setItems([])
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="w-full max-w-sm h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Bell size={18} className="text-indigo-600 dark:text-indigo-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={16} />
            </button>
          </div>

          {/* Sub Header / Actions */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex gap-1">
              {['All', 'Today', 'Yesterday', 'Earlier'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${
                    filter === cat
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={markAllRead}
                title="Mark all as read"
                className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-400"
              >
                <CheckCheck size={14} />
              </button>
              <button
                onClick={clearAll}
                title="Clear all"
                className="p-1 hover:text-rose-500 text-slate-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Virtualized List Container */}
          <div ref={parentRef} className="flex-1 overflow-y-auto p-3">
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-400">
                <Bell size={24} className="mb-2 opacity-40" />
                <p className="text-xs font-semibold">No notifications</p>
                <p className="text-[10px] text-slate-500">You are all caught up!</p>
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map(virtualRow => {
                  const item = filteredItems[virtualRow.index]
                  const Icon = item.icon
                  return (
                    <div
                      key={item.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="pb-2"
                    >
                      <div
                        className={`p-3 h-full rounded-2xl border transition-all flex gap-3 ${
                          item.unread
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/60 dark:border-indigo-800/40'
                            : 'bg-slate-50/40 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/60'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${item.color}15`, color: item.color }}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                            <span className="text-[9px] text-slate-400">{item.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug truncate">{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 font-medium">NeuroSense Alert Telemetry Stream</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
