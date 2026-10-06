import { MediaItem } from '../types/media';
import { downloadManager } from './downloadManager';
import { preferencesManager } from './preferencesManager';
import { saveMediaItem } from '../database/db';

class SmartDownloader {
  private activeAutoDownloads: Set<string> = new Set();

  /**
   * Called automatically whenever a track begins playback.
   * If Smart Downloads is enabled, auto-caches the current track and pre-fetches the next tracks in queue.
   */
  public async handleTrackPlay(currentTrack: MediaItem, queue: MediaItem[] = []): Promise<void> {
    const prefs = preferencesManager.getPreferences();
    if (!prefs.smartDownloadsEnabled) return;

    // 1. Check current track
    if (currentTrack && !currentTrack.isOffline && !currentTrack.hasLocalBlob) {
      this.triggerBackgroundDownload(currentTrack);
    }

    // 2. Pre-fetch upcoming queue items (up to next 2 items)
    if (Array.isArray(queue) && queue.length > 0) {
      const currentIndex = queue.findIndex((m) => m.id === currentTrack?.id);
      const nextItems = currentIndex >= 0 ? queue.slice(currentIndex + 1, currentIndex + 3) : queue.slice(0, 2);

      for (const nextItem of nextItems) {
        if (nextItem && !nextItem.isOffline && !nextItem.hasLocalBlob) {
          // Stagger pre-fetch slightly to let current track load first
          setTimeout(() => {
            this.triggerBackgroundDownload(nextItem);
          }, 3000);
        }
      }
    }
  }

  private async triggerBackgroundDownload(item: MediaItem): Promise<void> {
    if (this.activeAutoDownloads.has(item.id)) return;

    // Check if task is already in download manager
    const existingTask = downloadManager.getTask(item.id);
    if (existingTask && existingTask.status !== 'error' && existingTask.status !== 'cancelled') {
      return;
    }

    this.activeAutoDownloads.add(item.id);

    try {
      // Ensure media item exists in db
      await saveMediaItem(item);

      // Determine format option based on user preference or item mediaType
      const prefs = preferencesManager.getPreferences();
      let formatPref = prefs.downloadFormat;

      let formatOption: any = undefined;
      if (formatPref === 'audio_mp3') {
        formatOption = {
          id: 'yt_audio_mp3',
          label: 'MP3 Solo Audio (320 kbps)',
          format: 'MP3',
          quality: '320 kbps',
          type: 'audio',
          ext: '.mp3',
          mimeType: 'audio/mpeg',
        };
      } else if (formatPref === 'audio_m4a') {
        formatOption = {
          id: 'yt_audio_m4a',
          label: 'M4A / AAC (128 kbps)',
          format: 'M4A',
          quality: '128 kbps',
          type: 'audio',
          ext: '.m4a',
          mimeType: 'audio/mp4',
        };
      } else if (formatPref === 'video_720p') {
        formatOption = {
          id: 'yt_video_720p',
          label: '720p HD (MP4)',
          format: 'MP4',
          quality: '720p',
          type: 'video',
          ext: '.mp4',
          mimeType: 'video/mp4',
        };
      } else if (formatPref === 'video_1080p') {
        formatOption = {
          id: 'yt_video_1080p',
          label: '1080p Full HD (MP4)',
          format: 'MP4',
          quality: '1080p',
          type: 'video',
          ext: '.mp4',
          mimeType: 'video/mp4',
        };
      }

      await downloadManager.startDownload(item, formatOption);
    } catch (err) {
      console.warn('[SmartDownloader] Could not auto-download track:', item.title, err);
    } finally {
      this.activeAutoDownloads.delete(item.id);
    }
  }
}

export const smartDownloader = new SmartDownloader();
