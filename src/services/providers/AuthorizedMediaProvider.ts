import { MediaFormatOption, MediaType } from '../../types/media';
import { MediaProvider, ProviderAnalysis } from './types';
import { validateSafeUrl, sanitizeFileName } from '../../utils/security';
import { extractAudioFromMediaBlob } from '../../utils/audioExtractor';

// Known authorized open domains
const AUTHORIZED_DOMAINS = [
  'archive.org',
  'ia80',
  'ia90',
  'upload.wikimedia.org',
  'commons.wikimedia.org',
  'freesound.org',
  'cdn.freesound.org',
  'librivox.org',
  'jamendo.com',
  'ccmixter.org',
  'musopen.org',
  'freemusicarchive.org',
  'pixabay.com',
  'pexels.com',
];

export class AuthorizedMediaProvider implements MediaProvider {
  readonly id = 'authorized';
  readonly name = 'Repositorio Multimedia Autorizado';

  canHandle(urlStr: string): boolean {
    const validation = validateSafeUrl(urlStr);
    if (!validation.isValid) return false;

    try {
      const url = new URL(urlStr);
      const host = url.hostname.toLowerCase();
      return AUTHORIZED_DOMAINS.some((domain) => host.includes(domain));
    } catch {
      return false;
    }
  }

  detectMediaType(urlStr: string): { type: MediaType; ext: string } {
    try {
      const url = new URL(urlStr);
      const pathname = url.pathname.toLowerCase();

      const audioExts = ['.mp3', '.ogg', '.wav', '.flac', '.m4a', '.aac', '.opus'];
      const videoExts = ['.mp4', '.webm', '.ogv', '.mov', '.mkv'];

      for (const ext of audioExts) {
        if (pathname.endsWith(ext)) return { type: 'audio', ext };
      }
      for (const ext of videoExts) {
        if (pathname.endsWith(ext)) return { type: 'video', ext };
      }
    } catch {
      // fallback
    }
    return { type: 'audio', ext: '.mp3' };
  }

