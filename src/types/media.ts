export type MediaType = 'audio' | 'video';

export type MediaSource = 
  | 'direct' 
  | 'youtube' 
  | 'vimeo' 
  | 'soundcloud' 
  | 'podcast' 
  | 'authorized'
  | 'local_import' 
  | 'other';

export type DownloadStatus = 
  | 'not_downloaded' 
  | 'preparing' 
  | 'analyzing'
  | 'downloading' 
  | 'processing'
  | 'saving'
  | 'paused' 
  | 'completed' 
  | 'error' 
  | 'cancelled';

export interface MediaFormatOption {
  id: string; // e.g. "video_1080p", "audio_mp3_320"
  type: MediaType;
  label: string; // e.g. "1080p MP4", "320 kbps MP3"
  quality?: string; // e.g. "1080p", "720p", "320 kbps", "192 kbps"
  format: string; // e.g. "MP4", "MP3", "M4A", "WAV", "OGG"
  ext: string; // e.g. ".mp4", ".mp3", ".m4a"
  mimeType: string;
  fileSize?: number; // in bytes if known
  url?: string; // specific stream url if separate
  isAudioOnly?: boolean;
  bitrate?: string;
  supportsRangeRequests?: boolean;
}

export interface MediaItem {
  id: string;
  title: string;
  thumbnail?: string;
  duration: number; // in seconds
  sourceUrl: string; // Primary source URL
  originalUrl: string; // Compatibility alias with sourceUrl
  provider: string; // Provider identifier or name
  source: MediaSource;
  mediaType: MediaType;
  mimeType: string;
  format?: string; // e.g. "MP4", "MP3"
  quality?: string; // e.g. "1080p", "320 kbps"
  size: number; // in bytes
  fileSize: number; // Compatibility alias with size
  fileName: string;
  hasLocalBlob: boolean; // Compatibility flag (true when stored in IndexedDB)
  isOffline: boolean; // True ONLY if real Blob exists in media_blobs
  category: string; // Category id or 'general'
  tags: string[];
  favorite: boolean;
  isVaultItem?: boolean;
  downloadStatus: DownloadStatus;
  createdAt: number;
  downloadedAt?: number;
  lastPlayedAt?: number;
  progress: number; // last playback position in seconds
  playbackPosition?: number; // Compatibility alias with progress
  
  // Provider capability attributes
  canDownload: boolean;
  canStreamOffline: boolean;
  requiresOnlinePlayback: boolean;
  corsStatus?: 'allowed' | 'blocked' | 'not_applicable';
  explanation?: string;
  metadata?: {
    artist?: string;
    album?: string;
    channel?: string;
    description?: string;
    resolution?: string;
    canDirectDownload?: boolean;
    directDownloadNotice?: string;
    providerId?: string;
    isStreamRestricted?: boolean;
    [key: string]: any;
  };
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  itemIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface DownloadTask {
  id: string; // matches mediaItem id
  title: string;
  url: string;
  format?: string;
  quality?: string;
  thumbnail?: string;
  mediaType?: MediaType;
  status: DownloadStatus;
  statusLabel?: string;
  progressPercent: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number;
  speedBps: number;
  etaSeconds: number;
  errorMessage?: string;
  canPause: boolean;
  startedAt: number;
  updatedAt: number;
}

export type SortOption = 
  | 'recent' 
  | 'oldest' 
  | 'alpha_asc' 
  | 'alpha_desc' 
  | 'size_desc' 
  | 'size_asc' 
  | 'last_played';

export type FilterOption = 
  | 'all' 
  | 'audio' 
  | 'video' 
  | 'offline'
  | 'favorites' 
  | 'downloads'
  | 'downloaded'
  | 'links'
  | 'recent';

export interface StorageBreakdown {
  usedBytes: number;
  quotaBytes: number;
  freeBytes?: number;
  audioBytes: number;
  videoBytes: number;
  audioCount: number;
  videoCount: number;
  downloadedCount: number;
  linksCount: number;
  totalCount: number;
}
