'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Brain,
  Activity,
  FileText,
  Clock,
  Download,
  Share2,
  ChevronRight,
  ChevronDown,
  Layers,
  ShieldCheck,
  HeartPulse,
  Filter,
  CheckCircle2,
  AlertTriangle,
  User,
  Sparkles,
} from 'lucide-react';

/* ─── Mock Patient Profile & Longitudinal Records ─── */
const PATIENT_DATA = {
  id: 'PT-9042',
  name: 'Eleanor Vance',
  age: 72,
  sex: 'Female',
  mrn: 'MRN-882194',
  institution: 'Memorial Neurological Institute',
  attending: 'Dr. Sarah Lin, MD, PhD',
  baselineDate: '2025-04-12',
  currentStage: 'Mild Cognitive Impairment (MCI)',
  riskLevel: 'warning' as const,
  biomarkers: {
    hippocampalVolume: '3.12 cm³ (-1.4% p.a.)',
    tauProteinRatio: '0.42 (Elevated)',
    mmseScore: '24 / 30',
    speechHesitation: '26.8% (+3.1%)',
  },
};

const TIMELINE_EVENTS = [
  {
    sessionId: 'SES-2026-1014',
    date: '2026-10-14',
    modality: 'multimodal',
    stage: 'Mild Cognitive Impairment (MCI)',
    confidence: '94.8%',
    riskVariant: 'warning',
    physician: 'Dr. Sarah Lin, MD',
    findings: 'Multi-harmonic EEG theta synchronization paired with localized hippocampal volume loss (0.82 mm³ deficit). Speech pause interval rose to 26.8%.',
    mriStage: 'Mild Cortical Atrophy',
    speechPitch: 'Jitter 2.4%',
    cogScore: '24/30 (MMSE)',
  },
  {
    sessionId: 'SES-2026-0518',
    date: '2026-05-18',
    modality: 'speech',
    stage: 'Subtle Vocal Variations Observed',
    confidence: '91.2%',
    riskVariant: 'warning',
    physician: 'Dr. Michael Chen, MD',
    findings: 'Phonemic speech analysis detected lexical retrieval latency in spontaneous naming tests (+4.2% pause frequency).',
    mriStage: 'Not Performed',
    speechPitch: 'Jitter 2.1%',
    cogScore: '26/30 (MMSE)',
  },
  {
    sessionId: 'SES-2026-0109',
    date: '2026-01-09',
    modality: 'mri',
    stage: 'Typical / Normal Cognition (CN)',
    confidence: '97.5%',
    riskVariant: 'stable',
    physician: 'Dr. Sarah Lin, MD',
    findings: 'Baseline 3T T1-weighted structural MRI. Bilateral hippocampus within normal age-adjusted volumetric bounds.',
    mriStage: 'No Significant Atrophy',
    speechPitch: 'Nominal',
    cogScore: '28/30 (MMSE)',
  },
];

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [selectedModality, setSelectedModality] = useState<'all' | 'mri' | 'speech' | 'multimodal'>('all');
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({
    'SES-2026-1014': true, // Expanded by default
  });

  const toggleSession = (id: string) => {
    setExpandedSessions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredEvents = useMemo(() => {
    if (selectedModality === 'all') return TIMELINE_EVENTS;
    return TIMELINE_EVENTS.filter((e) => e.modality === selectedModality);
  }, [selectedModality]);

  return (
    <div className="min-h-screen bg-canvas text-foreground font-body select-none">
      {/* ── Top Navigation & Breadcrumbs ── */}
      <header className="h-14 px-4 sm:px-6 border-b border-border bg-surface/70 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            aria-label="Return to primary dashboard"
            className="p-2 rounded-xl bg-card border border-border text-muted hover:text-foreground transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-muted">Patients</span>
            <span className="text-subtle">/</span>
            <span className="font-mono text-primary font-bold">{PATIENT_DATA.id}</span>
            <span className="text-subtle">/</span>
            <span className="text-foreground">{PATIENT_DATA.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg bg-surface hover:bg-card border border-border text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[36px]"
          >
            <Download size={14} className="text-muted" aria-hidden="true" />
            <span>Export Record (PDF)</span>
          </button>
        </div>
      </header>

      {/* ── Main Content Container (Density 8/10) ── */}
      <main id="main-content" className="max-w-7xl mx-auto p-3 sm:p-5 space-y-4">
        {/* ── Patient Profile Header Card ── */}
        <section aria-labelledby="patient-profile-title" className="p-4 bg-card border border-border rounded-2xl shadow-tile space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-heading font-extrabold text-base">
                {PATIENT_DATA.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <h1 id="patient-profile-title" className="text-lg font-extrabold font-heading text-foreground tracking-tight">
                  {PATIENT_DATA.name}
                </h1>
                <div className="flex items-center gap-2 text-xs text-muted font-mono mt-0.5">
                  <span>ID: {PATIENT_DATA.id}</span>
                  <span className="text-subtle">·</span>
                  <span>{PATIENT_DATA.mrn}</span>
                  <span className="text-subtle">·</span>
                  <span>{PATIENT_DATA.age}y / {PATIENT_DATA.sex}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-full bg-status-warning/15 border border-status-warning/30 text-status-warning text-xs font-bold font-mono">
                {PATIENT_DATA.currentStage}
              </div>
            </div>
          </div>

          {/* Clinical Demographic Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-surface border border-border">
              <span className="text-[10px] text-muted uppercase block font-bold">Attending Clinician</span>
              <span className="text-foreground font-semibold truncate block mt-0.5">{PATIENT_DATA.attending}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface border border-border">
              <span className="text-[10px] text-muted uppercase block font-bold">Hippocampal Volume</span>
              <span className="text-foreground font-bold block mt-0.5">{PATIENT_DATA.biomarkers.hippocampalVolume}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface border border-border">
              <span className="text-[10px] text-muted uppercase block font-bold">Cognitive Battery</span>
              <span className="text-status-warning font-bold block mt-0.5">{PATIENT_DATA.biomarkers.mmseScore}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-surface border border-border">
              <span className="text-[10px] text-muted uppercase block font-bold">Acoustic Latency</span>
              <span className="text-primary font-bold block mt-0.5">{PATIENT_DATA.biomarkers.speechHesitation}</span>
            </div>
          </div>
        </section>

        {/* ── Timeline Section ── */}
        <section aria-labelledby="timeline-heading" className="p-4 bg-card border border-border rounded-2xl shadow-tile space-y-4">
          {/* Header & Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-primary" aria-hidden="true" />
              <h2 id="timeline-heading" className="font-heading font-extrabold text-base text-foreground">
                Longitudinal Neurological Trajectory
              </h2>
            </div>

            {/* Modality Filter Pills */}
            <div className="flex items-center bg-surface border border-border rounded-xl p-0.5" role="group" aria-label="Filter timeline by modality">
              {(['all', 'multimodal', 'speech', 'mri'] as const).map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setSelectedModality(mod)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold capitalize transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                    selectedModality === mod
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Timeline List */}
          <ol aria-label="Chronological assessment sessions" className="relative border-l border-border/80 ml-3 space-y-4 pl-5">
            {filteredEvents.map((evt) => {
              const isExpanded = !!expandedSessions[evt.sessionId];
              return (
                <li key={evt.sessionId} className="relative group">
                  {/* Timeline Dot Indicator */}
                  <span
                    className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-card ${
                      evt.riskVariant === 'stable'
                        ? 'bg-status-stable'
                        : evt.riskVariant === 'warning'
                        ? 'bg-status-warning'
                        : 'bg-status-danger'
                    }`}
                    aria-hidden="true"
                  />

                  {/* Session Card Item */}
                  <div className="bg-surface border border-border rounded-xl p-3.5 space-y-2.5 transition-colors hover:border-border-strong">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">{evt.date}</span>
                        <span className="text-subtle">·</span>
                        <span className="text-xs font-mono text-muted">{evt.sessionId}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold ${
                            evt.riskVariant === 'stable'
                              ? 'bg-status-stable/10 text-status-stable border border-status-stable/20'
                              : 'bg-status-warning/10 text-status-warning border border-status-warning/20'
                          }`}
                        >
                          {evt.stage}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleSession(evt.sessionId)}
                        aria-expanded={isExpanded}
                        aria-controls={`session-details-${evt.sessionId}`}
                        className="p-1 rounded text-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-1 text-xs font-mono"
                      >
                        <span>{isExpanded ? 'Collapse' : 'Inspect Telemetry'}</span>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </div>

                    <p className="text-xs text-muted leading-relaxed">{evt.findings}</p>

                    {/* Expandable Session Telemetry Sub-Panel */}
                    {isExpanded && (
                      <div
                        id={`session-details-${evt.sessionId}`}
                        className="pt-2 mt-2 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono"
                      >
                        <div className="p-2 rounded-lg bg-card border border-border">
                          <span className="text-[10px] text-muted block">Structural MRI</span>
                          <strong className="text-foreground">{evt.mriStage}</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-card border border-border">
                          <span className="text-[10px] text-muted block">Acoustic Biomarkers</span>
                          <strong className="text-primary">{evt.speechPitch}</strong>
                        </div>
                        <div className="p-2 rounded-lg bg-card border border-border">
                          <span className="text-[10px] text-muted block">Cognitive Battery</span>
                          <strong className="text-status-warning">{evt.cogScore}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </div>
  );
}
