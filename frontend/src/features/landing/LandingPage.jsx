import React, { useEffect, useState } from 'react'
import { motion, useScroll, useSpring, useTransform, useMotionValue } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Brain, ShieldCheck, Activity, Sparkles, LogIn, ArrowRight, Mic, ClipboardList,
  Stethoscope, ScanLine, ScanEye, UserRound, Building2, FlaskConical, Cpu, KeyRound,
  DatabaseZap, UserCog, ScrollText, CheckCircle2, Menu, X,
  FileCheck, UserPlus, Gauge
} from 'lucide-react'
import Button from '../../shared/components/ui/Button'
import GlassCard from '../../shared/components/ui/GlassCard'
import ThemeToggle from '../../shared/components/ThemeToggle'
import { CountUp, Magnetic, useReducedMotionPref } from '../../shared/motion'

/* ─── Scroll-reveal wrapper (collapses to static when motion is reduced) ── */
function Reveal({ children, delay = 0, className = '', y = 22 }) {
  const reduced = useReducedMotionPref()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─── Section eyebrow + heading ──────────────────────────────────────────── */
function SectionHeading({ eyebrow, eyebrowClass = 'text-primary dark:text-indigo-300', title, className = '' }) {
  return (
    <Reveal className={`text-center max-w-2xl mx-auto mb-14 ${className}`}>
      <span className={`text-xs font-bold uppercase tracking-widest ${eyebrowClass}`}>{eyebrow}</span>
      <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 tracking-tight font-heading">{title}</h2>
    </Reveal>
  )
}

/* ─── Hero product illustration: the analysis console ───────────────────── */
function ConsoleMock() {
  const reduced = useReducedMotionPref()
  const bars = [
    { label: 'MRI Classifier', value: 87, color: '#6366F1' },
    { label: 'Cognitive Battery', value: 72, color: '#10B981' },
    { label: 'Speech Acoustics', value: 64, color: '#38BDF8' },
    { label: 'Risk Factors', value: 41, color: '#F59E0B' },
  ]

  /* Pointer-driven tilt: ±4° toward the cursor, spring-damped. */
  const tiltX = useMotionValue(0)
  const tiltY = useMotionValue(0)
  const rotateX = useSpring(useTransform(tiltY, [-0.5, 0.5], [4, -4]), { stiffness: 180, damping: 22 })
  const rotateY = useSpring(useTransform(tiltX, [-0.5, 0.5], [-5, 5]), { stiffness: 180, damping: 22 })
  const handleTilt = (e) => {
    if (reduced) return
    const rect = e.currentTarget.getBoundingClientRect()
    tiltX.set((e.clientX - rect.left) / rect.width - 0.5)
    tiltY.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  const resetTilt = () => { tiltX.set(0); tiltY.set(0) }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 32, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative max-w-3xl mx-auto mt-16"
      style={{ perspective: 1000 }}
    >
      {/* glow under the console */}
      <div className="absolute -inset-6 bg-gradient-to-r from-indigo-500/20 via-purple-500/15 to-emerald-500/20 blur-3xl rounded-full pointer-events-none" aria-hidden="true" />

      <motion.div
        onMouseMove={handleTilt}
        onMouseLeave={resetTilt}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="relative rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-lg overflow-hidden text-left"
      >
        {/* window chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-secondary/70">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 text-[11px] font-mono font-semibold text-muted">NeuroSense AI · Multi-Modal Assessment</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            LIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-5 p-5">
          {/* MRI tile with scanning sweep */}
          <div className="relative rounded-xl overflow-hidden border border-border bg-slate-950 aspect-square max-h-[190px]">
            {/* neon brain render (same asset as the login hero) */}
            <img
              src="/images/glowing_brain_3d_isolated.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              className={`absolute inset-0 m-auto h-[82%] w-auto object-contain opacity-90 ${reduced ? '' : 'animate-float'}`}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_40%,rgba(168,85,247,0.35),transparent_55%)]" aria-hidden="true" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(56,189,248,0.25),transparent_50%)]" aria-hidden="true" />
            {/* scan sweep */}
            {!reduced && (
              <motion.div
                className="absolute left-0 right-0 h-10 bg-gradient-to-b from-transparent via-cyan-400/25 to-transparent"
                animate={{ top: ['-15%', '100%'] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'linear', repeatDelay: 1.2 }}
                aria-hidden="true"
              />
            )}
            <div className="absolute top-2 left-2 text-[9px] font-mono font-bold text-cyan-300/80">MRI · T1w</div>
            <div className="absolute bottom-2 left-2 text-[9px] font-mono font-bold text-purple-300/90">Grad-CAM</div>
          </div>

          {/* modality bars */}
          <div className="flex flex-col justify-center gap-3.5 min-w-0">
            {bars.map((b, i) => (
              <div key={b.label}>
                <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                  <span className="text-muted">{b.label}</span>
                  <motion.span
                    className="font-mono font-bold text-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 + i * 0.25 }}
                  >
                    <CountUp value={b.value} suffix="%" duration={1.2} />
                  </motion.span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-secondary overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${b.color}88, ${b.color})` }}
                    initial={reduced ? false : { width: '0%' }}
                    animate={{ width: `${b.value}%` }}
                    transition={{ duration: reduced ? 0 : 1.1, delay: reduced ? 0 : 0.9 + i * 0.25, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            ))}

            {/* fused verdict chip — rotating gradient ring marks it as the payload */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2, type: 'spring', damping: 18, stiffness: 260 }}
              className="gradient-border mt-1 flex items-center justify-between gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Brain size={15} className="text-primary dark:text-indigo-300 shrink-0 animate-pulse" />
                <span className="text-[11px] font-bold text-foreground truncate">Fused Assessment · for clinician review</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-primary dark:text-indigo-300 shrink-0">FN 0.31</span>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <p className="text-center text-[10px] text-subtle mt-3">Product illustration — scores shown are placeholders, not real outputs.</p>
    </motion.div>
  )
}

/* ─── Feature data ───────────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Stethoscope, title: 'Dual-Lens Reporting', desc: 'Instantly toggle between empathetic Patient & Family summaries and precision Clinician diagnostic telemetry with printable visit checklists.', tile: 'from-blue-500 to-indigo-600', glow: 'group-hover:shadow-blue-500/25' },
  { icon: Brain, title: 'MRI Deep Neuroimaging', desc: 'ResNet classifier (CN / MCI / AD) over MRI slices with interactive Grad-CAM cortical activation overlays.', tile: 'from-indigo-500 to-indigo-700', glow: 'group-hover:shadow-indigo-500/25' },
  { icon: ClipboardList, title: 'Cognitive Screening Battery', desc: '15-question multi-domain assessment evaluating temporal orientation, memory recall, and executive calculation.', tile: 'from-emerald-500 to-teal-600', glow: 'group-hover:shadow-emerald-500/25' },
  { icon: Mic, title: 'Speech & Acoustic Biomarkers', desc: 'Multi-lingual audio recording with pause frequency, lexical density, and vocal jitter/shimmer extraction.', tile: 'from-sky-500 to-cyan-600', glow: 'group-hover:shadow-sky-500/25' },
  { icon: Activity, title: 'Clinical Risk Profiling', desc: 'Multivariate lifestyle, genetic, and cardiovascular risk factor evaluation correlated across demographic baselines.', tile: 'from-amber-500 to-orange-600', glow: 'group-hover:shadow-amber-500/25' },
  { icon: ScanEye, title: 'Explainable AI (XAI)', desc: 'Clear anatomical region guidance for the hippocampus, ventricles, and temporoparietal cortex behind model decisions.', tile: 'from-purple-500 to-fuchsia-600', glow: 'group-hover:shadow-purple-500/25' },
]

const WORKFLOW = [
  { icon: UserPlus, step: '01', title: 'Patient Registration', desc: 'Enter demographic data and assign clinical IDs.' },
  { icon: ClipboardList, step: '02', title: 'Clinical Intake', desc: 'Gather cognitive tests, speech audio, and DICOM MRI.' },
  { icon: Cpu, step: '03', title: 'AI Fusion Engine', desc: 'Deep learning models process multi-modal signals.' },
  { icon: FileCheck, step: '04', title: 'Decision Support', desc: 'Review AI output, Grad-CAM overlays, and PDF report.' },
]

const AUDIENCE = [
  { icon: Stethoscope, title: 'Neurologists', desc: 'Cross-verify subtle cognitive decline.' },
  { icon: ScanLine, title: 'Radiologists', desc: 'Accelerate MRI slice review workflows.' },
  { icon: FlaskConical, title: 'Researchers', desc: 'Analyze multimodal longitudinal trends.' },
  { icon: Building2, title: 'Hospital Admins', desc: 'Manage role permissions & compliance.' },
  { icon: Cpu, title: 'Clinical AI Teams', desc: 'Validate model certainty and metrics.' },
]

const SECURITY = [
  { icon: KeyRound, title: 'Secure Authentication', desc: 'Role-based access tokens & encrypted sessions.' },
  { icon: DatabaseZap, title: 'Encrypted Storage', desc: 'AES-256 encryption at rest and TLS 1.3 in transit.' },
  { icon: UserCog, title: 'Role-Based Access', desc: 'Doctor & System Administrator permissions.' },
  { icon: ScrollText, title: 'Audit Logging', desc: 'Complete access trail for institutional compliance.' },
]

const STATS = [
  { value: 3, suffix: '', label: 'MRI Classes', sub: 'CN · MCI · AD outputs' },
  { value: 4, suffix: '', label: 'Evidence Streams', sub: 'MRI · cognition · speech · risk' },
  { value: 15, suffix: '', label: 'Cognitive Questions', sub: 'Structured screening battery' },
  { value: 11, suffix: '', label: 'Clinical Domains', desc: 'Covered risk factors', sub: 'Demographics to lifestyle' },
  { value: 100, suffix: '%', label: 'Human Review', sub: 'AI assists, clinicians decide' },
]

const NAV_LINKS = [
  { href: '#overview', label: 'Platform Overview' },
  { href: '#features', label: 'Core Features' },
  { href: '#workflow', label: 'Clinical Workflow' },
  { href: '#who-uses-it', label: 'Who Uses It' },
  { href: '#security', label: 'Security & Compliance' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const { scrollYProgress, scrollY } = useScroll()
  const progressBar = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 })
  /* Aurora field drifts down at ~15% of scroll speed for a depth effect. */
  const auroraY = useTransform(scrollY, [0, 800], [0, 120])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen text-foreground font-sans bg-background scroll-smooth">
      {/* ── Scroll progress hairline ─────────────────────────────────────── */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 origin-left bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 z-[60]"
        style={{ scaleX: progressBar }}
        aria-hidden="true"
      />

      {/* ── Sticky Top Header ────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl transition-all duration-200 border-b ${
        scrolled ? 'bg-surface/90 border-border shadow-xs' : 'bg-surface/60 border-transparent'
      }`}>
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

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-muted">
            {NAV_LINKS.map(link => (
              <a key={link.href} href={link.href} className="hover:text-foreground transition-colors">{link.label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="primary" icon={LogIn} onClick={() => navigate('/login')} className="hidden sm:inline-flex text-xs px-5 btn-sheen">
              Login Portal
            </Button>
            <button
              className="md:hidden p-2 rounded-lg border border-border bg-surface-secondary text-muted hover:text-foreground transition-colors"
              onClick={() => setMobileNavOpen(o => !o)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        <motion.nav
          initial={false}
          animate={mobileNavOpen ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="md:hidden overflow-hidden border-t border-border bg-surface/95 backdrop-blur-xl"
        >
          <div className="px-6 py-4 space-y-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Button variant="primary" icon={LogIn} onClick={() => navigate('/login')} className="w-full mt-2">
              Login Portal
            </Button>
          </div>
        </motion.nav>
      </header>

      {/* ── SECTION 1: HERO ──────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-28 overflow-hidden">
        {/* animated aurora field — parallax-drifts on scroll */}
        <motion.div
          style={{ y: auroraY }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[560px] pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute left-[15%] top-[10%] w-[420px] h-[420px] bg-indigo-500/20 rounded-full blur-[130px] animate-aurora" />
          <div className="absolute right-[8%] top-[30%] w-[340px] h-[340px] bg-purple-500/15 rounded-full blur-[120px] animate-aurora" style={{ animationDelay: '-6s' }} />
          <div className="absolute left-[35%] top-[45%] w-[300px] h-[300px] bg-emerald-500/12 rounded-full blur-[110px] animate-aurora" style={{ animationDelay: '-12s' }} />
        </motion.div>
        <div className="absolute inset-0 grid-pattern pointer-events-none" aria-hidden="true" />

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
            className="text-fluid-hero font-extrabold tracking-tight text-foreground max-w-5xl mx-auto"
          >
            NeuroSense AI <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500">
              AI-Powered Clinical Decision Support
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-muted max-w-3xl mx-auto leading-relaxed"
          >
            Empowering neurologists with unified deep-learning analysis across MRI neuroimaging,
            cognitive questionnaires, acoustic speech summaries, clinical risk scoring, and
            Grad-CAM visual explanations — with a clinician always in the loop.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Magnetic className="w-full sm:w-auto">
              <Button size="lg" variant="primary" icon={LogIn} onClick={() => navigate('/login')} className="w-full sm:w-auto text-sm px-8 btn-sheen shadow-lg shadow-primary/25">
                Login to Workspace
              </Button>
            </Magnetic>
            <Magnetic className="w-full sm:w-auto" strength={0.14}>
              <Button size="lg" variant="secondary" icon={ArrowRight} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto text-sm px-8">
                Explore Features
              </Button>
            </Magnetic>
          </motion.div>

          <ConsoleMock />
        </div>
      </section>

      {/* ── SECTION 2: PLATFORM OVERVIEW ─────────────────────────────────── */}
      <section id="overview" className="py-24 relative border-t border-border bg-surface/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <span className="text-xs font-bold uppercase tracking-widest text-primary dark:text-indigo-300">Platform Vision &amp; Mission</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 mb-6 tracking-tight">Why Early Alzheimer's Detection Matters</h2>
              <p className="text-muted text-sm leading-relaxed mb-4">
                Alzheimer's pathology develops decades before clinical symptoms appear. Traditional diagnosis relies heavily on late-stage cognitive decline observations. NeuroSense AI combines MRI classifier outputs, questionnaire scores, speech summaries, and risk-factor scores into a decision-support summary that a clinician must confirm. No test accuracy is claimed: the MRI checkpoint has no held-out test evaluation.
              </p>
              <div className="space-y-3 mt-6">
                {[
                  { title: 'Human-in-the-Loop AI', desc: 'Designed to assist and amplify physician judgment, not replace clinical diagnosis.' },
                  { title: 'Grad-CAM Visual Explanations', desc: 'MRI attention overlays showing which image regions most influenced the classifier output. Not proof of clinical relevance.' },
                  { title: 'Multimodal Fusion Engine', desc: 'Combines MRI, cognitive, and risk evidence with rule-based weights. Speech summaries are displayed separately and do not change fusion.' },
                ].map((item, idx) => (
                  <Reveal key={idx} delay={0.08 * idx}>
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border shadow-2xs hover:border-primary/40 hover:shadow-sm transition-all duration-200">
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
                        <p className="text-[12px] text-muted mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <GlassCard className="p-6 relative overflow-hidden" glow>
                <div className="text-xs font-mono text-primary dark:text-indigo-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Brain size={16} /> Multimodal Fusion Architecture
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-background rounded-lg border border-border">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold block">MRI Classification</span>
                    <span className="text-muted text-[11px]">CN · MCI · AD classifier output</span>
                  </div>
                  <div className="p-3 bg-background rounded-lg border border-border">
                    <span className="text-sky-600 dark:text-sky-400 font-bold block">Speech Acoustics</span>
                    <span className="text-muted text-[11px]">Pause Frequency &amp; Pitch</span>
                  </div>
                  <div className="p-3 bg-background rounded-lg border border-border">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold block">Cognitive Battery</span>
                    <span className="text-muted text-[11px]">Composite sub-scores</span>
                  </div>
                  <div className="p-3 bg-background rounded-lg border border-border">
                    <span className="text-amber-600 dark:text-amber-400 font-bold block">Clinical Risk Factors</span>
                    <span className="text-muted text-[11px]">Vascular &amp; Family Load</span>
                  </div>
                </div>
                <div className="mt-4 p-4 rounded-xl bg-primary-soft border border-primary/30 text-center">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">NeuroSense AI Fusion Matrix</span>
                  <p className="text-[11px] text-muted mt-1">Rule-based weighted fusion combines modality outputs; reported scores are uncalibrated</p>
                </div>
              </GlassCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: CORE FEATURES ─────────────────────────────────────── */}
      <section id="features" className="py-24 relative border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="Comprehensive Modality Support" title="Core Diagnostic Capabilities" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={0.06 * (i % 3)}>
                <GlassCard
                  variant="interactive"
                  className="p-6 h-full group hover:shadow-md transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.tile} flex items-center justify-center shadow-sm ${f.glow} hover:shadow-lg transition-shadow duration-300 mb-4`}>
                    <f.icon size={21} className="text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-1.5 group-hover:text-primary dark:group-hover:text-indigo-300 transition-colors">{f.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: CLINICAL WORKFLOW ─────────────────────────────────── */}
      <section id="workflow" className="py-24 relative border-t border-border bg-surface/30">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="Streamlined Process" title="Clinical Decision Workflow" eyebrowClass="text-emerald-500" />

          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* connector line (desktop) */}
            <div className="hidden md:block absolute top-[52px] left-[12%] right-[12%] h-px bg-gradient-to-r from-indigo-500/40 via-emerald-500/40 to-indigo-500/40" aria-hidden="true" />
            {WORKFLOW.map((w, i) => (
              <Reveal key={w.step} delay={0.1 * i}>
                <div className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:-translate-y-1 hover:shadow-sm transition-all duration-200 relative group text-center">
                  <div className="relative z-10 w-12 h-12 mx-auto mb-3 rounded-2xl bg-primary-soft border border-primary/25 text-primary dark:text-indigo-300 flex items-center justify-center group-hover:scale-110 group-hover:animate-pulse-ring transition-transform duration-200">
                    <w.icon size={21} aria-hidden="true" />
                  </div>
                  <span className="absolute top-3 right-4 text-2xl font-mono font-bold text-foreground/10 group-hover:text-primary/25 transition-colors">{w.step}</span>
                  <h4 className="text-sm font-bold text-foreground mb-1">{w.title}</h4>
                  <p className="text-xs text-muted">{w.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: NUMBERS ───────────────────────────────────────────── */}
      <section className="py-20 relative border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="Project Capabilities" title="NeuroSense AI by the Numbers" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={0.06 * i}>
                <GlassCard className="p-5 text-center hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 h-full">
                  <p className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground">
                    <CountUp value={s.value} suffix={s.suffix} duration={1.1} />
                  </p>
                  <p className="text-xs font-bold text-primary dark:text-indigo-300 mt-1.5 uppercase tracking-wider">{s.label}</p>
                  <p className="text-[11px] text-muted mt-0.5">{s.sub}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: WHO USES IT ───────────────────────────────────────── */}
      <section id="who-uses-it" className="py-20 relative border-t border-border bg-surface/40">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading eyebrow="User Ecosystem" title="Empowering the Healthcare Spectrum" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {AUDIENCE.map((u, i) => (
              <Reveal key={u.title} delay={0.06 * i}>
                <GlassCard className="p-5 text-center h-full hover:border-primary/40 transition-colors duration-200 group">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-surface-secondary border border-border text-muted group-hover:text-primary group-hover:border-primary/40 flex items-center justify-center transition-colors duration-200">
                    <u.icon size={19} aria-hidden="true" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground mb-1">{u.title}</h4>
                  <p className="text-[11px] text-muted">{u.desc}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: SECURITY & COMPLIANCE ──────────────────────────────── */}
      <section id="security" className="py-20 relative border-t border-border">
        <div className="max-w-7xl mx-auto px-6">
          <SectionHeading
            eyebrow="Enterprise Security"
            title="HIPAA-Ready Architecture"
            eyebrowClass="text-emerald-500"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {SECURITY.map((sec, i) => (
              <Reveal key={sec.title} delay={0.06 * i}>
                <GlassCard className="p-5 h-full hover:border-emerald-500/40 transition-colors duration-200 group">
                  <div className="w-9 h-9 mb-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 flex items-center justify-center">
                    <sec.icon size={17} aria-hidden="true" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground mb-1">{sec.title}</h4>
                  <p className="text-[11px] text-muted">{sec.desc}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 8: CALL TO ACTION ────────────────────────────────────── */}
      <section className="py-20 relative border-t border-border bg-surface">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <div className="gradient-border relative rounded-3xl border border-border bg-card p-10 sm:p-14 overflow-hidden">
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[240px] bg-indigo-500/15 blur-[90px] rounded-full pointer-events-none" aria-hidden="true" />
              <Gauge size={30} className="mx-auto text-primary dark:text-indigo-300 mb-4" aria-hidden="true" />
              <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4 tracking-tight font-heading">
                Ready to Experience AI-Assisted Assessment?
              </h2>
              <p className="text-muted text-sm mb-8">Access the enterprise clinical workspace for unified multi-modal AI diagnostics.</p>
              <Magnetic>
                <Button size="lg" variant="primary" icon={LogIn} onClick={() => navigate('/login')} className="px-8 btn-sheen shadow-lg shadow-primary/25">
                  Access Login Portal
                </Button>
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SECTION 9: FOOTER ────────────────────────────────────────────── */}
      <footer className="py-12 bg-background border-t border-border text-xs text-muted">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <span className="font-bold text-foreground text-sm block">NeuroSense AI</span>
            <span className="text-[11px] text-muted">Clinical Decision Support System v2.4.0 · Investigational — not a medical device</span>
          </div>
          <div className="flex items-center gap-6">
            {NAV_LINKS.slice(0, 3).map(l => (
              <a key={l.href} href={l.href} className="hover:text-foreground transition-colors">{l.label}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
