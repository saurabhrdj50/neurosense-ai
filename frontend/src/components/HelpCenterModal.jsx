import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, HelpCircle, BookOpen, Cpu, Sparkles, MessageSquare, Keyboard, FileText, ChevronRight } from 'lucide-react'

const HELP_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    content: 'Welcome to NeuroSense AI. The platform connects MRI volumetric classification, speech acoustic processing, and cognitive score modeling into a unified multimodal diagnostic report.',
  },
  {
    id: 'workflow',
    title: 'Diagnostic Analysis Workflow',
    icon: Cpu,
    content: 'Step 1: Select or register patient record.\nStep 2: Upload MRI T1/T2 scan series or cognitive batteries.\nStep 3: Run multimodal fusion pipeline.\nStep 4: Review stage classification and confidence metrics.',
  },
  {
    id: 'explainability',
    title: 'Explainable AI & Biomarkers',
    icon: Sparkles,
    content: 'NeuroSense utilizes Grad-CAM activation maps for MRI region saliency (Hippocampal/Entorhinal volume loss) and acoustic spectrogram feature extraction for speech degradation.',
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts Guide',
    icon: Keyboard,
    content: 'Ctrl + K : Command Palette & Search\nCtrl + N : Register New Patient\nCtrl + Shift + A : Start Analysis Intake\nEsc : Close Dialogs & Modals\n? : Open Help Center',
  },
]

export default function HelpCenterModal({ isOpen, onClose }) {
  const [activeId, setActiveId] = useState('getting-started')

  if (!isOpen) return null

  const activeSection = HELP_SECTIONS.find(s => s.id === activeId)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="w-full max-w-3xl h-[520px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <HelpCircle size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Help & Knowledge Center</h3>
                <p className="text-[10px] text-slate-500">Clinical guidance & system documentation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar nav */}
            <div className="w-64 bg-slate-50 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800 p-3 space-y-1">
              {HELP_SECTIONS.map(s => {
                const Icon = s.icon
                const active = activeId === s.id
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-semibold text-left transition-all ${
                      active
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={16} />
                      <span className="truncate">{s.title}</span>
                    </div>
                    <ChevronRight size={14} className="opacity-60" />
                  </button>
                )
              })}
            </div>

            {/* Content panel */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">{activeSection?.title}</h4>
              <p className="whitespace-pre-line leading-relaxed">{activeSection?.content}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-900">
            <span className="text-slate-500">Need direct clinical IT support? Contact clinical-help@stjude.org</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
