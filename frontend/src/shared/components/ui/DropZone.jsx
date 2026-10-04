/**
 * @fileoverview Enterprise drag-and-drop file upload zone.
 * No dark hardcoded backgrounds, no neon accent hovers.
 */
import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, CheckCircle, Image, FileAudio, FileText } from 'lucide-react'

const ICON_MAP = {
  image:   Image,
  audio:   FileAudio,
  default: FileText,
}

/**
 * Enterprise drop zone.
 *
 * @param {object}   [props.accept]        react-dropzone accept MIME map.
 * @param {string}   [props.label]         Primary label.
 * @param {string}   [props.hint]          Sub-label.
 * @param {File|null} props.file           Selected file or null.
 * @param {function} props.onFile          Called with chosen File.
 * @param {function} props.onClear         Clears selected file.
 * @param {'image'|'audio'|'default'} [props.type]
 */
export default function DropZone({
  accept,
  label = 'Upload File',
  hint = 'Drag & drop or click to browse',
  file,
  onFile,
  onClear,
  type = 'default',
}) {
  const onDrop = useCallback(accepted => { if (accepted[0]) onFile(accepted[0]) }, [onFile])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept, maxFiles: 1, multiple: false })
  const Icon = ICON_MAP[type] || ICON_MAP.default

  if (file) {
    return (
      <div className="flex items-center gap-3 p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50">
        <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {(file.size / 1024).toFixed(1)} KB · Ready for analysis
          </p>
        </div>
        <button
          onClick={onClear}
          aria-label="Remove selected file"
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center gap-3 p-8 rounded-lg cursor-pointer transition-colors text-center border-2 border-dashed ${
        isDragActive
          ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-600'
          : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20'
      }`}
      style={{ minHeight: 130 }}
    >
      <input {...getInputProps()} />

      <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
        isDragActive
          ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
      }`}>
        {isDragActive
          ? <Upload size={22} aria-hidden="true" />
          : <Icon    size={22} aria-hidden="true" />
        }
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {isDragActive ? 'Drop file here…' : label}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>
      </div>
    </div>
  )
}
