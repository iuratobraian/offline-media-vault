import React, { useState } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { useMedia } from '../../context/MediaContext';
import { formatDuration } from '../../utils/formatters';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronDown,
  Volume2,
  VolumeX,
  Gauge,
  Star,
  ListPlus,
  Music,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

interface FullAudioPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPlaylistModal?: () => void;
}

export const FullAudioPlayerModal: React.FC<FullAudioPlayerModalProps> = ({
  isOpen,
  onClose,
  onOpenPlaylistModal,
}) => {
  const {
    currentItem,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    togglePlayPause,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setPlaybackRate,
    playNext,
    playPrevious,
    openEqualizerModal,
  } = usePlayer();

  const { toggleFavorite } = useMedia();
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  if (!isOpen || !currentItem) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isDownloaded = !!(currentItem.isOffline || currentItem.hasLocalBlob);
  const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070b14]/98 backdrop-blur-3xl animate-fade-in select-none">
      {/* Dynamic Island Safe Header */}
      <div className="flex items-center justify-between px-5 pt-[max(1.25rem,calc(var(--sat)+0.75rem))] pb-3 border-b border-white/5">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition active:scale-95"
          title="Minimizar reproductor"
        >
          <ChevronDown className="h-5 w-5" />
          <span>Minimizar</span>
        </button>

        <div className="text-center min-w-0 px-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Reproduciendo ahora
          </p>
          {isDownloaded && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span>Offline</span>
            </span>
          )}
        </div>

        <button
          onClick={() => toggleFavorite(currentItem.id)}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
            currentItem.favorite ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white bg-white/5'
          }`}
          title="Favorito"
        >
          <Star className={`h-4 w-4 ${currentItem.favorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Main Body: Big Album Art + Song Details */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 max-w-md mx-auto w-full space-y-6">
        {/* Album Art with Ambient Glow */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 shrink-0">
          <div
            className={`absolute -inset-4 rounded-3xl bg-gradient-to-tr from-emerald-500/25 to-indigo-500/25 blur-3xl transition-opacity duration-700 ${
              isPlaying ? 'opacity-100 animate-pulse' : 'opacity-30'
            }`}
          />
          <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl">
            {currentItem.thumbnail ? (
              <img
                src={currentItem.thumbnail}
                alt={currentItem.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-emerald-600/30 to-indigo-600/30">
                <Music className="h-20 w-20 text-emerald-400" />
              </div>
            )}
          </div>
        </div>

        {/* Title & Artist */}
        <div className="w-full text-center space-y-1">
          <h2 className="text-lg sm:text-xl font-bold text-white line-clamp-2">
            {currentItem.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {currentItem.metadata?.artist || currentItem.metadata?.channel || 'sharemusic'}
          </p>
        </div>

        {/* Scrubber Progress Bar */}
        <div className="w-full space-y-1.5">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => seek(parseFloat(e.target.value))}
              className="w-full h-1.5 cursor-pointer accent-emerald-500 bg-white/10 rounded-lg"
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-slate-400 px-0.5">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration || currentItem.duration)}</span>
          </div>
        </div>

        {/* Primary Controls: Previous, Play/Pause, Next */}
        <div className="flex items-center justify-center gap-6 sm:gap-8 w-full">
          <button
            onClick={playPrevious}
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95"
            title="Pista anterior"
          >
            <SkipBack className="h-6 w-6 fill-current" />
          </button>

          <button
            onClick={togglePlayPause}
            className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/30 hover:scale-105 transition active:scale-95"
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? (
              <Pause className="h-7 w-7 fill-current" />
            ) : (
              <Play className="h-7 w-7 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={playNext}
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95"
            title="Pista siguiente"
          >
            <SkipForward className="h-6 w-6 fill-current" />
          </button>
        </div>

        {/* Secondary controls: Volume & Speed & Add to Playlist */}
        <div className="flex items-center justify-between w-full pt-2 border-t border-white/5">
          {/* Volume */}
          <div className="flex items-center gap-2">
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
              className="w-20 h-1 accent-emerald-500 bg-white/10"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Speed */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-white/20"
              >
                <Gauge className="h-3 w-3 text-emerald-400" />
                <span>{playbackRate}x</span>
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-28 rounded-xl border border-white/10 bg-[#141b2d] p-1.5 shadow-2xl">
                  {speedOptions.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full rounded-lg px-2 py-1 text-left text-xs ${
                        playbackRate === rate ? 'bg-emerald-500 font-bold text-slate-950' : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Equalizer Button */}
            <button
              onClick={openEqualizerModal}
              className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-slate-300 hover:bg-white/20 transition"
              title="Ecualizador"
            >
              <Sliders className="h-3.5 w-3.5 text-emerald-400" />
              <span>EQ</span>
            </button>

            {/* Add to Playlist button */}
            {onOpenPlaylistModal && (
              <button
                onClick={onOpenPlaylistModal}
                className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-white/20 transition"
                title="Agregar a playlist"
              >
                <ListPlus className="h-3.5 w-3.5 text-emerald-400" />
                <span>Playlist</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
