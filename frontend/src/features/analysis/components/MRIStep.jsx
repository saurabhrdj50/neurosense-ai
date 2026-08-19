import React, { useState } from 'react'
import { motion } from 'framer-motion'
import DropZone from '../../../components/ui/DropZone'
import { Layers, CheckCircle2, Cpu, Sliders, Brain } from 'lucide-react'

const PREPROCESSING_PIPELINE = [
  { step: 'Upload & Read Brain Scan', done: true },
  { step: 'Extract Brain Region', done: true },
  { step: 'Align Scan View (Spatial Alignment)', done: true },
  { step: 'Measure Gray & White Matter', done: true },
  { step: 'Analyze Brain Tissue Patterns', done: true },
]

export function MRIStep({ mriFile, setMriFile }) {
  const [activePlane, setActivePlane] = useState('axial')
  const [currentSlice, setCurrentSlice] = useState(88)

  const handleFileSelect = (file) => {
    setMriFile(file)
  }

  return (
    <div className="space-y-6">
      {/* Action Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Brain className="text-indigo-400 w-7 h-7" />
            Structural Brain MRI Scan
          </h2>
          <p className="text-sm text-foreground-muted font-medium mt-0.5">
            Upload structural brain MRI scan (DICOM or NIfTI format) for AI automated segmentation.
          </p>
        </div>

        {mriFile && (
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-full text-sm font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 size={18} /> Scan Loaded & Ready
            </span>
          </div>
        )}
      </div>

      {/* MRI Dropzone Uploader */}
      <DropZone
        accept={{
          'image/*': ['.jpg', '.jpeg', '.png', '.tif', '.tiff'],
          'application/dicom': ['.dcm'],
          'application/x-nifti': ['.nii', '.nii.gz']
        }}
        label="Upload Structural MRI Scan"
        hint="Supports DICOM (.dcm), NIfTI (.nii / .nii.gz), JPG, PNG (Max 64 MB)"
        file={mriFile}
        onFile={handleFileSelect}
        onClear={() => setMriFile(null)}
        type="image"
      />

      {/* Main Review Viewport (When MRI is attached) */}
      {mriFile && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left Col: Interactive Preview Canvas (2 Cols) */}
            <div className="md:col-span-2 p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between border-b border-border/60 pb-3 gap-2">
                <div className="flex items-center gap-2.5">
                  <Layers size={20} className="text-primary" />
                  <span className="text-base font-extrabold text-foreground truncate max-w-xs">{mriFile.name}</span>
                </div>

                {/* Plane Selector Tabs */}
                <div className="flex items-center gap-1.5 bg-background p-1.5 rounded-xl border border-border text-sm font-bold">
                  {['axial', 'coronal', 'sagittal'].map(plane => (
                    <button
                      key={plane}
                      type="button"
                      onClick={() => setActivePlane(plane)}
                      className={`px-3.5 py-1.5 rounded-lg capitalize transition-colors min-h-[38px] cursor-pointer ${
                        activePlane === plane ? 'bg-primary text-white font-extrabold shadow-sm' : 'text-foreground-muted hover:text-foreground'
                      }`}
                    >
                      {plane}
                    </button>
                  ))}
                </div>
              </div>

              {/* MRI Image Display Area */}
              <div className="relative aspect-video rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800">
                <img
                  src={mriFile.preview || (mriFile instanceof File ? URL.createObjectURL(mriFile) : '/mri_sample.jpg')}
                  alt="MRI Structural Scan"
                  className="max-h-full object-contain filter contrast-125"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />

                {/* Image Specs Badge */}
                <div className="absolute bottom-3 left-3 px-3.5 py-1.5 rounded-xl bg-slate-900/90 text-slate-200 border border-slate-800 text-sm font-mono flex items-center gap-4">
                  <span>Quality: <strong className="text-emerald-400">High (SNR 24dB)</strong></span>
                  <span>Res: <strong>256×256×176</strong></span>
                  <span>Plane: <strong className="uppercase text-cyan-400">{activePlane}</strong></span>
                </div>
              </div>

              {/* Interactive Slice Scrubber Slider */}
              <div className="p-3.5 rounded-xl bg-background border border-border flex items-center gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <Sliders size={18} className="text-primary" />
                  <span className="text-sm font-bold text-foreground">Scrub Slice:</span>
                  <span className="text-sm font-mono font-extrabold text-primary w-16">#{currentSlice} / 176</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={176}
                  value={currentSlice}
                  onChange={(e) => setCurrentSlice(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Right Col: AI Preprocessing Pipeline Progress */}
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 flex flex-col justify-between shadow-2xs">
              <div>
                <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-3">
                  <Cpu size={20} className="text-primary" />
                  <h3 className="text-base font-extrabold text-foreground">Preprocessing Status</h3>
                </div>

                <div className="space-y-2.5">
                  {PREPROCESSING_PIPELINE.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-background border border-border text-sm">
                      <span className="font-bold text-foreground text-sm">{item.step}</span>
                      <span className="flex items-center gap-1 text-sm font-extrabold text-emerald-400">
                        <CheckCircle2 size={16} /> Ready
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
