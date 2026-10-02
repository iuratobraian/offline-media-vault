import { MediaItem } from '../types/media';

interface MediaSessionCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onPreviousTrack?: () => void;
  onNextTrack?: () => void;
  onSeekTo?: (details: MediaSessionActionDetails) => void;
  onSeekBackward?: (details: MediaSessionActionDetails) => void;
  onSeekForward?: (details: MediaSessionActionDetails) => void;
}

export function updateMediaSession(item: MediaItem | null, callbacks: MediaSessionCallbacks = {}) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator) || !item) {
    return;
  }

  try {
    const artworkList: MediaImage[] = [];
    if (item.thumbnail) {
      artworkList.push({
        src: item.thumbnail,
        sizes: '512x512',
        type: 'image/jpeg',
      });
    } else {
      artworkList.push({
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      });
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.title,
      artist: item.metadata?.artist || item.metadata?.channel || (item.mediaType === 'audio' ? 'Audio Offline' : 'Video Offline'),
      album: item.category ? item.category.toUpperCase() : 'Offline Media Vault',
      artwork: artworkList,
    });

    // Set action handlers
    if (callbacks.onPlay) {
      navigator.mediaSession.setActionHandler('play', callbacks.onPlay);
    }
    if (callbacks.onPause) {
      navigator.mediaSession.setActionHandler('pause', callbacks.onPause);
    }
    if (callbacks.onPreviousTrack) {
      navigator.mediaSession.setActionHandler('previoustrack', callbacks.onPreviousTrack);
    }
    if (callbacks.onNextTrack) {
      navigator.mediaSession.setActionHandler('nexttrack', callbacks.onNextTrack);
    }
    if (callbacks.onSeekBackward) {
      navigator.mediaSession.setActionHandler('seekbackward', callbacks.onSeekBackward);
    }
    if (callbacks.onSeekForward) {
      navigator.mediaSession.setActionHandler('seekforward', callbacks.onSeekForward);
    }
    if (callbacks.onSeekTo) {
      navigator.mediaSession.setActionHandler('seekto', callbacks.onSeekTo);
    }
  } catch (e) {
    console.warn('MediaSession API warning:', e);
  }
}

export function updateMediaSessionPositionState(state: {
  duration?: number;
  playbackRate?: number;
  position?: number;
}) {
  if (typeof window === 'undefined' || !('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) {
    return;
  }

  try {
    if (state.duration && state.duration > 0 && isFinite(state.duration)) {
      navigator.mediaSession.setPositionState({
        duration: state.duration,
        playbackRate: state.playbackRate || 1.0,
        position: Math.min(state.position || 0, state.duration),
      });
    }
  } catch (e) {
    // Ignore invalid state exceptions
  }
}
