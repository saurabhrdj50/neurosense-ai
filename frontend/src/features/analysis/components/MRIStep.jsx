import React, { useState } from 'react'
import { motion } from 'framer-motion'
import DropZone from '../../../components/ui/DropZone'
import { Layers, Eye, CheckCircle2, Cpu, ShieldAlert, Activity, Sparkles } from 'lucide-react'

const EXTRACTED_BIOMARKERS = [
  { label: 'Hippocampal Volume', value: '3.12 cm³', norm: '3.80 - 4.50 cm³', status: 'Atrophy Warning', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { label: 'Ventricular Enlargement', value: '42.8 mL', norm: '15.0 - 25.0 mL', status: 'Hydrocephalus Risk', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
  { label: 'Whole Brain Volume', value: '74.2%', norm: '80.0 - 88.0%', status: 'Mild Reduction', color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' },
  { label: 'Brain Age Estimate', value: '76.4 Yrs', norm: 'Chronological: 72', status: 'Accelerated Aging (+4.4 yrs)', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
]

const PREPROCESSING_PIPELINE = [
  { step: 'Upload Complete', done: true },
  { step: 'Skull Stripping (Brain Extraction)', done: true },
  { step: 'MNI152 Spatial Registration', done: true },
  { step: 'Tissue Segmentation (GM/WM/CSF)', done: true },
  { step: 'Deep Radiomic Feature Extraction', done: true },
]

export function MRIStep({ mriFile, setMriFile }) {
  const [activePlane, setActivePlane] = useState('axial')
  const [showHeatmap, setShowHeatmap] = useState(true)

  const handleFileSelect = (file) => {
    setMriFile(file)
  }

  return (
    <div className="space-y-5">
      {/* Header & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-foreground">AI MRI Review & Neuro-Biomarkers</h2>
          <p className="text-xs text-foreground-muted">Structural volumetric segmentation and hippocampal atrophy analysis.</p>
        </div>

        {mriFile && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5">
            <CheckCircle2 size={13} /> AI Preprocessed & Segmented
          </span>
        )}
      </div>

      {/* MRI Dropzone Uploader */}
      <DropZone
        accept={{
          'image/*': ['.jpg', '.jpeg', '.png', '.tif', '.tiff'],
          'application/dicom': ['.dcm'],
          'application/x-nifti': ['.nii', '.nii.gz']
        }}
        label="Upload MRI Brain Scan (T1-Weighted 3D MPRAGE)"
        hint="Supports DICOM (.dcm), NIfTI (.nii/.nii.gz), JPG, PNG (Max 64 MB)"
        file={mriFile}
        onFile={handleFileSelect}
        onClear={() => setMriFile(null)}
        type="image"
      />

      {/* Main Review Viewport (When MRI is attached) */}
      {mriFile && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left Col: Preview Canvas (2 Cols) */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-surface border border-border space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-primary" />
                  <span className="text-xs font-bold text-foreground">{mriFile.name}</span>
                </div>

                {/* Plane Selector Tabs */}
                <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border text-[11px] font-semibold">
                  {['axial', 'coronal', 'sagittal'].map(plane => (
                    <button
                      key={plane}
                      type="button"
                      onClick={() => setActivePlane(plane)}
                      className={`px-2.5 py-0.5 rounded-lg capitalize transition-colors ${
                        activePlane === plane ? 'bg-primary text-white font-bold' : 'text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      {plane}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`ml-2 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all border ${
                      showHeatmap ? 'bg-rose-500/20 text-rose-500 border-rose-500/40 font-bold' : 'bg-surface text-foreground-muted border-border'
                    }`}
                  >
                    <Eye size={10} /> Heatmap
                  </button>
                </div>
              </div>

              {/* MRI Image Display Area */}
              <div className="relative aspect-video rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800">
                <img
                  src={mriFile.preview || (mriFile instanceof File ? URL.createObjectURL(mriFile) : '/mri_sample.jpg')}
                  alt="MRI Structural Scan"
                  className="max-h-full object-contain filter contrast-125"
                  onError={(e) => {
                    // Fallback visual canvas placeholder if raw file cannot render natively
                    e.target.style.display = 'none'
                  }}
                />

                {/* Overlay simulated Grad-CAM heatmap mask when enabled */}
                {showHeatmap && (
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 via-rose-500/25 to-amber-500/20 pointer-events-none mix-blend-screen" />
                )}

                {/* Image Specs Badge */}
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-slate-900/90 text-slate-300 border border-slate-800 text-[10px] font-mono flex items-center gap-3">
                  <span>Image Quality: <strong className="text-emerald-400">High (SNR 24dB)</strong></span>
                  <span>Res: <strong>256×256×176</strong></span>
                  <span>Slice: <strong>#88/176</strong></span>
                </div>
              </div>
            </div>

            {/* Right Col: AI Preprocessing Pipeline Checklist */}
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <Cpu size={16} className="text-primary" />
                <h3 className="text-xs font-bold text-foreground">AI Preprocessing Progress</h3>
              </div>

              <div className="space-y-2">
                {PREPROCESSING_PIPELINE.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-surface-secondary border border-border/50 text-xs">
                    <span className="font-medium text-foreground text-[11px]">{item.step}</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                      <CheckCircle2 size={12} /> Complete
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Extracted Brain Biomarkers Cards */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Extracted Structural Brain Biomarkers</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {EXTRACTED_BIOMARKERS.map((bm) => (
                <div key={bm.label} className="p-3.5 rounded-2xl bg-surface border border-border space-y-1">
                  <span className="text-[11px] font-semibold text-foreground-muted block">{bm.label}</span>
                  <div className="text-lg font-extrabold text-foreground tracking-tight">{bm.value}</div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-foreground-muted">Norm: {bm.norm}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold border ${bm.color}`}>
                      {bm.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
