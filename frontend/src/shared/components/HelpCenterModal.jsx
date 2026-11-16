import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, HelpCircle, BookOpen, Cpu, Sparkles, MessageSquare, Keyboard, FileText, ChevronRight } from 'lucide-react'

const HELP_SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    content: 'Welcome to NeuroSense AI. The platform combines MRI classifier outputs, speech summaries, and questionnaire-based cognitive and risk scores into a decision-support report that a clinician must confirm. It does not diagnose.',
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
    content: 'NeuroSense shows Grad-CAM attention overlays for the MRI classification (which image regions influenced the output, not proof of clinical relevance) alongside pause-category, pitch-variation, and lexical statistics from speech.',
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="w-full max-w-3xl max-h-[92vh] sm:h-[540px] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border bg-card">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold shrink-0">
                <HelpCircle size={18} aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground font-heading">Help &amp; Knowledge Center</h3>
                <p className="text-[11px] text-muted">Clinical guidance &amp; system documentation</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close help center dialog"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
            {/* Sidebar nav — horizontally scrolls on mobile (375px), vertical on desktop */}
            <div className="w-full sm:w-64 bg-surface-secondary/60 border-b sm:border-b-0 sm:border-r border-border p-2 sm:p-3 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible shrink-0">
              {HELP_SECTIONS.map(s => {
                const Icon = s.icon
                const active = activeId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveId(s.id)}
                    className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl text-xs font-semibold text-left transition-all shrink-0 sm:w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      active
                        ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                        : 'text-muted hover:text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      <Icon size={16} aria-hidden="true" className="shrink-0" />
                      <span className="truncate whitespace-nowrap sm:whitespace-normal">{s.title}</span>
                    </div>
                    <ChevronRight size={14} className="opacity-60 hidden sm:block shrink-0" aria-hidden="true" />
                  </button>
                )
              })}
            </div>

            {/* Content panel */}
            <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-foreground-muted bg-card">
              <h4 className="text-base sm:text-lg font-bold text-foreground font-heading">{activeSection?.title}</h4>
              <p className="whitespace-pre-line leading-relaxed">{activeSection?.content}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] bg-surface-secondary/40">
            <span className="text-muted">Need direct clinical IT support? Contact clinical-help@stjude.org</span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[38px] rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full sm:w-auto text-center"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
