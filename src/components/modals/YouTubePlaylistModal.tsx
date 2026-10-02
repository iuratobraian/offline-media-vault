import React, { useState, useEffect } from 'react';
import { useMedia } from '../../context/MediaContext';
import { youTubeProvider } from '../../services/providers/YouTubeProvider';
import { MediaItem, MediaFormatOption } from '../../types/media';
import {
  ListMusic,
  Download,
  X,
  CheckSquare,
  Square,
  Music,
  Video,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatDuration } from '../../utils/formatters';

interface PlaylistItem {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  url: string;
}

interface YouTubePlaylistModalProps {
  isOpen: boolean;
  playlistUrl: string;
  onClose: () => void;
  onDownloadStarted?: () => void;
}

export const YouTubePlaylistModal: React.FC<YouTubePlaylistModalProps> = ({
  isOpen,
  playlistUrl,
  onClose,
  onDownloadStarted,
}) => {
  const { addMedia, startDownload } = useMedia();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [formatType, setFormatType] = useState<'audio' | 'video'>('audio');
  const [downloadingBatch, setDownloadingBatch] = useState(false);

  useEffect(() => {
    if (!isOpen || !playlistUrl) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    youTubeProvider
      .fetchPlaylist(playlistUrl)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.items && res.items.length > 0) {
          setPlaylistTitle(res.title || 'Playlist de YouTube');
          setItems(res.items);
          // By default, select all items as requested by user
          setSelectedIds(new Set(res.items.map((it) => it.id)));
        } else {
          setError('No se pudieron encontrar videos en esta lista de reproducción.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Error al conectar con la lista de reproducción');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, playlistUrl]);

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((it) => it.id)));
    }
  };

  const handleStartBatchDownload = async () => {
    const selectedItems = items.filter((it) => selectedIds.has(it.id));
    if (selectedItems.length === 0) return;

    setDownloadingBatch(true);

    try {
      for (const item of selectedItems) {
        const canonicalUrl = `https://www.youtube.com/watch?v=${item.id}`;
        const formatKey = formatType === 'audio' ? 'audio_mp3' : 'video_720p';
        const streamUrl = `/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=${formatKey}&title=${encodeURIComponent(item.title)}`;

        const formatOption: MediaFormatOption = {
          id: formatType === 'audio' ? 'yt_audio_mp3' : 'yt_video_720p',
          type: formatType,
          label: formatType === 'audio' ? 'MP3 Alta Calidad' : '720p HD MP4',
          quality: formatType === 'audio' ? '320 kbps' : '720p',
          format: formatType === 'audio' ? 'MP3' : 'MP4',
          ext: formatType === 'audio' ? '.mp3' : '.mp4',
          mimeType: formatType === 'audio' ? 'audio/mpeg' : 'video/mp4',
          url: streamUrl,
          supportsRangeRequests: true,
        };

        const mediaItem: MediaItem = {
          id: `yt_${item.id}`,
          title: item.title,
          thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
          duration: item.duration || 0,
          sourceUrl: canonicalUrl,
          originalUrl: canonicalUrl,
          provider: 'youtube',
          source: 'youtube',
          mediaType: formatType,
          mimeType: formatOption.mimeType,
          format: formatOption.format,
          quality: formatOption.quality,
          size: 0,
          fileSize: 0,
          fileName: `${item.title.replace(/[/\\?%*:|"<>]/g, '_')}${formatOption.ext}`,
          hasLocalBlob: false,
          isOffline: false,
          category: formatType === 'audio' ? 'musica' : 'videos',
          tags: ['#youtube', '#playlist', `#${formatType}`],
          favorite: false,
          downloadStatus: 'preparing',
          createdAt: Date.now(),
          progress: 0,
          canDownload: true,
          canStreamOffline: false,
          requiresOnlinePlayback: false,
          explanation: 'Descargando desde playlist de YouTube...',
        };

        await addMedia(mediaItem);
        // Start download in background
        startDownload(mediaItem, formatOption);
      }

      onDownloadStarted?.();
      onClose();
    } catch (err: any) {
      setError(`Error al iniciar descargas: ${err.message}`);
    } finally {
      setDownloadingBatch(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-xl animate-fade-in">
      <div className="flex flex-col h-full max-h-[92vh] w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0f1422] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5 bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-white shadow-md">
              <ListMusic className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm sm:text-base font-bold text-white">
                {playlistTitle || 'Playlist de YouTube'}
              </h3>
              <p className="text-xs text-slate-400">
                {items.length > 0 ? `${items.length} videos encontrados` : 'Explorando playlist...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-sm font-semibold text-white">Cargando lista de videos de YouTube...</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Estamos analizando la lista de reproducción para que puedas seleccionar lo que deseas descargar.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Error al procesar playlist</p>
                <p className="mt-1 text-rose-300/90">{error}</p>
              </div>
            </div>
          )}

          {!loading && items.length > 0 && (
            <>
              {/* Controls bar: Select all + Format selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-white transition"
                >
                  {selectedIds.size === items.length ? (
                    <CheckSquare className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-400" />
                  )}
                  <span>
                    {selectedIds.size === items.length
                      ? 'Desmarcar todos'
                      : `Seleccionar todos (${selectedIds.size}/${items.length})`}
                  </span>
                </button>

                {/* Audio vs Video toggle */}
                <div className="flex items-center rounded-xl bg-black/40 p-1 border border-white/10">
                  <button
                    onClick={() => setFormatType('audio')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      formatType === 'audio'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Music className="h-3.5 w-3.5" />
                    <span>Solo Audio (MP3)</span>
                  </button>
                  <button
                    onClick={() => setFormatType('video')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      formatType === 'video'
                        ? 'bg-indigo-500 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Video className="h-3.5 w-3.5" />
                    <span>Video (MP4)</span>
                  </button>
                </div>
              </div>

              {/* Items checklist */}
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const isChecked = selectedIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 transition cursor-pointer select-none ${
                        isChecked
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : 'border-white/5 bg-white/[0.02] opacity-60'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItem(item.id);
                        }}
                        className="text-slate-400 hover:text-white shrink-0"
                      >
                        {isChecked ? (
                          <CheckSquare className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-500" />
                        )}
                      </button>

                      {/* Number */}
                      <span className="text-xs font-mono text-slate-500 w-5 text-right shrink-0">
                        {idx + 1}
                      </span>

                      {/* Thumbnail */}
                      <div className="relative flex h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-800 border border-white/10">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      {/* Title & Duration */}
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-xs sm:text-sm font-semibold text-white">
                          {item.title}
                        </h4>
                        {item.duration > 0 && (
                          <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {formatDuration(item.duration)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-white/10 p-4 sm:p-5 bg-white/[0.02] flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {selectedIds.size} de {items.length} videos seleccionados
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
            >
              Cancelar
            </button>

            <button
              onClick={handleStartBatchDownload}
              disabled={selectedIds.size === 0 || downloadingBatch}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-300 transition active:scale-95 disabled:opacity-50"
            >
              {downloadingBatch ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Descargar seleccionados ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
