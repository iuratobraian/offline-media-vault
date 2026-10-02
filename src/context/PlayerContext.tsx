import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { MediaItem } from '../types/media';
import { getMediaBlob, updateMediaItem } from '../database/db';
import { updateMediaSession, updateMediaSessionPositionState } from '../services/mediaSession';

interface PlayerContextType {
  // Current playing track/video
  currentItem: MediaItem | null;
  currentBlobUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isLoading: boolean;
  isVideoModalOpen: boolean;
  resumeNotice: { seconds: number; formatted: string } | null;

  // Actions
  playItem: (item: MediaItem, queue?: MediaItem[]) => Promise<void>;
  togglePlayPause: () => void;
  seek: (seconds: number) => void;
  seekRelative: (deltaSeconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  closeVideoModal: () => void;
  openVideoModal: () => void;
  dismissResumeNotice: () => void;
  applyResumeNotice: () => void;
  togglePiP: () => Promise<void>;
  registerVideoElement: (el: HTMLVideoElement | null) => void;
  reportVideoTimeUpdate: (time: number, totalDuration: number) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentItem, setCurrentItem] = useState<MediaItem | null>(null);
  const [currentBlobUrl, setCurrentBlobUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRateState] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [resumeNotice, setResumeNotice] = useState<{ seconds: number; formatted: string } | null>(null);

  const [queue, setQueue] = useState<MediaItem[]>([]);

  // Persistent native media elements
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const progressSaveThrottle = useRef<number>(0);

  // Initialize background audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioElementRef.current = audio;

