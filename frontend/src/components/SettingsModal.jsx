import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Sun, Moon, Laptop, SlidersHorizontal, User, Shield, Bell,
  Info, Globe, Clock, Layers, Sparkles, Key, Smartphone, FileCode2
} from 'lucide-react'
import { useTheme } from '../context/ThemeProvider'

const TABS = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'appearance', label: 'Appearance', icon: Sun },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'about', label: 'About', icon: Info },
]

export default function SettingsModal({ isOpen, onClose }) {
  const { theme, setTheme, fontSize, setFontSize, motion: motionPref, setMotion } = useTheme()
  const [activeTab, setActiveTab] = useState('general')

  // Preferences State
  const [general, setGeneral] = useState({
    dateFormat: 'YYYY-MM-DD',
    timeZone: 'UTC-5 (EST)',
    landingPage: '/dashboard',
    autoSave: '30s',
  })

  const [appearance, setAppearance] = useState({
    density: 'normal',
    glassEffects: true,
  })

  const [notifications, setNotifications] = useState({
    analysisCompleted: true,
    patientAdded: true,
    reportGenerated: true,
    systemAlerts: true,
    emailNotifications: false,
    desktopNotifications: true,
  })

  const [profile, setProfile] = useState({
    name: 'Dr. Eleanor Vance',
    department: 'Cognitive Neurology & Memory Care',
    hospital: 'St. Jude Neurological Institute',
    license: 'MD-8849201',
    email: 'e.vance@stjude-health.org',
    phone: '+1 (555) 234-5678',
  })

  const [security, setSecurity] = useState({
    sessionTimeout: '30 mins',
  })

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-4xl h-[600px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl text-slate-900 dark:text-white flex overflow-hidden"
        >
          {/* ── Settings Left Sidebar ───────────────────────────────────── */}
          <aside className="w-56 bg-slate-50 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between select-none">
            <div>
              <div className="flex items-center gap-2.5 px-3 py-3 mb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <SlidersHorizontal size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight">Settings Center</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Enterprise Workstation</p>
                </div>
              </div>

              <nav className="space-y-1">
                {TABS.map(tab => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="p-3 rounded-2xl bg-slate-200/50 dark:bg-slate-800/40 text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
              <p className="font-semibold text-slate-700 dark:text-slate-300">NeuroSense AI Enterprise</p>
              <p>v2.4.0 · Build #8849</p>
            </div>
          </aside>

          {/* ── Settings Right Content Panel ─────────────────────────────── */}
          <main className="flex-1 flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold capitalize tracking-tight">
                {TABS.find(t => t.id === activeTab)?.label} Configuration
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 1. GENERAL */}
              {activeTab === 'general' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Application Version</label>
                      <input disabled value="v2.4.0-enterprise" className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Language</label>
                      <select disabled className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                        <option>English (US) — Clinical</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Date Format</label>
                      <select
                        value={general.dateFormat}
                        onChange={e => setGeneral({ ...general, dateFormat: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US Clinical)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Time Zone</label>
                      <select
                        value={general.timeZone}
                        onChange={e => setGeneral({ ...general, timeZone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="UTC-5 (EST)">UTC-5 (Eastern Time)</option>
                        <option value="UTC-6 (CST)">UTC-6 (Central Time)</option>
                        <option value="UTC-8 (PST)">UTC-8 (Pacific Time)</option>
                        <option value="UTC+0 (GMT)">UTC+0 (London / GMT)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Default Landing Workspace</label>
                      <select
                        value={general.landingPage}
                        onChange={e => setGeneral({ ...general, landingPage: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="/dashboard">Clinical Dashboard</option>
                        <option value="/analysis">Diagnostic Analysis Intake</option>
                        <option value="/patients">Patient Registry</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Auto Save Draft Interval</label>
                      <select
                        value={general.autoSave}
                        onChange={e => setGeneral({ ...general, autoSave: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      >
                        <option value="15s">Every 15 Seconds</option>
                        <option value="30s">Every 30 Seconds</option>
                        <option value="60s">Every 1 Minute</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. APPEARANCE */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  {/* Theme */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Theme Mode</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Laptop },
                      ].map(item => {
                        const Icon = item.icon
                        const active = theme === item.id
                        return (
                          <button
                            key={item.id}
                            onClick={() => setTheme(item.id)}
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition-all ${
                              active
                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <Icon size={18} className="mb-1" />
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Font Size & Typography</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'compact', label: 'Compact' },
                        { id: 'comfortable', label: 'Comfortable' },
                        { id: 'large', label: 'Large' },
                      ].map(item => {
                        const active = fontSize === item.id
                        return (
                          <button
                            key={item.id}
                            onClick={() => setFontSize(item.id)}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                              active
                                ? 'border-indigo-600 bg-indigo-600 text-white font-bold'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {item.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Motion & Effects */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Visual Effects & Animations</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setMotion(motionPref === 'full' ? 'reduced' : 'full')}
                        className={`p-3 rounded-xl border text-xs text-left flex items-center justify-between ${
                          motionPref === 'full' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">Enable Animations</p>
                          <p className="text-[10px] text-slate-400">Smooth micro-interactions</p>
                        </div>
                        <input type="checkbox" checked={motionPref === 'full'} readOnly className="rounded text-indigo-600" />
                      </button>

                      <button
                        onClick={() => setAppearance({ ...appearance, glassEffects: !appearance.glassEffects })}
                        className={`p-3 rounded-xl border text-xs text-left flex items-center justify-between ${
                          appearance.glassEffects ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">Glassmorphism Effects</p>
                          <p className="text-[10px] text-slate-400">Backdrop blurred cards</p>
                        </div>
                        <input type="checkbox" checked={appearance.glassEffects} readOnly className="rounded text-indigo-600" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  {[
                    { id: 'analysisCompleted', label: 'Analysis Completed', desc: 'Notify when diagnostic fusion pipeline finishes' },
                    { id: 'patientAdded', label: 'Patient Added', desc: 'Alert when a new patient record is registered' },
                    { id: 'reportGenerated', label: 'Report Export Ready', desc: 'Notify when PDF export is synthesized' },
                    { id: 'systemAlerts', label: 'System Telemetry Alerts', desc: 'Real-time AI model availability updates' },
                    { id: 'emailNotifications', label: 'Email Digest Notifications', desc: 'Send daily clinical summaries via email' },
                    { id: 'desktopNotifications', label: 'Browser Desktop Alerts', desc: 'System level desktop popups' },
                  ].map(n => (
                    <div key={n.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{n.label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{n.desc}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications[n.id]}
                        onChange={e => setNotifications({ ...notifications, [n.id]: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 4. PROFILE */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
                      EV
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{profile.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{profile.department}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Clinician Name</label>
                      <input
                        value={profile.name}
                        onChange={e => setProfile({ ...profile, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Medical License No.</label>
                      <input
                        value={profile.license}
                        onChange={e => setProfile({ ...profile, license: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Department</label>
                      <input
                        value={profile.department}
                        onChange={e => setProfile({ ...profile, department: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500">Hospital / Affiliation</label>
                      <input
                        value={profile.hospital}
                        onChange={e => setProfile({ ...profile, hospital: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 5. SECURITY */}
              {activeTab === 'security' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Change Credentials</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="password" placeholder="Current Password" className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700" />
                      <input type="password" placeholder="New Password" className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="text-xs font-bold">Two-Factor Authentication (2FA)</p>
                      <p className="text-[11px] text-slate-500">Hardware token or authenticator app</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Coming Soon
                    </span>
                  </div>
                </div>
              )}

              {/* 6. ABOUT */}
              {activeTab === 'about' && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                    <h4 className="font-bold text-sm text-indigo-600 dark:text-indigo-400">NeuroSense AI Enterprise</h4>
                    <p className="text-slate-600 dark:text-slate-300">
                      Multimodal Diagnostic Decision Support System for Neurodegenerative Disorders.
                    </p>
                    <div className="pt-2 text-[11px] text-slate-500 space-y-1 font-mono">
                      <p>Version: 2.4.0-production</p>
                      <p>Build: #8849-2026.07</p>
                      <p>Engine: PyTorch 2.2 + Flask AI Orchestrator</p>
                      <p>License: HIPAA Enterprise Certified</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-900">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors shadow-md"
              >
                Save Preferences
              </button>
            </div>
          </main>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
