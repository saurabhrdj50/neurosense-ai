import React from 'react'
import { motion } from 'framer-motion'
import { Database, Cpu, Layers, Activity, GitBranch, ShieldCheck } from 'lucide-react'

export default function ArchitecturePipeline() {
  const pipelineStages = [
    {
      step: '01',
      title: 'Multimodal Data Ingestion & Preprocessing',
      desc: '3D DICOM MRI voxel normalization, wav/mp3 speech acoustic micro-pause isolation, and psychometric MMSE feature vector scaling.',
      icon: Database,
      tag: 'ETL Pipeline'
    },
    {
      step: '02',
      title: 'Modality-Specific Feature Embeddings',
      desc: 'ResNet-3D CNN for neuroimaging spatial features, Wav2Vec 2.0 / Librosa for audio acoustics, and Transformer NLP for semantic transcripts.',
      icon: Cpu,
      tag: 'Deep Encoders'
    },
    {
      step: '03',
      title: 'Cross-Attention Multimodal Transformer Fusion',
      desc: 'Inter-modality self-attention matrix dynamically computes latent alignment weights between structural MRI atrophy and speech hesitancy.',
      icon: Layers,
      tag: 'Fusion Core'
    },
    {
      step: '04',
      title: 'Explainable Staging & Decision Output',
      desc: 'Outputs MCI / AD stage probability, SHAP feature attributions, and confidence score vectors for human-in-the-loop clinician validation.',
      icon: Activity,
      tag: 'Clinical Verdict'
    }
  ]

  const modelSpecs = [
    { label: 'Primary Architecture', val: 'Multimodal Cross-Attention Transformer' },
    { label: 'Latent Space Embedding', val: '512-Dimensional Joint Vector Space' },
    { label: 'Feature Attribution', val: 'Game-Theoretic SHAP (Shapley Explanations)' },
    { label: 'Validation Framework', val: '5-Fold Cross-Validation on Benchmark Cohorts' },
    { label: 'Deployment Strategy', val: 'FastAPI Microservice + ONNX Runtime' }
  ]

  return (
    <div className="space-y-10">
      {/* SECTION HEADER */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider border border-indigo-500/20">
          <GitBranch size={13} className="text-indigo-500" /> Deep Learning Architecture
        </span>
        <h2 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight">
          System Pipeline & Technical Model Specifications
        </h2>
        <p className="text-foreground-muted text-sm sm:text-base leading-relaxed">
          From raw multimodal data intake to cross-attention fusion and explainable clinical staging.
        </p>
      </div>

      {/* TWO COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* LEFT COLUMN: 4 PIPELINE STAGES */}
        <div className="lg:col-span-7 bg-surface-card border border-border rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-subtle pb-4 border-b border-border flex items-center justify-between">
            <span>End-to-End Processing Workflow</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">4 Stages</span>
          </h3>

          <div className="space-y-4">
            {pipelineStages.map((st, idx) => {
              const Icon = st.icon
              return (
                <div key={idx} className="p-4 rounded-2xl bg-surface border border-border flex items-start gap-4 hover:border-indigo-500/30 transition-all">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0 font-mono font-bold text-xs">
                    {st.step}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground">{st.title}</h4>
                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10">
                        {st.tag}
                      </span>
                    </div>
                    <p className="text-xs text-foreground-muted leading-relaxed">{st.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: MODEL SPECS MATRIX & PROTOTYPE CALLOUT */}
        <div className="lg:col-span-5 bg-surface-card border border-border rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-subtle pb-4 border-b border-border flex items-center justify-between">
              <span>Technical Model Parameters</span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">Specs</span>
            </h3>

            <div className="space-y-3">
              {modelSpecs.map((spec, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-surface border border-border/80 space-y-0.5">
                  <span className="text-[10px] font-mono text-foreground-subtle block uppercase">{spec.label}</span>
                  <span className="text-xs font-bold text-foreground block">{spec.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Academic Research Prototype
            </div>
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Designed as a proof-of-concept for multimodal Alzheimer's detection. All architecture benchmarks are validated on standard academic research datasets.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

