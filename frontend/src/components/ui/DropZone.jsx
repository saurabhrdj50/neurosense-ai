import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, CheckCircle, Image, FileAudio, FileText } from 'lucide-react'

const ICON_MAP = {
  image: Image,
  audio: FileAudio,
  default: FileText,
}

/**
 * Animated drag-and-drop file upload zone with improved visibility.
 */
export default function DropZone({ accept, label = 'Upload File', hint = 'Drag & drop or click to browse', file, onFile, onClear, type = 'default' }) {
  const onDrop = useCallback((accepted) => {
    if (accepted[0]) onFile(accepted[0])
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    multiple: false,
  })

  const Icon = ICON_MAP[type] || ICON_MAP.default

  return (
    <div>
      <AnimatePresence mode="wait">
        {file ? (
          /* ── File selected state ─────────── */
          <motion.div
            key="file-selected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-3 p-4 rounded-2xl"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            <CheckCircle size={20} style={{ color: '#22c55e', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 14, fontWeight: 500, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file.name}
              </p>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                {(file.size / 1024).toFixed(1)} KB · Ready for analysis
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClear}
              style={{ background: '#374151', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: 6, borderRadius: 8 }}
            >
              <X size={16} />
            </motion.button>
          </motion.div>
        ) : (
          /* ── Drop zone ────────────────────── */
          <motion.div
            key="dropzone"
            {...getRootProps()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            whileHover={{ borderColor: '#6366f1', background: 'rgba(99,102,241,0.05)' }}
            className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl cursor-pointer transition-all text-center`}
            style={{
              border: '2px dashed #374151',
              background: '#1F2937',
              minHeight: 140,
            }}
          >
            <input {...getInputProps()} />

            <motion.div
              animate={isDragActive ? { scale: [1, 1.2, 1], rotate: [0, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
            >
              {isDragActive ? (
                <Upload size={24} style={{ color: '#6366f1' }} />
              ) : (
                <Icon size={24} style={{ color: '#6366f1' }} />
              )}
            </motion.div>

            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#FFFFFF' }}>
                {isDragActive ? 'Drop file here…' : label}
              </p>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{hint}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
