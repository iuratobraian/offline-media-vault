import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import JSZip from 'jszip';
import {
  Category,
  DownloadTask,
  FilterOption,
  MediaFormatOption,
  MediaItem,
  SortOption,
  StorageBreakdown,
} from '../types/media';
import {
  getAllMedia,
  saveMediaItem,
  updateMediaItem,
  deleteMediaItem,
  getMediaBlob,
  saveMediaBlob,
  getAllCategories,
  saveCategory,
  deleteCategory as dbDeleteCategory,
  clearEntireDatabase,
} from '../database/db';
import { downloadManager } from '../services/downloadManager';
import { preferencesManager } from '../services/preferencesManager';

interface MediaContextType {
  mediaItems: MediaItem[];
  filteredItems: MediaItem[];
  categories: Category[];
  downloadTasks: DownloadTask[];
  storageBreakdown: StorageBreakdown;
  searchQuery: string;
  selectedFilter: FilterOption;
  selectedCategory: string;
  selectedTag: string | null;
  sortOption: SortOption;
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  allTags: string[];

  // Setters
  setSearchQuery: (q: string) => void;
  setSelectedFilter: (f: FilterOption) => void;
  setSelectedCategory: (c: string) => void;
  setSelectedTag: (t: string | null) => void;
  setSortOption: (s: SortOption) => void;
  setViewMode: (v: 'grid' | 'list') => void;

  // Actions
  refreshMedia: () => Promise<void>;
  addMedia: (item: MediaItem) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  toggleVaultItem: (id: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<MediaItem>) => Promise<void>;
  deleteItem: (id: string, deleteBlobOnly?: boolean) => Promise<void>;
  batchDelete: (ids: string[], deleteBlobsOnly?: boolean) => Promise<void>;
  deleteAllVideos: () => Promise<void>;
  deleteAllAudios: () => Promise<void>;
  deleteAllOfflineBlobs: () => Promise<void>;
  startDownload: (item: MediaItem, formatOption?: MediaFormatOption) => Promise<void>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (item: MediaItem) => Promise<void>;
  cancelDownload: (id: string) => Promise<void>;
  retryDownload: (item: MediaItem, formatOption?: MediaFormatOption) => Promise<void>;
  createCategory: (cat: Category) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  exportMetadataJson: () => string;
  importMetadataJson: (jsonStr: string) => Promise<{ importedCount: number }>;
  exportFullBackupZip: (onProgress?: (progressPercent: number) => void) => Promise<void>;
  importFullBackupZip: (zipFile: File, onProgress?: (msg: string) => void) => Promise<{ importedCount: number }>;
  loadSampleData: () => Promise<void>;
  clearSampleData: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const MediaContext = createContext<MediaContextType | null>(null);

export const MediaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialPrefs = preferencesManager.getPreferences();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');
  const [selectedCategoryState, setSelectedCategoryState] = useState<string>(initialPrefs.defaultCategory || 'all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOptionState, setSortOptionState] = useState<SortOption>(initialPrefs.sortOption || 'recent');
  const [viewModeState, setViewModeState] = useState<'grid' | 'list'>(initialPrefs.viewMode || 'grid');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setSortOption = (s: SortOption) => {
    setSortOptionState(s);
    preferencesManager.setSortOption(s);
  };

  const setViewMode = (v: 'grid' | 'list') => {
    setViewModeState(v);
    preferencesManager.setViewMode(v);
  };

  const setSelectedCategory = (c: string) => {
    setSelectedCategoryState(c);
    preferencesManager.save({ defaultCategory: c });
  };
  const [storageBreakdown, setStorageBreakdown] = useState<StorageBreakdown>({
    usedBytes: 0,
    quotaBytes: 0,
    freeBytes: 0,
    audioBytes: 0,
    videoBytes: 0,
    audioCount: 0,
    videoCount: 0,
    downloadedCount: 0,
    linksCount: 0,
    totalCount: 0,
  });

  // Calculate storage stats
  const calculateStorage = useCallback(async (items: MediaItem[]) => {
    let audioBytes = 0;
    let videoBytes = 0;
    let audioCount = 0;
    let videoCount = 0;
    let downloadedCount = 0;
    let linksCount = 0;

    items.forEach((item) => {
      const size = item.size || item.fileSize || 0;
      const isItemOffline = item.isOffline || item.hasLocalBlob;

      if (item.mediaType === 'audio') {
        audioCount++;
        if (isItemOffline) audioBytes += size;
      } else {
        videoCount++;
        if (isItemOffline) videoBytes += size;
      }

      if (isItemOffline) {
        downloadedCount++;
      } else {
        linksCount++;
      }
    });

    let quotaBytes = 0;
    let usedBytes = audioBytes + videoBytes;
    let freeBytes = 0;

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage !== undefined) usedBytes = Math.max(usedBytes, estimate.usage);
        if (estimate.quota !== undefined) {
          quotaBytes = estimate.quota;
          freeBytes = Math.max(0, quotaBytes - usedBytes);
        }
      } catch {
        // ignore
      }
    }

