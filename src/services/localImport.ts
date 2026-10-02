import { MediaItem, MediaType } from '../types/media';
import { saveMediaBlob, saveMediaItem } from '../database/db';
import { sanitizeFileName } from '../utils/security';

export async function extractMediaDuration(file: File, type: MediaType): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(type === 'video' ? 'video' : 'audio');
    media.preload = 'metadata';

    const cleanUp = () => {
      URL.revokeObjectURL(url);
      media.remove();
    };

    media.onloadedmetadata = () => {
      const dur = isFinite(media.duration) ? media.duration : 0;
      cleanUp();
      resolve(dur);
    };

    media.onerror = () => {
      cleanUp();
      resolve(0);
    };

    // Timeout fallback after 3s
    setTimeout(() => {
      cleanUp();
      resolve(0);
    }, 3000);

    media.src = url;
  });
}

export async function generateVideoThumbnail(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const cleanUp = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1.0, video.duration / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(video.videoWidth || 640, 640);
        canvas.height = Math.round((canvas.width / (video.videoWidth || 640)) * (video.videoHeight || 360));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          cleanUp();
          resolve(dataUrl);
          return;
        }
      } catch {
        // canvas capture failed
      }
      cleanUp();
      resolve(undefined);
    };

    video.onerror = () => {
      cleanUp();
      resolve(undefined);
    };

    setTimeout(() => {
      cleanUp();
      resolve(undefined);
    }, 4000);

    video.src = url;
  });
}

export async function extractAudioCoverArt(file: File): Promise<string | undefined> {
  try {
    const slice = file.slice(0, 262144);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
      return undefined;
    }

    for (let i = 10; i < bytes.length - 20; i++) {
      if (
        bytes[i] === 0x41 && // 'A'
        bytes[i + 1] === 0x50 && // 'P'
        bytes[i + 2] === 0x49 && // 'I'
        bytes[i + 3] === 0x43    // 'C'
      ) {
        const frameSize = (bytes[i + 4] << 24) | (bytes[i + 5] << 16) | (bytes[i + 6] << 8) | bytes[i + 7];
        if (frameSize <= 0 || i + 10 + frameSize > bytes.length) continue;

        let offset = i + 10;
        const encoding = bytes[offset++];
        let mime = '';
        while (offset < bytes.length && bytes[offset] !== 0) {
          mime += String.fromCharCode(bytes[offset++]);
        }
        offset++;
        offset++;

        if (encoding === 0 || encoding === 3) {
          while (offset < bytes.length && bytes[offset] !== 0) offset++;
          offset++;
        } else {
          while (offset < bytes.length - 1 && !(bytes[offset] === 0 && bytes[offset + 1] === 0)) offset += 2;
          offset += 2;
        }

        const imgBytes = bytes.slice(offset, i + 10 + frameSize);
        if (imgBytes.length > 32) {
          const blob = new Blob([imgBytes], { type: mime || 'image/jpeg' });
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(undefined as any);
            reader.readAsDataURL(blob);
          });
        }
      }
    }
  } catch {
    // Ignore extraction error
  }
  return undefined;
}

export async function importLocalFile(file: File, category = 'musica'): Promise<MediaItem> {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|ogv)$/i.test(file.name);
  const mediaType: MediaType = isVideo ? 'video' : 'audio';

  const duration = await extractMediaDuration(file, mediaType);
  let thumbnail: string | undefined;

  if (mediaType === 'video') {
    thumbnail = await generateVideoThumbnail(file);
  } else {
    thumbnail = await extractAudioCoverArt(file);
  }

  const id = 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const sanitizedName = sanitizeFileName(file.name);
  const cleanTitle = sanitizedName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  const extMatch = sanitizedName.match(/\.([0-9a-z]+)$/i);
  const format = extMatch ? extMatch[1].toUpperCase() : (isVideo ? 'MP4' : 'MP3');

  const mediaItem: MediaItem = {
    id,
    title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
    sourceUrl: 'local://' + encodeURIComponent(sanitizedName),
    originalUrl: 'local://' + encodeURIComponent(sanitizedName),
    provider: 'local_import',
    source: 'local_import',
    mediaType,
    thumbnail,
    duration,
    fileName: sanitizedName,
    mimeType: file.type || (mediaType === 'video' ? 'video/mp4' : 'audio/mpeg'),
    format,
    quality: isVideo ? 'Original' : 'HQ',
    size: file.size,
    fileSize: file.size,
    hasLocalBlob: true,
    isOffline: true, // Strictly true because blob is saved in media_blobs
    category,
    tags: ['#importado', mediaType === 'video' ? '#video' : '#audio'],
    favorite: false,
    downloadStatus: 'completed',
    createdAt: Date.now(),
    downloadedAt: Date.now(),
    progress: 0,
    playbackPosition: 0,
    canDownload: false,
    canStreamOffline: true,
    requiresOnlinePlayback: false,
    corsStatus: 'not_applicable',
    explanation: '✓ Guardado físicamente en el almacenamiento local de tu dispositivo.',
    metadata: {
      isImported: true,
      lastModified: file.lastModified,
      canDirectDownload: true,
      providerId: 'local_import',
    },
  };

  // Save blob to media_blobs
  await saveMediaBlob(id, file, mediaItem.mimeType);

  // Save metadata to media_meta
  await saveMediaItem(mediaItem);

  return mediaItem;
}

export async function importMultipleFiles(files: FileList | File[], category = 'musica'): Promise<MediaItem[]> {
  const results: MediaItem[] = [];
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    if (
      file.type.startsWith('audio/') ||
      file.type.startsWith('video/') ||
      /\.(mp3|wav|ogg|m4a|aac|opus|mp4|webm|mov|mkv)$/i.test(file.name)
    ) {
      try {
        const item = await importLocalFile(file, category);
        results.push(item);
      } catch (err) {
        console.error('Error importing file:', file.name, err);
      }
    }
  }

  return results;
}
