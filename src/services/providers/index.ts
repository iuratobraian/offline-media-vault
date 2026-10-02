import { MediaFormatOption } from '../../types/media';
import { MediaProvider, ProviderAnalysis } from './types';
import { youTubeProvider } from './YouTubeProvider';
import { directFileProvider } from './DirectFileProvider';
import { localFileProvider } from './LocalFileProvider';
import { authorizedMediaProvider } from './AuthorizedMediaProvider';
import { validateSafeUrl } from '../../utils/security';

export * from './types';
export * from './YouTubeProvider';
export * from './DirectFileProvider';
export * from './LocalFileProvider';
export * from './AuthorizedMediaProvider';

export class ProviderManager {
  private providers: MediaProvider[] = [];

  constructor() {
    // Registered in priority order
    this.providers = [
      youTubeProvider,
      localFileProvider,
      authorizedMediaProvider,
      directFileProvider, // Fallback for direct HTTP/HTTPS URLs
    ];
  }

  /**
   * Register an additional provider
   */
  public registerProvider(provider: MediaProvider, highPriority = false) {
    if (highPriority) {
      this.providers.unshift(provider);
    } else {
      this.providers.push(provider);
    }
  }

  public getProvider(id: string): MediaProvider | undefined {
    return this.providers.find((p) => p.id === id);
  }

  public findProviderForUrl(url: string): MediaProvider | undefined {
    return this.providers.find((p) => p.canHandle(url));
  }

  public async analyzeUrl(url: string): Promise<ProviderAnalysis> {
    const trimmed = url.trim();
    const validation = validateSafeUrl(trimmed);
    if (!validation.isValid) {
      return {
        isValid: false,
        source: 'other',
        provider: 'unknown',
        providerName: 'Desconocido',
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
        error: validation.error || 'El enlace no parece ser un recurso multimedia válido.',
      };
    }

    const provider = this.findProviderForUrl(trimmed);
    if (!provider) {
      return {
        isValid: false,
        source: 'other',
        provider: 'unknown',
        providerName: 'Desconocido',
        canDownload: false,
        canStreamOffline: false,
        requiresOnlinePlayback: true,
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
        error: 'No se encontró un proveedor compatible para este enlace.',
      };
    }

    return await provider.analyze(trimmed);
  }

  public async getFormats(url: string): Promise<MediaFormatOption[]> {
    const provider = this.findProviderForUrl(url);
    if (!provider) return [];
    return await provider.getFormats(url);
  }

  public async download(
    url: string,
    format?: MediaFormatOption,
    signal?: AbortSignal,
    onProgress?: (downloaded: number, total: number, speed: number) => void
  ): Promise<Blob> {
    const provider = this.findProviderForUrl(url);
    if (!provider) {
      throw new Error('No hay un proveedor compatible para descargar este recurso.');
    }
    return await provider.download(url, format, signal, onProgress);
  }
}

export const providerManager = new ProviderManager();
