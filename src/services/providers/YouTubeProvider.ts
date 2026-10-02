import { MediaFormatOption } from '../../types/media';
import { MediaProvider, ProviderAnalysis } from './types';
import { validateSafeUrl, sanitizeFileName } from '../../utils/security';

export function getBackendBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('omv_backend_url');
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }

    // Default to 24/7 Render cloud backend when running on Vercel, mobile web or any external host
    const host = window.location.hostname.toLowerCase();
    if (host.includes('vercel.app') || host.includes('render.com') || host.includes('github.io')) {
      return host.includes('render.com') ? '' : 'https://offline-media-vault.onrender.com';
    }

    // If on localhost or private LAN IP, use relative path
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
      return '';
    }

    return 'https://offline-media-vault.onrender.com';
  }
  return '';
}

export class YouTubeProvider implements MediaProvider {
  readonly id = 'youtube';
  readonly name = 'YouTube';

  canHandle(urlStr: string): boolean {
    try {
      const url = new URL(urlStr.trim());
      const host = url.hostname.toLowerCase();
      return host.includes('youtube.com') || host.includes('youtu.be');
    } catch {
      return false;
    }
  }

  extractVideoId(urlStr: string): string | null {
    try {
      const url = new URL(urlStr.trim());
      const host = url.hostname.toLowerCase();

      if (host.includes('youtu.be')) {
        return url.pathname.slice(1).split('?')[0].split('/')[0];
      }

      if (host.includes('youtube.com')) {
        if (url.pathname.startsWith('/shorts/')) {
          return url.pathname.replace('/shorts/', '').split('/')[0].split('?')[0];
        }
        if (url.pathname.startsWith('/embed/')) {
          return url.pathname.replace('/embed/', '').split('/')[0].split('?')[0];
        }
        return url.searchParams.get('v');
      }
      return null;
    } catch {
      return null;
    }
  }

  async analyze(urlStr: string): Promise<ProviderAnalysis> {
    const trimmed = urlStr.trim();
    const videoId = this.extractVideoId(trimmed);

    if (!videoId) {
      return {
        isValid: false,
        source: 'youtube',
        provider: this.id,
        providerName: this.name,
        canDownload: false,
        canStreamOffline: false,
        requiresOnlinePlayback: true,
        title: '',
        duration: 0,
        fileSize: 0,
        fileName: '',
        mimeType: 'video/mp4',
        mediaType: 'video',
        videoFormats: [],
        audioFormats: [],
        supportsRangeRequests: false,
        corsStatus: 'not_applicable',
        error: 'El enlace de YouTube no contiene un identificador de video válido.',
      };
    }

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let title = `Video de YouTube (${videoId})`;
    let author = 'YouTube';
    let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let duration = 0;
    let videoFormats: MediaFormatOption[] = [];
    let audioFormats: MediaFormatOption[] = [];
    let backendAvailable = false;
    let effectiveBaseUrl = getBackendBaseUrl();

    // 1. Try primary backend endpoint (local or configured)
    const tryFetchBackend = async (targetBase: string): Promise<boolean> => {
      try {
        const endpoint = `${targetBase}/api/youtube/info?url=${encodeURIComponent(canonicalUrl)}`;
        const backendRes = await fetch(endpoint, {
          signal: AbortSignal.timeout(20000),
        });

        if (backendRes.ok) {
          const data = await backendRes.json();
          if (data.success) {
            title = data.title || title;
            author = data.author || author;
            duration = data.duration || 0;
            if (data.thumbnail) thumbnail = data.thumbnail;
            videoFormats = (data.videoFormats || []).map((fmt: any) => ({
              ...fmt,
              url: fmt.url?.startsWith('/') ? `${targetBase}${fmt.url}` : fmt.url,
            }));
            audioFormats = (data.audioFormats || []).map((fmt: any) => ({
              ...fmt,
              url: fmt.url?.startsWith('/') ? `${targetBase}${fmt.url}` : fmt.url,
            }));
            return true;
          }
        }
      } catch {
        // fail
      }
      return false;
    };

    backendAvailable = await tryFetchBackend(effectiveBaseUrl);

    // If local/relative failed and not yet tried Render, try the Render cloud backend!
    if (!backendAvailable && effectiveBaseUrl !== 'https://offline-media-vault.onrender.com') {
      effectiveBaseUrl = 'https://offline-media-vault.onrender.com';
      backendAvailable = await tryFetchBackend(effectiveBaseUrl);
    }

    // 2. Fallback to public oEmbed if title is not yet resolved
    if (!backendAvailable) {
      try {
        const oembedRes = await fetch(
          `https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`,
          { signal: AbortSignal.timeout(4000) }
        );
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          if (data.title) title = data.title;
          if (data.author_name) author = data.author_name;
          if (data.thumbnail_url) thumbnail = data.thumbnail_url;
        }
      } catch {
        // Fallback
      }
    }

