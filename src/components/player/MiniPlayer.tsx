import React, { useState } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { formatDuration } from '../../utils/formatters';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Music,
} from 'lucide-react';

interface MiniPlayerProps {
  onOpenFullPlayer?: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onOpenFullPlayer }) => {
  const {
    currentItem,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlayPause,
    seek,
    setVolume,
    toggleMute,
    playNext,
    playPrevious,
    openVideoModal,
  } = usePlayer();

  if (!currentItem) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleOpenPlayer = () => {
    if (currentItem.mediaType === 'video') {
      openVideoModal();
    } else {
      onOpenFullPlayer?.();
    }
  };

  return (
    <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#0e1424]/98 backdrop-blur-2xl shadow-2xl transition-all">
      {/* Top thin interactive scrubber bar */}
      <div className="group relative -top-1 h-2 w-full cursor-pointer">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="absolute inset-0 h-1.5 w-full opacity-0 cursor-pointer z-10"
        />
        <div className="h-1 w-full bg-white/10 transition-all group-hover:h-2">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Left: Media Info - Tapping opens full player */}
        <div
          onClick={handleOpenPlayer}
          className="flex items-center gap-3 min-w-0 max-w-[55%] sm:max-w-xs cursor-pointer group"
          title="Toca para ver reproductor completo"
        >
          {/* Thumbnail / Disc */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 border border-white/10 group-hover:border-emerald-500/50 transition">
            {currentItem.thumbnail ? (
              <img
                src={currentItem.thumbnail}
                alt={currentItem.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center bg-gradient-to-tr from-emerald-600/30 to-indigo-600/30 ${
                  isPlaying ? 'animate-pulse' : ''
                }`}
              >
                <Music className="h-5 w-5 text-emerald-400" />
              </div>
            )}

            {/* Offline badge tag */}
            {currentItem.hasLocalBlob && (
              <span
                className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[#0e1424]"
                title="Offline"
              />
            )}
          </div>

          {/* Title & Artist */}
          <div className="min-w-0">
            <h4 className="truncate text-xs sm:text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
              {currentItem.title}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="truncate">
                {currentItem.metadata?.artist ||
                  currentItem.metadata?.channel ||
                  (currentItem.mediaType === 'audio' ? 'Audio Vault' : 'Video Vault')}
              </span>
              <span className="hidden sm:inline font-mono text-[10px] text-emerald-400/80">
                {formatDuration(currentTime)} / {formatDuration(duration || currentItem.duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Playback Controls (Prev, Play/Pause, Next) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Previous */}
          <button
            onClick={playPrevious}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition active:scale-95"
            title="Pista anterior"
          >
            <SkipBack className="h-4 w-4 fill-current" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlayPause}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/25 hover:scale-105 transition active:scale-95 mx-1"
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={playNext}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition active:scale-95"
            title="Pista siguiente"
          >
            <SkipForward className="h-4 w-4 fill-current" />
          </button>
        </div>

        {/* Right: Expand to Full Screen + Volume */}
        <div className="flex items-center gap-2">
          {/* Volume slider (desktop only) */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-slate-400 hover:text-white"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4 text-rose-400" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 h-1 accent-emerald-500 bg-white/10"
            />
          </div>

          {/* Expand Full Player Button */}
          <button
            onClick={handleOpenPlayer}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white transition active:scale-95"
            title="Abrir reproductor completo"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
