import React, { useRef, useState } from 'react'
import { SectionTitle } from './SharedComponents'
import DropZone from '../../../components/ui/DropZone'

export function HandwritingStep({ hwFile, setHwFile, hwCanvas, setHwCanvas, hwMode, setHwMode }) {
  const canvasRef = useRef(null)
  const [drawing, setDrawing] = useState(false)

  const startDraw = (e) => {
    setDrawing(true)
    const ctx = canvasRef.current.getContext('2d')
    const r = canvasRef.current.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - r.left, e.clientY - r.top)
  }
  const draw = (e) => {
    if (!drawing) return
    const ctx = canvasRef.current.getContext('2d')
    const r = canvasRef.current.getBoundingClientRect()
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#f1f5f9'
    ctx.lineTo(e.clientX - r.left, e.clientY - r.top)
    ctx.stroke()
  }
  const endDraw = () => {
    setDrawing(false)
    setHwCanvas(canvasRef.current.toDataURL('image/png'))
  }
  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    setHwCanvas('')
  }

  return (
    <div className="space-y-5">
      <SectionTitle>Handwriting Analysis</SectionTitle>
      <div className="flex gap-2 mb-4">
        {['draw', 'upload'].map(m => (
          <button key={m} onClick={() => setHwMode(m)} className="px-5 py-2.5 rounded-xl text-sm font-medium capitalize transition-all hover:scale-105"
            style={{ 
              background: hwMode === m ? 'rgba(99,102,241,0.2)' : '#1F2937', 
              border: hwMode === m ? '1px solid #6366f1' : '1px solid #374151', 
              color: hwMode === m ? '#a5b4fc' : '#9CA3AF', 
              cursor: 'pointer' 
            }}>
            {m === 'draw' ? '✏️ Draw' : '📎 Upload'}
          </button>
        ))}
      </div>
      {hwMode === 'draw' ? (
        <div className="space-y-3">
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>Ask the patient to write a sentence or draw a clock in the canvas below.</p>
          <div className="relative rounded-2xl overflow-hidden" style={{ border: '2px solid #6366f1', background: '#111827' }}>
            <canvas ref={canvasRef} width={600} height={220} style={{ width: '100%', height: 220, display: 'block' }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} />
            <button onClick={clearCanvas} style={{ position: 'absolute', top: 8, right: 8, background: '#374151', border: 'none', color: '#FFFFFF', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
              Clear
            </button>
          </div>
        </div>
      ) : (
        <DropZone accept={{ 'image/*': ['.jpg', '.jpeg', '.png'] }} label="Upload Handwriting Sample"
          hint="JPG or PNG · handwritten text or clock drawing" file={hwFile} onFile={setHwFile} onClear={() => setHwFile(null)} type="image" />
      )}
    </div>
  )
}
