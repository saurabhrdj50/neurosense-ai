'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  Activity,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  ChevronRight,
  Terminal,
  Zap,
  BarChart3,
  Sliders,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'mri' | 'eeg' | 'speech'>('eeg');

  return (
    <div className="min-h-screen bg-canvas text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* Skip to Content for WCAG 2.4.1 Keyboard Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-canvas focus:font-bold focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-focus"
      >
        Skip to main workstation content
      </a>

      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-canvas/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary" aria-hidden="true">
            <Brain size={18} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-heading font-extrabold text-base tracking-tight text-foreground">
              NeuroSense<span className="text-primary">.AI</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-muted px-1.5 py-0.5 rounded bg-surface border border-border">
              v2.4-Enclave
            </span>
          </div>
        </div>

        {/* Center Live Telemetry Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-surface border border-border text-xs font-mono">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-stable opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-stable" />
          </span>
          <span className="text-foreground-muted">Enclave Gateway:</span>
          <span className="text-status-stable font-bold">ONLINE (12ms)</span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-lg border border-border hover:border-border-accent hover:bg-surface text-xs font-semibold text-muted hover:text-foreground transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[36px] flex items-center"
          >
            Access Portal
          </Link>
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-canvas font-bold text-xs shadow-sm hover:shadow-cyan-500/20 transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[36px]"
          >
            <span>Launch Workstation</span>
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {/* ── Main Hero Section ─────────────────────────────────────────────── */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-16">
        <section aria-labelledby="hero-heading" className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium font-mono">
            <Sparkles size={13} aria-hidden="true" />
            <span>AI-Native High-Density Neural Telemetry Workstation</span>
          </div>

          <h1
            id="hero-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight text-foreground leading-[1.1]"
          >
            Real-Time Neural Telemetry &amp; Multi-Modal Dementia Analytics
          </h1>

          <p className="text-base sm:text-lg text-muted leading-relaxed max-w-2xl mx-auto">
            Synchronous 128-channel EEG processing, automated MRI voxel volumetrics, and predictive longitudinal cognitive biomarkers inside a cryptographic enclave.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-canvas font-bold text-sm shadow-md hover:shadow-cyan-500/25 transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
            >
              <Activity size={16} aria-hidden="true" />
              <span>Enter Telemetry Stream</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>

            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl border border-border hover:border-border-accent hover:bg-surface text-foreground font-semibold text-sm transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[44px]"
            >
              <Terminal size={15} aria-hidden="true" />
              <span>Verify API Key &amp; Enclave</span>
            </Link>
          </div>
        </section>

        {/* ── Live Telemetry Showcase Card (Density 8/10) ──────────────────── */}
        <section
          aria-label="Interactive Telemetry Demonstration"
          className="rounded-2xl border border-border bg-card/90 backdrop-blur-md overflow-hidden shadow-xl"
        >
          {/* Card Chrome Bar */}
          <div className="px-4 py-3 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs font-mono font-bold text-foreground">
                TELEMETRY CONSOLE :: MULTI-MODAL SYNAPSE
              </span>
            </div>

            {/* Modality View Selector */}
            <div className="flex items-center gap-1 bg-surface-secondary p-1 rounded-lg border border-border" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'eeg'}
                onClick={() => setActiveTab('eeg')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  activeTab === 'eeg'
                    ? 'bg-primary text-canvas shadow-xs'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                128-ch EEG Waveform
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'mri'}
                onClick={() => setActiveTab('mri')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  activeTab === 'mri'
                    ? 'bg-primary text-canvas shadow-xs'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                MRI Axial Volumetrics
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'speech'}
                onClick={() => setActiveTab('speech')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  activeTab === 'speech'
                    ? 'bg-primary text-canvas shadow-xs'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Acoustic Formants
              </button>
            </div>
          </div>

          {/* Interactive Telemetry Canvas Area */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 rounded-xl border border-border bg-canvas/60 p-4 relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-mono text-muted">
                  <span className="text-primary font-bold">LIVE TELEMETRY TRACE · FP1-F3 / C3-P3</span>
                  <span>SAMPLE RATE: 1,000 Hz</span>
                </div>

                {/* Simulated Waveform Visualizer */}
                <div className="space-y-4 my-auto">
                  <div className="h-10 w-full flex items-center gap-1">
                    {[40, 65, 30, 85, 95, 45, 20, 60, 75, 40, 88, 55, 30, 70, 90, 60, 45, 80, 65, 35, 75, 50, 85, 40].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-cyan-400/80 rounded-xs transition-all duration-300"
                        style={{ height: `${h}%` }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <div className="h-10 w-full flex items-center gap-1">
                    {[25, 45, 60, 35, 80, 50, 70, 90, 40, 30, 65, 85, 55, 40, 75, 60, 30, 50, 70, 45, 90, 65, 35, 60].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-purple-400/80 rounded-xs transition-all duration-300"
                        style={{ height: `${h}%` }}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-subtle border-t border-border/50 pt-2">
                  <span>SWEEP: 5.0 SECONDS</span>
                  <span className="text-status-stable font-bold">ARTIFACT REJECTION: ACTIVE (SNR 34.2 dB)</span>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-border bg-surface">
                  <p className="text-[10px] font-mono uppercase text-subtle">Electrode Impedance</p>
                  <p className="text-lg font-bold font-mono text-foreground mt-0.5">3.8 kΩ</p>
                  <span className="text-[10px] text-status-stable font-semibold">Within Spec (&lt;5 kΩ)</span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface">
                  <p className="text-[10px] font-mono uppercase text-subtle">Packet Jitter</p>
                  <p className="text-lg font-bold font-mono text-foreground mt-0.5">0.42 ms</p>
                  <span className="text-[10px] text-status-stable font-semibold">Zero Frame Drops</span>
                </div>
                <div className="p-3 rounded-xl border border-border bg-surface">
                  <p className="text-[10px] font-mono uppercase text-subtle">Hippocampal Atrophy</p>
                  <p className="text-lg font-bold font-mono text-status-warning mt-0.5">-1.4%</p>
                  <span className="text-[10px] text-status-warning font-semibold">MCI Threshold Detected</span>
                </div>
              </div>
            </div>

            {/* Side Clinical Status & Decision Support Tile */}
            <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">AI Classification</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-status-warning border border-amber-500/20">
                    High Risk
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <p className="text-xs text-muted">Primary Consensus Stage</p>
                  <p className="text-sm font-bold text-foreground">Mild Cognitive Impairment (MCI)</p>
                  <p className="text-[11px] font-mono text-primary font-semibold">Confidence: 94.2%</p>
                </div>

                <div className="space-y-1.5 text-xs text-muted">
                  <p className="font-semibold text-foreground">Contributing Modalities:</p>
                  <ul className="space-y-1 text-[11px] font-mono">
                    <li className="flex items-center justify-between">
                      <span>• MRI Voxel Volumetrics:</span>
                      <span className="text-foreground font-bold">88% AD Align</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>• Acoustic Speech Jitter:</span>
                      <span className="text-foreground font-bold">76% MCI Align</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>• Cognitive MMSE Profile:</span>
                      <span className="text-foreground font-bold">24 / 30</span>
                    </li>
                  </ul>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-hover text-canvas font-bold text-xs transition-all flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[36px]"
              >
                <span>Open Diagnostic Dossier</span>
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Bento Grid: Platform Capabilities ───────────────────────────── */}
        <section aria-labelledby="features-heading" className="space-y-8">
          <div className="text-center space-y-2">
            <h2 id="features-heading" className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">
              Clinical-Grade Neuro-Sensing Architecture
            </h2>
            <p className="text-sm sm:text-base text-muted max-w-xl mx-auto">
              Engineered for neurologists, research institutions, and clinical trial developers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-primary flex items-center justify-center">
                <Brain size={20} />
              </div>
              <h3 className="font-bold text-base text-foreground">Automated Voxel Parcellation</h3>
              <p className="text-xs text-muted leading-relaxed">
                Volumetric sub-segmentation of the hippocampus, entorhinal cortex, and ventricular expansion with longitudinal atrophy tracking.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Activity size={20} />
              </div>
              <h3 className="font-bold text-base text-foreground">128-ch Real-Time EEG Telemetry</h3>
              <p className="text-xs text-muted leading-relaxed">
                Synchronous multi-channel streaming with sub-15ms latency, live bandpass filtering (Theta, Alpha, Beta, Gamma), and artifact rejection.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-card space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-status-stable flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold text-base text-foreground">Cryptographic Enclave Security</h3>
              <p className="text-xs text-muted leading-relaxed">
                Zero-knowledge data enclaves ensure HIPAA &amp; GDPR compliance. Telemetry and MRI scans remain encrypted both in transit and in compute.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface py-8 px-4 sm:px-6 mt-16 text-xs text-muted">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-primary" />
            <span className="font-bold text-foreground">NeuroSense AI</span>
            <span>— Clinical Decision Support Platform</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] text-subtle">
            <span>WCAG 2.1 AA Compliant</span>
            <span>•</span>
            <span>FDA SaMD Tier II Ready</span>
            <span>•</span>
            <span>Enclave SHA-256 Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

