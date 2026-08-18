import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, BarChart3, Zap, Users, FileText, Clock, Shield,
  ArrowRight, Star, Plus, CheckCircle, FileUp
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { patientsApi } from '../services'

// Simple fuzzy matching function using character subsequence matching
function fuzzyMatch(text, query) {
  if (!text) return false
  if (!query) return true
  const cleanText = text.toLowerCase()
  const cleanQuery = query.toLowerCase()
  let queryIdx = 0
  for (let textIdx = 0; textIdx < cleanText.length; textIdx++) {
    if (cleanText[textIdx] === cleanQuery[queryIdx]) {
      queryIdx++
      if (queryIdx === cleanQuery.length) return true
    }
  }
  return false
}

export default function CommandPalette({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState([])
  const [favorites, setFavorites] = useState([])
  const resultsContainerRef = useRef(null)

  // Load favorites & recents on mount/open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      
      const storedFavorites = JSON.parse(localStorage.getItem('ns_favorite_commands') || '[]')
      setFavorites(storedFavorites)

      const storedRecents = JSON.parse(localStorage.getItem('ns_recent_searches') || '[]')
      setRecentSearches(storedRecents)

      // Fetch patients using unified service layer
      patientsApi.getAll()
        .then(data => {
          setPatients(data.patients || [])
        })
        .catch(() => {
          setPatients([])
        })
    }
  }, [isOpen])

  // Save/manage favorites
  const toggleFavorite = (cmdId, e) => {
    e.stopPropagation()
    let updated
    if (favorites.includes(cmdId)) {
      updated = favorites.filter(id => id !== cmdId)
    } else {
      updated = [...favorites, cmdId]
    }
    setFavorites(updated)
    localStorage.setItem('ns_favorite_commands', JSON.stringify(updated))
  }

  // Keyboard navigation & keybinds
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
      }
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const COMMANDS = [
    { id: 'dash', label: 'Clinical Dashboard', category: 'Navigation', icon: BarChart3, path: '/dashboard' },
    { id: 'patients', label: 'Patient Registry', category: 'Navigation', icon: Users, path: '/patients' },
    { id: 'analysis', label: 'Start New Diagnostic Analysis', category: 'Actions', icon: Zap, path: '/analysis' },
    { id: 'results', label: 'Diagnostic Results & Reports', category: 'Navigation', icon: FileText, path: '/results' },
    { id: 'history', label: 'Patient Assessment History', category: 'Navigation', icon: Clock, path: '/patients' },
    { id: 'admin', label: 'System Admin Workstation', category: 'Admin', icon: Shield, path: '/admin/dashboard' },
    { id: 'new-patient', label: 'Register New Patient', category: 'Patient actions', icon: Plus, action: 'new-patient' },
    { id: 'high-risk', label: 'Show High Risk Patients', category: 'Patient actions', icon: Users, action: 'high-risk' },
    { id: 'resume-analysis', label: 'Resume Analysis', category: 'Analysis actions', icon: FileUp, path: '/analysis' },
    { id: 'generate-report', label: 'Generate Clinical Report', category: 'Analysis actions', icon: CheckCircle, path: '/results' }
  ]

  // Combine commands and patients into search items
  const searchItems = useMemo(() => {
    const matchedCommands = COMMANDS.map(cmd => ({
      ...cmd,
      type: 'command',
      isFavorite: favorites.includes(cmd.id),
      searchKey: `${cmd.label} ${cmd.category}`
    }))

    const patientItems = patients.map(p => {
      // Find diagnosis, biomarkers info for search matching
      const diagnosis = p.stage || p.status || 'Unknown Stage'
      const biomarkersList = p.biomarkers 
        ? `Abeta: ${p.biomarkers.abeta42||p.biomarkers.abeta||'N/A'} Tau: ${p.biomarkers.tau||'N/A'} pTau: ${p.biomarkers.ptau181||'N/A'} NfL: ${p.biomarkers.nfl||'N/A'}`
        : ''
      const mriInfo = p.mriMetrics ? `MRI Brain Volume: ${p.mriMetrics.brainVolume||'N/A'} Hippocampal: ${p.mriMetrics.hippocampalVolume||'N/A'}` : ''
      const recentActivity = p.scanDate || p.lastAnalysis || ''

      return {
        id: `patient-${p.patient_id}`,
        type: 'patient',
        label: p.name,
        category: 'Patients',
        patientId: p.patient_id,
        diagnosis,
        path: `/history/${p.patient_id}`,
        icon: Users,
        searchKey: `${p.name} ${p.patient_id} ${p.mrn||''} ${diagnosis} ${biomarkersList} ${mriInfo} ${recentActivity}`
      }
    })

    const allItems = [...matchedCommands, ...patientItems]

    if (!query.trim()) {
      // If query is empty: sort commands with favorites first, then patients
      return allItems.sort((a, b) => {
        if (a.type === 'command' && b.type === 'command') {
          if (a.isFavorite && !b.isFavorite) return -1
          if (!a.isFavorite && b.isFavorite) return 1
        }
        if (a.type === 'command' && b.type === 'patient') return -1
        if (a.type === 'patient' && b.type === 'command') return 1
        return 0
      })
    }

    // Filter using subsequence fuzzy match
    return allItems
      .filter(item => fuzzyMatch(item.searchKey, query))
      .sort((a, b) => {
        // Boost favorites to the top
        if (a.isFavorite && !b.isFavorite) return -1
        if (!a.isFavorite && b.isFavorite) return 1
        return 0
      })
  }, [query, patients, favorites])

  // Handle select execution
  const handleSelect = (item) => {
    // Add to recents
    if (query.trim()) {
      const updatedRecents = [query, ...recentSearches.filter(q => q !== query)].slice(0, 5)
      setRecentSearches(updatedRecents)
      localStorage.setItem('ns_recent_searches', JSON.stringify(updatedRecents))
    }

    onClose()
    
    if (item.action === 'new-patient') {
      navigate('/patients?add=true')
    } else if (item.action === 'high-risk') {
      navigate('/patients?risk=High')
    } else if (item.path) {
      navigate(item.path)
    }
  }

  // Handle keyboard event on container
  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % searchItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + searchItems.length) % searchItems.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (searchItems[selectedIndex]) {
        handleSelect(searchItems[selectedIndex])
      }
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const activeEl = resultsContainerRef.current.children[selectedIndex]
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/75 backdrop-blur-xl transition-all">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-white"
        >
          {/* Input Bar */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 font-sans">
            <Search size={18} className="text-indigo-500 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Search patients, reports, biomarkers, studies... (⌘K)"
              className="w-full bg-transparent text-xs font-semibold placeholder:text-slate-400 focus:outline-none"
            />
            <div className="flex items-center gap-1 shrink-0">
              <kbd className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-sm">
                ESC
              </kbd>
            </div>
          </div>

          {/* Recents Helper row */}
          {recentSearches.length > 0 && !query && (
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/20 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-2 font-sans">
              <span className="font-semibold">Recent searches:</span>
              <div className="flex gap-2.5 overflow-x-auto">
                {recentSearches.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(s)
                      setSelectedIndex(0)
                    }}
                    className="hover:underline hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results list */}
          <div
            ref={resultsContainerRef}
            className="max-h-80 overflow-y-auto p-2 space-y-1 font-sans"
          >
            {searchItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No matching clinical command or patient records found
              </div>
            ) : (
              searchItems.map((item, idx) => {
                const Icon = item.icon || Users
                const isFocused = idx === selectedIndex
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors group cursor-pointer ${
                      isFocused ? 'bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-900 dark:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                        isFocused 
                          ? 'bg-indigo-600 border-indigo-700 text-white' 
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold truncate">
                            {item.label}
                          </p>
                          {item.patientId && (
                            <span className="text-[10px] font-mono px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {item.patientId}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {item.type === 'patient' ? `${item.diagnosis} · Patient record` : item.category}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.type === 'command' && (
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(item.id, e)}
                          title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                            item.isFavorite ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        >
                          <Star size={14} fill={item.isFavorite ? 'currentColor' : 'none'} />
                        </button>
                      )}
                      <ArrowRight size={14} className={`text-slate-400 transition-opacity ${isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Keyboard Hints */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-sans">
            <span>Press <kbd className="font-bold">↑↓</kbd> to navigate</span>
            <span>Press <kbd className="font-bold">Enter</kbd> to execute</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
