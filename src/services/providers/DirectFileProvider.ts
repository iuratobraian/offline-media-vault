import { MediaFormatOption, MediaType } from '../../types/media';
import { MediaProvider, ProviderAnalysis } from './types';
import { validateSafeUrl, sanitizeFileName } from '../../utils/security';
import { extractAudioFromMediaBlob } from '../../utils/audioExtractor';

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.opus', '.oga'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.m4v', '.ogv'];

export class DirectFileProvider implements MediaProvider {
  readonly id = 'direct';
  readonly name = 'Archivo Multimedia Directo';

  canHandle(urlStr: string): boolean {
    const validation = validateSafeUrl(urlStr);
    if (!validation.isValid) return false;

    try {
      const url = new URL(urlStr.trim());
      const host = url.hostname.toLowerCase();
      if (host.includes('youtube.com') || host.includes('youtu.be') || url.protocol === 'local:') {
        return false;
      }
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  detectMediaType(urlStr: string): { type: MediaType; ext: string } {
    try {
      const url = new URL(urlStr);
      const pathname = url.pathname.toLowerCase();

      for (const ext of AUDIO_EXTENSIONS) {
        if (pathname.endsWith(ext)) return { type: 'audio', ext };
      }
      for (const ext of VIDEO_EXTENSIONS) {
        if (pathname.endsWith(ext)) return { type: 'video', ext };
      }
    } catch {
      // ignore
    }
    return { type: 'audio', ext: '' };
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
      // fallback
    }
    return sanitizeFileName(`archivo_${Date.now()}${defaultExt}`);
  }

  async testCorsAndHeaders(urlStr: string): Promise<{
    corsAllowed: boolean;
    contentLength: number;
    contentType: string;
    supportsRange: boolean;
    status: number;
  }> {
    let corsAllowed = false;
    let contentLength = 0;
    let contentType = '';
    let supportsRange = false;
    let status = 0;

    // 1. Try a lightweight HEAD request
    try {
      const headRes = await fetch(urlStr, { method: 'HEAD' });
      status = headRes.status;
      if (headRes.ok) {
        corsAllowed = true;
        const cl = headRes.headers.get('content-length');
        if (cl) contentLength = parseInt(cl, 10);
        contentType = headRes.headers.get('content-type') || '';
        const ar = headRes.headers.get('accept-ranges');
        if (ar && ar.toLowerCase().includes('bytes')) {
          supportsRange = true;
        }
        return { corsAllowed, contentLength, contentType, supportsRange, status };
      }
    } catch {
      // HEAD may fail due to server configuration; probe with Range GET
    }

    // 2. Fallback probe: Range GET 0-1
    try {
      const rangeRes = await fetch(urlStr, {
        method: 'GET',
        headers: { Range: 'bytes=0-1' },
      });
      status = rangeRes.status;
      if (rangeRes.ok || rangeRes.status === 206) {
        corsAllowed = true;
        supportsRange = rangeRes.status === 206;
        const cl = rangeRes.headers.get('content-length');
        const cr = rangeRes.headers.get('content-range');
        if (cr) {
          const match = cr.match(/\/(\d+)/);
          if (match) contentLength = parseInt(match[1], 10);
        } else if (cl) {
          contentLength = parseInt(cl, 10);
        }
        contentType = rangeRes.headers.get('content-type') || '';
        return { corsAllowed, contentLength, contentType, supportsRange, status };
      }
    } catch (err) {
      console.warn('CORS or network check failed for:', urlStr, err);
      return { corsAllowed: false, contentLength: 0, contentType: '', supportsRange: false, status: 0 };
    }

    return { corsAllowed, contentLength, contentType, supportsRange, status };
  }

  async analyze(urlStr: string): Promise<ProviderAnalysis> {
    const trimmed = urlStr.trim();
    const validation = validateSafeUrl(trimmed);
    if (!validation.isValid) {
      return {
        isValid: false,
        source: 'direct',
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

    const { type: detectedType, ext } = this.detectMediaType(trimmed);
    const fileName = this.getFileName(trimmed, ext || (detectedType === 'video' ? '.mp4' : '.mp3'));
    const titleCandidate = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const title = titleCandidate.charAt(0).toUpperCase() + titleCandidate.slice(1);

    // Test CORS and probe headers
    const probe = await this.testCorsAndHeaders(trimmed);

    let mimeType = detectedType === 'video' ? 'video/mp4' : 'audio/mpeg';
    if (probe.contentType) {
      mimeType = probe.contentType.split(';')[0];
    } else if (ext === '.wav') {
      mimeType = 'audio/wav';
    } else if (ext === '.ogg') {
      mimeType = detectedType === 'video' ? 'video/ogg' : 'audio/ogg';
    } else if (ext === '.webm') {
      mimeType = 'video/webm';
    } else if (ext === '.m4a' || ext === '.aac') {
      mimeType = 'audio/mp4';
    }

    const mediaType: MediaType =
      mimeType.startsWith('video/') || detectedType === 'video' ? 'video' : 'audio';

    const videoFormats: MediaFormatOption[] = [];
    const audioFormats: MediaFormatOption[] = [];

    if (probe.corsAllowed) {
      if (mediaType === 'video') {
        const qualityLabel = probe.contentLength > 20 * 1024 * 1024 ? '1080p' : '720p';
        videoFormats.push({
          id: `video_${qualityLabel.toLowerCase()}_mp4`,
          type: 'video',
          label: `${qualityLabel} MP4`,
          quality: qualityLabel,
          format: 'MP4',
          ext: '.mp4',
          mimeType,
          fileSize: probe.contentLength || undefined,
          url: trimmed,
          supportsRangeRequests: probe.supportsRange,
        });

        // Always provide explicit "SOLO AUDIO" options when a video source is detected
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
          supportsRangeRequests: probe.supportsRange,
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
          supportsRangeRequests: probe.supportsRange,
        });

        audioFormats.push({
          id: 'audio_m4a',
          type: 'audio',
          label: 'M4A (Solo Audio)',
          quality: 'Original',
          format: 'M4A',
          ext: '.m4a',
          mimeType: 'audio/mp4',
          isAudioOnly: true,
          supportsRangeRequests: probe.supportsRange,
        });
      } else {
        // Direct Audio formats
        audioFormats.push({
          id: 'audio_mp3_320',
          type: 'audio',
          label: '320 kbps MP3',
          quality: '320 kbps',
          format: 'MP3',
          ext: ext || '.mp3',
          mimeType,
          fileSize: probe.contentLength || undefined,
          url: trimmed,
          bitrate: '320 kbps',
          supportsRangeRequests: probe.supportsRange,
        });

        audioFormats.push({
          id: 'audio_mp3_192',
          type: 'audio',
          label: '192 kbps MP3',
          quality: '192 kbps',
          format: 'MP3',
          ext: ext || '.mp3',
          mimeType,
          fileSize: probe.contentLength ? Math.round(probe.contentLength * 0.6) : undefined,
          url: trimmed,
          bitrate: '192 kbps',
          supportsRangeRequests: probe.supportsRange,
        });

        audioFormats.push({
          id: 'audio_original',
          type: 'audio',
          label: 'Audio Original',
          quality: 'Original',
          format: (ext.replace('.', '') || 'MP3').toUpperCase(),
          ext: ext || '.mp3',
          mimeType,
          fileSize: probe.contentLength || undefined,
          url: trimmed,
          supportsRangeRequests: probe.supportsRange,
        });
      }

      return {
        isValid: true,
        source: trimmed.includes('podcast') ? 'podcast' : 'direct',
        provider: this.id,
        providerName: this.name,
        canDownload: true,
        canStreamOffline: true,
        requiresOnlinePlayback: false,
        title,
        duration: 0,
        fileSize: probe.contentLength,
        fileName,
        mimeType,
        mediaType,
        videoFormats,
        audioFormats,
        supportsRangeRequests: probe.supportsRange,
        corsStatus: 'allowed',
        explanation: 'El servidor permite descarga directa vía CORS. Puedes descargarlo para uso offline.',
        notice: '✓ Formato listo para almacenar offline.',
        metadata: {
          providerId: this.id,
          corsAllowed: true,
          supportsRange: probe.supportsRange,
        },
      };
    }

    // CORS is blocked or server restricts direct fetch
    return {
      isValid: true,
      source: trimmed.includes('podcast') ? 'podcast' : 'direct',
      provider: this.id,
      providerName: this.name,
      canDownload: false,
      canStreamOffline: false,
      requiresOnlinePlayback: true,
      title,
      duration: 0,
      fileSize: 0,
      fileName,
      mimeType,
      mediaType,
      videoFormats: [],
      audioFormats: [],
      supportsRangeRequests: false,
      corsStatus: 'blocked',
      explanation: 'Esta fuente no proporciona un archivo descargable mediante este método.',
      notice: 'Restricción CORS detectada. Puedes guardar el enlace para reproducirlo cuando tengas conexión.',
      actionButtonLabel: 'Guardar enlace',
      metadata: {
        providerId: this.id,
        corsAllowed: false,
        corsReason: 'Cross-Origin Resource Sharing (CORS) bloqueado por el servidor remoto',
      },
    };
  }

  async getMetadata(urlStr: string): Promise<Record<string, any>> {
    const analysis = await this.analyze(urlStr);
    return analysis.metadata || {};
  }

  async getFormats(urlStr: string, analysis?: ProviderAnalysis): Promise<MediaFormatOption[]> {
    const a = analysis || (await this.analyze(urlStr));
    return [...a.videoFormats, ...a.audioFormats];
  }

  async getThumbnail(urlStr: string): Promise<string | undefined> {
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
      throw new Error(`Error en el servidor: HTTP ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
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

    // If user chose "SOLO AUDIO" and input was a video container, extract audio track
    if (format?.isAudioOnly && !finalBlob.type.startsWith('audio/')) {
      const extracted = await extractAudioFromMediaBlob(finalBlob, 'WAV');
      return extracted.blob;
    }

    return finalBlob;
  }
}

export const directFileProvider = new DirectFileProvider();
