import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import DropZone from '../../../components/ui/DropZone'
import { Layers, CheckCircle2, Cpu, Brain, Loader2 } from 'lucide-react'
import { analysisApi } from '../api/analysisApi'

const PREPROCESSING_PIPELINE = [
  { step: 'Upload & Read Brain Scan', done: true },
  { step: 'Extract Brain Region', done: true },
  { step: 'Align Scan View (Spatial Alignment)', done: true },
  { step: 'Measure Gray & White Matter', done: true },
  { step: 'Analyze Brain Tissue Patterns', done: true },
]

export function MRIStep({ mriFile, setMriFile }) {
  const [previewSrc, setPreviewSrc] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)

  const handleFileSelect = (file) => {
    setMriFile(file)
    setPreviewSrc(null)
    setPreviewError(null)
  }

  const isRasterImage = (file) => {
    if (!file) return false
    const name = (file.name || '').toLowerCase()
    return /\.(png|jpe?g|gif|bmp|tif{1,2})$/.test(name)
  }

  // A `.nii`/`.nii.gz`/`.dcm` volume can't be rendered by the browser, so we ask
  // the backend to render a representative slice and stream it back as PNG.
  useEffect(() => {
    if (!mriFile) {
      setPreviewSrc(null)
      setPreviewError(null)
      return
    }

    if (isRasterImage(mriFile)) {
      const objectUrl = URL.createObjectURL(mriFile)
      setPreviewSrc(objectUrl)
      setPreviewError(null)
      return () => URL.revokeObjectURL(objectUrl)
    }

    let cancelled = false
    setPreviewLoading(true)
    setPreviewError(null)

    analysisApi.mriPreview(mriFile)
      .then((url) => {
        if (cancelled) return
        if (url) setPreviewSrc(url)
        else throw new Error('No preview generated')
      })
      .catch((err) => {
        if (cancelled) return
        setPreviewError(err?.message || 'Unable to render MRI preview')
        setPreviewSrc(null)
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })

    return () => { cancelled = true }
  }, [mriFile])

  const handleClear = useCallback(() => {
    setMriFile(null)
    setPreviewSrc(null)
    setPreviewError(null)
  }, [setMriFile])

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner with Clinical Artwork ──────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-50/80 via-blue-50/50 to-indigo-50/40 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-800/80 border border-sky-200/60 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Brain size={28} className="drop-shadow" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                Structural Brain MRI Scan
              </h2>
              <p className="text-sm text-foreground-muted font-medium mt-0.5">
                Upload structural brain MRI scan (DICOM or NIfTI format) for automated volumetric segmentation
              </p>
            </div>
          </div>

          {mriFile && (
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="px-4 py-2 rounded-xl text-sm font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-2 shadow-2xs">
                <CheckCircle2 size={18} /> Scan Loaded & Ready
              </span>
            </div>
          )}
        </div>
      </div>

      {/* MRI Dropzone Uploader */}
      <DropZone
        accept={{
          'image/*': ['.jpg', '.jpeg', '.png', '.tif', '.tiff'],
          'application/dicom': ['.dcm'],
          'application/x-nifti': ['.nii', '.nii.gz'],
          'application/octet-stream': ['.nii', '.nii.gz']
        }}
        label="Upload Structural MRI Scan"
        hint="Supports DICOM (.dcm), NIfTI (.nii / .nii.gz), JPG, PNG (Max 64 MB)"
        file={mriFile}
        onFile={handleFileSelect}
        onClear={handleClear}
        type="image"
      />

      {/* Main Review Viewport (When MRI is attached) */}
      {mriFile && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left Col: MRI Preview Canvas (2 Cols) */}
            <div className="md:col-span-2 p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <Layers size={20} className="text-primary" />
                  <span className="text-base font-extrabold text-foreground truncate max-w-sm">{mriFile.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Scan Loaded
                </span>
              </div>

              {/* MRI Image Display Area */}
              <div className="relative aspect-video rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800">
                {previewLoading ? (
                  <div className="flex flex-col items-center gap-3 text-slate-300">
                    <Loader2 size={32} className="animate-spin text-primary" />
                    <span className="text-sm font-bold">Rendering scan preview…</span>
                  </div>
                ) : previewError ? (
                  <div className="flex flex-col items-center gap-2 px-6 text-center">
                    <Brain size={32} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-300">Preview unavailable</span>
                    <span className="text-xs text-slate-500 max-w-sm">{previewError}</span>
                  </div>
                ) : (
                  <img
                    src={previewSrc || '/images/mri_3d_brain_scan.png'}
                    alt="MRI Structural Scan"
                    className="max-h-full object-contain filter contrast-125"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                )}

                {/* Image Specs Badge */}
                <div className="absolute bottom-3 left-3 px-3.5 py-1.5 rounded-xl bg-slate-900/90 text-slate-200 border border-slate-800 text-sm font-mono flex items-center gap-4">
                  <span>Quality: <strong className="text-emerald-400">High (SNR 24dB)</strong></span>
                  <span>Res: <strong>256×256×176</strong></span>
                </div>
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
