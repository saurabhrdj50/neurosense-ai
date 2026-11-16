import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  Brain,
  Cpu,
  Layers,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Download,
  Share2,
  FileText,
  Zap,
  Users,
  Search,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Active Sensor Streams & Patient Cohorts ── */
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

export default function TelemetryWorkstation() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [gain, setGain] = useState(1); // 1x | 2x | 5x
  const [timeWindow, setTimeWindow] = useState('10s'); // 5s | 10s | 30s
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [streamsOpen, setStreamsOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState('cohort-1');

  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const offsetRef = useRef(0);

  // Keyboard shortcut: Space toggles telemetry stream play/pause (WCAG 2.2.2 Pause/Stop/Hide)
  const handleKeyDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') {
      e.preventDefault();
      setIsPlaying(prev => !prev);
      toast(isPlaying ? 'Telemetry Paused' : 'Telemetry Resumed', { icon: isPlaying ? '⏸️' : '▶️' });
    }
  }, [isPlaying]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Real-time multi-channel canvas waveform rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isActive = true;

    const render = () => {
      if (!isActive) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Background grid lines (High-Density 8/10 Scale)
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;

      const gridStepX = 50;
      for (let x = 0; x < width; x += gridStepX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      const channelHeight = height / EEG_CHANNELS.length;
      EEG_CHANNELS.forEach((_, idx) => {
        const y = (idx + 1) * channelHeight;
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      });

      // Render channel waveforms
      EEG_CHANNELS.forEach((ch, idx) => {
        const isDimmed = selectedChannel && selectedChannel !== ch.id;
        ctx.strokeStyle = ch.color;
        ctx.globalAlpha = isDimmed ? 0.2 : 0.95;
        ctx.lineWidth = selectedChannel === ch.id ? 2 : 1.5;

        const baselineY = idx * channelHeight + channelHeight / 2;
        ctx.beginPath();

        const speed = timeWindow === '5s' ? 2.5 : timeWindow === '10s' ? 1.5 : 0.8;
        const currentOffset = offsetRef.current;

        for (let x = 0; x < width; x += 2) {
          const t = (x + currentOffset * speed) * 0.03;
          let wave = 0;

          if (idx === 0) {
            // Theta (4–8 Hz)
            wave = Math.sin(t * 0.8) * 14 + Math.sin(t * 2.2) * 6;
          } else if (idx === 1) {
            // Alpha (8–12 Hz)
            wave = Math.sin(t * 1.5) * 18 + Math.cos(t * 3.1) * 8;
          } else if (idx === 2) {
            // Beta (13–30 Hz)
            wave = Math.sin(t * 3.5) * 10 + Math.sin(t * 7.0) * 4;
          } else {
            // Gamma
            wave = Math.sin(t * 6.0) * 7 + (Math.random() - 0.5) * 3;
          }

          const y = baselineY + wave * gain;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      ctx.restore();

      if (isPlaying) {
        offsetRef.current += 1.5;
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, gain, timeWindow, selectedChannel]);

  const handleAction = (label) => {
    toast.success(`${label} demonstration preview executed.`);
  };

  return (
    <div className="space-y-4">
      {/* ── Clinical Demonstration Disclaimer Notice ──────────────────────── */}
      <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-500 shrink-0" />
          <span>
            <strong className="font-extrabold uppercase tracking-wider text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md mr-1.5">
              Simulated Demonstration
            </strong>
            Waveforms and telemetry indicators below are synthetically generated for workflow preview and UI testing. Not live patient data or diagnostic claims.
          </span>
        </div>
        <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400 font-bold shrink-0">
          Synthetic Model v1.0
        </span>
      </div>

      {/* ── Active Sensor Stream Strip & Collapsible Cohorts ──────────────── */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 bg-surface-secondary/50">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
              Simulated Telemetry Streams (4 Channels)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-foreground-muted">
              <span>Cohort Demo: <strong className="text-foreground">Synthetic Sample</strong></span>
              <span>•</span>
              <span>Signal Loop: <strong className="text-emerald-500">12ms</strong></span>
            </div>

            <button
              type="button"
              onClick={() => setStreamsOpen(!streamsOpen)}
              className="px-2.5 py-1 rounded-lg border border-border bg-surface text-xs font-semibold text-foreground-muted hover:text-foreground flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-expanded={streamsOpen}
            >
              <span>{streamsOpen ? 'Hide Feeds' : 'Sensor Feeds & Cohorts'}</span>
              {streamsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Collapsible details for streams & cohorts */}
        {streamsOpen && (
          <div className="p-4 border-t border-border bg-surface-secondary/20 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-2">
              <p className="font-bold uppercase tracking-wider text-foreground-muted text-[11px]">Active Feeds</p>
              <div className="space-y-1.5">
                {ACTIVE_STREAMS.map((str) => (
                  <div key={str.id} className="p-2 rounded-xl border border-border bg-card flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${str.status === 'live' ? 'bg-emerald-500' : 'bg-foreground-muted'}`} />
                      <span className="font-bold text-foreground">{str.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-foreground-muted text-[11px]">
                      <span>{str.rate}</span>
                      <span className={str.status === 'live' ? 'text-emerald-500 font-bold' : ''}>{str.latency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-bold uppercase tracking-wider text-foreground-muted text-[11px]">Monitored Cohorts</p>
              <div className="space-y-1.5">
                {PATIENT_COHORTS.map((coh) => (
                  <button
                    key={coh.id}
                    type="button"
                    onClick={() => setSelectedCohort(coh.id)}
                    className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                      selectedCohort === coh.id
                        ? 'border-primary bg-primary/10 text-primary font-bold'
                        : 'border-border bg-card text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <span>{coh.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-surface font-bold">
                      {coh.count} patients
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Telemetry Workstation Tile (Density 8/10 Scale) ─────────── */}
      <section
        aria-label="Interactive Multi-Channel Telemetry Workstation"
        className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs"
      >
        {/* Workstation Header Chrome */}
        <div className="px-5 py-3 border-b border-border bg-surface-secondary/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 flex items-center justify-center">
              <Activity size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wider font-heading">
                  Multi-Channel EEG Telemetry &amp; Voxel Volumetrics
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/25">
                  Simulated
                </span>
              </div>
              <p className="text-[11px] text-foreground-muted font-mono">
                Channels: FP1-F3 · C3-P3 · P3-O1 · T3-T5 | Synthetic Telemetry Stream (UX Testing Preview)
              </p>
            </div>
          </div>

          {/* Interactive Controls Strip */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Play/Pause Button (WCAG 2.2.2 compliant) */}
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isPlaying
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
              }`}
              aria-label={isPlaying ? 'Pause telemetry stream (Space)' : 'Resume telemetry stream (Space)'}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? 'Pause Stream' : 'Resume'}</span>
            </button>

            {/* Gain Dials */}
            <div className="flex items-center gap-1 bg-surface-secondary p-1 rounded-xl border border-border" role="group" aria-label="Gain Multiplier">
              {[1, 2, 5].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGain(g)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                    gain === g
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                  aria-pressed={gain === g}
                >
                  {g}x
                </button>
              ))}
            </div>

            {/* Time Window Selectors */}
            <div className="flex items-center gap-1 bg-surface-secondary p-1 rounded-xl border border-border" role="group" aria-label="Sweep Window">
              {['5s', '10s', '30s'].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setTimeWindow(w)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                    timeWindow === w
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                  aria-pressed={timeWindow === w}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Telemetry Display Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Main Waveform Canvas Area */}
          <div className="lg:col-span-3 p-4 flex flex-col justify-between space-y-3">
            <div className="relative h-64 w-full rounded-xl bg-canvas border border-border/70 overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-full block"
                role="img"
                aria-label="Real-time multi-channel EEG waveform canvas visualizer"
              />

              {/* Pause Overlay indicator */}
              {!isPlaying && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-surface/90 border border-border text-amber-500 font-mono text-xs font-bold flex items-center gap-1.5 shadow-md">
                  <Pause size={12} />
                  <span>STREAM PAUSED (PRESS SPACE TO RESUME)</span>
                </div>
              )}
            </div>

            {/* Channel Legend & Filter Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-mono">
              <div className="flex items-center gap-3 flex-wrap">
                {EEG_CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChannel(selectedChannel === ch.id ? null : ch.id)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition-all ${
                      selectedChannel === ch.id
                        ? 'bg-surface border border-border font-bold'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ch.color }} aria-hidden="true" />
                    <span className="font-bold">{ch.id}</span>
                    <span className="text-[10px] text-subtle hidden sm:inline">({ch.band})</span>
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-foreground-muted">
                SNR: <strong className="text-emerald-500">34.2 dB</strong> · Rejection: Active
              </div>
            </div>

            {/* Telemetry Hardware Diagnostics KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="p-2.5 rounded-xl border border-border bg-surface-secondary/40">
                <span className="text-[10px] uppercase font-mono text-foreground-muted">Impedance</span>
                <p className="text-sm font-bold font-mono text-foreground mt-0.5">3.8 kΩ</p>
                <span className="text-[10px] text-emerald-500 font-semibold">In Spec (&lt;5 kΩ)</span>
              </div>
              <div className="p-2.5 rounded-xl border border-border bg-surface-secondary/40">
                <span className="text-[10px] uppercase font-mono text-foreground-muted">DC Drift</span>
                <p className="text-sm font-bold font-mono text-foreground mt-0.5">0.12 µV/m</p>
                <span className="text-[10px] text-emerald-500 font-semibold">Compensated</span>
              </div>
              <div className="p-2.5 rounded-xl border border-border bg-surface-secondary/40">
                <span className="text-[10px] uppercase font-mono text-foreground-muted">Packet Loss</span>
                <p className="text-sm font-bold font-mono text-foreground mt-0.5">0.00%</p>
                <span className="text-[10px] text-emerald-500 font-semibold">Zero Drops</span>
              </div>
              <div className="p-2.5 rounded-xl border border-border bg-surface-secondary/40">
                <span className="text-[10px] uppercase font-mono text-foreground-muted">Stream Delay</span>
                <p className="text-sm font-bold font-mono text-foreground mt-0.5">12 ms</p>
                <span className="text-[10px] text-emerald-500 font-semibold">Enclave Direct</span>
              </div>
            </div>
          </div>

          {/* Diagnostic Control & Clinical Action Panel */}
          <div className="p-4 flex flex-col justify-between space-y-4 bg-surface-secondary/15">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  AI Decision Support
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  MCI Suspected
                </span>
              </div>

              <div className="p-3 rounded-xl border border-border bg-card space-y-1.5">
                <span className="text-[11px] text-foreground-muted">Multimodal Consensus</span>
                <p className="text-sm font-extrabold text-foreground">Mild Cognitive Impairment</p>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-foreground-muted">Confidence:</span>
                  <strong className="text-primary">94.2%</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border bg-card space-y-1.5 text-xs">
                <span className="text-[11px] text-foreground-muted">Voxel Volumetrics</span>
                <div className="flex items-center justify-between font-mono">
                  <span>Hippocampus:</span>
                  <strong className="text-amber-500">-1.4% p.a.</strong>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span>Ventricles:</span>
                  <strong className="text-foreground">+2.1% p.a.</strong>
                </div>
              </div>
            </div>

            {/* Clinician Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleAction('Multi-Modal Consensus')}
                className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs transition-all flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[36px]"
              >
                <Zap size={14} aria-hidden="true" />
                <span>Trigger AI Re-Analysis</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction('Telemetry Export (.EDF)')}
                className="w-full py-2 px-3 rounded-xl border border-border bg-card hover:bg-surface text-foreground font-semibold text-xs transition-all flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[36px]"
              >
                <Download size={14} aria-hidden="true" />
                <span>Export Telemetry (.EDF)</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction('Neurologist Flag')}
                className="w-full py-2 px-3 rounded-xl border border-border bg-card hover:bg-surface text-foreground-muted hover:text-foreground font-semibold text-xs transition-all flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[36px]"
              >
                <FileText size={14} aria-hidden="true" />
                <span>Flag for Physician Review</span>
              </button>

              <p className="text-[10px] text-foreground-muted text-center font-mono leading-tight pt-1">
                Demonstration CDS Interface · Non-diagnostic preview. Not an FDA-cleared diagnostic device. Requires verified physician diagnosis.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

