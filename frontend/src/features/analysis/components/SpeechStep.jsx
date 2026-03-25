import React from 'react'
import { SectionTitle, InfoBox } from './SharedComponents'
import DropZone from '../../../components/ui/DropZone'

export function SpeechStep({ speechText, setSpeechText, audioFile, setAudioFile }) {
  return (
    <div className="space-y-5">
      <SectionTitle>Speech & Language Analysis</SectionTitle>
      <p style={{ fontSize: 13, color: '#9CA3AF' }}>Transcribe patient speech or type their description. We analyze semantic content, coherence, and vocabulary richness.</p>
      
      <textarea 
        value={speechText} 
        onChange={e => setSpeechText(e.target.value)}
        placeholder="Describe what the patient said — e.g., 'The patient was asked to describe the cookie theft picture…'"
        rows={5} 
        className="w-full px-4 py-3 rounded-xl text-sm" 
        style={{ 
          resize: 'vertical',
          background: '#1F2937',
          border: '1px solid #374151',
          color: '#FFFFFF'
        }} 
      />
      
      <div className="relative flex items-center gap-3">
        <div style={{ flex: 1, height: 1, background: '#374151' }} />
        <span style={{ fontSize: 12, color: '#6B7280' }}>OR</span>
        <div style={{ flex: 1, height: 1, background: '#374151' }} />
      </div>
      
      <DropZone 
        accept={{ 'audio/*': ['.wav', '.mp3', '.webm', '.ogg', '.flac'] }} 
        label="Upload Audio Recording"
        hint="WAV, MP3, WebM · Max 16 MB" 
        file={audioFile} 
        onFile={setAudioFile} 
        onClear={() => setAudioFile(null)} 
        type="audio" 
      />
      
      <InfoBox type="info">Audio is transcribed using Whisper then analyzed for cognitive markers.</InfoBox>
    </div>
  )
}
