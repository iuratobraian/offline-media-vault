import { MediaFormatOption, MediaItem, MediaSource, MediaType } from '../types/media';
import { providerManager, ProviderAnalysis, youTubeProvider } from './providers';
import { sanitizeFileName } from '../utils/security';

export interface AnalysisResult extends ProviderAnalysis {
  url: string;
}

export function extractYouTubeId(urlStr: string): string | null {
  return youTubeProvider.extractVideoId(urlStr);
}

export function extractVimeoId(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes('vimeo.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (/^\d+$/.test(last)) return last;
    }
    return null;
  } catch {
    return null;
  }
}

export async function analyzeMediaUrl(rawUrl: string): Promise<AnalysisResult> {
  const trimmed = rawUrl.trim();
  const analysis = await providerManager.analyzeUrl(trimmed);
  return {
    ...analysis,
    url: trimmed,
  };
}

// Convert analysis result to a full MediaItem ready to save in IndexedDB
export function createMediaItemFromAnalysis(
  analysis: AnalysisResult,
  customTitle?: string,
  category = 'general',
  tags: string[] = [],
  selectedFormat?: MediaFormatOption
): MediaItem {
  const mediaType: MediaType = selectedFormat ? selectedFormat.type : analysis.mediaType;
  const mimeType = selectedFormat ? selectedFormat.mimeType : analysis.mimeType;
  const format = selectedFormat ? selectedFormat.format : (mediaType === 'video' ? 'MP4' : 'MP3');
  const quality = selectedFormat?.quality || (mediaType === 'video' ? '1080p' : '320 kbps');
  const size = selectedFormat?.fileSize || analysis.fileSize || 0;

  let fileName = analysis.fileName;
  if (selectedFormat && selectedFormat.ext) {
    const base = analysis.fileName.replace(/\.[^/.]+$/, '');
    fileName = sanitizeFileName(`${base}${selectedFormat.ext}`);
  }

  const id = 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const finalTitle = customTitle?.trim() || analysis.title;

  return {
    id,
    title: finalTitle,
    sourceUrl: analysis.url,
    originalUrl: analysis.url,
    provider: analysis.provider || 'direct',
    source: analysis.source,
    mediaType,
    thumbnail: analysis.thumbnail,
    duration: analysis.duration,
    fileName,
    mimeType,
    format,
    quality,
    size,
    fileSize: size,
    hasLocalBlob: false,
    isOffline: false,
    category,
    tags,
    favorite: false,
    downloadStatus: 'not_downloaded',
    createdAt: Date.now(),
    progress: 0,
    playbackPosition: 0,
    canDownload: analysis.canDownload,
    canStreamOffline: analysis.canStreamOffline,
    requiresOnlinePlayback: analysis.requiresOnlinePlayback,
    corsStatus: analysis.corsStatus,
    explanation: analysis.explanation,
    metadata: {
      ...analysis.metadata,
      selectedFormatId: selectedFormat?.id,
      selectedFormatLabel: selectedFormat?.label,
      canDirectDownload: analysis.canDownload,
      directDownloadNotice: analysis.explanation || analysis.notice,
      notice: analysis.notice,
    },
  };
}
