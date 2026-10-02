/**
 * Client-side audio processing utility.
 * Extracts pure audio tracks from media Blobs using Web Audio API
 * and encodes to standard uncompressed PCM WAV when conversion to "SOLO AUDIO" is requested.
 */

export async function extractAudioFromMediaBlob(
  mediaBlob: Blob,
  targetFormat: 'WAV' | 'MP3' | 'M4A' = 'WAV'
): Promise<{ blob: Blob; mimeType: string; ext: string }> {
  // If the blob is already audio, return it directly
  if (mediaBlob.type.startsWith('audio/')) {
    const ext = mediaBlob.type.includes('mp3') || mediaBlob.type.includes('mpeg')
      ? '.mp3'
      : mediaBlob.type.includes('wav')
      ? '.wav'
      : mediaBlob.type.includes('ogg')
      ? '.ogg'
      : mediaBlob.type.includes('m4a') || mediaBlob.type.includes('mp4')
      ? '.m4a'
      : '.audio';
    return { blob: mediaBlob, mimeType: mediaBlob.type, ext };
  }

  // Web Audio API decoding
  try {
    const arrayBuffer = await mediaBlob.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      // Fallback: return as audio/mp4 container
      return {
        blob: new Blob([mediaBlob], { type: 'audio/mp4' }),
        mimeType: 'audio/mp4',
        ext: '.m4a',
      };
    }

    const audioCtx = new AudioContextClass();
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch {
      // If decode failed (e.g. video format without simple audio decode), return audio wrapper
      await audioCtx.close();
      return {
        blob: new Blob([mediaBlob], { type: 'audio/mp4' }),
        mimeType: 'audio/mp4',
        ext: '.m4a',
      };
    }

    const wavBlob = audioBufferToWav(audioBuffer);
    await audioCtx.close();

    return {
      blob: wavBlob,
      mimeType: 'audio/wav',
      ext: '.wav',
    };
  } catch (err) {
    console.warn('Audio extraction error, fallback to audio stream wrapper:', err);
    return {
      blob: new Blob([mediaBlob], { type: 'audio/mp4' }),
      mimeType: 'audio/mp4',
      ext: '.m4a',
    };
  }
}

/**
 * Encodes an AudioBuffer into a compliant 16-bit PCM WAV Blob.
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channel samples
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      // Clamp between -1.0 and 1.0
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
