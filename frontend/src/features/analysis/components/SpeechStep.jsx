import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Play, Square, Upload, Volume2, CheckCircle2, ChevronRight, MessageSquare, AlertCircle, HeartPulse } from 'lucide-react'
import DropZone from '../../../components/ui/DropZone'

const GUIDED_TASKS = [
  { id: 1, title: 'Introduce Yourself', prompt: 'Ask the patient: "Please state your full name, age, and where you live."' },
  { id: 2, title: 'Describe Your Morning', prompt: 'Ask the patient: "Describe what you did from the time you woke up this morning until now."' },
  { id: 3, title: 'Serial 7s Backwards', prompt: 'Ask the patient: "Count backwards from 100 by 7s aloud."' },
  { id: 4, title: 'Animal Category Naming', prompt: 'Ask the patient: "Name as many animals as you can in 60 seconds."' },
  { id: 5, title: 'Cookie Theft Picture Description', prompt: 'Show the Boston Diagnostic Cookie Theft picture and ask: "Tell me everything happening in this picture."' },
  { id: 6, title: 'Delayed Story Recall', prompt: 'Ask the patient: "Tell me back the story details we read to you earlier."' },
]

const CLINICAL_FINDINGS = [
  { label: 'Speech Fluency', status: 'Slightly Hesitant', score: '78%', note: 'Occasional pauses during word retrieval' },
  { label: 'Word Finding', status: 'Moderate Anomia', score: '64%', note: 'Increased reliance on generic pronouns' },
  { label: 'Speaking Speed', status: 'Mildly Reduced', score: '112 WPM', note: 'Normal range: 130 - 160 WPM' },
  { label: 'Pause Frequency', status: 'Elevated Pauses', score: '4.2 / min', note: 'Unfilled inter-phrase pauses' },
  { label: 'Topic Consistency', status: 'Preserved Coherence', score: '91%', note: 'Stays focused on topic prompt' },
  { label: 'Memory Recall', status: 'Mildly Reduced', score: '70%', note: 'Recalled 3 of 5 story details' },
]

const EMOTIONAL_INDICATORS = [
  { label: 'Calmness', value: '75%', status: 'Calm' },
  { label: 'Anxiety Level', value: 'Low', status: 'Mild Anxiety' },
  { label: 'Stress Level', value: 'Minimal', status: 'Controlled' },
  { label: 'Emotional Stability', value: 'Stable', status: 'Cooperative' },
]

export function SpeechStep({ speechText, setSpeechText, audioFile, setAudioFile }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(42)
  const [activeTaskId, setActiveTaskId] = useState(1)

  const activeTask = GUIDED_TASKS.find(t => t.id === activeTaskId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-foreground">Speech & Language Assessment</h2>
        <p className="text-xs text-foreground-muted">Standardized speech recording, guided task protocols, and acoustic fluency evaluation.</p>
      </div>

      {/* SECTION 1: Recording & Audio Controls */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Mic size={14} className="text-primary" /> Section 1: Audio Recording & Playback
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Record & Playback Bar */}
          <div className="p-3 rounded-xl bg-background border border-border/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRecording(!isRecording)}
                className={`p-2.5 rounded-xl font-bold flex items-center gap-1.5 text-xs transition-all ${
                  isRecording
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30'
                }`}
              >
                {isRecording ? <Square size={13} /> : <Mic size={13} />}
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>

              <div className="text-xs font-mono font-bold text-foreground pl-1">
                00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </div>
            </div>

            <div className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
              Quality: High SNR (48kHz)
            </div>
          </div>

          {/* Audio File Dropzone */}
          <DropZone
            accept={{ 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.webm'] }}
            label="Upload Audio File"
            hint="MP3, WAV, M4A (Max 25 MB)"
            file={audioFile}
            onFile={setAudioFile}
            onClear={() => setAudioFile(null)}
            type="audio"
          />
        </div>

        {/* Live Transcript Field */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground-muted block">Live Speech Transcript:</label>
          <textarea
            value={speechText}
            onChange={(e) => setSpeechText(e.target.value)}
            placeholder="Transcript will populate automatically during recording or file analysis. You can also edit manually..."
            rows={3}
            className="w-full px-3 py-2 rounded-xl text-xs bg-background text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* SECTION 2: Guided Speech Tasks */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <MessageSquare size={14} className="text-primary" /> Section 2: Guided Speech Tasks (Task {activeTaskId} of 6)
          </h3>
          <div className="flex gap-1">
            {GUIDED_TASKS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTaskId(t.id)}
                className={`w-6 h-6 rounded-lg text-xs font-bold transition-all border ${
                  activeTaskId === t.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background hover:bg-surface-hover text-foreground-muted border-border'
                }`}
              >
                {t.id}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-background border border-border/80 space-y-1">
          <h4 className="text-xs font-bold text-foreground">{activeTask.title}</h4>
          <p className="text-xs text-foreground-muted">{activeTask.prompt}</p>
        </div>
      </div>

      {/* SECTION 3: AI Communication Findings */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 size={14} className="text-primary" /> Section 3: AI Communication Findings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CLINICAL_FINDINGS.map(cf => (
            <div key={cf.label} className="p-3 rounded-2xl bg-surface border border-border space-y-1">
              <span className="text-[11px] font-semibold text-foreground-muted block">{cf.label}</span>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{cf.status}</span>
                <span className="text-xs font-extrabold text-primary">{cf.score}</span>
              </div>
              <p className="text-[10px] text-foreground-muted italic pt-0.5">{cf.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4: Conversation Summary & Emotional Indicators */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-4">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
          <HeartPulse size={14} className="text-primary" /> Section 4: Clinical Summary & Affect Indicators
        </h3>

        {/* Concise Paragraph Summary */}
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-foreground leading-relaxed">
          <strong className="text-indigo-400 font-bold block mb-1">Synthesized Speech Summary:</strong>
          "The patient demonstrated mild hesitation, moderate word-finding difficulty during object description tasks, preserved articulation, and slightly reduced sentence complexity."
        </div>

        {/* Simple Emotional Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {EMOTIONAL_INDICATORS.map(ei => (
            <div key={ei.label} className="p-2.5 rounded-xl bg-background border border-border text-center">
              <span className="text-[10px] text-foreground-muted block font-semibold">{ei.label}</span>
              <span className="text-xs font-bold text-foreground">{ei.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