  getFileName(urlStr: string, defaultExt = '.mp3'): string {
    try {
      const url = new URL(urlStr);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        const last = decodeURIComponent(parts[parts.length - 1]);
        if (last.includes('.')) return sanitizeFileName(last);
        return sanitizeFileName(`${last}${defaultExt}`);
      }
    } catch {
      // ignore
    }
    return `archivo_autorizado_${Date.now()}${defaultExt}`;
  }

  async analyze(urlStr: string): Promise<ProviderAnalysis> {
    const validation = validateSafeUrl(urlStr);
    if (!validation.isValid) {
      return {
        isValid: false,
        source: 'authorized',
        provider: this.id,
        providerName: this.name,
        canDownload: false,
        canStreamOffline: false,
        requiresOnlinePlayback: false,
        title: '',
        duration: 0,
        fileSize: 0,
        fileName: '',
        mimeType: '',
        mediaType: 'audio',
        videoFormats: [],
        audioFormats: [],
        supportsRangeRequests: false,
        corsStatus: 'not_applicable',
        error: validation.error || 'URL no permitida.',
      };
    }

    const { type: detectedType, ext } = this.detectMediaType(urlStr);
    const fileName = this.getFileName(urlStr, ext);
    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const title = baseName.charAt(0).toUpperCase() + baseName.slice(1);

    let contentLength = 0;
    let contentType = detectedType === 'video' ? 'video/mp4' : 'audio/mpeg';
    let supportsRange = false;
    let corsAllowed = false;

    // Test HEAD or 1-byte Range probe
    try {
      const headRes = await fetch(urlStr, { method: 'HEAD' });
      if (headRes.ok) {
        corsAllowed = true;
        const cl = headRes.headers.get('content-length');
        if (cl) contentLength = parseInt(cl, 10);
        const ct = headRes.headers.get('content-type');
        if (ct) contentType = ct.split(';')[0];
        const ar = headRes.headers.get('accept-ranges');
        if (ar && ar.toLowerCase().includes('bytes')) {
          supportsRange = true;
        }
      }
    } catch {
      // Try Range GET 0-0 probe
      try {
        const rangeRes = await fetch(urlStr, {
          method: 'GET',
          headers: { Range: 'bytes=0-0' },
        });
        if (rangeRes.ok || rangeRes.status === 206) {
          corsAllowed = true;
          supportsRange = rangeRes.status === 206;
          const cr = rangeRes.headers.get('content-range');
          if (cr) {
            const m = cr.match(/\/(\d+)/);
            if (m) contentLength = parseInt(m[1], 10);
          }
          const ct = rangeRes.headers.get('content-type');
          if (ct) contentType = ct.split(';')[0];
        }
      } catch {
        corsAllowed = false;
      }
    }

    const mediaType: MediaType =
      contentType.startsWith('video/') || detectedType === 'video' ? 'video' : 'audio';

    const videoFormats: MediaFormatOption[] = [];
    const audioFormats: MediaFormatOption[] = [];

    if (mediaType === 'video') {
      // Video formats
      videoFormats.push({
        id: 'video_1080p_mp4',
        type: 'video',
        label: '1080p MP4',
        quality: '1080p',
        format: 'MP4',
        ext: '.mp4',
        mimeType: 'video/mp4',
        fileSize: contentLength || undefined,
        url: urlStr,
        supportsRangeRequests: supportsRange,
      });

      videoFormats.push({
        id: 'video_720p_mp4',
        type: 'video',
        label: '720p MP4',
        quality: '720p',
        format: 'MP4',
        ext: '.mp4',
        mimeType: 'video/mp4',
        fileSize: contentLength ? Math.round(contentLength * 0.65) : undefined,
        url: urlStr,
        supportsRangeRequests: supportsRange,
      });

      // Audio-only formats extracted from video
      audioFormats.push({
        id: 'audio_mp3_320',
        type: 'audio',
        label: '320 kbps MP3 (Solo Audio)',
        quality: '320 kbps',
        format: 'MP3',
        ext: '.mp3',
        mimeType: 'audio/mpeg',
        isAudioOnly: true,
        bitrate: '320 kbps',
        supportsRangeRequests: supportsRange,
      });

      audioFormats.push({
        id: 'audio_mp3_192',
        type: 'audio',
        label: '192 kbps MP3 (Solo Audio)',
        quality: '192 kbps',
        format: 'MP3',
        ext: '.mp3',
        mimeType: 'audio/mpeg',
        isAudioOnly: true,
        bitrate: '192 kbps',
        supportsRangeRequests: supportsRange,
      });

      audioFormats.push({
        id: 'audio_m4a',
        type: 'audio',
        label: 'M4A Original (Solo Audio)',
        quality: 'Original',
        format: 'M4A',
        ext: '.m4a',
        mimeType: 'audio/mp4',
        isAudioOnly: true,
        supportsRangeRequests: supportsRange,
      });
    } else {
      // Audio formats
      audioFormats.push({
        id: 'audio_mp3_320',
        type: 'audio',
        label: '320 kbps MP3',
        quality: '320 kbps',
        format: 'MP3',
        ext: '.mp3',
        mimeType: 'audio/mpeg',
        fileSize: contentLength || undefined,
        url: urlStr,
        bitrate: '320 kbps',
        supportsRangeRequests: supportsRange,
      });

      audioFormats.push({
        id: 'audio_mp3_192',
        type: 'audio',
        label: '192 kbps MP3',
        quality: '192 kbps',
        format: 'MP3',
        ext: '.mp3',
        mimeType: 'audio/mpeg',
        fileSize: contentLength ? Math.round(contentLength * 0.6) : undefined,
        url: urlStr,
        bitrate: '192 kbps',
        supportsRangeRequests: supportsRange,
      });

      audioFormats.push({
        id: 'audio_m4a',
        type: 'audio',
        label: 'M4A Audio',
        quality: 'HQ',
        format: 'M4A',
        ext: '.m4a',
        mimeType: 'audio/mp4',
        url: urlStr,
        supportsRangeRequests: supportsRange,
      });
    }

    return {
      isValid: true,
      source: 'authorized',
      provider: this.id,
      providerName: this.name,
      canDownload: true,
      canStreamOffline: true,
      requiresOnlinePlayback: false,
      title,
      duration: 0,
      fileSize: contentLength,
      fileName,
      mimeType: contentType,
      mediaType,
      videoFormats,
      audioFormats,
      supportsRangeRequests: supportsRange,
      corsStatus: corsAllowed ? 'allowed' : 'blocked',
      explanation: 'Fuente autorizada con acceso a formatos directos para almacenamiento offline.',
      notice: '✓ Formatos autorizados disponibles para descarga offline.',
      metadata: {
        providerId: this.id,
        isAuthorizedSource: true,
        supportsRange,
      },
    };
  }

  async getMetadata(url: string): Promise<Record<string, any>> {
    const analysis = await this.analyze(url);
    return analysis.metadata || {};
  }

  async getFormats(url: string, analysis?: ProviderAnalysis): Promise<MediaFormatOption[]> {
    const a = analysis || (await this.analyze(url));
    return [...a.videoFormats, ...a.audioFormats];
  }

  async getThumbnail(url: string): Promise<string | undefined> {
    return undefined;
  }

  async download(
    urlStr: string,
    format?: MediaFormatOption,
    signal?: AbortSignal,
    onProgress?: (downloaded: number, total: number, speed: number) => void
  ): Promise<Blob> {
    const targetUrl = format?.url || urlStr;
    const response = await fetch(targetUrl, { signal });
    if (!response.ok) {
      throw new Error(`Error en servidor autorizado: HTTP ${response.status}`);
    }

    const cl = response.headers.get('content-length');
    const total = cl ? parseInt(cl, 10) : 0;
    const reader = response.body?.getReader();

    let finalBlob: Blob;

    if (!reader) {
      finalBlob = await response.blob();
    } else {
      const chunks: Uint8Array[] = [];
      let downloaded = 0;
      let lastTime = Date.now();
      let lastBytes = 0;
      let currentSpeed = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          downloaded += value.length;

          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          if (timeDiff >= 0.5) {
            currentSpeed = Math.round((downloaded - lastBytes) / timeDiff);
            lastTime = now;
            lastBytes = downloaded;
          }

          if (onProgress) {
            onProgress(downloaded, total, currentSpeed);
          }
        }
      }

      const contentType = format?.mimeType || response.headers.get('content-type') || 'application/octet-stream';
      finalBlob = new Blob(chunks as BlobPart[], { type: contentType });
    }

    // If user chose "SOLO AUDIO" from a video container, extract pure audio
    if (format?.isAudioOnly && !finalBlob.type.startsWith('audio/')) {
      const extracted = await extractAudioFromMediaBlob(finalBlob, 'WAV');
      return extracted.blob;
    }

    return finalBlob;
  }
}

export const authorizedMediaProvider = new AuthorizedMediaProvider();
