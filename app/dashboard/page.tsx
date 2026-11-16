'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  Brain,
  Cpu,
  Layers,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Download,
  Share2,
  FileText,
  RefreshCw,
  Zap,
  Users,
  Search,
  Check,
  Filter,
} from 'lucide-react';

/* ─── Mock Data: Active Sensor Streams & Patient Cohorts ─── */
const ACTIVE_STREAMS = [
  { id: 'str-01', name: '128-ch EEG Vertex', patientId: 'PT-9042', status: 'live', rate: '1000 Hz', latency: '12ms' },
  { id: 'str-02', name: 'BOLD fMRI Axial', patientId: 'PT-9042', status: 'live', rate: '2.5 Hz', latency: '14ms' },
  { id: 'str-03', name: 'Acoustic Jitter', patientId: 'PT-8819', status: 'idle', rate: '48 kHz', latency: '—' },
  { id: 'str-04', name: 'Eye-Tracking Saccades', patientId: 'PT-9104', status: 'live', rate: '250 Hz', latency: '8ms' },
];

const PATIENT_COHORTS = [
  { id: 'cohort-1', name: 'MCI Elevated Risk', count: 18, risk: 'warning' },
  { id: 'cohort-2', name: 'Normal Aging Baseline', count: 42, risk: 'stable' },
  { id: 'cohort-3', name: 'Rapid Progressors', count: 6, risk: 'danger' },
];

const EEG_CHANNELS = [
  { id: 'FP1-F3', label: 'FP1-F3 (Frontal Pole)', band: 'Theta (4–8 Hz)', color: '#06B6D4' },
  { id: 'C3-P3', label: 'C3-P3 (Sensorimotor)', band: 'Alpha (8–12 Hz)', color: '#818CF8' },
  { id: 'P3-O1', label: 'P3-O1 (Parieto-Occipital)', band: 'Beta (13–30 Hz)', color: '#10B981' },
  { id: 'T3-T5', label: 'T3-T5 (Temporal Lateral)', band: 'Hippocampal Gamma', color: '#F59E0B' },
];

