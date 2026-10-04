import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion as Motion } from 'framer-motion'
import DropZone from '../../../shared/components/ui/DropZone'
import { Layers, CheckCircle2, Brain, Loader2 } from 'lucide-react'
import { analysisApi } from '../api/analysisApi'

export function MRIStep({ mriFile, setMriFile }) {
  const [previewSrc, setPreviewSrc] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState(null)
  const previewUrlRef = useRef(null)

  const handleFileSelect = (file) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setMriFile(file)
    setPreviewError(null)
    setPreviewLoading(!isRasterImage(file))

    if (isRasterImage(file)) {
      const objectUrl = URL.createObjectURL(file)
      previewUrlRef.current = objectUrl
      setPreviewSrc(objectUrl)
    } else {
      setPreviewSrc(null)
    }
  }

  const isRasterImage = (file) => {
    if (!file) return false
    const name = (file.name || '').toLowerCase()
    return /\.(png|jpe?g|gif|bmp|tif{1,2})$/.test(name)
  }

  // NIfTI volumes need a backend-rendered slice for preview.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!mriFile) return
    if (isRasterImage(mriFile)) return

    let cancelled = false

    analysisApi.mriPreview(mriFile)
      .then((url) => {
        if (cancelled) {
          if (url) URL.revokeObjectURL(url)
          return
        }
        if (url) {
          previewUrlRef.current = url
          setPreviewSrc(url)
        }
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
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setMriFile(null)
    setPreviewSrc(null)
    setPreviewError(null)
    setPreviewLoading(false)
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
                Upload a brain MRI image for classification. NIfTI volumes are processed as multi-slice input.
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
          'application/x-nifti': ['.nii', '.nii.gz'],
          'application/octet-stream': ['.nii', '.nii.gz']
        }}
        label="Upload Structural MRI Scan"
        hint="Supports NIfTI (.nii / .nii.gz), JPG, PNG, and TIFF"
        file={mriFile}
        onFile={handleFileSelect}
        onClear={handleClear}
        type="image"
      />

      {/* Main Review Viewport (When MRI is attached) */}
      {mriFile && (
        <Motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 gap-5">
            <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 shadow-2xs">
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

              </div>
            </div>
          </div>
        </Motion.div>
      )}
    </div>
  )
}