    setStorageBreakdown({
      usedBytes,
      quotaBytes,
      freeBytes,
      audioBytes,
      videoBytes,
      audioCount,
      videoCount,
      downloadedCount,
      linksCount,
      totalCount: items.length,
    });
  }, []);

  const refreshMedia = useCallback(async () => {
    try {
      const [items, cats] = await Promise.all([getAllMedia(), getAllCategories()]);
      setMediaItems(items);
      setCategories(cats);
      calculateStorage(items);
    } catch (err) {
      console.error('Error refreshing media:', err);
    } finally {
      setIsLoading(false);
    }
  }, [calculateStorage]);

  useEffect(() => {
    refreshMedia();

    // Subscribe to download manager
    const unsubscribe = downloadManager.subscribe((taskMap) => {
      setDownloadTasks(Array.from(taskMap.values()));
      // If any task completed, refresh media state
      const completed = Array.from(taskMap.values()).some((t) => t.status === 'completed');
      if (completed) {
        getAllMedia().then((items) => {
          setMediaItems(items);
          calculateStorage(items);
        });
      }
    });

    return () => unsubscribe();
  }, [refreshMedia, calculateStorage]);

  const addMedia = async (item: MediaItem) => {
    await saveMediaItem(item);
    await refreshMedia();
  };

  const toggleFavorite = async (id: string) => {
    const item = mediaItems.find((m) => m.id === id);
    if (!item) return;
    const newFav = !item.favorite;
    await updateMediaItem(id, { favorite: newFav });
    setMediaItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, favorite: newFav } : m))
    );
  };

  const toggleVaultItem = async (id: string) => {
    const item = mediaItems.find((m) => m.id === id);
    if (!item) return;
    const nextVaultState = !item.isVaultItem;
    await updateMediaItem(id, { isVaultItem: nextVaultState });
    setMediaItems((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isVaultItem: nextVaultState } : m))
    );
  };

  const updateItem = async (id: string, updates: Partial<MediaItem>) => {
    const updated = await updateMediaItem(id, updates);
    setMediaItems((prev) => prev.map((m) => (m.id === id ? updated : m)));
    calculateStorage(mediaItems.map((m) => (m.id === id ? updated : m)));
  };

  const deleteItem = async (id: string, deleteBlobOnly = false) => {
    await deleteMediaItem(id, deleteBlobOnly);
    if (deleteBlobOnly) {
      setMediaItems((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, hasLocalBlob: false, isOffline: false, downloadStatus: 'not_downloaded' }
            : m
        )
      );
    } else {
      setMediaItems((prev) => prev.filter((m) => m.id !== id));
      downloadManager.removeTask(id);
    }
    calculateStorage(
      deleteBlobOnly
        ? mediaItems.map((m) =>
            m.id === id
              ? { ...m, hasLocalBlob: false, isOffline: false, downloadStatus: 'not_downloaded' }
              : m
          )
        : mediaItems.filter((m) => m.id !== id)
    );
  };

  const batchDelete = async (ids: string[], deleteBlobsOnly = false) => {
    for (const id of ids) {
      await deleteMediaItem(id, deleteBlobsOnly);
      if (!deleteBlobsOnly) {
        downloadManager.removeTask(id);
      }
    }
    await refreshMedia();
  };

  const deleteAllVideos = async () => {
    const videoIds = mediaItems.filter((m) => m.mediaType === 'video').map((m) => m.id);
    await batchDelete(videoIds, false);
  };

  const deleteAllAudios = async () => {
    const audioIds = mediaItems.filter((m) => m.mediaType === 'audio').map((m) => m.id);
    await batchDelete(audioIds, false);
  };

  const deleteAllOfflineBlobs = async () => {
    const offlineIds = mediaItems.filter((m) => m.isOffline || m.hasLocalBlob).map((m) => m.id);
    await batchDelete(offlineIds, true);
  };

  const startDownload = async (item: MediaItem, formatOption?: MediaFormatOption) => {
    await downloadManager.startDownload(item, formatOption);
  };

  const pauseDownload = async (id: string) => {
    await downloadManager.pauseDownload(id);
  };

  const resumeDownload = async (item: MediaItem) => {
    await downloadManager.resumeDownload(item);
  };

  const cancelDownload = async (id: string) => {
    await downloadManager.cancelDownload(id);
  };

  const retryDownload = async (item: MediaItem, formatOption?: MediaFormatOption) => {
    await downloadManager.retryDownload(item, formatOption);
  };

  const createCategory = async (cat: Category) => {
    await saveCategory(cat);
    const cats = await getAllCategories();
    setCategories(cats);
  };

  const removeCategory = async (id: string) => {
    await dbDeleteCategory(id);
    const cats = await getAllCategories();
    setCategories(cats);
  };

  const exportMetadataJson = (): string => {
    const payload = {
      app: 'Offline Media Vault',
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
      mediaItems: mediaItems.map((m) => ({
        id: m.id,
        title: m.title,
        sourceUrl: m.sourceUrl || m.originalUrl,
        originalUrl: m.originalUrl || m.sourceUrl,
        provider: m.provider || m.source,
        source: m.source,
        mediaType: m.mediaType,
        thumbnail: m.thumbnail,
        duration: m.duration,
        fileName: m.fileName,
        mimeType: m.mimeType,
        format: m.format,
        quality: m.quality,
        size: m.size || m.fileSize,
        fileSize: m.fileSize || m.size,
        category: m.category,
        tags: m.tags,
        favorite: m.favorite,
        createdAt: m.createdAt,
        metadata: m.metadata,
      })),
      categories,
    };
    return JSON.stringify(payload, null, 2);
  };

  const importMetadataJson = async (jsonStr: string): Promise<{ importedCount: number }> => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || !Array.isArray(data.mediaItems)) {
        throw new Error('El archivo no contiene un formato de respaldo válido de Media Vault.');
      }

      let count = 0;
      for (const rawItem of data.mediaItems) {
        if (rawItem && rawItem.id && rawItem.title) {
          const isYouTube =
            rawItem.source === 'youtube' ||
            (rawItem.originalUrl && rawItem.originalUrl.includes('youtu')) ||
            (rawItem.sourceUrl && rawItem.sourceUrl.includes('youtu'));

          const size = rawItem.size || rawItem.fileSize || 0;
          const item: MediaItem = {
            id: rawItem.id,
            title: rawItem.title,
            sourceUrl: rawItem.sourceUrl || rawItem.originalUrl || '',
            originalUrl: rawItem.originalUrl || rawItem.sourceUrl || '',
            provider: rawItem.provider || rawItem.source || 'other',
            source: rawItem.source || 'other',
            mediaType: rawItem.mediaType || 'audio',
            thumbnail: rawItem.thumbnail,
            duration: rawItem.duration || 0,
            fileName: rawItem.fileName || 'media.mp3',
            mimeType: rawItem.mimeType || 'audio/mpeg',
            format: rawItem.format,
            quality: rawItem.quality,
            size,
            fileSize: size,
            hasLocalBlob: false,
            isOffline: false,
            category: rawItem.category || 'otros',
            tags: Array.isArray(rawItem.tags) ? rawItem.tags : [],
            favorite: !!rawItem.favorite,
            downloadStatus: 'not_downloaded',
            createdAt: rawItem.createdAt || Date.now(),
            progress: 0,
            playbackPosition: 0,
            canDownload: rawItem.canDownload !== undefined ? rawItem.canDownload : !isYouTube,
            canStreamOffline: false,
            requiresOnlinePlayback:
              rawItem.requiresOnlinePlayback !== undefined
                ? rawItem.requiresOnlinePlayback
                : isYouTube,
            corsStatus: rawItem.corsStatus || (isYouTube ? 'not_applicable' : 'allowed'),
            explanation:
              rawItem.explanation ||
              (isYouTube
                ? 'Este contenido está guardado en tu biblioteca, pero necesita conexión a Internet para reproducirse.'
                : undefined),
            metadata: rawItem.metadata || {},
          };
          await saveMediaItem(item);
          count++;
        }
      }

      if (Array.isArray(data.categories)) {
        for (const cat of data.categories) {
          if (cat.id && cat.name) {
            await saveCategory(cat);
          }
        }
      }

      await refreshMedia();
      return { importedCount: count };
    } catch (e: any) {
      throw new Error(e.message || 'Error al procesar el archivo JSON de respaldo.');
    }
  };

  /**
   * Section 21: Full Backup Export with real multimedia files packed into a ZIP archive.
   */
  const exportFullBackupZip = async (onProgress?: (progressPercent: number) => void): Promise<void> => {
    const zip = new JSZip();

    // 1. Add metadata.json
    const metadataStr = exportMetadataJson();
    zip.file('metadata.json', metadataStr);

    // 2. Fetch all offline blobs and add to zip
    const offlineItems = mediaItems.filter((m) => m.isOffline || m.hasLocalBlob);
    const mediaFolder = zip.folder('media');

    let processed = 0;
    for (const item of offlineItems) {
      const blobRecord = await getMediaBlob(item.id);
      if (blobRecord && blobRecord.blob && mediaFolder) {
        const folderName = item.mediaType === 'video' ? 'video' : 'audio';
        const subFolder = mediaFolder.folder(folderName);
        if (subFolder) {
          subFolder.file(item.fileName, blobRecord.blob);
        }
      }
      processed++;
      if (onProgress && offlineItems.length > 0) {
        onProgress(Math.round((processed / offlineItems.length) * 80));
      }
    }

    // 3. Generate ZIP blob
    const zipBlob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      (metadata) => {
        if (onProgress) {
          onProgress(80 + Math.round((metadata.percent / 100) * 20));
        }
      }
    );

    // 4. Trigger download
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OfflineMediaVault_Backup_${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Section 21: Import full backup ZIP archive containing multimedia blobs and metadata.
   */
  const importFullBackupZip = async (
    zipFile: File,
    onProgress?: (msg: string) => void
  ): Promise<{ importedCount: number }> => {
    const zip = await JSZip.loadAsync(zipFile);

    // Read metadata.json
    const metaFile = zip.file('metadata.json');
    if (!metaFile) {
      throw new Error('El archivo ZIP no contiene "metadata.json".');
    }

    const metaJsonStr = await metaFile.async('string');
    const parsedData = JSON.parse(metaJsonStr);
    if (!parsedData || !Array.isArray(parsedData.mediaItems)) {
      throw new Error('El formato del archivo de respaldo es inválido.');
    }

    let count = 0;
    for (const rawItem of parsedData.mediaItems) {
      if (onProgress) {
        onProgress(`Importando "${rawItem.title}"...`);
      }

      // Check if blob file is inside media/ folder
      const possiblePaths = [
        `media/${rawItem.mediaType}/${rawItem.fileName}`,
        `media/${rawItem.fileName}`,
        rawItem.fileName,
      ];

      let foundZipEntry: JSZip.JSZipObject | null = null;
      for (const p of possiblePaths) {
        const entry = zip.file(p);
        if (entry) {
          foundZipEntry = entry;
          break;
        }
      }

      let hasLocalBlob = false;
      let fileSize = rawItem.size || rawItem.fileSize || 0;

      if (foundZipEntry) {
        const blobData = await foundZipEntry.async('blob');
        const mime = rawItem.mimeType || (rawItem.mediaType === 'video' ? 'video/mp4' : 'audio/mpeg');
        await saveMediaBlob(rawItem.id, blobData, mime);
        hasLocalBlob = true;
        fileSize = blobData.size;
      }

      const item: MediaItem = {
        ...rawItem,
        size: fileSize,
        fileSize,
        hasLocalBlob,
        isOffline: hasLocalBlob,
        downloadStatus: hasLocalBlob ? 'completed' : 'not_downloaded',
        downloadedAt: hasLocalBlob ? Date.now() : undefined,
        canStreamOffline: hasLocalBlob,
        requiresOnlinePlayback: !hasLocalBlob,
      };

      await saveMediaItem(item);
      count++;
    }

    await refreshMedia();
    return { importedCount: count };
  };

  const loadSampleData = async () => {
    const samples: MediaItem[] = [
      {
        id: 'sample_audio_1',
        title: 'Synthwave Chill Groove (Descargable)',
        sourceUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
        originalUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
        provider: 'authorized',
        source: 'authorized',
        mediaType: 'audio',
        duration: 42,
        fileName: 'synthwave_chill.mp3',
        mimeType: 'audio/mpeg',
        format: 'MP3',
        quality: '192 kbps',
        size: 672000,
        fileSize: 672000,
        hasLocalBlob: false,
        isOffline: false,
        category: 'musica',
        tags: ['#demo', '#musica', '#chill', '#descargable'],
        favorite: true,
        downloadStatus: 'not_downloaded',
        createdAt: Date.now() - 1000 * 60 * 60 * 2,
        progress: 0,
        playbackPosition: 0,
        canDownload: true,
        canStreamOffline: false,
        requiresOnlinePlayback: false,
        corsStatus: 'allowed',
        explanation: 'Descarga autorizada disponible para almacenamiento offline.',
        metadata: {
          artist: 'Vault Demo Studio',
          album: 'Lo-Fi Chill Sessions',
          isSample: true,
          canDirectDownload: true,
          providerId: 'authorized',
        },
      },
      {
        id: 'sample_audio_2',
        title: 'Tech Podcast: Arquitectura Offline First',
        sourceUrl: 'https://cdn.freesound.org/previews/517/517228_1156514-lq.mp3',
        originalUrl: 'https://cdn.freesound.org/previews/517/517228_1156514-lq.mp3',
        provider: 'authorized',
        source: 'podcast',
        mediaType: 'audio',
        duration: 85,
        fileName: 'podcast_offline_first.mp3',
        mimeType: 'audio/mpeg',
        format: 'MP3',
        quality: '320 kbps',
        size: 1360000,
        fileSize: 1360000,
        hasLocalBlob: false,
        isOffline: false,
        category: 'podcasts',
        tags: ['#demo', '#podcast', '#desarrollo', '#offline'],
        favorite: false,
        downloadStatus: 'not_downloaded',
        createdAt: Date.now() - 1000 * 60 * 60 * 8,
        progress: 0,
        playbackPosition: 0,
        canDownload: true,
        canStreamOffline: false,
        requiresOnlinePlayback: false,
        corsStatus: 'allowed',
        explanation: 'Descarga autorizada disponible.',
        metadata: {
          artist: 'Web & Mobile Dev Show',
          isSample: true,
          canDirectDownload: true,
          providerId: 'authorized',
        },
      },
      {
        id: 'sample_video_1',
        title: 'Big Buck Bunny (Video Descargable)',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        originalUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        provider: 'direct',
        source: 'direct',
        mediaType: 'video',
        thumbnail: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
        duration: 15,
        fileName: 'for_bigger_blazes.mp4',
        mimeType: 'video/mp4',
        format: 'MP4',
        quality: '1080p',
        size: 2240000,
        fileSize: 2240000,
        hasLocalBlob: false,
        isOffline: false,
        category: 'videos',
        tags: ['#demo', '#video', '#trailer', '#descargable'],
        favorite: false,
        downloadStatus: 'not_downloaded',
        createdAt: Date.now() - 1000 * 60 * 60 * 24,
        progress: 0,
        playbackPosition: 0,
        canDownload: true,
        canStreamOffline: false,
        requiresOnlinePlayback: false,
        corsStatus: 'allowed',
        explanation: 'Descarga autorizada disponible.',
        metadata: {
          artist: 'Blender Open Movie',
          resolution: '1080p',
          isSample: true,
          canDirectDownload: true,
          providerId: 'direct',
        },
      },
      {
        id: 'sample_youtube_ref',
        title: 'Tutorial PWA y Service Workers (YouTube Oficial)',
        sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        provider: 'youtube',
        source: 'youtube',
        mediaType: 'video',
        thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        duration: 213,
        fileName: 'youtube_dQw4w9WgXcQ.mp4',
        mimeType: 'video/mp4',
        format: 'MP4',
        quality: '720p',
        size: 0,
        fileSize: 0,
        hasLocalBlob: false,
        isOffline: false,
        category: 'educacion',
        tags: ['#youtube', '#enlace_online', '#demo'],
        favorite: false,
        downloadStatus: 'not_downloaded',
        createdAt: Date.now() - 1000 * 60 * 60 * 48,
        progress: 0,
        playbackPosition: 0,
        canDownload: false,
        canStreamOffline: false,
        requiresOnlinePlayback: true,
        corsStatus: 'not_applicable',
        explanation: 'Esta fuente no proporciona un archivo descargable mediante este método.',
        metadata: {
          channel: 'YouTube Video Oficial',
          isSample: true,
          canDirectDownload: false,
          providerId: 'youtube',
        },
      },
    ];

    for (const sample of samples) {
      await saveMediaItem(sample);
    }

    await refreshMedia();
  };

  const clearSampleData = async () => {
    const samples = mediaItems.filter((m) => m.metadata?.isSample || m.id.startsWith('sample_'));
    for (const s of samples) {
      await deleteMediaItem(s.id);
    }
    await refreshMedia();
  };

  const clearAll = async () => {
    await clearEntireDatabase();
    await refreshMedia();
  };

  // Collect all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    mediaItems.forEach((m) => {
      m.tags?.forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [mediaItems]);

  // Filtered & sorted items
  const filteredItems = useMemo(() => {
    return mediaItems
      .filter((item) => {
        const isItemOffline = item.isOffline || item.hasLocalBlob;

        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchSource = item.source?.toLowerCase().includes(q) || item.provider?.toLowerCase().includes(q);
          const matchCategory = item.category?.toLowerCase().includes(q);
          const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
          const matchFormat = item.format?.toLowerCase().includes(q);
          const matchFileName = item.fileName?.toLowerCase().includes(q);
          if (!matchTitle && !matchSource && !matchCategory && !matchTags && !matchFormat && !matchFileName) {
            return false;
          }
        }

        // Selected filter tab
        if (selectedFilter === 'audio' && item.mediaType !== 'audio') return false;
        if (selectedFilter === 'video' && item.mediaType !== 'video') return false;
        if (selectedFilter === 'offline' && !isItemOffline) return false;
        if (selectedFilter === 'downloaded' && !isItemOffline) return false;
        if (selectedFilter === 'downloads' && !isItemOffline && item.downloadStatus === 'not_downloaded') {
          return false;
        }
        if (selectedFilter === 'links' && isItemOffline) return false;
        if (selectedFilter === 'favorites' && !item.favorite) return false;
        if (selectedFilter === 'recent') {
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (item.createdAt < weekAgo && (!item.lastPlayedAt || item.lastPlayedAt < weekAgo)) {
            return false;
          }
        }

        // Category filter
        if (selectedCategoryState !== 'all' && item.category !== selectedCategoryState) {
          return false;
        }

        // Tag filter
        if (selectedTag && !item.tags.includes(selectedTag)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortOptionState) {
          case 'recent':
            return b.createdAt - a.createdAt;
          case 'oldest':
            return a.createdAt - b.createdAt;
          case 'alpha_asc':
            return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
          case 'alpha_desc':
            return b.title.localeCompare(a.title, undefined, { sensitivity: 'base' });
          case 'size_desc':
            return (b.size || b.fileSize || 0) - (a.size || a.fileSize || 0);
          case 'size_asc':
            return (a.size || a.fileSize || 0) - (b.size || b.fileSize || 0);
          case 'last_played':
            return (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0);
          default:
            return b.createdAt - a.createdAt;
        }
      });
  }, [mediaItems, searchQuery, selectedFilter, selectedCategoryState, selectedTag, sortOptionState]);

  return (
    <MediaContext.Provider
      value={{
        mediaItems,
        filteredItems,
        categories,
        downloadTasks,
        storageBreakdown,
        searchQuery,
        selectedFilter,
        selectedCategory: selectedCategoryState,
        selectedTag,
        sortOption: sortOptionState,
        viewMode: viewModeState,
        isLoading,
        allTags,
        setSearchQuery,
        setSelectedFilter,
        setSelectedCategory,
        setSelectedTag,
        setSortOption,
        setViewMode,
        refreshMedia,
        addMedia,
        toggleFavorite,
        toggleVaultItem,
        updateItem,
        deleteItem,
        batchDelete,
        deleteAllVideos,
        deleteAllAudios,
        deleteAllOfflineBlobs,
        startDownload,
        pauseDownload,
        resumeDownload,
        cancelDownload,
        retryDownload,
        createCategory,
        removeCategory,
        exportMetadataJson,
        importMetadataJson,
        exportFullBackupZip,
        importFullBackupZip,
        loadSampleData,
        clearSampleData,
        clearAll,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
};

export function useMedia() {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMedia must be used within MediaProvider');
  }
  return context;
}