    if (backendAvailable && (videoFormats.length > 0 || audioFormats.length > 0)) {
      return {
        isValid: true,
        source: 'youtube',
        provider: this.id,
        providerName: this.name,
        canDownload: true,
        canStreamOffline: true,
        requiresOnlinePlayback: false,
        title,
        thumbnail,
        duration,
        fileSize: videoFormats[0]?.fileSize || 0,
        fileName: sanitizeFileName(`${title}.mp4`),
        mimeType: 'video/mp4',
        mediaType: 'video',
        videoFormats,
        audioFormats,
        supportsRangeRequests: true,
        corsStatus: 'allowed',
        notice: 'Disponible para descargar y reproducir 100% offline.',
        actionButtonLabel: 'Descargar a este dispositivo',
        actionUrl: canonicalUrl,
        metadata: {
          youtubeId: videoId,
          channel: author,
          providerId: this.id,
          isStreamRestricted: false,
          canDirectDownload: true,
        },
      };
    }

    const isVercelHost =
      typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');

    const explanation = isVercelHost
      ? 'Estás en Vercel. En tu celular, conéctate al mismo Wi-Fi que tu PC e ingresa a: http://192.168.1.97:3000 (o configura tu servidor 24/7 en Configuración).'
      : 'El servidor de descarga local no está conectado. Inicia el servidor ejecutando ./iniciar_servidor.sh para habilitar la descarga completa.';

    const notice = isVercelHost
      ? 'Para descargar en tu celular, ingresa desde tu red Wi-Fi a http://192.168.1.97:3000 o vincula tu servidor 24/7.'
      : 'Guardado como enlace online. Para descargar el video/audio a tu dispositivo, inicia la aplicación mediante ./iniciar_servidor.sh';

    // Fallback when backend is not running
    return {
      isValid: true,
      source: 'youtube',
      provider: this.id,
      providerName: this.name,
      canDownload: false,
      canStreamOffline: false,
      requiresOnlinePlayback: true,
      title,
      thumbnail,
      duration: 0,
      fileSize: 0,
      fileName: sanitizeFileName(`youtube_${videoId}.mp4`),
      mimeType: 'video/mp4',
      mediaType: 'video',
      videoFormats: [],
      audioFormats: [],
      supportsRangeRequests: false,
      corsStatus: 'not_applicable',
      explanation,
      notice,
      actionButtonLabel: 'Guardar enlace online',
      actionUrl: canonicalUrl,
      unauthorizedReason: isVercelHost
        ? 'Ingresa a http://192.168.1.97:3000 o vincula tu servidor 24/7 para descargar.'
        : 'Inicia el servidor local (iniciar_servidor.sh) para descargar.',
      metadata: {
        youtubeId: videoId,
        channel: author,
        providerId: this.id,
        isStreamRestricted: true,
        canDirectDownload: false,
      },
    };
  }

  async getMetadata(urlStr: string): Promise<Record<string, any>> {
    const analysis = await this.analyze(urlStr);
    return analysis.metadata || {};
  }

  async getFormats(urlStr: string): Promise<MediaFormatOption[]> {
    const analysis = await this.analyze(urlStr);
    return [...analysis.videoFormats, ...analysis.audioFormats];
  }

  async getThumbnail(urlStr: string): Promise<string | undefined> {
    const videoId = this.extractVideoId(urlStr);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : undefined;
  }

  async download(urlStr: string, format?: MediaFormatOption): Promise<Blob> {
    const baseUrl = getBackendBaseUrl();
    const defaultStreamUrl = `${baseUrl}/api/youtube/stream?url=${encodeURIComponent(urlStr)}&formatKey=video_720p`;
    let downloadUrl = format?.url || defaultStreamUrl;
    if (downloadUrl.startsWith('/') && baseUrl) {
      downloadUrl = `${baseUrl}${downloadUrl}`;
    }

    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new Error(`Error en la descarga de YouTube: HTTP ${res.status}`);
    }
    return await res.blob();
  }
}

export const youTubeProvider = new YouTubeProvider();
