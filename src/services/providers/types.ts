import { MediaFormatOption, MediaSource, MediaType } from '../../types/media';

export interface ProviderAnalysis {
  source: MediaSource;
  provider: string; // Identifier e.g. 'direct', 'authorized', 'youtube', 'local_import'
  providerName: string; // Display name
  canDownload: boolean;
  canStreamOffline: boolean;
  requiresOnlinePlayback: boolean;
  title: string;
  thumbnail?: string;
  duration: number; // in seconds
  fileSize: number; // in bytes
  fileName: string;
  mimeType: string;
  mediaType: MediaType;
  videoFormats: MediaFormatOption[];
  audioFormats: MediaFormatOption[];
  supportsRangeRequests: boolean;
  corsStatus: 'allowed' | 'blocked' | 'not_applicable';
  explanation?: string;
  notice?: string;
  actionButtonLabel?: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  error?: string;
  isValid: boolean;
  unauthorizedReason?: string;
}

export interface MediaProvider {
  readonly id: string;
  readonly name: string;

  /**
   * Checks whether this provider can handle the given URL.
   */
  canHandle(url: string): boolean;

  /**
   * Analyzes the URL to extract metadata, detect formats, streamability and download capabilities.
   */
  analyze(url: string): Promise<ProviderAnalysis>;

  /**
   * Fetches metadata details for the resource.
   */
  getMetadata(url: string): Promise<Record<string, any>>;

  /**
   * Returns available video and audio format options.
   */
  getFormats(url: string, analysis?: ProviderAnalysis): Promise<MediaFormatOption[]>;

  /**
   * Downloads the specified format to a real Blob.
   */
  download(
    url: string,
    format?: MediaFormatOption,
    signal?: AbortSignal,
    onProgress?: (downloaded: number, total: number, speed: number) => void
  ): Promise<Blob>;

  /**
   * Retrieves thumbnail preview URL if available.
   */
  getThumbnail(url: string): Promise<string | undefined>;
}

// Backward compatibility alias
export type DownloadProvider = MediaProvider;
