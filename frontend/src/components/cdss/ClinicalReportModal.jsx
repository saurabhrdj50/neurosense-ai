import React, { useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  X, Printer, Download, FileText, CheckCircle2, ShieldCheck, 
  Brain, Sparkles, Activity, FileSpreadsheet, QrCode
} from 'lucide-react'

export default function ClinicalReportModal({ patientData, onClose }) {
  const reportRef = useRef()

  const handlePrint = () => {
    window.print()
  }

  const patient = patientData || {
    id: "PAT-0104",
    name: "Eleanor Vance",
    age: 74,
    gender: "Female",
    mrn: "MRN-982412",
    stage: "Early AD",
    riskScore: 0.68,
    scanDate: "2026-03-18",
    attendingPhysician: "Dr. Sarah Jenkins, MD"
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* Modal Action Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileText className="w-4 h-4 text-indigo-400" />
            Commercial CDSS Printable Report Preview
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/30"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Surface */}
        <div
          ref={reportRef}
          className="p-8 bg-slate-950 text-slate-100 space-y-6 printable-area overflow-y-auto max-h-[80vh]"
        >
          {/* Hospital Header Banner */}
          <div className="flex items-center justify-between border-b-2 border-indigo-500 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                NS
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-wide">NEUROSENSE HEALTHCARE ACADEMIC CENTER</h1>
                <p className="text-xs text-slate-400">Department of Neurological Sciences & Diagnostic Radiology</p>
                <p className="text-[10px] text-slate-500 font-mono">100 Healthcare Parkway, Medical Plaza Suite 400</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-semibold rounded-md inline-block">
                CLINICAL DECISION REPORT
              </span>
              <p className="text-xs text-slate-400 font-mono">Date: {patient.scanDate}</p>
              <p className="text-xs text-slate-400 font-mono">Report ID: RPT-2026-9901</p>
            </div>
          </div>

          {/* Patient Info Header Grid */}
          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">PATIENT NAME</span>
              <strong className="text-white text-sm">{patient.name}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">AGE / GENDER</span>
              <strong className="text-white">{patient.age} yrs / {patient.gender}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">RECORD NUMBER</span>
              <strong className="text-white">{patient.mrn}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">ATTENDING PHYSICIAN</span>
              <strong className="text-white">{patient.attendingPhysician}</strong>
            </div>
          </div>

          {/* AI Clinical Summary Banner */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Multimodal Synthesis Summary
            </h3>
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-xs text-slate-400">Classified Diagnostic Stage</span>
                <div className="text-base font-bold text-white mt-0.5">{patient.stage}</div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Risk Assessment Index</span>
                <div className="text-base font-bold text-rose-400 font-mono mt-0.5">
                  {Math.round(patient.riskScore * 100)}% Risk
                </div>
              </div>
            </div>
          </div>

          {/* Findings & SHAP Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">MRI Volumetric Findings</h4>
              <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                <li>Bilateral hippocampal volumetric reduction observed.</li>
                <li>Cortical thinning noted in temporal and parietal regions.</li>
                <li>Ventricle dilation within expected range for age group.</li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Speech & Cognitive Profile</h4>
              <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                <li>MMSE Score: <strong className="text-white">{patient.mmse || 26}/30</strong> (Mild Cognitive Deficit)</li>
                <li>Speech Hesitation Pause Rate: <strong className="text-amber-400">1.82s avg</strong> (Elevated)</li>
                <li>Clinical Risk Load: <strong className="text-white">Moderate</strong> (Lancet score 35%)</li>
              </ul>
            </div>
          </div>

          {/* Doctor Signature & Verification QR Code Block */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
            <div className="space-y-2">
              <div className="font-serif italic text-lg text-slate-300 border-b border-slate-700 pb-1 w-48">
                Dr. Sarah Jenkins
              </div>
              <p className="text-xs text-slate-400 font-mono">Attending Neurologist, MD, FANA</p>
              <p className="text-[10px] text-slate-500 font-mono">Electronically Signed • Verification Hash: #990A2F81</p>
            </div>

            <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <QrCode className="w-12 h-12 text-slate-200" />
              <div className="text-[10px] text-slate-400 font-mono">
                <div>Scan to verify</div>
                <div>Audit Log Token</div>
                <div className="text-indigo-400 font-bold">NS-CDSS-VERIFIED</div>
              </div>
            </div>
          </div>

          {/* Mandatory Clinical Disclaimer */}
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-[10px] text-slate-500 leading-relaxed">
            <strong>CLINICAL DISCLAIMER:</strong> This report is generated by NeuroSense AI as an automated Clinical Decision Support System (CDSS). It is intended solely to assist licensed healthcare providers in clinical evaluation. All AI recommendations must be independently corroborated by clinical examination and diagnostic diagnostic criteria before treatment decisions.
          </div>
        </div>
      </motion.div>
    </div>
  )
}
