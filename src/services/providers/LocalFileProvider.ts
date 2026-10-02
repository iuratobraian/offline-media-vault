import { MediaFormatOption, MediaType } from '../../types/media';
import { MediaProvider, ProviderAnalysis } from './types';
import { sanitizeFileName } from '../../utils/security';

export class LocalFileProvider implements MediaProvider {
  readonly id = 'local_import';
  readonly name = 'Archivo Local del Dispositivo';

  canHandle(urlStr: string): boolean {
    return urlStr.startsWith('local://');
  }

  async analyze(urlStr: string): Promise<ProviderAnalysis> {
    const rawFileName = decodeURIComponent(urlStr.replace('local://', ''));
    const fileName = sanitizeFileName(rawFileName);
    const isVideo = /\.(mp4|webm|mov|mkv|ogv)$/i.test(fileName);
    const mediaType: MediaType = isVideo ? 'video' : 'audio';

    const formats: MediaFormatOption[] = [
      {
        id: 'local_file_format',
        type: mediaType,
        label: isVideo ? 'Video Local' : 'Audio Local',
        format: isVideo ? 'MP4' : 'MP3',
        ext: isVideo ? '.mp4' : '.mp3',
        mimeType: isVideo ? 'video/mp4' : 'audio/mpeg',
        supportsRangeRequests: true,
      },
    ];

    return {
      isValid: true,
      source: 'local_import',
      provider: this.id,
      providerName: this.name,
      canDownload: false, // Already local in IndexedDB
      canStreamOffline: true,
      requiresOnlinePlayback: false,
      title: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      duration: 0,
      fileSize: 0,
      fileName,
      mimeType: isVideo ? 'video/mp4' : 'audio/mpeg',
      mediaType,
      videoFormats: isVideo ? formats : [],
      audioFormats: !isVideo ? formats : [],
      supportsRangeRequests: true,
      corsStatus: 'not_applicable',
      explanation: 'Disponible offline en el almacenamiento local de tu dispositivo.',
      notice: 'Guardado físicamente en IndexedDB.',
      metadata: {
        providerId: this.id,
        isLocalFile: true,
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

  async download(urlStr: string): Promise<Blob> {
    throw new Error('El archivo local ya reside en el dispositivo.');
  }
}

export const localFileProvider = new LocalFileProvider();
