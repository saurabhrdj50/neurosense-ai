import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Brain,
  Layers,
  Sliders,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Upload,
} from 'lucide-react'

import { Niivue, SLICE_TYPE } from '@niivue/niivue'

const SLICE_TYPES = SLICE_TYPE || {
  AXIAL: 0,
  CORONAL: 1,
  SAGITTAL: 2,
  MULTIPLANAR: 3,
  RENDER: 4,
}

const COLORMAPS = [
  { id: 'gray', label: 'Grayscale (T1/T2)' },
  { id: 'viridis', label: 'Viridis' },
  { id: 'magma', label: 'Magma' },
  { id: 'turbo', label: 'Turbo / Jet' },
  { id: 'warm', label: 'Warm (PET)' },
  { id: 'bone', label: 'Bone' },
]

export function NiiVueViewer({ mri }) {
  const [activeTab, setActiveTab] = useState('gradcam') // 'gradcam' | 'niivue3d'
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef(null)

  // Grad-CAM layer inspector state
  const gradcamOverlay = mri?.gradcam_image_base64 || mri?.gradcam_image
  const heatmapLayer = mri?.gradcam_heatmap
  const originalLayer = mri?.mri_image
  const hasInteractiveLayers = Boolean(heatmapLayer && originalLayer)

  const [heatmapOpacity, setHeatmapOpacity] = useState(65)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [inspectCoords, setInspectCoords] = useState(null)
  const [showCrosshairs, setShowCrosshairs] = useState(true)
  const [isInverted, setIsInverted] = useState(false)

  // NiiVue 3D state
  const canvasRef = useRef(null)
  const nvInstanceRef = useRef(null)
  const [sliceType, setSliceType] = useState('multiplanar')
  const [colormap, setColormap] = useState('gray')
  const [nvCrosshair, setNvCrosshair] = useState(true)
  const [nvColorbar, setNvColorbar] = useState(true)
  const [webglError, setWebglError] = useState(null)
  const [isNvLoading, setIsNvLoading] = useState(false)
  const [nvLocation, setNvLocation] = useState({ vox: [0, 0, 0], mm: [0, 0, 0], val: 0 })

  // Fullscreen handler
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // NiiVue WebGL Lifecycle
  useEffect(() => {
    if (activeTab !== 'niivue3d') return
    if (!canvasRef.current) return

    // Verify WebGL2 support
    const canvas = canvasRef.current
    let gl = null
    try {
      gl = canvas.getContext('webgl2')
    } catch {
      gl = null
    }

    if (!gl) {
      setWebglError('WebGL 2.0 is not supported or hardware accelerated in this browser environment.')
      return
    }

    let isDisposed = false
    setIsNvLoading(true)
    setWebglError(null)

    try {
      const nv = new Niivue({
        show3Dcrosshair: nvCrosshair,
        backColor: [0.03, 0.04, 0.07, 1],
        isColorbar: nvColorbar,
        crosshairColor: [0.39, 0.4, 0.95, 0.8],
      })
      nvInstanceRef.current = nv

      nv.onLocationChange = (data) => {
        if (!isDisposed && data) {
          setNvLocation({
            vox: data.vox || [0, 0, 0],
            mm: data.mm ? data.mm.map((v) => Math.round(v)) : [0, 0, 0],
            val: data.values && data.values.length ? Number(data.values[0].value).toFixed(2) : 0,
          })
        }
      }

      nv.attachToCanvas(canvas).then(async () => {
        if (isDisposed) return
        nv.setSliceType(SLICE_TYPES.MULTIPLANAR)
        try {
          // Load reference MNI152 template volume
          await nv.loadVolumes([
            {
              url: 'https://niivue.github.io/niivue/images/mni152.nii.gz',
              colormap: colormap,
              opacity: 1,
            },
          ])
        } catch {
          // Fallback if network/offline
        } finally {
          if (!isDisposed) setIsNvLoading(false)
        }
      }).catch((err) => {
        if (!isDisposed) {
          setWebglError(`NiiVue initialization error: ${err?.message || 'Failed to attach to canvas'}`)
          setIsNvLoading(false)
        }
      })
    } catch (e) {
      setWebglError(`NiiVue error: ${e?.message || 'WebGL initialization failure'}`)
      setIsNvLoading(false)
    }

    return () => {
      isDisposed = true
      if (nvInstanceRef.current) {
        try {
          nvInstanceRef.current = null
        } catch {
          // ignore cleanup errors
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // Update NiiVue options on state change
  const handleSliceTypeChange = (type) => {
    setSliceType(type)
    const nv = nvInstanceRef.current
    if (!nv) return
    const code = {
      multiplanar: SLICE_TYPES.MULTIPLANAR,
      axial: SLICE_TYPES.AXIAL,
      coronal: SLICE_TYPES.CORONAL,
      sagittal: SLICE_TYPES.SAGITTAL,
      render: SLICE_TYPES.RENDER,
    }[type] ?? SLICE_TYPES.MULTIPLANAR
    nv.setSliceType(code)
  }

  const handleColormapChange = (cmap) => {
    setColormap(cmap)
    const nv = nvInstanceRef.current
    if (!nv || !nv.volumes || !nv.volumes.length) return
    try {
      nv.setColormap(nv.volumes[0].id, cmap)
    } catch {
      // fallback
    }
  }

  const toggleNvCrosshair = () => {
    const next = !nvCrosshair
    setNvCrosshair(next)
    const nv = nvInstanceRef.current
    if (!nv) return
    nv.opts.show3Dcrosshair = next
    nv.updateGLVolume?.()
  }

  const toggleNvColorbar = () => {
    const next = !nvColorbar
    setNvColorbar(next)
    const nv = nvInstanceRef.current
    if (!nv) return
    nv.opts.isColorbar = next
    nv.drawScene?.()
  }

  const handleCustomFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const nv = nvInstanceRef.current
    if (!nv) return
    setIsNvLoading(true)
    nv.loadFromFile(file)
      .then(() => {
        setIsNvLoading(false)
      })
      .catch((err) => {
        setWebglError(`Failed to load file: ${err.message}`)
        setIsNvLoading(false)
      })
  }

  // Crosshair mouse inspection on Grad-CAM
  const handleGradcamMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    setInspectCoords({ x, y })
  }

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border border-border bg-background/95 backdrop-blur-md overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'relative w-full'
      }`}
    >
      {/* Top Header / Mode Switcher */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface/60 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-indigo-500" />
          <span className="text-xs sm:text-sm font-bold text-foreground">
            3D Neuroimaging & Saliency Explorer
          </span>
          {mri?.stage && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              {mri.stage}
            </span>
          )}
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-0.5 rounded-lg bg-surface border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('gradcam')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'gradcam'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Layers size={13} />
              <span>Patient Grad-CAM Inspector</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('niivue3d')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'niivue3d'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              <Sparkles size={13} />
              <span>NiiVue 3D Multi-Planar</span>
            </button>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground-muted hover:text-foreground transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Main Viewer Body */}
      {activeTab === 'gradcam' ? (
        <div className="p-4 space-y-4">
          {/* Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-surface/50 border border-border text-xs">
            {/* Opacity Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-foreground-muted font-medium">
                <span>Grad-CAM Opacity</span>
                <span className="font-mono font-bold text-foreground">{heatmapOpacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={heatmapOpacity}
                onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Brightness / Window */}
            <div className="space-y-1">
              <div className="flex justify-between text-foreground-muted font-medium">
                <span>Intensity / Brightness</span>
                <span className="font-mono font-bold text-foreground">{brightness}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="180"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Contrast / Level */}
            <div className="space-y-1">
              <div className="flex justify-between text-foreground-muted font-medium">
                <span>Contrast Window</span>
                <span className="font-mono font-bold text-foreground">{contrast}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(Number((z + 0.25).toFixed(2)), 2.5))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground-muted hover:text-foreground"
              >
                <ZoomIn size={13} /> Zoom ({Math.round(zoomLevel * 100)}%)
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(Number((z - 0.25).toFixed(2)), 0.75))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground-muted hover:text-foreground"
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                onClick={() => setShowCrosshairs((c) => !c)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                  showCrosshairs
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                    : 'border-border bg-surface text-foreground-muted'
                }`}
              >
                <Eye size={13} /> Crosshair Guide
              </button>
              <button
                type="button"
                onClick={() => setIsInverted((v) => !v)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                  isInverted
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                    : 'border-border bg-surface text-foreground-muted'
                }`}
              >
                Invert Lut
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setHeatmapOpacity(65)
                setBrightness(100)
                setContrast(100)
                setZoomLevel(1.0)
                setIsInverted(false)
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground-muted hover:text-foreground"
            >
              <RotateCcw size={13} /> Reset View
            </button>
          </div>

          {/* Interactive Canvas Display Area */}
          <div
            className="relative rounded-xl overflow-hidden border border-indigo-500/30 bg-black flex items-center justify-center min-h-[320px] max-h-[520px] select-none cursor-crosshair group"
            onMouseMove={handleGradcamMouseMove}
            onMouseLeave={() => setInspectCoords(null)}
          >
            {gradcamOverlay ? (
              <div
                className="relative transition-transform duration-150 ease-out"
                style={{
                  transform: `scale(${zoomLevel})`,
                  filter: `brightness(${brightness}%) contrast(${contrast}%) ${
                    isInverted ? 'invert(1)' : ''
                  }`,
                }}
              >
                {/* Base MRI scan layer */}
                {hasInteractiveLayers ? (
                  <img
                    src={`data:image/png;base64,${originalLayer}`}
                    alt="Original patient MRI scan"
                    className="max-h-[460px] w-auto object-contain block mx-auto"
                  />
                ) : null}

                {/* Blended Grad-CAM Heatmap layer */}
                {hasInteractiveLayers ? (
                  <img
                    src={`data:image/png;base64,${heatmapLayer}`}
                    alt="Grad-CAM activation heatmap overlay"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    style={{ opacity: heatmapOpacity / 100 }}
                  />
                ) : (
                  <img
                    src={`data:image/png;base64,${gradcamOverlay}`}
                    alt="Grad-CAM activation overlay"
                    className="max-h-[460px] w-auto object-contain block mx-auto"
                    style={{ opacity: Math.max(heatmapOpacity / 100, 0.2) }}
                  />
                )}

                {/* Interactive Dynamic Crosshairs */}
                {showCrosshairs && inspectCoords && (
                  <>
                    <div
                      className="absolute top-0 bottom-0 w-px bg-indigo-400/70 pointer-events-none"
                      style={{ left: `${inspectCoords.x}%` }}
                    />
                    <div
                      className="absolute left-0 right-0 h-px bg-indigo-400/70 pointer-events-none"
                      style={{ top: `${inspectCoords.y}%` }}
                    />
                    <div
                      className="absolute w-3 h-3 rounded-full border border-indigo-300 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${inspectCoords.x}%`, top: `${inspectCoords.y}%` }}
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 p-8 text-foreground-muted text-xs">
                <Brain size={28} className="text-indigo-400/60" />
                <span>No Grad-CAM visualization image available for this MRI session.</span>
              </div>
            )}

            {/* Live Coordinate Badge Overlay */}
            {inspectCoords && (
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/80 border border-white/10 text-[10px] font-mono text-white/90 backdrop-blur-xs pointer-events-none">
                <span>Voxel Plane: X={inspectCoords.x}% · Y={inspectCoords.y}%</span>
              </div>
            )}

            {/* Saliency Legend Bar */}
            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-[10px] text-white/90 backdrop-blur-xs pointer-events-none flex items-center gap-2">
              <span className="font-semibold text-white/70">Activation:</span>
              <div className="w-16 h-2 rounded-full bg-gradient-to-r from-blue-600 via-amber-400 to-rose-600" />
              <span className="text-[9px] text-rose-400 font-bold">Max Saliency</span>
            </div>
          </div>

          <p className="text-xs text-foreground-muted leading-relaxed">
            {mri?.heatmap_explanation ||
              'Grad-CAM highlights neural regions that contributed most to the stage classification. Warmer regions represent higher feature saliency.'}
          </p>
        </div>
      ) : (
        /* NiiVue 3D WebGL Multi-Planar View */
        <div className="p-4 space-y-3.5">
          {/* NiiVue Toolbar */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface/50 border border-border flex-wrap text-xs">
            {/* View Selectors */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface border border-border flex-wrap">
              {[
                { id: 'multiplanar', label: 'Multi-Planar' },
                { id: 'axial', label: 'Axial' },
                { id: 'coronal', label: 'Coronal' },
                { id: 'sagittal', label: 'Sagittal' },
                { id: 'render', label: '3D Raycast Render' },
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSliceTypeChange(v.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    sliceType === v.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-foreground-muted hover:text-foreground'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>

            {/* Colormap & Display Toggles */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-foreground-muted font-medium">LUT:</span>
                <select
                  value={colormap}
                  onChange={(e) => handleColormapChange(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-border bg-surface text-foreground text-[11px] font-medium"
                >
                  {COLORMAPS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={toggleNvCrosshair}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                  nvCrosshair
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                    : 'border-border bg-surface text-foreground-muted'
                }`}
              >
                Crosshairs
              </button>

              <button
                type="button"
                onClick={toggleNvColorbar}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                  nvColorbar
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                    : 'border-border bg-surface text-foreground-muted'
                }`}
              >
                Colorbar
              </button>

              {/* Load Custom NIfTI File */}
              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground-muted hover:text-foreground cursor-pointer transition-colors text-[11px] font-medium">
                <Upload size={12} />
                <span>Load .nii / .nii.gz</span>
                <input
                  type="file"
                  accept=".nii,.nii.gz,.dcm"
                  onChange={handleCustomFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="relative rounded-xl overflow-hidden border border-indigo-500/30 bg-black min-h-[380px] h-[520px]">
            {webglError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-xs text-foreground-muted space-y-2 bg-surface/80 backdrop-blur-xs">
                <Brain size={32} className="text-amber-500/70" />
                <p className="font-semibold text-foreground">{webglError}</p>
                <p className="max-w-md">
                  WebGL 2.0 hardware context is unavailable in this browser session. You can continue using the
                  Patient Grad-CAM Inspector tab for full high-resolution layer exploration.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('gradcam')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium"
                >
                  Switch to Grad-CAM Inspector
                </button>
              </div>
            ) : (
              <canvas ref={canvasRef} className="w-full h-full block" />
            )}

            {isNvLoading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-xs text-white/90 gap-2 font-medium">
                <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                <span>Streaming 3D neuroimaging volume...</span>
              </div>
            )}

            {/* Coordinate Status Bar */}
            {!webglError && (
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-[10px] font-mono text-white/80 backdrop-blur-xs flex items-center gap-3">
                <span>Voxel: [{nvLocation.vox.join(', ')}]</span>
                <span>World: [{nvLocation.mm.join(', ')} mm]</span>
                <span>Intensity: {nvLocation.val}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-foreground-muted">
            <p>
              Use primary click to pan, secondary click to window/level contrast, and scroll wheel to traverse orthogonal slices.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
export default NiiVueViewer
