import { DownloadStatus, DownloadTask, MediaFormatOption, MediaItem } from '../types/media';
import { saveMediaBlob, updateMediaItem } from '../database/db';
import { extractAudioFromMediaBlob } from '../utils/audioExtractor';
import { getBackendBaseUrl } from './providers/YouTubeProvider';

type Listener = (tasks: Map<string, DownloadTask>) => void;

interface ActiveStream {
  abortController: AbortController;
  receivedChunks: Uint8Array[];
  receivedBytes: number;
  totalBytes: number;
  supportsRange: boolean;
  formatOption?: MediaFormatOption;
  lastSpeedSampleTime: number;
  lastSpeedSampleBytes: number;
  speedSamples: number[];
}

export class DownloadManager {
  private tasks: Map<string, DownloadTask> = new Map();
  private activeStreams: Map<string, ActiveStream> = new Map();
  private listeners: Set<Listener> = new Set();

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.tasks);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.tasks));
  }

  public getTasks(): DownloadTask[] {
    return Array.from(this.tasks.values());
  }

  public getTask(id: string): DownloadTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Checks if device storage has sufficient quota for a download.
   */
  public async checkStorageQuota(requiredBytes: number): Promise<{ hasEnough: boolean; availableBytes: number }> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota !== undefined && estimate.usage !== undefined) {
          const available = estimate.quota - estimate.usage;
          if (requiredBytes > 0 && available < requiredBytes) {
            return { hasEnough: false, availableBytes: available };
          }
          return { hasEnough: true, availableBytes: available };
        }
      } catch {
        // ignore
      }
    }
    return { hasEnough: true, availableBytes: Infinity };
  }

  public async startDownload(item: MediaItem, formatOption?: MediaFormatOption): Promise<void> {
    let downloadUrl = formatOption?.url || item.sourceUrl || item.originalUrl;
    if (!downloadUrl) {
      throw new Error('No hay una URL válida para descargar.');
    }

    if (downloadUrl.startsWith('/')) {
      const baseUrl = getBackendBaseUrl();
      if (baseUrl) {
        downloadUrl = `${baseUrl}${downloadUrl}`;
      }
    }

    if (item.canDownload === false && !formatOption) {
      throw new Error(
        item.explanation || 'Esta fuente no proporciona un archivo descargable mediante este método.'
      );
    }

    // Storage quota warning check
    if (item.size > 0) {
      const quotaCheck = await this.checkStorageQuota(item.size);
      if (!quotaCheck.hasEnough) {
        console.warn(`Alerta de cuota: Espacio disponible bajo (${quotaCheck.availableBytes} bytes)`);
      }
    }

    const abortController = new AbortController();
    const supportsRange = formatOption?.supportsRangeRequests ?? (item.corsStatus === 'allowed');

    const task: DownloadTask = {
      id: item.id,
      title: item.title,
      url: downloadUrl,
      format: formatOption?.format || item.format,
      quality: formatOption?.quality || item.quality,
      thumbnail: item.thumbnail,
      mediaType: formatOption?.type || item.mediaType,
      status: 'preparing',
      statusLabel: 'Preparando',
      progressPercent: 0,
      downloadedBytes: 0,
      totalBytes: formatOption?.fileSize || item.size || 0,
      speedBps: 0,
      etaSeconds: 0,
      canPause: supportsRange,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.tasks.set(item.id, task);
    this.activeStreams.set(item.id, {
      abortController,
      receivedChunks: [],
      receivedBytes: 0,
      totalBytes: task.totalBytes,
      supportsRange,
      formatOption,
      lastSpeedSampleTime: Date.now(),
      lastSpeedSampleBytes: 0,
      speedSamples: [],
    });

    await updateMediaItem(item.id, { downloadStatus: 'preparing' });
    this.notify();

    // Begin download stream
    this.executeDownload(item, abortController);
  }

  private async executeDownload(item: MediaItem, abortController: AbortController, resumeOffset = 0) {
    const streamInfo = this.activeStreams.get(item.id);
    const task = this.tasks.get(item.id);
    if (!streamInfo || !task) return;

    try {
      task.status = 'downloading';
      task.statusLabel = 'Descargando';
      task.updatedAt = Date.now();
      await updateMediaItem(item.id, { downloadStatus: 'downloading' });
      this.notify();

      const headers: Record<string, string> = {};
      if (resumeOffset > 0 && streamInfo.supportsRange) {
        headers['Range'] = `bytes=${resumeOffset}-`;
      }

      const response = await fetch(task.url, {
        headers,
        signal: abortController.signal,
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`Error en el servidor: HTTP ${response.status}`);
      }

      // Check range support from response
      const acceptRanges = response.headers.get('accept-ranges');
      const contentRange = response.headers.get('content-range');
      if (acceptRanges?.toLowerCase().includes('bytes') || contentRange) {
        streamInfo.supportsRange = true;
        task.canPause = true;
      }

      // Calculate total bytes
      if (contentRange) {
        const m = contentRange.match(/\/(\d+)/);
        if (m) {
          streamInfo.totalBytes = parseInt(m[1], 10);
          task.totalBytes = streamInfo.totalBytes;
        }
      } else {
        const cl = response.headers.get('content-length');
        if (cl) {
          const lengthVal = parseInt(cl, 10);
          streamInfo.totalBytes = resumeOffset > 0 ? resumeOffset + lengthVal : lengthVal;
          task.totalBytes = streamInfo.totalBytes;
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        // Fallback to blob if ReadableStream is unavailable
        const rawBlob = await response.blob();
        await this.handleProcessingAndSave(item, rawBlob, streamInfo.formatOption);
        return;
      }

      let lastUiUpdate = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          streamInfo.receivedChunks.push(value);
          streamInfo.receivedBytes += value.length;
          task.downloadedBytes = streamInfo.receivedBytes;

          // Real progress percentage calculation
          if (streamInfo.totalBytes > 0) {
            task.progressPercent = Math.min(
              100,
              Math.round((streamInfo.receivedBytes / streamInfo.totalBytes) * 100)
            );
          } else {
            // Indeterminate progress (Content-Length missing)
            task.progressPercent = 0;
          }

          // Speed & ETA calculations
          const now = Date.now();
          const timeDiff = (now - streamInfo.lastSpeedSampleTime) / 1000;

          if (timeDiff >= 0.5) {
            const bytesDiff = streamInfo.receivedBytes - streamInfo.lastSpeedSampleBytes;
            const currentSpeed = bytesDiff / timeDiff;

            streamInfo.speedSamples.push(currentSpeed);
            if (streamInfo.speedSamples.length > 5) streamInfo.speedSamples.shift();

            const avgSpeed =
              streamInfo.speedSamples.reduce((a, b) => a + b, 0) / streamInfo.speedSamples.length;

            task.speedBps = Math.round(avgSpeed);

            if (task.totalBytes > 0 && avgSpeed > 0) {
              const remainingBytes = Math.max(0, task.totalBytes - streamInfo.receivedBytes);
              task.etaSeconds = Math.max(0, Math.round(remainingBytes / avgSpeed));
            }

            streamInfo.lastSpeedSampleTime = now;
            streamInfo.lastSpeedSampleBytes = streamInfo.receivedBytes;
          }

          // Throttle UI notification to ~15fps
          if (now - lastUiUpdate > 66) {
            lastUiUpdate = now;
            task.updatedAt = now;
            this.notify();
          }
        }
      }

      // Download payload complete - now assemble and process
      const contentType =
        streamInfo.formatOption?.mimeType ||
        response.headers.get('content-type') ||
        item.mimeType ||
        'application/octet-stream';

      const rawBlob = new Blob(streamInfo.receivedChunks as BlobPart[], { type: contentType });
      await this.handleProcessingAndSave(item, rawBlob, streamInfo.formatOption);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Handled cleanly by pause or cancel
        return;
      }

      console.error('Download error:', err);
      const isCorsOrNetwork =
        err.name === 'TypeError' ||
        (err.message && (err.message.includes('fetch') || err.message.includes('Network')));

      const friendlyError = isCorsOrNetwork
        ? 'El archivo existe, pero su servidor no permite descargas desde esta aplicación.'
        : err.message || 'Se perdió la conexión durante la descarga.';

      task.status = 'error';
      task.statusLabel = 'Error';
      task.errorMessage = friendlyError;
      task.speedBps = 0;
      task.etaSeconds = 0;
      task.updatedAt = Date.now();
      this.activeStreams.delete(item.id);

      await updateMediaItem(item.id, {
        downloadStatus: 'error',
        corsStatus: isCorsOrNetwork ? 'blocked' : item.corsStatus,
        explanation: friendlyError,
      });
      this.notify();
    }
  }

  private async handleProcessingAndSave(
    item: MediaItem,
    rawBlob: Blob,
    formatOption?: MediaFormatOption
  ) {
    const task = this.tasks.get(item.id);
    if (task) {
      task.status = 'processing';
      task.statusLabel = 'Procesando';
      task.progressPercent = 100;
      task.speedBps = 0;
      task.etaSeconds = 0;
      task.updatedAt = Date.now();
      this.notify();
    }

    let finalBlob = rawBlob;
    let finalMimeType = formatOption?.mimeType || rawBlob.type || item.mimeType;
    let finalMediaType = formatOption?.type || item.mediaType;

    // Check if user requested "SOLO AUDIO" extraction from a video source
    if (formatOption?.isAudioOnly && !rawBlob.type.startsWith('audio/')) {
      try {
        const extracted = await extractAudioFromMediaBlob(rawBlob, 'WAV');
        finalBlob = extracted.blob;
        finalMimeType = extracted.mimeType;
        finalMediaType = 'audio';
      } catch (err) {
        console.warn('Audio extraction fallback:', err);
      }
    }

    if (task) {
      task.status = 'saving';
      task.statusLabel = 'Guardando';
      task.updatedAt = Date.now();
      this.notify();
    }

    // 1. Download and cache thumbnail image offline as Base64 data URL
    let localThumbnail = item.thumbnail;
    if (item.thumbnail && item.thumbnail.startsWith('http')) {
      try {
        const imgRes = await fetch(item.thumbnail, { signal: AbortSignal.timeout(8000) });
        if (imgRes.ok) {
          const imgBlob = await imgRes.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(item.thumbnail!);
            reader.readAsDataURL(imgBlob);
          });
          if (base64 && base64.startsWith('data:image')) {
            localThumbnail = base64;
          }
          await saveMediaBlob(`${item.id}_thumb`, imgBlob, imgBlob.type || 'image/jpeg');
        }
      } catch (err) {
        console.warn('Could not cache thumbnail offline:', err);
      }
    }

    // 2. Save real binary Blob to IndexedDB
    await saveMediaBlob(item.id, finalBlob, finalMimeType);

    // 3. Automatically categorize in dedicated folders
    const finalCategory =
      item.category && item.category !== 'general'
        ? item.category
        : finalMediaType === 'audio'
        ? 'musica'
        : 'videos';

    // 4. Update metadata in IndexedDB (offline-ready with cached image)
    await updateMediaItem(item.id, {
      thumbnail: localThumbnail,
      hasLocalBlob: true,
      isOffline: true, // Only true because Blob is verified saved in IndexedDB
      downloadStatus: 'completed',
      downloadedAt: Date.now(),
      size: finalBlob.size,
      fileSize: finalBlob.size,
      mediaType: finalMediaType,
      category: finalCategory,
      mimeType: finalMimeType,
      format: formatOption?.format || item.format,
      quality: formatOption?.quality || item.quality,
      canStreamOffline: true,
      requiresOnlinePlayback: false,
      canDownload: false,
      explanation: '✓ Guardado en tu biblioteca offline',
    });

    if (task) {
      task.status = 'completed';
      task.statusLabel = 'Completado';
      task.progressPercent = 100;
      task.downloadedBytes = finalBlob.size;
      task.totalBytes = finalBlob.size;
      task.speedBps = 0;
      task.etaSeconds = 0;
      task.updatedAt = Date.now();
    }

    this.activeStreams.delete(item.id);
    this.notify();
  }

  public async pauseDownload(id: string): Promise<void> {
    const streamInfo = this.activeStreams.get(id);
    const task = this.tasks.get(id);
    if (!task) return;

    if (!streamInfo?.supportsRange) {
      throw new Error('Esta fuente no permite reanudar la descarga.');
    }

    if (streamInfo) {
      streamInfo.abortController.abort();
    }

    task.status = 'paused';
    task.statusLabel = 'Pausado';
    task.speedBps = 0;
    task.etaSeconds = 0;
    task.updatedAt = Date.now();

    await updateMediaItem(id, { downloadStatus: 'paused' });
    this.notify();
  }

  public async resumeDownload(item: MediaItem): Promise<void> {
    const task = this.tasks.get(item.id);
    const streamInfo = this.activeStreams.get(item.id);

    if (!task || !streamInfo) {
      return this.startDownload(item);
    }

    if (!streamInfo.supportsRange) {
      throw new Error('Esta fuente no permite reanudar la descarga.');
    }

    const abortController = new AbortController();
    streamInfo.abortController = abortController;
    streamInfo.lastSpeedSampleTime = Date.now();
    streamInfo.lastSpeedSampleBytes = streamInfo.receivedBytes;

    task.status = 'downloading';
    task.statusLabel = 'Descargando';
    task.updatedAt = Date.now();

    await updateMediaItem(item.id, { downloadStatus: 'downloading' });
    this.notify();

    this.executeDownload(item, abortController, streamInfo.receivedBytes);
  }

  public async cancelDownload(id: string): Promise<void> {
    const streamInfo = this.activeStreams.get(id);
    if (streamInfo) {
      streamInfo.abortController.abort();
      // Free temporary chunks from memory
      streamInfo.receivedChunks = [];
      this.activeStreams.delete(id);
    }

    const task = this.tasks.get(id);
    if (task) {
      task.status = 'cancelled';
      task.statusLabel = 'Cancelado';
      task.speedBps = 0;
      task.etaSeconds = 0;
      task.updatedAt = Date.now();
    }

    await updateMediaItem(id, { downloadStatus: 'cancelled' });
    this.notify();
  }

  public async retryDownload(item: MediaItem, formatOption?: MediaFormatOption): Promise<void> {
    await this.cancelDownload(item.id);
    await this.startDownload(item, formatOption);
  }

  public removeTask(id: string): void {
    this.cancelDownload(id);
    this.tasks.delete(id);
    this.notify();
  }
}

export const downloadManager = new DownloadManager();
