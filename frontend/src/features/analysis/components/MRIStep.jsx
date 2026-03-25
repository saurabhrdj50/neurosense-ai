import React from 'react'
import { motion } from 'framer-motion'
import { SectionTitle, InfoBox } from './SharedComponents'
import DropZone from '../../../components/ui/DropZone'

export function MRIStep({ mriFile, setMriFile }) {
  return (
    <div className="space-y-5">
      <SectionTitle>MRI Brain Scan</SectionTitle>
      <p style={{ fontSize: 13, color: '#9CA3AF', lineHeight: 1.6 }}>
        Upload an axial or coronal MRI slice (JPG/PNG/TIFF). The AI classifier will detect the dementia stage using EfficientNet-B4 with Grad-CAM visualization.
      </p>
      <DropZone accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp'] }} label="Upload MRI Scan"
        hint="JPG, PNG, TIFF · Max 16 MB" file={mriFile} onFile={setMriFile} onClear={() => setMriFile(null)} type="image" />
      {mriFile && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
          <img src={URL.createObjectURL(mriFile)} alt="MRI preview" className="w-32 h-32 object-cover rounded-xl"
            style={{ border: '2px solid #6366f1' }} />
          <div className="flex flex-col justify-center gap-1">
            <p style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 500 }}>{mriFile.name}</p>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>Ready for AI classification</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} />
              <span style={{ fontSize: 12, color: '#4ade80' }}>GradCAM enabled</span>
            </div>
          </div>
        </motion.div>
      )}
      <InfoBox type="info">Supported stages: Non Demented · Very Mild · Mild Demented · Moderate Demented</InfoBox>
    </div>
  )
}
