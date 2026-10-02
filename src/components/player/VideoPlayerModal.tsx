import React, { useRef, useState, useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { formatDuration } from '../../utils/formatters';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  X,
  Gauge,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Music,
} from 'lucide-react';
import { extractYouTubeId, extractVimeoId } from '../../services/analyzer';

export const VideoPlayerModal: React.FC = () => {
  const {
    currentItem,
    currentBlobUrl,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    isVideoModalOpen,
    resumeNotice,
    togglePlayPause,
    seek,
    seekRelative,
    setVolume,
    toggleMute,
    setPlaybackRate,
    closeVideoModal,
    dismissResumeNotice,
    applyResumeNotice,
    togglePiP,
    registerVideoElement,
    reportVideoTimeUpdate,
  } = usePlayer();

  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Sync video ref with PlayerContext
  useEffect(() => {
    if (videoElementRef.current) {
      registerVideoElement(videoElementRef.current);
    }
    return () => {
      registerVideoElement(null);
    };
  }, [isVideoModalOpen, registerVideoElement]);

  // Auto-hide controls after 3.5s of inactivity while playing
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3500);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (!isVideoModalOpen || !currentItem) {
    return null;
  }

  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await videoContainerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen error:', e);
    }
  };

  const isDownloaded = !!(currentItem.isOffline || currentItem.hasLocalBlob);
  const isYouTubeOnline = currentItem.source === 'youtube' && !isDownloaded;
  const isVimeoOnline = currentItem.source === 'vimeo' && !isDownloaded;
  const ytId = isYouTubeOnline ? extractYouTubeId(currentItem.sourceUrl || currentItem.originalUrl) : null;
  const vimeoId = isVimeoOnline ? extractVimeoId(currentItem.sourceUrl || currentItem.originalUrl) : null;

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fade-in">
      <div
        ref={videoContainerRef}
        className="relative flex h-full w-full max-w-6xl flex-col justify-between overflow-hidden sm:h-[90vh] sm:rounded-2xl sm:border sm:border-white/10 sm:bg-black sm:shadow-2xl"
      >
        {/* Top Overlay Header */}
        <div
          className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <span
              className={`flex h-2.5 w-2.5 rounded-full ${
                isDownloaded ? 'bg-emerald-400' : 'bg-sky-400'
              }`}
            />
            <div className="min-w-0">
              <h3 className="truncate text-sm sm:text-base font-bold text-white">
                {currentItem.title}
              </h3>
              <p className="text-xs text-slate-400">
                {isDownloaded
                  ? '✓ Reproduciendo offline (IndexedDB local)'
                  : 'Transmitiendo en línea'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {document.pictureInPictureEnabled && !isYouTubeOnline && (
              <button
                onClick={togglePiP}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
                title="Picture in Picture (PiP)"
              >
                <PictureInPicture className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={closeVideoModal}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
              title="Cerrar reproductor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Video Canvas / Screen */}
        <div className="relative flex flex-1 items-center justify-center bg-black">
          {/* Section 13: Resume Playback Prompt Banner ("Continuar desde MM:SS") */}
          {resumeNotice && (
            <div className="absolute top-20 z-30 mx-4 max-w-md rounded-2xl border border-emerald-500/40 bg-[#0e1424]/95 p-4 shadow-2xl backdrop-blur-md animate-bounce-short">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    Continuar desde {resumeNotice.formatted}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ¿Deseas retomar la reproducción donde lo dejaste la última vez?
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        applyResumeNotice();
                        if (videoElementRef.current) {
                          videoElementRef.current.currentTime = resumeNotice.seconds;
                        }
                      }}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                    >
                      Continuar desde {resumeNotice.formatted}
                    </button>
                    <button
                      onClick={dismissResumeNotice}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/20 transition"
                    >
                      Desde el inicio
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audio Player Screen */}
          {currentItem.mediaType === 'audio' ? (
            <div className="flex flex-col items-center justify-center p-6 text-center space-y-5 max-w-md mx-auto my-auto animate-fade-in">
              {/* Album Art with Ambient Glow */}
              <div className="relative group">
                <div
                  className={`absolute -inset-4 rounded-full bg-gradient-to-tr from-emerald-500/30 to-indigo-500/30 blur-2xl transition-opacity duration-700 ${
                    isPlaying ? 'opacity-100 animate-pulse' : 'opacity-40'
                  }`}
                />
                <div
                  className={`relative h-44 w-44 sm:h-64 sm:w-64 rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-slate-900 transition-transform duration-500 ${
                    isPlaying ? 'scale-105' : 'scale-100'
                  }`}
                >
                  {currentItem.thumbnail ? (
                    <img
                      src={currentItem.thumbnail}
                      alt={currentItem.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-tr from-emerald-600 to-teal-900">
                      <Music className="h-20 w-20 text-white/80" />
                    </div>
                  )}
                </div>
              </div>

              {/* Track Info */}
              <div className="space-y-1.5 px-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
                  <Music className="h-3.5 w-3.5" />
                  <span>
                    {currentItem.format || 'AUDIO'} • {isDownloaded ? '✓ OFFLINE' : 'ONLINE'}
                  </span>
                </div>
                <h2 className="text-base sm:text-xl font-bold text-white line-clamp-2">
                  {currentItem.title}
                </h2>
                <p className="text-xs text-slate-400">
                  {currentItem.category?.toUpperCase() || 'MÚSICA'}
                </p>
              </div>

              {/* Visualizer wave bars animation when playing */}
              <div className="flex items-center gap-1.5 h-6">
                {[40, 70, 20, 90, 50, 80, 30, 60, 100, 45, 75, 25, 85].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full bg-emerald-400 transition-all duration-300 ${
                      isPlaying ? 'animate-bounce' : 'h-1.5 opacity-40'
                    }`}
                    style={{
                      height: isPlaying ? `${h}%` : '4px',
                      animationDelay: `${(i % 5) * 120}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : isYouTubeOnline && ytId ? (
            <div className="relative h-full w-full flex flex-col items-center justify-center">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&enablejsapi=1`}
                title={currentItem.title}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
              <div className="absolute bottom-2 left-4 right-4 flex items-center justify-between rounded-xl bg-black/80 px-3 py-1.5 text-[11px] text-amber-300 backdrop-blur-md">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Reproducción online oficial de YouTube.
                </span>
                <a
                  href={currentItem.sourceUrl || currentItem.originalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 underline text-white hover:text-emerald-400"
                >
                  Abrir enlace <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ) : isVimeoOnline && vimeoId ? (
            <div className="relative h-full w-full flex flex-col items-center justify-center">
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                title={currentItem.title}
                className="h-full w-full border-0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            /* HTML5 Video: Section 14 Reproducción offline desde IndexedDB */
            <video
              ref={videoElementRef}
              src={currentBlobUrl || undefined}
              className="h-full w-full object-contain cursor-pointer"
              playsInline
              onClick={togglePlayPause}
              onTimeUpdate={(e) => {
                const target = e.currentTarget;
                reportVideoTimeUpdate(target.currentTime, target.duration);
              }}
              onLoadedMetadata={(e) => {
                const target = e.currentTarget;
                target.playbackRate = playbackRate;
                target.volume = isMuted ? 0 : volume;
              }}
              onPlay={() => {}}
              onPause={() => {}}
              onEnded={() => {}}
              autoPlay
            />
          )}
        </div>

        {/* Bottom Custom Overlay Controls (for HTML5 video) */}
        {!isYouTubeOnline && !isVimeoOnline && (
          <div
            className={`absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Scrubber Range */}
            <div className="mb-3 flex items-center gap-3">
              <span className="font-mono text-xs font-medium text-slate-300 min-w-[40px]">
                {formatDuration(currentTime)}
              </span>

              <div className="relative flex-1 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    const sec = parseFloat(e.target.value);
                    seek(sec);
                    if (videoElementRef.current) {
                      videoElementRef.current.currentTime = sec;
                    }
                  }}
                  className="w-full h-1.5 cursor-pointer accent-emerald-500"
                />
              </div>

              <span className="font-mono text-xs font-medium text-slate-400 min-w-[40px] text-right">
                {formatDuration(duration || currentItem.duration)}
              </span>
            </div>

            {/* Bottom Row Controls */}
            <div className="flex items-center justify-between">
              {/* Left group */}
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={togglePlayPause}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 hover:bg-emerald-400 transition active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5 fill-current" />
                  ) : (
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Skip buttons (10 sec backward / forward) */}
                <button
                  onClick={() => {
                    seekRelative(-10);
                    if (videoElementRef.current) {
                      videoElementRef.current.currentTime = Math.max(0, videoElementRef.current.currentTime - 10);
                    }
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 transition"
                  title="Retroceder 10s"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                <button
                  onClick={() => {
                    seekRelative(10);
                    if (videoElementRef.current) {
                      videoElementRef.current.currentTime = Math.min(duration || 99999, videoElementRef.current.currentTime + 10);
                    }
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 transition"
                  title="Adelantar 10s"
                >
                  <RotateCw className="h-4 w-4" />
                </button>

                {/* Volume control */}
                <div className="hidden sm:flex items-center gap-2">
                  <button
                    onClick={toggleMute}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 transition"
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
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      if (videoElementRef.current) {
                        videoElementRef.current.volume = v;
                      }
                    }}
                    className="w-20 h-1 accent-emerald-500"
                  />
                </div>
              </div>

              {/* Right group: Speed & Fullscreen */}
              <div className="flex items-center gap-2">
                {/* Speed selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-white/20 transition"
                  >
                    <Gauge className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{playbackRate}x</span>
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-28 rounded-xl border border-white/10 bg-[#141b2d] p-1.5 shadow-2xl">
                      <div className="text-[10px] font-semibold text-slate-400 px-2 py-1">Velocidad</div>
                      {speedOptions.map((rate) => (
                        <button
                          key={rate}
                          onClick={() => {
                            setPlaybackRate(rate);
                            if (videoElementRef.current) {
                              videoElementRef.current.playbackRate = rate;
                            }
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

                <button
                  onClick={toggleFullscreen}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
                  title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
