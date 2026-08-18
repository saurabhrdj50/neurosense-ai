import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Brain, ShieldCheck, Activity, Sparkles, LogIn, ArrowRight,
  TestTube, Mic, PenTool, Lock, Zap, CheckCircle2, Hospital, Stethoscope,
  BarChart3, Users, UserCheck, FileText, ChevronRight, HelpCircle, Building2, Eye, X, Send
} from 'lucide-react'
import Button from '../../components/ui/Button'
import GlassCard from '../../components/ui/GlassCard'
import ThemeToggle from '../../components/ThemeToggle'

export default function LandingPage() {
  const navigate = useNavigate()
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  const [demoSubmitted, setDemoSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institution: '',
    role: 'Clinician / Physician'
  })

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleDemoSubmit = (e) => {
    e.preventDefault()
    setDemoSubmitted(true)
    setTimeout(() => {
      setDemoSubmitted(false)
      setIsDemoModalOpen(false)
      setFormData({ name: '', email: '', institution: '', role: 'Clinician / Physician' })
    }, 2500)
  }


  return (
    <div className="min-h-screen text-foreground font-sans selection:bg-indigo-500 selection:text-white bg-background transition-colors duration-200">
      {/* ── Sticky Top Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-surface/85 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-foreground">NeuroSense AI</span>
              <span className="block text-[10px] uppercase tracking-widest text-indigo-500 dark:text-indigo-400 font-mono font-semibold">
                Clinical Decision Support
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-foreground-muted">
            <button onClick={scrollToFeatures} className="hover:text-foreground transition-colors">Core Features</button>
            <a href="#overview" className="hover:text-foreground transition-colors">Platform Overview</a>
            <a href="#workflow" className="hover:text-foreground transition-colors">Clinical Workflow</a>
            <a href="#who-uses-it" className="hover:text-foreground transition-colors">Who Uses It</a>
            <a href="#security" className="hover:text-foreground transition-colors">Security & Compliance</a>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" onClick={scrollToFeatures} className="hidden sm:inline-flex text-xs">
              Learn More
            </Button>
            <Button variant="primary" icon={LogIn} onClick={() => navigate('/login')} className="text-xs px-5">
              Login Portal
            </Button>
          </div>
        </div>
      </header>

      {/* ── SECTION 1: HERO ──────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-28 overflow-hidden border-b border-border">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-600/15 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-6"
          >
            <Sparkles size={14} className="text-indigo-500 dark:text-indigo-400" /> Enterprise Healthcare AI Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-5xl mx-auto leading-[1.1]"
          >
            NeuroSense AI <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500">
              AI-Powered Clinical Decision Support System
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-foreground-muted max-w-3xl mx-auto leading-relaxed"
          >
            Empowering neurologists and healthcare institutions with unified deep learning analysis across 3D MRI Neuroimaging, Cognitive Batteries, Acoustic Speech Signals, Clinical Risk Profiling, and Transparent Explainable AI (SHAP).
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" variant="primary" icon={LogIn} onClick={() => navigate('/login')} className="w-full sm:w-auto text-sm px-8">
              Login to Workspace
            </Button>
            <Button size="lg" variant="secondary" icon={ArrowRight} onClick={scrollToFeatures} className="w-full sm:w-auto text-sm px-8">
              Learn More
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: PLATFORM OVERVIEW ─────────────────────────────────── */}
      <section id="overview" className="py-24 relative border-b border-border bg-surface/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Platform Vision & Mission</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 mb-6">Why Early Alzheimer's Detection Matters</h2>
              <p className="text-foreground-muted text-sm leading-relaxed mb-4">
                Alzheimer's pathology develops decades before clinical symptoms appear. Traditional diagnosis relies heavily on late-stage cognitive decline observations. NeuroSense AI changes this paradigm by fusing subtle digital biomarkers into an actionable, clinical-grade verdict.
              </p>
              <div className="space-y-3 mt-6">
                {[
                  { title: 'Human-in-the-Loop AI', desc: 'Designed to assist and amplify physician judgment, not replace clinical diagnosis.' },
                  { title: 'SHAP Feature Attributions', desc: 'Transparent decision-making showing exact regional and biomarker weights driving predictive scores.' },
                  { title: 'Multimodal Fusion Engine', desc: 'Cross-verifies structural MRI imaging with cognitive tests, speech acoustic pauses, and clinical risk factors.' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-surface border border-border shadow-sm">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                      <p className="text-[12px] text-foreground-muted mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <GlassCard className="p-6 relative overflow-hidden" glow>
              <div className="text-xs font-mono text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Brain size={16} /> Multimodal Fusion Architecture
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-background rounded-lg border border-border">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold block">3D MRI Scans</span>
                  <span className="text-foreground-muted text-[11px]">Hippocampal Volumetrics</span>
                </div>
                <div className="p-3 bg-background rounded-lg border border-border">
                  <span className="text-sky-600 dark:text-sky-400 font-bold block">Speech Acoustics</span>
                  <span className="text-foreground-muted text-[11px]">Pause Frequency & Pitch</span>
                </div>
                <div className="p-3 bg-background rounded-lg border border-border">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold block">Cognitive Battery</span>
                  <span className="text-foreground-muted text-[11px]">MMSE / MoCA Sub-scores</span>
                </div>
                <div className="p-3 bg-background rounded-lg border border-border">
                  <span className="text-amber-600 dark:text-amber-400 font-bold block">Clinical Risk Factors</span>
                  <span className="text-foreground-muted text-[11px]">Vascular & Family Load</span>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">NeuroSense AI Fusion Matrix</span>
                <p className="text-[11px] text-foreground-muted mt-1">Cross-attention neural network synthesizes unified staging & certainty meter</p>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: CORE FEATURES ─────────────────────────────────────── */}
      <section id="features" className="py-24 relative border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Comprehensive Modality Support</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2">Core Diagnostic Capabilities</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: '🧠 MRI Analysis', desc: 'Volumetric 3D structural segmentation identifying hippocampal volume reduction and cortical thickness.', color: '#6366F1' },
              { title: '📊 Cognitive Assessment', desc: 'Standardized sub-score analysis normalizing MMSE/MoCA orientation, executive function, and recall.', color: '#10B981' },
              { title: '🎤 Speech Analysis', desc: 'Natural language processing capturing pause duration, hesitation cadence, and vocal fundamental tremor.', color: '#38BDF8' },
              { title: '📋 Clinical Risk Profile', desc: 'Lancet dementia risk score assessment modeling vascular health and familial history factors.', color: '#F59E0B' },
              { title: '👤 Patient Demographics', desc: 'Age, education level, and baseline clinical history correlation for tailored risk indexing.', color: '#EC4899' },
              { title: '🤖 Explainable AI (SHAP)', desc: 'Transparent attribution heatmaps explaining the exact neural feature weights driving risk scores.', color: '#A855F7' },
            ].map((f, i) => (
              <GlassCard key={i} className="p-6 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 cursor-pointer group">
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-indigo-500 dark:group-hover:text-indigo-300 transition-colors">{f.title}</h3>
                <p className="text-xs text-foreground-muted leading-relaxed transition-colors">{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: CLINICAL WORKFLOW ─────────────────────────────────── */}
      <section id="workflow" className="py-24 relative border-b border-border bg-surface/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Streamlined Process</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2">Clinical Decision Workflow</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Patient Registration', desc: 'Enter demographic data and assign clinical IDs.' },
              { step: '02', title: 'Clinical Intake', desc: 'Gather cognitive tests, speech audio, and DICOM MRI.' },
              { step: '03', title: 'AI Fusion Engine', desc: 'Deep learning models process multi-modal signals.' },
              { step: '04', title: 'Clinical Decision Support', desc: 'Review AI verdict, SHAP attributions, and PDF report.' },
            ].map((w, i) => (
              <div key={i} className="p-5 rounded-2xl bg-surface border border-border hover:border-emerald-500/40 transition-all duration-200 relative group shadow-sm">
                <span className="text-3xl font-mono font-bold text-indigo-500/40 group-hover:text-emerald-500 transition-colors block mb-2">{w.step}</span>
                <h4 className="text-sm font-bold text-foreground mb-1">{w.title}</h4>
                <p className="text-xs text-foreground-muted transition-colors">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: WHY CHOOSE NEUROSENSE AI ────────────────────────────── */}
      <section className="py-20 relative border-b border-border">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Proven Performance</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 mb-12">Why Choose NeuroSense AI</h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { val: '94.8%', label: 'Diagnostic Accuracy', sub: 'OASIS & ADNI benchmarked' },
              { val: '5+', label: 'AI Modalities', sub: 'Unified in single engine' },
              { val: '< 30 sec', label: 'Analysis Time', sub: 'Instant staging' },
              { val: 'SHAP AI', label: 'Explainable', sub: 'Sub-regional attributions' },
              { val: 'Clinical Grade', label: 'Decision Support', sub: 'Human-in-the-loop' },
            ].map((s, i) => (
              <GlassCard key={i} className="p-4 text-center hover:border-indigo-500/50 transition-all duration-200">
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{s.val}</p>
                <p className="text-xs font-bold text-indigo-500 dark:text-indigo-300 mt-1 uppercase tracking-wider">{s.label}</p>
                <p className="text-[11px] text-foreground-muted mt-0.5">{s.sub}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>


      {/* ── SECTION 6: WHO USES IT ───────────────────────────────────────── */}
      <section id="who-uses-it" className="py-20 relative border-b border-border bg-surface/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">User Ecosystem</span>
            <h2 className="text-3xl font-extrabold text-foreground mt-2">Empowering the Healthcare Spectrum</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {[
              { title: 'Neurologists', desc: 'Cross-verify subtle cognitive decline.' },
              { title: 'Radiologists', desc: 'Automate 3D brain slice segmentations.' },
              { title: 'Researchers', desc: 'Analyze multimodal longitudinal trends.' },
              { title: 'Hospital Admins', desc: 'Manage role permissions & compliance.' },
              { title: 'Clinical AI Teams', desc: 'Validate model certainty and metrics.' },
            ].map((u, i) => (
              <GlassCard key={i} className="p-4 text-center">
                <h4 className="text-xs font-bold text-foreground mb-1">{u.title}</h4>
                <p className="text-[11px] text-foreground-muted">{u.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: SECURITY & COMPLIANCE ──────────────────────────────── */}
      <section id="security" className="py-20 relative border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Enterprise Security</span>
            <h2 className="text-3xl font-extrabold text-foreground mt-1">HIPAA-Ready Architecture</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { title: 'Secure Authentication', desc: 'Role-based access tokens & encrypted sessions.' },
              { title: 'Encrypted Storage', desc: 'AES-256 encryption at rest and TLS 1.3 in transit.' },
              { title: 'Role-Based Access', desc: 'Doctor & System Administrator permissions.' },
              { title: 'Audit Logging', desc: 'Complete access trail for institutional compliance.' },
            ].map((sec, i) => (
              <GlassCard key={i} className="p-4">
                <h4 className="text-xs font-bold text-foreground mb-1">{sec.title}</h4>
                <p className="text-[11px] text-foreground-muted">{sec.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 8: CALL TO ACTION ────────────────────────────────────── */}
      <section className="py-20 relative bg-surface border-b border-border">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
            Ready to Experience AI-Assisted Alzheimer's Assessment?
          </h2>
          <p className="text-foreground-muted text-sm mb-8">Access the enterprise clinical workspace or request institutional demo access.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="primary" icon={LogIn} onClick={() => navigate('/login')} className="w-full sm:w-auto px-8">
              Access Login Portal
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setIsDemoModalOpen(true)} className="w-full sm:w-auto px-8">
              Request Demo Access
            </Button>
          </div>
        </div>
      </section>

      {/* ── SECTION 9: FOOTER ────────────────────────────────────────────── */}
      <footer className="py-12 bg-background border-t border-border text-xs text-foreground-muted">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="font-bold text-foreground text-sm block">NeuroSense AI</span>
            <span className="text-[11px] text-foreground-muted">Clinical Decision Support System v2.4.0</span>
          </div>
          <div className="flex items-center gap-6 text-foreground-muted">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors">Institutional Contact</a>
          </div>
        </div>
      </footer>

      {/* ── Institutional Demo Access Request Modal ───────────────────────── */}
      <AnimatePresence>
        {isDemoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden"
            >
              <button
                onClick={() => setIsDemoModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>

              {demoSubmitted ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Request Received</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    Thank you! Institutional demo credentials will be dispatched to <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formData.email}</span> upon verification.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      <Hospital size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">Request Institutional Access</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Request clinical trial workspace access</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Dr. Eleanor Vance"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Institutional Email</label>
                    <input
                      type="email"
                      required
                      placeholder="e.vance@medical-center.org"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Hospital / Institution Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Johns Hopkins Neurology Dept."
                      value={formData.institution}
                      onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Clinical Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option>Clinician / Physician</option>
                      <option>Radiologist</option>
                      <option>Clinical Researcher</option>
                      <option>Hospital Administrator</option>
                    </select>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <Button type="button" variant="ghost" onClick={() => setIsDemoModalOpen(false)} className="flex-1 text-xs">
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" icon={Send} className="flex-1 text-xs">
                      Submit Request
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

