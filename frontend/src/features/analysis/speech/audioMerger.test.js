import { describe, it, expect } from 'vitest'
import { audioBufferToWav, mergeAudioBlobs } from './audioMerger'

describe('audioMerger', () => {
  it('encodes mono AudioBuffer to valid 16-bit PCM WAV', () => {
    // Mock minimal AudioBuffer
    const sampleRate = 16000
    const pcmData = new Float32Array([0.0, 0.5, -0.5, 0.25, -0.25])
    const mockBuffer = {
      numberOfChannels: 1,
      sampleRate,
      length: pcmData.length,
      getChannelData: (ch) => (ch === 0 ? pcmData : null),
    }

    const wavBlob = audioBufferToWav(mockBuffer)
    expect(wavBlob).toBeDefined()
    expect(wavBlob.type).toBe('audio/wav')
    // 44 bytes header + 5 samples * 2 bytes = 54 bytes
    expect(wavBlob.size).toBe(44 + 5 * 2)
  })

  it('mergeAudioBlobs returns null for empty array', async () => {
    const res = await mergeAudioBlobs([])
    expect(res).toBeNull()
  })

  it('mergeAudioBlobs passes through single blob unchanged', async () => {
    const blob = new Blob(['mock audio data'], { type: 'audio/webm' })
    const file = await mergeAudioBlobs([blob])
    expect(file).toBeInstanceOf(File)
    expect(file.type).toBe('audio/webm')
    expect(file.name).toBe('patient_speech.webm')
  })
})