    const handleTimeUpdate = () => {
      if (currentItem?.mediaType === 'audio') {
        const time = audio.currentTime;
        setCurrentTime(time);

        // Throttle saving progress to IndexedDB every 4s
        const now = Date.now();
        if (now - progressSaveThrottle.current > 4000 && currentItem) {
          progressSaveThrottle.current = now;
          const pos = Math.floor(time);
          updateMediaItem(currentItem.id, {
            progress: pos,
            playbackPosition: pos,
            lastPlayedAt: now,
          }).catch(() => {});
        }

        updateMediaSessionPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: time,
        });
      }
    };

    const handleLoadedMetadata = () => {
      if (currentItem?.mediaType === 'audio') {
        setDuration(audio.duration || 0);
        setIsLoading(false);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleEnded = () => {
      setIsPlaying(false);
      handleNextTrack();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [currentItem]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      }
    };
  }, []);

  const registerVideoElement = (el: HTMLVideoElement | null) => {
    videoElementRef.current = el;
  };

  const reportVideoTimeUpdate = (time: number, totalDuration: number) => {
    setCurrentTime(time);
    if (totalDuration > 0 && (!duration || duration !== totalDuration)) {
      setDuration(totalDuration);
    }

    const now = Date.now();
    if (now - progressSaveThrottle.current > 3500 && currentItem) {
      progressSaveThrottle.current = now;
      const pos = Math.floor(time);
      updateMediaItem(currentItem.id, {
        progress: pos,
        playbackPosition: pos,
        lastPlayedAt: now,
      }).catch(() => {});
    }
  };

  const handleNextTrack = useCallback(() => {
    if (!currentItem || queue.length === 0) return;
    const currentIndex = queue.findIndex((q) => q.id === currentItem.id);
    if (currentIndex >= 0 && currentIndex < queue.length - 1) {
      playItem(queue[currentIndex + 1], queue);
    }
  }, [currentItem, queue]);

  const handlePreviousTrack = useCallback(() => {
    if (!currentItem || queue.length === 0) return;
    const currentIndex = queue.findIndex((q) => q.id === currentItem.id);
    if (currentIndex > 0) {
      playItem(queue[currentIndex - 1], queue);
    } else {
      seek(0);
    }
  }, [currentItem, queue]);

  const playItem = async (item: MediaItem, newQueue?: MediaItem[]) => {
    if (newQueue) {
      setQueue(newQueue);
    }

    setIsLoading(true);
    setCurrentItem(item);
    setResumeNotice(null);

    // Stop current audio if playing
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    // Revoke previous blob URL
    if (activeBlobUrlRef.current) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
      activeBlobUrlRef.current = null;
    }

    let mediaSourceUrl = '';

    // Section 14: Reproducción offline garantizada desde IndexedDB
    const isItemOffline = item.isOffline || item.hasLocalBlob || item.downloadStatus === 'completed';
    if (isItemOffline) {
      const blobRecord = await getMediaBlob(item.id);
      if (blobRecord && blobRecord.blob) {
        mediaSourceUrl = URL.createObjectURL(blobRecord.blob);
        activeBlobUrlRef.current = mediaSourceUrl;
      }
    }

    // Fallback to original online URL only if item is not offline
    if (!mediaSourceUrl) {
      mediaSourceUrl = item.sourceUrl || item.originalUrl;
    }

    setCurrentBlobUrl(mediaSourceUrl);

    // Section 13: Resume position prompt ("Continuar desde 01:42")
    const savedPos = item.playbackPosition || item.progress || 0;
    const dur = item.duration || 0;
    if (savedPos > 5 && (!dur || savedPos < dur - 5)) {
      const mins = Math.floor(savedPos / 60);
      const secs = savedPos % 60;
      setResumeNotice({
        seconds: savedPos,
        formatted: `${mins}:${secs.toString().padStart(2, '0')}`,
      });
    }

    if (item.mediaType === 'audio') {
      setIsVideoModalOpen(false);
      if (audioElementRef.current) {
        audioElementRef.current.src = mediaSourceUrl;
        audioElementRef.current.playbackRate = playbackRate;
        audioElementRef.current.volume = isMuted ? 0 : volume;
        try {
          await audioElementRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.warn('Playback waiting for user gesture:', err);
        }
      }
    } else {
      // Video
      setIsVideoModalOpen(true);
    }

    // Record last played in IndexedDB
    updateMediaItem(item.id, { lastPlayedAt: Date.now() }).catch(() => {});

    // Update Media Session API
    updateMediaSession(item, {
      onPlay: () => togglePlayPause(),
      onPause: () => togglePlayPause(),
      onPreviousTrack: () => handlePreviousTrack(),
      onNextTrack: () => handleNextTrack(),
      onSeekBackward: (details) => seekRelative(-(details.seekOffset || 10)),
      onSeekForward: (details) => seekRelative(details.seekOffset || 10),
      onSeekTo: (details) => {
        if (details.seekTime !== undefined) seek(details.seekTime);
      },
    });

    setIsLoading(false);
  };

  const togglePlayPause = () => {
    if (currentItem?.mediaType === 'audio') {
      const audio = audioElementRef.current;
      if (!audio) return;
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(console.warn);
      }
    } else if (currentItem?.mediaType === 'video') {
      const video = videoElementRef.current;
      if (!video) return;
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        video.play().catch(console.warn);
        setIsPlaying(true);
      }
    }
  };

  const seek = (seconds: number) => {
    const target = Math.max(0, Math.min(seconds, duration || 99999));
    setCurrentTime(target);

    if (currentItem?.mediaType === 'audio' && audioElementRef.current) {
      audioElementRef.current.currentTime = target;
    } else if (currentItem?.mediaType === 'video' && videoElementRef.current) {
      videoElementRef.current.currentTime = target;
    }

    if (currentItem) {
      const pos = Math.floor(target);
      updateMediaItem(currentItem.id, {
        progress: pos,
        playbackPosition: pos,
      }).catch(() => {});
    }
  };

  const seekRelative = (deltaSeconds: number) => {
    seek(currentTime + deltaSeconds);
  };

  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);

    if (audioElementRef.current) audioElementRef.current.volume = clamped;
    if (videoElementRef.current) videoElementRef.current.volume = clamped;
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      const restored = volume || 0.8;
      if (audioElementRef.current) audioElementRef.current.volume = restored;
      if (videoElementRef.current) videoElementRef.current.volume = restored;
    } else {
      setIsMuted(true);
      if (audioElementRef.current) audioElementRef.current.volume = 0;
      if (videoElementRef.current) videoElementRef.current.volume = 0;
    }
  };

  const setPlaybackRate = (rate: number) => {
    setPlaybackRateState(rate);
    if (audioElementRef.current) audioElementRef.current.playbackRate = rate;
    if (videoElementRef.current) videoElementRef.current.playbackRate = rate;
  };

  const closeVideoModal = () => {
    if (videoElementRef.current) {
      videoElementRef.current.pause();
    }
    setIsPlaying(false);
    setIsVideoModalOpen(false);
  };

  const openVideoModal = () => {
    if (currentItem?.mediaType === 'video') {
      setIsVideoModalOpen(true);
    }
  };

  const dismissResumeNotice = () => {
    setResumeNotice(null);
  };

  const applyResumeNotice = () => {
    if (resumeNotice) {
      seek(resumeNotice.seconds);
      setResumeNotice(null);
    }
  };

  const togglePiP = async () => {
    const video = videoElementRef.current;
    if (!video || !document.pictureInPictureEnabled) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        currentItem,
        currentBlobUrl,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        playbackRate,
        isLoading,
        isVideoModalOpen,
        resumeNotice,
        playItem,
        togglePlayPause,
        seek,
        seekRelative,
        setVolume,
        toggleMute,
        setPlaybackRate,
        playNext: handleNextTrack,
        playPrevious: handlePreviousTrack,
        closeVideoModal,
        openVideoModal,
        dismissResumeNotice,
        applyResumeNotice,
        togglePiP,
        registerVideoElement,
        reportVideoTimeUpdate,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return context;
}