export default function DashboardPage() {
  /* ── Layout & Interactivity States ── */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedStreamId, setSelectedStreamId] = useState('str-01');
  const [isPlaying, setIsPlaying] = useState(true);
  const [gainLevel, setGainLevel] = useState<'1x' | '2x' | '5x'>('2x');
  const [windowSec, setWindowSec] = useState<'2s' | '5s' | '10s'>('5s');
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  /* ── Waveform Telemetry Engine ── */
  const [waveOffset, setWaveOffset] = useState(0);
  const requestRef = useRef<number | null>(null);

  const animateWaveform = useCallback(() => {
    if (isPlaying) {
      setWaveOffset((prev) => (prev + 1.8) % 360);
    }
    requestRef.current = requestAnimationFrame(animateWaveform);
  }, [isPlaying]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animateWaveform);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animateWaveform]);

  /* ── Helper: Trigger Action with Feedback ── */
  const handleTriggerAction = (actionName: string) => {
    setIsProcessingAction(true);
    setFeedbackMessage(null);
    setTimeout(() => {
      setIsProcessingAction(false);
      setFeedbackMessage(`${actionName} completed successfully.`);
      setTimeout(() => setFeedbackMessage(null), 3500);
    }, 900);
  };

  /* ── Math Generator for Channel Waveforms ── */
  const generateWavePath = (frequency: number, amplitude: number, phaseShift: number) => {
    const points: string[] = [];
    const width = 640;
    const height = 48;
    const midY = height / 2;
    const gainMultiplier = gainLevel === '1x' ? 0.6 : gainLevel === '2x' ? 1.0 : 1.8;

    for (let x = 0; x <= width; x += 4) {
      const rad = ((x + waveOffset * 2.5 + phaseShift) * Math.PI) / 180;
      // Multi-harmonic synthesized EEG rhythm
      const y =
        midY +
        (Math.sin(rad * frequency) * amplitude * 0.7 +
          Math.sin(rad * frequency * 2.2) * (amplitude * 0.3) +
          (Math.random() - 0.5) * 1.5) *
          gainMultiplier;
      points.push(`${x === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return points.join(' ');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-foreground font-body select-none">
      {/* ── 1. COLLAPSIBLE SIDEBAR: Streams & Cohorts ───────────────── */}
      <aside
        aria-label="Sensor Streams & Patient Cohorts"
        className={`h-full bg-surface border-r border-border transition-all duration-200 ease-out flex flex-col justify-between shrink-0 z-30 ${
          sidebarCollapsed ? 'w-14' : 'w-64 sm:w-72'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Sidebar Header */}
          <div className="h-12 px-3 border-b border-border flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <Brain size={16} className="text-primary shrink-0" aria-hidden="true" />
                <span className="font-heading font-extrabold text-xs text-foreground tracking-tight truncate">
                  Sensor Telemetry
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? 'Expand streams sidebar' : 'Collapse streams sidebar'}
              className="p-1.5 rounded-lg hover:bg-card text-muted hover:text-foreground transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ml-auto"
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Streams & Cohorts Scrollable List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* Active Sensor Streams Group */}
            <div>
              {!sidebarCollapsed && (
                <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-mono uppercase tracking-wider text-muted font-bold">
                  <span>Live Feeds ({ACTIVE_STREAMS.length})</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-status-stable" aria-hidden="true" />
                </div>
              )}
              <div role="radiogroup" aria-label="Select active sensor feed" className="space-y-1">
                {ACTIVE_STREAMS.map((str) => {
                  const isSelected = selectedStreamId === str.id;
                  return (
                    <button
                      key={str.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedStreamId(str.id)}
                      className={`w-full p-2 rounded-xl text-left transition-colors flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isSelected
                          ? 'bg-primary/10 border border-primary/30 text-foreground font-semibold'
                          : 'hover:bg-card-hover border border-transparent text-muted hover:text-foreground'
                      }`}
                    >
                      <div className="relative shrink-0" aria-hidden="true">
                        <Activity size={16} className={isSelected ? 'text-primary' : 'text-muted'} />
                        {str.status === 'live' && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-status-stable animate-pulse" />
                        )}
                      </div>

                      {!sidebarCollapsed && (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate text-foreground">{str.name}</span>
                            <span className="text-[10px] font-mono text-muted">{str.rate}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted">
                            <span className="font-mono text-subtle">{str.patientId}</span>
                            <span className="font-mono text-primary font-bold">{str.latency}</span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Patient Cohorts Section */}
            {!sidebarCollapsed && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between px-2 pb-1.5 text-[11px] font-mono uppercase tracking-wider text-muted font-bold">
                  <span>Active Cohorts</span>
                  <Users size={12} aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  {PATIENT_COHORTS.map((c) => (
                    <div
                      key={c.id}
                      className="p-2 rounded-xl bg-card/60 border border-border/80 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-foreground truncate">{c.name}</span>
                      <span className="px-1.5 py-0.5 rounded-md font-mono text-[10px] font-extrabold bg-surface border border-border text-foreground">
                        {c.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-2 border-t border-border bg-canvas/40 text-[10px] font-mono text-subtle">
            {!sidebarCollapsed ? (
              <div className="flex items-center justify-between">
                <span>Enclave: BAA-Isolated</span>
                <span className="text-status-stable font-bold">Encrypted</span>
              </div>
            ) : (
              <div className="text-center font-bold text-status-stable">✓</div>
            )}
          </div>
        </div>
      </aside>

      {/* ── 2. MAIN WORKSTATION CONTENT AREA ─────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Control Bar */}
        <header className="h-12 px-4 border-b border-border bg-surface/70 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <span className="text-muted">Telemetry Session</span>
            <span className="text-subtle">/</span>
            <span className="font-mono text-foreground font-bold">{selectedStreamId} (PT-9042)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-status-stable/10 text-status-stable border border-status-stable/20 font-extrabold">
              REAL-TIME (120 FPS)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {feedbackMessage && (
              <div
                role="status"
                aria-live="polite"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-status-stable/15 text-status-stable border border-status-stable/30 text-xs font-bold"
              >
                <Check size={13} aria-hidden="true" />
                <span>{feedbackMessage}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs font-mono text-muted">
              <span>Sync Buffer:</span>
              <strong className="text-foreground">0.02%</strong>
            </div>
          </div>
        </header>

        {/* High-Density Workstation Grid (Density 8) */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2.5 max-w-[1600px] w-full mx-auto"
        >
          {/* Quick Telemetry Metric Tiles */}
          <section aria-label="Electrophysiological Telemetry Indices" className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-card border border-border flex flex-col justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-tight">Channel Impedance</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold font-mono text-foreground">&lt; 3.2</span>
                <span className="text-xs font-mono text-subtle">kΩ</span>
                <span className="ml-auto text-[10px] font-mono font-bold text-status-stable">Optimal</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border flex flex-col justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-tight">Voxel Segmentation</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold font-mono text-foreground">0.82</span>
                <span className="text-xs font-mono text-subtle">mm³</span>
                <span className="ml-auto text-[10px] font-mono font-bold text-primary">Sub-Voxel</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border flex flex-col justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-tight">Epistemic Confidence</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold font-mono text-foreground">96.8</span>
                <span className="text-xs font-mono text-subtle">%</span>
                <span className="ml-auto text-[10px] font-mono font-bold text-status-stable">p &lt; 0.001</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-card border border-border flex flex-col justify-between">
              <span className="text-[11px] font-bold text-muted uppercase tracking-tight">Sampling Jitter</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold font-mono text-foreground">0.03</span>
                <span className="text-xs font-mono text-subtle">ms</span>
                <span className="ml-auto text-[10px] font-mono font-bold text-status-stable">Phase-Locked</span>
              </div>
            </div>
          </section>

          {/* ── 3. WORKSTATION MAIN ROW: Waveform Viewer + Status Control Panel ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
            {/* ── LEFT TILE: Live Waveform Telemetry Viewer (8 Columns) ── */}
            <section
              aria-labelledby="waveform-title"
              className="lg:col-span-8 p-3 rounded-2xl bg-card border border-border shadow-tile flex flex-col justify-between space-y-3"
            >
              {/* Waveform Header & Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-primary" aria-hidden="true" />
                  <h2 id="waveform-title" className="font-heading font-extrabold text-sm text-foreground">
                    Electrophysiological Waveform Telemetry
                  </h2>
                </div>

                {/* Toolbar Actions: Play/Pause, Window, Gain */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Play/Pause Button (Mandatory WAI-ARIA auto-motion requirement) */}
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    aria-label={isPlaying ? 'Pause telemetry live stream' : 'Play telemetry live stream'}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[36px] ${
                      isPlaying
                        ? 'bg-status-warning/15 text-status-warning border border-status-warning/30 hover:bg-status-warning/25'
                        : 'bg-status-stable/15 text-status-stable border border-status-stable/30 hover:bg-status-stable/25'
                    }`}
                  >
                    {isPlaying ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
                    <span>{isPlaying ? 'Pause Feed' : 'Resume Feed'}</span>
                  </button>

                  {/* Window Range Selector */}
                  <div className="flex items-center bg-surface border border-border rounded-lg p-0.5" role="group" aria-label="Time window range">
                    {(['2s', '5s', '10s'] as const).map((win) => (
                      <button
                        key={win}
                        type="button"
                        onClick={() => setWindowSec(win)}
                        className={`px-2 py-1 text-[11px] font-mono font-bold rounded-md transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                          windowSec === win ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground'
                        }`}
                      >
                        {win}
                      </button>
                    ))}
                  </div>

                  {/* Signal Amplification Gain */}
                  <div className="flex items-center bg-surface border border-border rounded-lg p-0.5" role="group" aria-label="Signal gain scale">
                    {(['1x', '2x', '5x'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGainLevel(g)}
                        className={`px-2 py-1 text-[11px] font-mono font-bold rounded-md transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                          gainLevel === g ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted hover:text-foreground'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Multi-Channel Waveform SVG Canvas */}
              <div
                tabIndex={0}
                role="region"
                aria-label="Live multi-channel EEG trace graph. Use Space or Enter to pause."
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setIsPlaying((p) => !p);
                  }
                }}
                className="w-full bg-[#080C14] border border-border/80 rounded-xl p-3 space-y-3 relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                {/* Horizontal reference grid lines */}
                <div className="absolute inset-0 grid grid-rows-4 pointer-events-none opacity-15 divide-y divide-border" aria-hidden="true">
                  <div />
                  <div />
                  <div />
                  <div />
                </div>

                {EEG_CHANNELS.map((ch, idx) => (
                  <div key={ch.id} className="relative z-10 flex flex-col space-y-0.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-foreground" style={{ color: ch.color }}>
                        {ch.label}
                      </span>
                      <span className="text-subtle text-[10px]">{ch.band}</span>
                    </div>

                    {/* SVG Trace */}
                    <div className="w-full h-11 overflow-hidden">
                      <svg viewBox="0 0 640 48" preserveAspectRatio="none" className="w-full h-full">
                        <path
                          d={generateWavePath(idx * 0.4 + 1.2, 14, idx * 60)}
                          fill="none"
                          stroke={ch.color}
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>

              {/* Screen Reader Accessible Data Summary Table (Hidden Visually) */}
              <table className="sr-only">
                <caption>Current Electrophysiological Waveform Averages</caption>
                <thead>
                  <tr>
                    <th scope="col">Channel</th>
                    <th scope="col">Frequency Band</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {EEG_CHANNELS.map((ch) => (
                    <tr key={ch.id}>
                      <td>{ch.label}</td>
                      <td>{ch.band}</td>
                      <td>Active streaming at 1000 Hz, signal amplitude nominal</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Bottom Scrubber & Metadata Ticker */}
              <div className="flex items-center justify-between text-[11px] font-mono text-muted pt-1 border-t border-border/60">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-xs bg-status-stable" aria-hidden="true" />
                  <span>Epoch: 182.4s – 187.4s</span>
                </span>
                <span className="text-subtle">Display Resolution: 1200 DPI · Nyquist Threshold Satisfied</span>
              </div>
            </section>

            {/* ── RIGHT TILE: Diagnostic Status & Action Control Panel (4 Columns) ── */}
            <section
              aria-labelledby="controls-title"
              className="lg:col-span-4 p-3 rounded-2xl bg-card border border-border shadow-tile flex flex-col justify-between space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-primary" aria-hidden="true" />
                  <h2 id="controls-title" className="font-heading font-extrabold text-sm text-foreground">
                    Diagnostic Status &amp; Decision Support
                  </h2>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20 font-bold">
                  AUTONOMOUS
                </span>
              </div>

              {/* Consensus Diagnostic Verdict */}
              <div className="p-3 rounded-xl bg-surface border border-border space-y-2">
                <span className="text-[10px] font-mono uppercase text-muted font-extrabold block">
                  Multimodal Neural Consensus
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-base font-extrabold text-foreground font-heading">
                    Typical / Normal Cognition (CN)
                  </span>
                  <span className="text-xs font-mono font-bold text-status-stable px-2 py-0.5 rounded-full bg-status-stable/10 border border-status-stable/20">
                    Low Risk (12%)
                  </span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Volumetric MRI and acoustic hesitation ratios demonstrate high cross-modality agreement without structural atrophy markers.
                </p>
              </div>

              {/* Clinical Confidence Matrix */}
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-muted text-[11px]">
                  <span>Hippocampal Volumetric Concordance:</span>
                  <strong className="text-foreground">94.8%</strong>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '94.8%' }} />
                </div>

                <div className="flex justify-between text-muted text-[11px] pt-1">
                  <span>Acoustic Phoneme Latency Stability:</span>
                  <strong className="text-foreground">98.2%</strong>
                </div>
                <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: '98.2%' }} />
                </div>
              </div>

              {/* Action Buttons: Clinician & Developer Tools */}
              <div className="space-y-1.5 pt-1 border-t border-border">
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => handleTriggerAction('Multimodal TensorRT Fusion')}
                  className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs min-h-[40px] cursor-pointer disabled:opacity-50"
                >
                  {isProcessingAction ? (
                    <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Zap size={14} aria-hidden="true" />
                  )}
                  <span>Run Multimodal Inference</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTriggerAction('Electrode Re-Baseline')}
                    className="py-1.5 px-2 rounded-xl bg-surface hover:bg-card-hover border border-border text-foreground font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[38px]"
                  >
                    <RotateCcw size={13} className="text-muted" aria-hidden="true" />
                    <span>Calibrate Sensors</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTriggerAction('Clinical Dossier Export')}
                    className="py-1.5 px-2 rounded-xl bg-surface hover:bg-card-hover border border-border text-foreground font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[38px]"
                  >
                    <Download size={13} className="text-muted" aria-hidden="true" />
                    <span>Export DICOM</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleTriggerAction('Physician Cohort Flag')}
                  className="w-full py-1.5 px-3 rounded-xl border border-border text-muted hover:text-foreground hover:bg-surface text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[36px]"
                >
                  <FileText size={13} aria-hidden="true" />
                  <span>Flag for Attending Neurologist Review</span>
                </button>
              </div>

              {/* Regulatory Notice */}
              <p className="text-[10px] text-subtle text-center font-mono leading-tight">
                Assistive Decision Support (FDA SaMD Tier II). Requires clinical sign-off.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
