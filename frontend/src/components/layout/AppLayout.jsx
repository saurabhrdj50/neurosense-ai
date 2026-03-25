import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

/**
 * AppLayout — Main dashboard shell wrapping all protected pages.
 * Sidebar + TopBar + scrollable content area + FAB
 */
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()

  return (
    <div className="flex h-screen overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopBar onMenuClick={() => setSidebarOpen(o => !o)} />
        <main
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6"
          style={{ scrollbarGutter: 'stable' }}
        >
          <Outlet />
        </main>
      </div>

      {/* Floating Action Button for mobile */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/analysis')}
        className="fixed bottom-6 right-6 z-50 lg:hidden w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
        }}
      >
        <Plus size={24} color="white" />
      </motion.button>
    </div>
  )
}
