import React, { useState, useMemo } from 'react';
import { useMedia } from '../context/MediaContext';
import { usePlayer } from '../context/PlayerContext';
import { MediaItem } from '../types/media';
import { formatBytes, formatDuration } from '../utils/formatters';
import {
  Play,
  Pause,
  Shuffle,
  Music,
  Video,
  Download,
  Star,
  Clock,
  Search,
  PlusCircle,
  FolderSearch,
  Sparkles,
  ArrowRight,
  Trash2,
  Share2,
  CheckCircle2,
  ExternalLink,
  Volume2,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenAddModal: () => void;
  onOpenFolderScanModal?: () => void;
  onNavigateToLibrary: () => void;
  onNavigateToDownloads: () => void;
  onNavigateToStorage: () => void;
}

type PortalFilter = 'all' | 'music' | 'videos' | 'favorites' | 'recent';

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenAddModal,
  onOpenFolderScanModal,
  onNavigateToLibrary,
  onNavigateToDownloads,
}) => {
  const { mediaItems, downloadTasks, toggleFavorite, deleteItem, loadSampleData } = useMedia();
  const { playItem, currentItem, isPlaying, togglePlayPause, openVideoModal } = usePlayer();

  const [activeFilter, setActiveFilter] = useState<PortalFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Active downloads notification banner
  const activeDownloads = downloadTasks.filter(
    (t) => t.status === 'downloading' || t.status === 'preparing'
  );

  // All downloaded / library audio items (Music)
  const allMusic = useMemo(() => {
    return mediaItems.filter(
      (m) => m.mediaType === 'audio' || m.category === 'musica'
    );
  }, [mediaItems]);

  // All downloaded / library video items
  const allVideos = useMemo(() => {
    return mediaItems.filter(
      (m) => m.mediaType === 'video' || m.category === 'videos'
    );
  }, [mediaItems]);

  // Filtered lists based on search & active filter
  const filteredMusic = useMemo(() => {
    let list = allMusic;
    if (activeFilter === 'favorites') {
      list = list.filter((m) => m.favorite);
    } else if (activeFilter === 'recent') {
      list = list.filter((m) => m.lastPlayedAt && m.lastPlayedAt > 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.metadata?.artist?.toLowerCase().includes(q) ||
          m.metadata?.channel?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allMusic, activeFilter, searchQuery]);

  const filteredVideos = useMemo(() => {
    let list = allVideos;
    if (activeFilter === 'favorites') {
      list = list.filter((m) => m.favorite);
    } else if (activeFilter === 'recent') {
      list = list.filter((m) => m.lastPlayedAt && m.lastPlayedAt > 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.metadata?.channel?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allVideos, activeFilter, searchQuery]);

  // Play All Music in sequence
  const handlePlayAll = () => {
    if (filteredMusic.length > 0) {
      playItem(filteredMusic[0], filteredMusic);
    } else if (allMusic.length > 0) {
      playItem(allMusic[0], allMusic);
    }
  };

  // Shuffle Play
  const handleShuffle = () => {
    const list = filteredMusic.length > 0 ? [...filteredMusic] : [...allMusic];
    if (list.length === 0) return;
    // Fisher-Yates shuffle
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    playItem(list[0], list);
  };

  // Share track
  const handleShare = async (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const url = item.sourceUrl || item.originalUrl;
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({ title: item.title, url: url.startsWith('http') ? url : undefined });
      } else if (url && url.startsWith('http')) {
        await navigator.clipboard.writeText(url);
        alert('Enlace copiado al portapapeles');
      }
    } catch {}
  };

  const showMusicSection = activeFilter === 'all' || activeFilter === 'music' || activeFilter === 'favorites' || activeFilter === 'recent';
  const showVideoSection = activeFilter === 'all' || activeFilter === 'videos' || activeFilter === 'favorites' || activeFilter === 'recent';
  const totalItemsCount = mediaItems.length;

  return (
    <div className="space-y-6 pb-28 sm:pb-20 animate-fade-in max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. MUSIC PLAYER HERO & CONTROL BAR
          ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#12192c] via-[#0d1322] to-[#090d16] p-5 sm:p-7 shadow-2xl">
        {/* Subtle background glow */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Left: Music App Branding & Stats */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Reproductor Offline</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Mi Música y Videos
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {allMusic.length} canciones • {allVideos.length} videos listos para reproducir sin conexión
            </p>
          </div>

          {/* Right: Primary Playback Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {allMusic.length > 0 && (
              <>
                <button
                  onClick={handlePlayAll}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-300 transition active:scale-95"
                >
                  <Play className="h-4 w-4 fill-slate-950" />
                  <span>Reproducir Todo</span>
                </button>

                <button
                  onClick={handleShuffle}
                  className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-white/10 transition active:scale-95"
                  title="Reproducción aleatoria"
                >
                  <Shuffle className="h-4 w-4 text-emerald-400" />
                  <span className="hidden sm:inline">Aleatorio</span>
                </button>
              </>
            )}

            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 transition active:scale-95"
            >
              <PlusCircle className="h-4 w-4 text-emerald-400" />
              <span>+ Descargar / Agregar</span>
            </button>

            {onOpenFolderScanModal && (
              <button
                onClick={onOpenFolderScanModal}
                className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-white/10 transition active:scale-95"
                title="Escanear carpeta de música local"
              >
                <FolderSearch className="h-4 w-4 text-slate-300" />
                <span className="hidden sm:inline">Escanear Carpeta</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar + Quick Filter Chips */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar canción, video o artista..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveFilter('all')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Todo ({totalItemsCount})
            </button>

            <button
              onClick={() => setActiveFilter('music')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === 'music'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Music className="h-3.5 w-3.5" />
              <span>Música ({allMusic.length})</span>
            </button>

            <button
              onClick={() => setActiveFilter('videos')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === 'videos'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              <span>Videos ({allVideos.length})</span>
            </button>

            <button
              onClick={() => setActiveFilter('favorites')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === 'favorites'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Star className="h-3.5 w-3.5" />
              <span>Favoritos</span>
            </button>

            <button
              onClick={() => setActiveFilter('recent')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === 'recent'
                  ? 'bg-indigo-400 text-slate-950 font-bold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Recientes</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. ACTIVE DOWNLOADS BANNER (only when downloading)
          ───────────────────────────────────────────────────────────── */}
      {activeDownloads.length > 0 && (
        <div
          onClick={onNavigateToDownloads}
          className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-500/20 via-indigo-600/10 to-transparent p-4 cursor-pointer hover:border-indigo-500/60 transition shadow-lg"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-500/30">
              <Download className="h-5 w-5 animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                  Descargando {activeDownloads.length} archivo(s)...
                </h4>
                <span className="rounded-full bg-indigo-500/40 px-2 py-0.5 text-[10px] font-bold text-indigo-200">
                  {activeDownloads[0].progressPercent > 0 ? `${activeDownloads[0].progressPercent}%` : 'Iniciando'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {activeDownloads[0].title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-indigo-300 shrink-0">
            <span>Ver progreso</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. EMPTY STATE (when no media yet)
          ───────────────────────────────────────────────────────────── */}
      {totalItemsCount === 0 && (
        <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-8 sm:p-12 text-center max-w-xl mx-auto">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-400/20 text-emerald-400 mb-4 shadow-xl">
            <Music className="h-8 w-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white">
            Tu reproductor está listo
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
            Descarga tus canciones y videos favoritos de YouTube o importa archivos desde tu celular para escucharlos sin internet.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs sm:text-sm font-bold text-slate-950 hover:bg-emerald-400 transition active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Descargar o Importar</span>
            </button>
            <button
              onClick={loadSampleData}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-white/10 transition active:scale-95"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Cargar demos de prueba</span>
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. SECCIÓN DE MÚSICA (TRACKLIST - ESTILO REPRODUCTOR)
          ───────────────────────────────────────────────────────────── */}
      {showMusicSection && filteredMusic.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Music className="h-4 w-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Música ({filteredMusic.length})
              </h2>
            </div>
            {filteredMusic.length > 1 && (
              <button
                onClick={handlePlayAll}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Reproducir toda la música</span>
              </button>
            )}
          </div>

          {/* Tracklist table style */}
          <div className="rounded-2xl border border-white/5 bg-[#0b0f19] divide-y divide-white/5 overflow-hidden shadow-xl">
            {filteredMusic.map((item, index) => {
              const isCurrentPlaying = currentItem?.id === item.id && isPlaying;
              const isCurrent = currentItem?.id === item.id;
              const hasOfflineBlob = !!(item.isOffline || item.hasLocalBlob);

              return (
                <div
                  key={item.id}
                  onClick={() => playItem(item, filteredMusic)}
                  className={`group flex items-center justify-between gap-3 p-3 transition cursor-pointer select-none ${
                    isCurrent
                      ? 'bg-emerald-500/10'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Left: Track # + Album Art / Thumbnail + Title & Artist */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Track Number / Play Indicator */}
                    <div className="flex h-8 w-6 shrink-0 items-center justify-center text-xs font-mono text-slate-500">
                      {isCurrentPlaying ? (
                        <div className="flex items-end gap-0.5 h-3.5">
                          <span className="w-1 bg-emerald-400 animate-[bounce_1s_infinite_100ms] h-full rounded-full" />
                          <span className="w-1 bg-emerald-400 animate-[bounce_1s_infinite_300ms] h-2/3 rounded-full" />
                          <span className="w-1 bg-emerald-400 animate-[bounce_1s_infinite_200ms] h-4/5 rounded-full" />
                        </div>
                      ) : (
                        <span className="group-hover:hidden">{index + 1}</span>
                      )}
                      {!isCurrentPlaying && (
                        <Play className="h-3.5 w-3.5 fill-slate-300 text-slate-300 hidden group-hover:block ml-0.5" />
                      )}
                    </div>

                    {/* Album Art / Cover Thumbnail */}
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 border border-white/10 shadow-sm">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-emerald-600/30 to-indigo-600/30">
                          <Music className="h-5 w-5 text-emerald-400" />
                        </div>
                      )}
                      {/* Play overlay on image */}
                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
                          isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isCurrentPlaying ? (
                          <Pause className="h-4 w-4 fill-white text-white" />
                        ) : (
                          <Play className="h-4 w-4 fill-white text-white ml-0.5" />
                        )}
                      </div>
                    </div>

                    {/* Song Title and Artist */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`truncate text-xs sm:text-sm font-semibold transition-colors ${
                            isCurrent ? 'text-emerald-400 font-bold' : 'text-white group-hover:text-emerald-300'
                          }`}
                        >
                          {item.title}
                        </h4>
                        {hasOfflineBlob && (
                          <span
                            className="hidden sm:inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300"
                            title="Descargado offline"
                          >
                            ✓ OFFLINE
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-slate-400 mt-0.5">
                        {item.metadata?.artist || item.metadata?.channel || 'Audio Vault'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Format tag + Duration + Favorite Star + Menu */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Format Pill */}
                    <span className="hidden md:inline-block rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-slate-300 uppercase">
                      {item.format || (item.mimeType.includes('mpeg') || item.mimeType.includes('mp3') ? 'MP3' : 'M4A')}
                    </span>

                    {/* Duration */}
                    {item.duration > 0 && (
                      <span className="text-xs font-mono text-slate-400 w-12 text-right">
                        {formatDuration(item.duration)}
                      </span>
                    )}

                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                        item.favorite
                          ? 'text-amber-400'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                      }`}
                      title={item.favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    >
                      <Star className={`h-4 w-4 ${item.favorite ? 'fill-current' : ''}`} />
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={(e) => handleShare(item, e)}
                      className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition"
                      title="Compartir"
                    >
                      <Share2 className="h-4 w-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar "${item.title}"?`)) {
                          deleteItem(item.id, false);
                        }
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Eliminar de la biblioteca"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. SECCIÓN DE VIDEOS DESCARGADOS (VIDEO CARDS GRID)
          ───────────────────────────────────────────────────────────── */}
      {showVideoSection && filteredVideos.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                <Video className="h-4 w-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Videos Descargados ({filteredVideos.length})
              </h2>
            </div>
            <button
              onClick={onNavigateToLibrary}
              className="text-xs font-semibold text-indigo-400 hover:underline"
            >
              Ver todos ({allVideos.length})
            </button>
          </div>

          {/* Video Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVideos.map((video) => {
              const isCurrentPlaying = currentItem?.id === video.id && isPlaying;
              const hasOfflineBlob = !!(video.isOffline || video.hasLocalBlob);

              return (
                <div
                  key={video.id}
                  onClick={() => {
                    playItem(video, filteredVideos);
                    openVideoModal();
                  }}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1422] hover:border-indigo-500/40 hover:bg-[#131a2b] transition-all cursor-pointer shadow-lg"
                >
                  {/* Video Thumbnail (16:9) */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-800">
                        <Video className="h-8 w-8 text-indigo-400" />
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                    {/* Center Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/90 text-white shadow-xl backdrop-blur-md group-hover:scale-110 group-active:scale-95 transition-transform">
                        <Play className="h-5 w-5 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Duration badge */}
                    {video.duration > 0 && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-mono font-bold text-white backdrop-blur-md">
                        {formatDuration(video.duration)}
                      </span>
                    )}

                    {/* Offline badge */}
                    {hasOfflineBlob && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[9px] font-bold text-slate-950 shadow-md">
                        ✓ OFFLINE
                      </span>
                    )}

                    {/* Resolution / Quality Tag */}
                    <span className="absolute top-2 right-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-slate-300 backdrop-blur-sm uppercase">
                      {video.quality || video.format || 'MP4'}
                    </span>
                  </div>

                  {/* Video Info */}
                  <div className="flex flex-1 flex-col justify-between p-3.5">
                    <div>
                      <h4 className="line-clamp-2 text-xs sm:text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {video.title}
                      </h4>
                      <p className="mt-1 truncate text-[11px] text-slate-400">
                        {video.metadata?.channel || 'Video Vault'}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] font-mono text-slate-400">
                        {video.size > 0 ? formatBytes(video.size) : ''}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleFavorite(video.id)}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                            video.favorite ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Favorito"
                        >
                          <Star className={`h-3.5 w-3.5 ${video.favorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => handleShare(video, e)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white transition"
                          title="Compartir"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar "${video.title}"?`)) {
                              deleteItem(video.id, false);
                            }
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* No results for current filter */}
      {totalItemsCount > 0 && filteredMusic.length === 0 && filteredVideos.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center">
          <p className="text-xs text-slate-400">
            No se encontraron elementos con el filtro o búsqueda seleccionada.
          </p>
          <button
            onClick={() => {
              setActiveFilter('all');
              setSearchQuery('');
            }}
            className="mt-3 text-xs font-semibold text-emerald-400 hover:underline"
          >
            Mostrar toda la biblioteca
          </button>
        </div>
      )}
    </div>
  );
};
