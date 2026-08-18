import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Sliders, Maximize2, 
  Layers, ChevronRight, Activity, Brain, CheckCircle2, AlertTriangle, Info
} from 'lucide-react'

export default function AdvancedMRIViewer({ patientData }) {
  const [viewPlane, setViewPlane] = useState('axial') // 'axial' | 'coronal' | 'sagittal'
  const [sliceIndex, setSliceIndex] = useState(42)
  const maxSlices = viewPlane === 'axial' ? 80 : viewPlane === 'coronal' ? 75 : 70
  
  // Interactive View Transformations
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })

  // Image Controls
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [showControls, setShowControls] = useState(false)

  // Region & Overlay Controls
  const [selectedRegion, setSelectedRegion] = useState('hippocampus')
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [heatmapOpacity, setHeatmapOpacity] = useState(65)
  const [overlayType, setOverlayType] = useState('probability') // 'probability' | 'attention'

  // Reset viewport
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setBrightness(100)
    setContrast(100)
  }

  // Handle Mouse Wheel Zoom
  const handleWheel = (e) => {
    e.preventDefault()
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9
    setZoom((prev) => Math.min(3, Math.max(0.6, prev * zoomFactor)))
  }

  // Handle Mouse Drag Pan
  const handleMouseDown = (e) => {
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  const metrics = patientData?.mriMetrics || {
    brainVolume: 1042.5,
    brainVolumeNormal: "1050 - 1250 cm³",
    brainVolumeStatus: "Mild Atrophy",
    hippocampalVolume: 2.85,
    hippocampalNormal: "3.5 - 4.5 cm³",
    hippocampalStatus: "Moderate Atrophy",
    corticalThickness: 2.38,
    corticalThicknessNormal: "2.4 - 2.9 mm",
    corticalThicknessStatus: "Thinning",
    ventricleSize: 34.2,
    ventricleSizeNormal: "15 - 35 cm³",
    ventricleSizeStatus: "Normal",
    whiteMatterLoss: 5.4,
    whiteMatterLossNormal: "< 4.0 %",
    whiteMatterLossStatus: "Elevated"
  }

  const regions = [
    { id: 'hippocampus', name: 'Hippocampus', volume: `${metrics.hippocampalVolume} cm³`, status: metrics.hippocampalStatus, color: '#ef4444' },
    { id: 'temporal', name: 'Temporal Lobe', volume: '184.2 cm³', status: 'Moderate Shrinkage', color: '#f59e0b' },
    { id: 'frontal', name: 'Frontal Lobe', volume: '312.8 cm³', status: 'Preserved', color: '#10b981' },
    { id: 'parietal', name: 'Parietal Lobe', volume: '210.5 cm³', status: 'Mild Deficit', color: '#6366f1' }
  ]

  // Image source mockup generator using Canvas for high clinical realism
  const getSliceMockup = () => {
    return `https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80`
  }

  return (
    <div className="space-y-6">
      {/* Viewer Header & Controls */}
      <div className="rounded-2xl p-4 shadow-xl border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-500/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Multi-Planar Interactive MRI Workstation</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>T1-Weighted 3D MPRAGE • 3T Clinical Scanner</p>
            </div>
          </div>

          {/* View Plane Selector */}
          <div className="flex items-center p-1 rounded-xl border" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
            {['axial', 'coronal', 'sagittal'].map((plane) => (
              <button
                key={plane}
                onClick={() => {
                  setViewPlane(plane)
                  setSliceIndex(Math.floor(maxSlices / 2))
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  viewPlane === plane
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {plane}
              </button>
            ))}
          </div>

          {/* Canvas Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="p-2 rounded-lg border transition hover:opacity-80"
              style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              className="p-2 rounded-lg border transition hover:opacity-80"
              style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-lg border transition hover:opacity-80"
              style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowControls(!showControls)}
              className={`p-2 rounded-lg border transition ${
                showControls
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'hover:opacity-80'
              }`}
              style={!showControls ? { background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' } : {}}
              title="Brightness & Contrast"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sliders for Brightness & Contrast */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 overflow-hidden"
            >
              <div className="flex items-center gap-3 p-2.5 rounded-xl border" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
                <span className="text-xs font-medium w-20" style={{ color: 'var(--text-muted)' }}>Brightness</span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <span className="text-xs font-mono text-indigo-500 w-10 text-right">{brightness}%</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl border" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
                <span className="text-xs font-medium w-20" style={{ color: 'var(--text-muted)' }}>Contrast</span>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
                <span className="text-xs font-mono text-indigo-500 w-10 text-right">{contrast}%</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Grid: Viewer + Controls Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRI Canvas Display */}
        <div className="lg:col-span-2 rounded-2xl border overflow-hidden flex flex-col relative group" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
          {/* Overlay Status Bar */}
          <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
            <span className="px-2.5 py-1 backdrop-blur text-xs font-mono text-indigo-600 dark:text-indigo-400 rounded-md border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
              VIEW: {viewPlane.toUpperCase()}
            </span>
            <span className="px-2.5 py-1 backdrop-blur text-xs font-mono text-emerald-600 dark:text-emerald-400 rounded-md border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
              SLICE {sliceIndex} / {maxSlices}
            </span>
            {showHeatmap && (
              <span className="px-2.5 py-1 bg-rose-500/20 backdrop-blur text-xs font-mono text-rose-500 rounded-md border border-rose-500/30">
                HEATMAP {heatmapOpacity}%
              </span>
            )}
          </div>

          {/* Canvas Viewport */}
          <div
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full h-[460px] flex items-center justify-center relative cursor-grab active:cursor-grabbing overflow-hidden select-none"
            style={{ background: 'var(--surface-card)' }}
          >
            <motion.div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                filter: `brightness(${brightness}%) contrast(${contrast}%)`
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-[380px] h-[380px] flex items-center justify-center"
            >
              {/* MRI Anatomical Slice Placeholder Visual */}
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border-4 border-slate-700/50 flex items-center justify-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-4 rounded-full border border-slate-600/30 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                  <Brain className="w-48 h-48 text-slate-600/40 animate-pulse" />
                </div>

                {/* Dynamic Heatmap Mask Overlay */}
                {showHeatmap && (
                  <div
                    style={{ opacity: heatmapOpacity / 100 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/40 to-amber-500/50 mix-blend-color-dodge transition-opacity duration-300 pointer-events-none"
                  >
                    <div className="absolute top-1/3 left-1/3 w-28 h-28 bg-red-600/60 rounded-full blur-xl animate-pulse" />
                    <div className="absolute bottom-1/3 right-1/4 w-20 h-20 bg-amber-500/50 rounded-full blur-lg" />
                  </div>
                )}

                {/* Attention Region Outlines */}
                {selectedRegion === 'hippocampus' && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-20 rounded-full border-2 border-red-500 border-dashed animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center justify-center">
                    <span className="text-[10px] font-mono text-red-400 bg-slate-900/90 px-1 rounded">Hippocampus</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Bottom Slice Slider Bar */}
          <div className="p-4 border-t flex items-center gap-4" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
            <span className="text-xs font-mono w-16" style={{ color: 'var(--text-muted)' }}>Slice: {sliceIndex}</span>
            <input
              type="range"
              min="1"
              max={maxSlices}
              value={sliceIndex}
              onChange={(e) => setSliceIndex(Number(e.target.value))}
              className="w-full accent-indigo-500 h-2 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono w-12 text-right" style={{ color: 'var(--text-muted)' }}>{maxSlices}</span>
          </div>
        </div>

        {/* Right Sidebar: Region Selector & Heatmap Controls */}
        <div className="space-y-6">
          {/* Heatmap & Overlay Controls */}
          <div className="rounded-2xl p-5 shadow-xl border space-y-4" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Layers className="w-4 h-4 text-rose-500" />
                Heatmap & Overlays
              </h4>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`p-1.5 rounded-lg border transition ${
                  showHeatmap
                    ? 'bg-rose-500/20 text-rose-500 border-rose-500/30'
                    : 'text-slate-400 border-slate-700'
                }`}
              >
                {showHeatmap ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {showHeatmap && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>Heatmap Opacity</span>
                    <span className="font-mono text-rose-500">{heatmapOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={heatmapOpacity}
                    onChange={(e) => setHeatmapOpacity(Number(e.target.value))}
                    className="w-full accent-rose-500 h-1.5 rounded-lg"
                  />
                </div>

                {/* Heatmap Legend */}
                <div className="pt-2">
                  <span className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>Probability Scale</span>
                  <div className="h-3 w-full rounded-md bg-gradient-to-r from-blue-600 via-amber-400 to-red-600" />
                  <div className="flex justify-between text-[10px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                    <span>0% (Low)</span>
                    <span>50%</span>
                    <span>100% (High Risk)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Brain Region Selector */}
          <div className="rounded-2xl p-5 shadow-xl border space-y-4" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
            <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Brain className="w-4 h-4 text-indigo-500" />
              Brain Region Focus
            </h4>

            <div className="space-y-2">
              {regions.map((reg) => (
                <button
                  key={reg.id}
                  onClick={() => setSelectedRegion(reg.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                    selectedRegion === reg.id
                      ? 'bg-indigo-500/10 border-indigo-500/50 text-foreground'
                      : 'border-border/80 text-foreground-muted hover:border-border'
                  }`}
                  style={selectedRegion !== reg.id ? { background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' } : {}}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: reg.color }} />
                    <div>
                      <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{reg.name}</div>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{reg.volume}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    {reg.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MRI Metrics Panel */}
      <div className="rounded-2xl p-6 shadow-xl space-y-4 border" style={{ background: 'var(--surface-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <h4 className="text-base font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Volumetric & Structural Biomarker Metrics
          </h4>
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Automated Segmentation via Deep Learning Engine</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: 'Brain Volume', value: `${metrics.brainVolume || 0} cm³`, normal: metrics.brainVolumeNormal || 'N/A', status: metrics.brainVolumeStatus || 'N/A', isAlert: (metrics.brainVolumeStatus || '').includes('Atrophy') },
            { label: 'Hippocampal Vol.', value: `${metrics.hippocampalVolume || 0} cm³`, normal: metrics.hippocampalNormal || 'N/A', status: metrics.hippocampalStatus || 'N/A', isAlert: (metrics.hippocampalStatus || '').includes('Atrophy') },
            { label: 'Cortical Thickness', value: `${metrics.corticalThickness || 0} mm`, normal: metrics.corticalThicknessNormal || 'N/A', status: metrics.corticalThicknessStatus || 'N/A', isAlert: metrics.corticalThicknessStatus === 'Thinning' },
            { label: 'Ventricle Size', value: `${metrics.ventricleSize || 0} cm³`, normal: metrics.ventricleSizeNormal || 'N/A', status: metrics.ventricleSizeStatus || 'N/A', isAlert: metrics.ventricleSizeStatus === 'Enlarged' },
            { label: 'White Matter Loss', value: `${metrics.whiteMatterLoss || 0} %`, normal: metrics.whiteMatterLossNormal || 'N/A', status: metrics.whiteMatterLossStatus || 'N/A', isAlert: metrics.whiteMatterLossStatus === 'Elevated' }
          ].map((m, idx) => (
            <div key={idx} className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--surface-hover)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-xs font-medium block" style={{ color: 'var(--text-muted)' }}>{m.label}</span>
              <div className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{m.value}</div>
              <div className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>Ref: {m.normal}</div>
              <div className="pt-1 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                  m.isAlert ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                }`}>
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
