import React, { useState } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { formatDuration } from '../../utils/formatters';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  X,
  Gauge,
  Music,
} from 'lucide-react';

export const MiniPlayer: React.FC = () => {
  const {
    currentItem,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    isLoading,
    togglePlayPause,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setPlaybackRate,
    playNext,
    playPrevious,
    openVideoModal,
  } = usePlayer();

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  if (!currentItem) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#0e1424]/95 backdrop-blur-2xl shadow-2xl transition-all">
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

      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Left: Media Info */}
        <div className="flex items-center gap-3 min-w-0 max-w-[45%] sm:max-w-xs">
          {/* Thumbnail / Disc */}
          <div
            onClick={() => currentItem.mediaType === 'video' && openVideoModal()}
            className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 border border-white/10 ${
              currentItem.mediaType === 'video' ? 'cursor-pointer hover:opacity-90' : ''
            }`}
          >
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
                className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0e1424]"
                title="Reproduciendo offline desde almacenamiento local"
              />
            )}
          </div>

          {/* Title & Artist */}
          <div className="min-w-0">
            <h4 className="truncate text-xs sm:text-sm font-semibold text-white">
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

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-1 sm:gap-3">
          {/* Skip -10s */}
          <button
            onClick={() => seekRelative(-10)}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition active:scale-95"
            title="Retroceder 10 segundos"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Prev */}
          <button
            onClick={playPrevious}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition active:scale-95"
            title="Anterior"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          {/* Play/Pause Main Button */}
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 transition active:scale-95 disabled:opacity-50"
            title={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={playNext}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5 hover:text-white transition active:scale-95"
            title="Siguiente"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Skip +10s */}
          <button
            onClick={() => seekRelative(10)}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition active:scale-95"
            title="Adelantar 10 segundos"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        {/* Right: Auxiliary Controls (Speed, Volume, Video Modal) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Speed button & popover */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-white/5 transition"
              title="Velocidad de reproducción"
            >
              <Gauge className="h-3.5 w-3.5 text-emerald-400" />
              <span>{playbackRate}x</span>
            </button>

            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-28 rounded-xl border border-white/10 bg-[#141b2d] p-1.5 shadow-xl">
                <div className="text-[10px] font-semibold text-slate-400 px-2 py-1">Velocidad</div>
                {speedOptions.map((rate) => (
                  <button
                    key={rate}
                    onClick={() => {
                      setPlaybackRate(rate);
                      setShowSpeedMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1 text-xs rounded-lg transition ${
                      playbackRate === rate
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume Control (Desktop) */}
          <div className="hidden lg:flex items-center gap-2 relative">
            <button
              onClick={toggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white transition"
              title={isMuted ? 'Activar sonido' : 'Silenciar'}
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
              className="w-18 h-1"
            />
          </div>

          {/* If video: Open Theater / Fullscreen Modal */}
          {currentItem.mediaType === 'video' && (
            <button
              onClick={openVideoModal}
              className="flex items-center gap-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition active:scale-95"
              title="Abrir reproductor de video"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver Video</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
