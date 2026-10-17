/**
 * audioMerger.js
 * Safely combines recorded audio tasks into a single compliant audio File.
 * - If single recording: uses native WebM container directly.
 * - If multiple recordings: decodes PCM via AudioContext and encodes a standard 16-bit PCM WAV container.
 */

export function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let interleaved;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    interleaved = new Float32Array(left.length + right.length);
    let idx = 0;
    for (let i = 0; i < left.length; i++) {
      interleaved[idx++] = left[i];
      interleaved[idx++] = right[i];
    }
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = interleaved.length * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const arrayBuffer = new ArrayBuffer(totalSize);
  const dataView = new DataView(arrayBuffer);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(dataView, 0, 'RIFF');
  dataView.setUint32(4, 36 + dataSize, true);
  writeString(dataView, 8, 'WAVE');
  writeString(dataView, 12, 'fmt ');
  dataView.setUint32(16, 16, true);
  dataView.setUint16(20, format, true);
  dataView.setUint16(22, numChannels, true);
  dataView.setUint32(24, sampleRate, true);
  dataView.setUint32(28, byteRate, true);
  dataView.setUint16(32, blockAlign, true);
  dataView.setUint16(34, bitDepth, true);
  writeString(dataView, 36, 'data');
  dataView.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < interleaved.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    dataView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([dataView], { type: 'audio/wav' });
}

export async function mergeAudioBlobs(blobs, fallbackFilename = 'patient_speech.webm') {
  if (!blobs || blobs.length === 0) return null;
  if (blobs.length === 1) {
    return new File([blobs[0]], fallbackFilename, { type: blobs[0].type || 'audio/webm' });
  }

  const AudioContextClass = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!AudioContextClass) {
    return new File([blobs[blobs.length - 1]], fallbackFilename, { type: blobs[blobs.length - 1].type || 'audio/webm' });
  }

  try {
    const ctx = new AudioContextClass();
    const decodedBuffers = [];
    for (const b of blobs) {
      const arrayBuf = await b.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      decodedBuffers.push(decoded);
    }
    const sampleRate = decodedBuffers[0].sampleRate;
    const channels = 1;
    const totalLength = decodedBuffers.reduce((sum, b) => sum + b.length, 0);
    const combinedBuffer = ctx.createBuffer(channels, totalLength, sampleRate);
    const outputChannel = combinedBuffer.getChannelData(0);
    let offset = 0;
    for (const b of decodedBuffers) {
      const channelData = b.getChannelData(0);
      outputChannel.set(channelData, offset);
      offset += b.length;
    }
    if (typeof ctx.close === 'function') {
      await ctx.close();
    }
    const wavBlob = audioBufferToWav(combinedBuffer);
    return new File([wavBlob], 'patient_speech_all_tasks.wav', { type: 'audio/wav' });
  } catch (err) {
    console.warn('Failed to merge audio buffers with AudioContext; falling back to latest recording:', err);
    return new File([blobs[blobs.length - 1]], fallbackFilename, { type: blobs[blobs.length - 1].type || 'audio/webm' });
  }
}
