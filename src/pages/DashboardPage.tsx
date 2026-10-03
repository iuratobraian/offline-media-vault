import React, { useState, useMemo, useEffect } from 'react';
import { useMedia } from '../context/MediaContext';
import { usePlayer } from '../context/PlayerContext';
import { MediaItem, MediaFormatOption } from '../types/media';
import { formatBytes, formatDuration } from '../utils/formatters';
import { youTubeProvider } from '../services/providers/YouTubeProvider';
import { getAllPlaylists } from '../database/db';
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
  Plus,
  FolderSearch,
  Sparkles,
  ArrowRight,
  Trash2,
  Share2,
  CheckCircle2,
  LayoutGrid,
  List,
  ListPlus,
  ListMusic,
  ExternalLink,
  SlidersHorizontal,
  X,
  Loader2,
} from 'lucide-react';
import { getBackendBaseUrl } from '../services/providers/YouTubeProvider';

interface DashboardPageProps {
  onOpenAddModal: () => void;
  onOpenFolderScanModal?: () => void;
  onOpenPlaylistModal?: (item?: MediaItem) => void;
  onOpenOnboardingModal?: () => void;
  onNavigateToLibrary: () => void;
  onNavigateToDownloads: () => void;
  onNavigateToStorage: () => void;
}

type PortalFilter = 'all' | 'music' | 'videos' | 'favorites' | 'recent' | 'playlists';

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenAddModal,
  onOpenFolderScanModal,
  onOpenPlaylistModal,
  onOpenOnboardingModal,
  onNavigateToLibrary,
  onNavigateToDownloads,
}) => {
  const { mediaItems, downloadTasks, toggleFavorite, deleteItem, loadSampleData, addMedia, startDownload } = useMedia();
  const { playItem, currentItem, isPlaying, openVideoModal } = usePlayer();

  const [activeFilter, setActiveFilter] = useState<PortalFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('sharemusic_view_mode') as 'list' | 'grid') || 'list';
  });

  const [playlists, setPlaylists] = useState<any[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);

  // YouTube online search results from main search bar
  const [youtubeSearchResults, setYoutubeSearchResults] = useState<Array<{ id: string; title: string; duration: number; thumbnail: string; url: string; channel?: string }>>([]);
  const [isSearchingYouTube, setIsSearchingYouTube] = useState(false);

  // Suggested music based on user's musical interests
  const [suggestedTracks, setSuggestedTracks] = useState<Array<{ id: string; title: string; duration: number; thumbnail: string; url: string }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);

  // Load playlists & user interests
  useEffect(() => {
    getAllPlaylists().then((list) => setPlaylists(list));

    try {
      const saved = localStorage.getItem('sharemusic_interests');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUserInterests(parsed);
          loadInterestSuggestions(parsed[0]);
        }
      }
    } catch {}
  }, []);

  const loadInterestSuggestions = async (term: string) => {
    if (!term) return;
    setLoadingSuggestions(true);
    try {
      const results = await youTubeProvider.search(term, 8);
      setSuggestedTracks(results);
    } catch {
      setSuggestedTracks([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // YouTube online search with automatic debounce from the search bar
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setYoutubeSearchResults([]);
      setIsSearchingYouTube(false);
      return;
    }

    setIsSearchingYouTube(true);
    const timer = setTimeout(async () => {
      try {
        const results = await youTubeProvider.search(q, 8);
        setYoutubeSearchResults(results);
      } catch {
        setYoutubeSearchResults([]);
      } finally {
        setIsSearchingYouTube(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggleViewMode = () => {
    const next = viewMode === 'list' ? 'grid' : 'list';
    setViewMode(next);
    localStorage.setItem('sharemusic_view_mode', next);
  };

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
    } else if (activeFilter === 'playlists' && selectedPlaylistId) {
      const pl = playlists.find((p) => p.id === selectedPlaylistId);
      if (pl) {
        list = list.filter((m) => pl.itemIds.includes(m.id));
      }
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
  }, [allMusic, activeFilter, searchQuery, selectedPlaylistId, playlists]);

  const filteredVideos = useMemo(() => {
    let list = allVideos;
    if (activeFilter === 'favorites') {
      list = list.filter((m) => m.favorite);
    } else if (activeFilter === 'recent') {
      list = list.filter((m) => m.lastPlayedAt && m.lastPlayedAt > 0);
    } else if (activeFilter === 'playlists' && selectedPlaylistId) {
      const pl = playlists.find((p) => p.id === selectedPlaylistId);
      if (pl) {
        list = list.filter((m) => pl.itemIds.includes(m.id));
      }
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
  }, [allVideos, activeFilter, searchQuery, selectedPlaylistId, playlists]);

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
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    playItem(list[0], list);
  };

  // Play YouTube online video (in-place playback directly in player)
  const handlePlayOnlineVideo = (video: { id: string; title: string; duration: number; thumbnail: string; url: string }) => {
    const canonicalUrl = `https://www.youtube.com/watch?v=${video.id}`;
    const mediaItem: MediaItem = {
      id: `yt_online_${video.id}`,
      title: video.title,
      thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
      duration: video.duration || 0,
      sourceUrl: canonicalUrl,
      originalUrl: canonicalUrl,
      provider: 'youtube',
      source: 'youtube',
      mediaType: 'video',
      mimeType: 'video/mp4',
      format: 'Online',
      quality: 'YouTube HD',
      size: 0,
      fileSize: 0,
      fileName: `${video.title}.mp4`,
      hasLocalBlob: false,
      isOffline: false,
      category: 'videos',
      tags: ['#youtube', '#online'],
      favorite: false,
      downloadStatus: 'not_downloaded',
      createdAt: Date.now(),
      progress: 0,
      canDownload: true,
      canStreamOffline: false,
      requiresOnlinePlayback: true,
    };
    playItem(mediaItem);
  };

  // Play YouTube online audio (direct stream proxy for background/miniplayer)
  const handlePlayOnlineAudio = (video: { id: string; title: string; duration: number; thumbnail: string; url: string }) => {
    const canonicalUrl = `https://www.youtube.com/watch?v=${video.id}`;
    const baseUrl = getBackendBaseUrl();
    const streamUrl = `${baseUrl}/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=audio_m4a&inline=true`;

    const mediaItem: MediaItem = {
      id: `yt_online_audio_${video.id}`,
      title: video.title,
      thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
      duration: video.duration || 0,
      sourceUrl: streamUrl,
      originalUrl: canonicalUrl,
      provider: 'youtube',
      source: 'youtube',
      mediaType: 'audio',
      mimeType: 'audio/mp4',
      format: 'M4A',
      quality: 'Online Audio',
      size: 0,
      fileSize: 0,
      fileName: `${video.title}.m4a`,
      hasLocalBlob: false,
      isOffline: false,
      category: 'musica',
      tags: ['#youtube', '#audio'],
      favorite: false,
      downloadStatus: 'not_downloaded',
      createdAt: Date.now(),
      progress: 0,
      canDownload: true,
      canStreamOffline: false,
      requiresOnlinePlayback: true,
    };
    playItem(mediaItem);
  };

  // Quick download an online YouTube video or audio
  const handleDownloadOnlineItem = async (
    video: { id: string; title: string; duration: number; thumbnail: string; url: string },
    type: 'audio' | 'video' = 'audio'
  ) => {
    const canonicalUrl = `https://www.youtube.com/watch?v=${video.id}`;
    const formatKey = type === 'audio' ? 'audio_mp3' : 'video_720p';
    const baseUrl = getBackendBaseUrl();
    const streamUrl = `${baseUrl}/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=${formatKey}&title=${encodeURIComponent(video.title)}`;

    const formatOption: MediaFormatOption = {
      id: type === 'audio' ? 'yt_audio_mp3' : 'yt_video_720p',
      type,
      label: type === 'audio' ? 'MP3 Alta Calidad' : '720p HD MP4',
      quality: type === 'audio' ? '320 kbps' : '720p',
      format: type === 'audio' ? 'MP3' : 'MP4',
      ext: type === 'audio' ? '.mp3' : '.mp4',
      mimeType: type === 'audio' ? 'audio/mpeg' : 'video/mp4',
      url: streamUrl,
      supportsRangeRequests: true,
    };

    const mediaItem: MediaItem = {
      id: `yt_${video.id}`,
      title: video.title,
      thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
      duration: video.duration || 0,
      sourceUrl: canonicalUrl,
      originalUrl: canonicalUrl,
      provider: 'youtube',
      source: 'youtube',
      mediaType: type,
      mimeType: type === 'audio' ? 'audio/mpeg' : 'video/mp4',
      format: type === 'audio' ? 'MP3' : 'MP4',
      quality: type === 'audio' ? '320 kbps' : '720p',
      size: 0,
      fileSize: 0,
      fileName: `${video.title.replace(/[/\\?%*:|"<>]/g, '_')}.${type === 'audio' ? 'mp3' : 'mp4'}`,
      hasLocalBlob: false,
      isOffline: false,
      category: type === 'audio' ? 'musica' : 'videos',
      tags: ['#youtube', type === 'audio' ? '#musica' : '#videos'],
      favorite: false,
      downloadStatus: 'preparing',
      createdAt: Date.now(),
      progress: 0,
      canDownload: true,
      canStreamOffline: false,
      requiresOnlinePlayback: false,
      explanation: `Descargando ${type === 'audio' ? 'música' : 'video'}...`,
    };

    await addMedia(mediaItem);
    startDownload(mediaItem, formatOption);
  };

  // Play suggested track online (opens video player so user can watch it immediately)
  const handlePlaySuggestedOnline = (suggested: { id: string; title: string; duration: number; thumbnail: string; url: string }) => {
    handlePlayOnlineVideo(suggested);
  };

  const handleDownloadSuggested = async (suggested: { id: string; title: string; duration: number; thumbnail: string; url: string }) => {
    await handleDownloadOnlineItem(suggested, 'audio');
  };

  const showMusicSection = activeFilter === 'all' || activeFilter === 'music' || activeFilter === 'favorites' || activeFilter === 'recent' || activeFilter === 'playlists';
  const showVideoSection = activeFilter === 'all' || activeFilter === 'videos' || activeFilter === 'favorites' || activeFilter === 'recent';
  const totalItemsCount = mediaItems.length;

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 sm:pb-20 animate-fade-in max-w-7xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          1. SLEEK MUSIC HERO & CONTROL BAR
          ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#101626] via-[#0d1322] to-[#070b14] p-4 sm:p-6 shadow-2xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left: App Title & Track Count */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Mi Música y Videos</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Offline
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {allMusic.length} canciones • {allVideos.length} videos disponibles
            </p>
          </div>

          {/* Right: Actions - Simplified */}
          <div className="flex items-center gap-2">
            {allMusic.length > 0 && (
              <>
                <button
                  onClick={handlePlayAll}
                  className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 hover:from-emerald-400 transition active:scale-95"
                >
                  <Play className="h-4 w-4 fill-slate-950" />
                  <span>Reproducir</span>
                </button>

                <button
                  onClick={handleShuffle}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 transition active:scale-95"
                  title="Aleatorio"
                >
                  <Shuffle className="h-4 w-4 text-emerald-400" />
                </button>
              </>
            )}

            {/* View Mode Toggle Button (Grid / List) */}
            <button
              onClick={handleToggleViewMode}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 transition active:scale-95"
              title={viewMode === 'list' ? 'Cambiar a vista de carátulas' : 'Cambiar a vista de lista'}
            >
              {viewMode === 'list' ? (
                <LayoutGrid className="h-4 w-4 text-indigo-400" />
              ) : (
                <List className="h-4 w-4 text-emerald-400" />
              )}
            </button>

            {/* Playlists Button */}
            {onOpenPlaylistModal && (
              <button
                onClick={() => onOpenPlaylistModal()}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 transition active:scale-95"
                title="Mis Playlists"
              >
                <ListMusic className="h-4 w-4 text-amber-400" />
              </button>
            )}

            {/* Simplified Add Button: JUST '+' as requested */}
            <button
              onClick={onOpenAddModal}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black shadow-md shadow-emerald-500/20 active:scale-95 transition"
              title="Descargar o agregar contenido"
            >
              <Plus className="h-5 w-5 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Search Bar + Filter Pills */}
        <div className="relative z-10 mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en biblioteca o en YouTube..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-1.5 pl-9 pr-8 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                title="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => { setActiveFilter('all'); setSelectedPlaylistId(null); }}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === 'all'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Todo ({totalItemsCount})
            </button>

            <button
              onClick={() => { setActiveFilter('music'); setSelectedPlaylistId(null); }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === 'music'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Music className="h-3 w-3" />
              <span>Música ({allMusic.length})</span>
            </button>

            <button
              onClick={() => { setActiveFilter('videos'); setSelectedPlaylistId(null); }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === 'videos'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Video className="h-3 w-3" />
              <span>Videos ({allVideos.length})</span>
            </button>

            <button
              onClick={() => { setActiveFilter('favorites'); setSelectedPlaylistId(null); }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                activeFilter === 'favorites'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Star className="h-3 w-3" />
              <span>Favoritos</span>
            </button>

            {playlists.length > 0 && (
              <button
                onClick={() => {
                  setActiveFilter('playlists');
                  if (!selectedPlaylistId && playlists.length > 0) {
                    setSelectedPlaylistId(playlists[0].id);
                  }
                }}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                  activeFilter === 'playlists'
                    ? 'bg-indigo-500 text-white font-bold'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <ListMusic className="h-3 w-3" />
                <span>Playlists ({playlists.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* If filtering by playlists: show playlist chips */}
        {activeFilter === 'playlists' && playlists.length > 0 && (
          <div className="pt-3 border-t border-white/5 flex items-center gap-2 overflow-x-auto">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => setSelectedPlaylistId(pl.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  selectedPlaylistId === pl.id
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-white/10 text-slate-300 hover:bg-white/15'
                }`}
              >
                {pl.name} ({pl.itemIds.length})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. ACTIVE DOWNLOADS BANNER
          ───────────────────────────────────────────────────────────── */}
      {activeDownloads.length > 0 && (
        <div
          onClick={onNavigateToDownloads}
          className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-500/20 via-indigo-600/10 to-transparent p-3.5 cursor-pointer hover:border-indigo-500/60 transition shadow-lg"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-md">
              <Download className="h-4 w-4 animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white truncate">
                  Descargando {activeDownloads.length} archivo(s)...
                </h4>
                <span className="rounded-full bg-indigo-500/40 px-2 py-0.2 text-[9px] font-bold text-indigo-200">
                  {activeDownloads[0].progressPercent > 0 ? `${activeDownloads[0].progressPercent}%` : 'Iniciando'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {activeDownloads[0].title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-indigo-300 shrink-0">
            <span>Ver</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          YOUTUBE ONLINE SEARCH RESULTS (EN EL BUSCADOR)
          ───────────────────────────────────────────────────────────── */}
      {searchQuery.trim().length >= 2 && (
        <section className="space-y-3 rounded-3xl border border-red-500/25 bg-gradient-to-b from-red-500/10 via-[#0e1424] to-[#070b14] p-4 sm:p-5 shadow-2xl animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-600 text-white shadow-md">
                <Video className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Videos en YouTube</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                    En línea
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isSearchingYouTube
                    ? 'Buscando videos en YouTube...'
                    : youtubeSearchResults.length > 0
                    ? `Encontrados ${youtubeSearchResults.length} videos listos para ver o descargar`
                    : 'Buscando en YouTube...'}
                </p>
              </div>
            </div>

            {isSearchingYouTube && (
              <Loader2 className="h-5 w-5 animate-spin text-red-400" />
            )}
          </div>

          {youtubeSearchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {youtubeSearchResults.map((video) => (
                <div
                  key={video.id}
                  className="group flex flex-col rounded-2xl border border-white/10 bg-[#0a0f1d] p-2.5 hover:border-red-500/40 hover:bg-[#0e1424] transition shadow-lg"
                >
                  <div
                    onClick={() => handlePlayOnlineVideo(video)}
                    className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 cursor-pointer"
                  >
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {video.duration > 0 && (
                      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                        {formatDuration(video.duration)}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600/90 text-white shadow-xl group-hover:scale-110 active:scale-95 transition">
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex-1 min-w-0">
                    <h4
                      onClick={() => handlePlayOnlineVideo(video)}
                      className="line-clamp-2 text-xs font-bold text-white group-hover:text-red-300 transition cursor-pointer"
                      title={video.title}
                    >
                      {video.title}
                    </h4>
                    {video.channel && (
                      <p className="mt-0.5 text-[11px] text-slate-400 truncate">{video.channel}</p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center gap-1.5">
                    <button
                      onClick={() => handlePlayOnlineVideo(video)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 py-1.5 text-xs font-semibold transition active:scale-95"
                      title="Ver video ahora"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Ver video</span>
                    </button>
                    <button
                      onClick={() => handlePlayOnlineAudio(video)}
                      className="flex items-center justify-center gap-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 px-2 py-1.5 text-xs font-semibold transition active:scale-95"
                      title="Escuchar audio"
                    >
                      <Music className="h-3 w-3" />
                      <span>Audio</span>
                    </button>
                    <button
                      onClick={() => handleDownloadOnlineItem(video, 'video')}
                      className="flex items-center justify-center rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2.5 py-1.5 text-xs font-semibold transition active:scale-95"
                      title="Descargar offline"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : !isSearchingYouTube ? (
            <div className="text-center py-4 text-xs text-slate-400">
              No se encontraron videos para "{searchQuery}".
            </div>
          ) : null}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. RECOMENDADO PARA TI (SEGÚN TUS GUSTOS MUSICALES)
          ───────────────────────────────────────────────────────────── */}
      {userInterests.length > 0 && suggestedTracks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Sugerencias para ti
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Interest filter tags */}
              <div className="hidden sm:flex items-center gap-1">
                {userInterests.slice(0, 3).map((term) => (
                  <button
                    key={term}
                    onClick={() => loadInterestSuggestions(term)}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-white/5 border border-white/10 text-slate-300 hover:text-white"
                  >
                    {term}
                  </button>
                ))}
              </div>

              {onOpenOnboardingModal && (
                <button
                  onClick={onOpenOnboardingModal}
                  className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>Mis gustos</span>
                </button>
              )}
            </div>
          </div>

          {/* Suggested items carousel/grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {suggestedTracks.map((tr) => (
              <div
                key={tr.id}
                className="group relative flex flex-col rounded-2xl border border-white/5 bg-[#0b0f19] p-2 hover:border-emerald-500/40 hover:bg-[#0e1424] transition overflow-hidden"
              >
                {/* Thumbnail with direct Play Video */}
                <div
                  onClick={() => handlePlayOnlineVideo(tr)}
                  className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-800 cursor-pointer"
                >
                  <img
                    src={tr.thumbnail}
                    alt={tr.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Play overlay button */}
                  <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-xl group-hover:scale-110 active:scale-95 transition">
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                <h4
                  onClick={() => handlePlayOnlineVideo(tr)}
                  className="mt-2 line-clamp-1 text-xs font-semibold text-white group-hover:text-emerald-300 transition cursor-pointer"
                  title={tr.title}
                >
                  {tr.title}
                </h4>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                  <button
                    onClick={() => handlePlayOnlineAudio(tr)}
                    className="flex items-center gap-0.5 rounded-md bg-white/5 hover:bg-white/10 px-1.5 py-0.5 text-slate-300 hover:text-white transition"
                    title="Escuchar audio en segundo plano"
                  >
                    <Music className="h-3 w-3 text-indigo-400" />
                    <span>Audio</span>
                  </button>
                  <button
                    onClick={() => handleDownloadSuggested(tr)}
                    className="flex items-center gap-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 px-1.5 py-0.5 text-emerald-400 font-semibold transition"
                    title="Descargar offline"
                  >
                    <Download className="h-3 w-3" />
                    <span>Bajar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. SECCIÓN DE MÚSICA (VISTA DE LISTA O VISTA DE CARÁTULAS)
          ───────────────────────────────────────────────────────────── */}
      {showMusicSection && filteredMusic.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Music className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Música ({filteredMusic.length})
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleViewMode}
                className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center gap-1"
              >
                {viewMode === 'list' ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{viewMode === 'list' ? 'Ver carátulas' : 'Ver lista'}</span>
              </button>
            </div>
          </div>

          {/* VISTA 1: LISTA DETALLADA (TRACKLIST) */}
          {viewMode === 'list' ? (
            <div className="rounded-2xl border border-white/5 bg-[#0b0f19] divide-y divide-white/5 overflow-hidden shadow-xl">
              {filteredMusic.map((item, index) => {
                const isCurrentPlaying = currentItem?.id === item.id && isPlaying;
                const isCurrent = currentItem?.id === item.id;
                const hasOfflineBlob = !!(item.isOffline || item.hasLocalBlob);

                return (
                  <div
                    key={item.id}
                    onClick={() => playItem(item, filteredMusic)}
                    className={`group flex items-center justify-between gap-3 p-2.5 sm:p-3 transition cursor-pointer select-none ${
                      isCurrent ? 'bg-emerald-500/10' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Track Number */}
                      <div className="flex h-7 w-5 shrink-0 items-center justify-center text-xs font-mono text-slate-500">
                        {isCurrentPlaying ? (
                          <div className="flex items-end gap-0.5 h-3">
                            <span className="w-1 bg-emerald-400 animate-pulse h-full rounded-full" />
                            <span className="w-1 bg-emerald-400 animate-pulse h-2/3 rounded-full" />
                          </div>
                        ) : (
                          <span className="group-hover:hidden">{index + 1}</span>
                        )}
                        {!isCurrentPlaying && (
                          <Play className="h-3.5 w-3.5 fill-slate-300 text-slate-300 hidden group-hover:block ml-0.5" />
                        )}
                      </div>

                      {/* Cover Art */}
                      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 border border-white/10 shadow-sm">
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
                      </div>

                      {/* Title & Artist */}
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
                            <span className="hidden sm:inline-flex shrink-0 items-center rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-300">
                              ✓ OFFLINE
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-slate-400 mt-0.5">
                          {item.metadata?.artist || item.metadata?.channel || 'sharemusic'}
                        </p>
                      </div>
                    </div>

                    {/* Actions: Add to Playlist, Favorite, Duration */}
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {item.duration > 0 && (
                        <span className="text-xs font-mono text-slate-400 w-11 text-right">
                          {formatDuration(item.duration)}
                        </span>
                      )}

                      {/* Add to Playlist button */}
                      {onOpenPlaylistModal && (
                        <button
                          onClick={() => onOpenPlaylistModal(item)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                          title="Agregar a playlist"
                        >
                          <ListPlus className="h-4 w-4" />
                        </button>
                      )}

                      {/* Favorite Button */}
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                          item.favorite ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                        }`}
                        title="Favorito"
                      >
                        <Star className={`h-4 w-4 ${item.favorite ? 'fill-current' : ''}`} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar "${item.title}"?`)) {
                            deleteItem(item.id, false);
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 transition"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VISTA 2: CARÁTULAS GRANDES (GRID VIEW) */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredMusic.map((item) => {
                const isCurrentPlaying = currentItem?.id === item.id && isPlaying;
                const isCurrent = currentItem?.id === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => playItem(item, filteredMusic)}
                    className="group relative flex flex-col rounded-2xl border border-white/5 bg-[#0b0f19] p-2.5 hover:border-emerald-500/40 hover:bg-[#0e1424] transition cursor-pointer overflow-hidden shadow-lg"
                  >
                    {/* Square Cover Art */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-800 shadow-md">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-emerald-600/30 to-indigo-600/30">
                          <Music className="h-10 w-10 text-emerald-400" />
                        </div>
                      )}

                      {/* Play overlay button */}
                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
                          isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-xl group-hover:scale-110 active:scale-95 transition">
                          {isCurrentPlaying ? (
                            <Pause className="h-5 w-5 fill-current" />
                          ) : (
                            <Play className="h-5 w-5 fill-current ml-0.5" />
                          )}
                        </div>
                      </div>

                      {/* Duration tag */}
                      {item.duration > 0 && (
                        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white backdrop-blur-sm">
                          {formatDuration(item.duration)}
                        </span>
                      )}
                    </div>

                    <h4 className="mt-2 line-clamp-1 text-xs font-semibold text-white group-hover:text-emerald-300">
                      {item.title}
                    </h4>
                    <p className="truncate text-[10px] text-slate-400 mt-0.5">
                      {item.metadata?.artist || item.metadata?.channel || 'sharemusic'}
                    </p>

                    {/* Quick actions row */}
                    <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        className={`p-1 ${item.favorite ? 'text-amber-400' : 'text-slate-500 hover:text-white'}`}
                      >
                        <Star className={`h-3.5 w-3.5 ${item.favorite ? 'fill-current' : ''}`} />
                      </button>

                      {onOpenPlaylistModal && (
                        <button
                          onClick={() => onOpenPlaylistModal(item)}
                          className="p-1 text-slate-500 hover:text-white"
                          title="Añadir a playlist"
                        >
                          <ListPlus className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar "${item.title}"?`)) {
                            deleteItem(item.id, false);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. SECCIÓN DE VIDEOS DESCARGADOS
          ───────────────────────────────────────────────────────────── */}
      {showVideoSection && filteredVideos.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                <Video className="h-3.5 w-3.5" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Videos Descargados ({filteredVideos.length})
              </h2>
            </div>
          </div>

          {/* Video Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filteredVideos.map((video) => {
              return (
                <div
                  key={video.id}
                  onClick={() => {
                    playItem(video, filteredVideos);
                    openVideoModal();
                  }}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1422] hover:border-indigo-500/40 hover:bg-[#131a2b] transition cursor-pointer shadow-lg"
                >
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

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600/90 text-white shadow-xl backdrop-blur-md group-hover:scale-110 active:scale-95 transition">
                        <Play className="h-5 w-5 fill-white ml-0.5" />
                      </div>
                    </div>

                    {video.duration > 0 && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-mono font-bold text-white backdrop-blur-md">
                        {formatDuration(video.duration)}
                      </span>
                    )}

                    <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[9px] font-bold text-slate-950 shadow-md">
                      ✓ OFFLINE
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-3">
                    <div>
                      <h4 className="line-clamp-2 text-xs sm:text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {video.title}
                      </h4>
                      <p className="mt-1 truncate text-[10px] text-slate-400">
                        {video.metadata?.channel || 'Video'}
                      </p>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] font-mono text-slate-400">
                        {video.size > 0 ? formatBytes(video.size) : ''}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleFavorite(video.id)}
                          className={`p-1 ${video.favorite ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
                        >
                          <Star className={`h-3.5 w-3.5 ${video.favorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Eliminar "${video.title}"?`)) {
                              deleteItem(video.id, false);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400"
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

      {/* Empty State */}
      {totalItemsCount === 0 && (
        <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-6 sm:p-10 text-center max-w-md mx-auto space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
            <Music className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Tu música sin internet</h3>
            <p className="text-xs text-slate-400 mt-1">
              Descarga canciones o videos con el botón + o importa tus audios para disfrutar offline.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <button
              onClick={onOpenAddModal}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              + Descargar contenido
            </button>
            <button
              onClick={loadSampleData}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              Cargar demos
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
