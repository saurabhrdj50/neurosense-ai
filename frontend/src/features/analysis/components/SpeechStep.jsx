import React from 'react'
import { SectionTitle, InfoBox } from './SharedComponents'
import DropZone from '../../../components/ui/DropZone'

export function SpeechStep({ speechText, setSpeechText, audioFile, setAudioFile }) {
  return (
    <div className="space-y-4">
      <SectionTitle>Speech & Language Analysis</SectionTitle>
      <p style={{ fontSize: 13, color: '#475569' }}>Transcribe patient speech or type their description. We analyze semantic content, coherence, and vocabulary richness.</p>
      <textarea value={speechText} onChange={e => setSpeechText(e.target.value)}
        placeholder="Describe what the patient said — e.g., 'The patient was asked to describe the cookie theft picture…'"
        rows={5} className="w-full px-4 py-3 rounded-xl text-sm" style={{ resize: 'vertical' }} />
      <div className="relative flex items-center gap-3">
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <span style={{ fontSize: 12, color: '#334155' }}>OR</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <DropZone accept={{ 'audio/*': ['.wav', '.mp3', '.webm', '.ogg', '.flac'] }} label="Upload Audio Recording"
        hint="WAV, MP3, WebM · Max 16 MB" file={audioFile} onFile={setAudioFile} onClear={() => setAudioFile(null)} type="audio" />
      <InfoBox>Audio is transcribed using Whisper then analyzed for cognitive markers.</InfoBox>
    </div>
  )
}
