import React, { useState } from 'react';
import { MediaItem } from '../../types/media';
import { formatBytes, formatDuration } from '../../utils/formatters';
import { usePlayer } from '../../context/PlayerContext';
import { useMedia } from '../../context/MediaContext';
import { getMediaBlob } from '../../database/db';
import {
  Play,
  Download,
  Star,
  MoreVertical,
  Music,
  Video,
  CheckCircle2,
  Trash2,
  Clock,
  HardDrive,
  Globe,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Share2,
  Link as LinkIcon,
  Cloud,
} from 'lucide-react';

interface MediaCardProps {
  item: MediaItem;
  allQueue?: MediaItem[];
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, allQueue }) => {
  const { playItem, currentItem, isPlaying } = usePlayer();
  const { toggleFavorite, startDownload, deleteItem } = useMedia();

  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const isCurrentPlaying = currentItem?.id === item.id && isPlaying;
  // Strictly offline if Blob is confirmed in IndexedDB
  const isDownloaded = !!(item.isOffline || item.hasLocalBlob);
  const isDownloading = item.downloadStatus === 'downloading' || item.downloadStatus === 'preparing';
  const isError = item.downloadStatus === 'error';

  const canDownload =
    !isDownloaded &&
    !isDownloading &&
    item.canDownload !== false &&
    item.metadata?.canDirectDownload !== false &&
    item.source !== 'youtube';

  const handlePlayClick = () => {
    if (item.source === 'youtube' && !isDownloaded) {
      window.open(item.sourceUrl || item.originalUrl, '_blank');
      return;
    }
    playItem(item, allQueue);
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startDownload(item);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(item.id);
  };

  // Section 29: Share link or local file blob
  const handleShare = async (e: React.MouseEvent, shareFile = false) => {
    e.stopPropagation();
    setShowMenu(false);
    setIsSharing(true);

    try {
      if (shareFile && isDownloaded) {
        const record = await getMediaBlob(item.id);
        if (record && record.blob && typeof navigator !== 'undefined' && 'share' in navigator) {
          const file = new File([record.blob], item.fileName || 'media_file', {
            type: record.mimeType || item.mimeType,
          });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: item.title,
              files: [file],
            });
            setIsSharing(false);
            return;
          }
        }
      }

      // Share URL fallback
      const shareUrl = item.sourceUrl || item.originalUrl;
      if (typeof navigator !== 'undefined' && 'share' in navigator && shareUrl && !shareUrl.startsWith('local://')) {
        await navigator.share({
          title: item.title,
          url: shareUrl,
        });
      } else if (shareUrl && !shareUrl.startsWith('local://')) {
        await navigator.clipboard.writeText(shareUrl);
        alert('Enlace copiado al portapapeles.');
      }
    } catch (err) {
      console.warn('Share cancelled or not supported:', err);
    } finally {
      setIsSharing(false);
    }
  };

  // Section 16: Badge ✓ OFFLINE vs ☁ ONLINE
  const renderStatusBadge = () => {
    if (isDownloaded) {
      return (
        <span
          className="flex items-center gap-1 rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-[10px] font-bold text-slate-950 shadow-md backdrop-blur-md"
          title="Guardado físicamente en IndexedDB - Disponible offline"
        >
          <CheckCircle2 className="h-3 w-3 text-slate-950" />
          <span>✓ OFFLINE</span>
        </span>
      );
    }

    if (isDownloading) {
      return (
        <span
          className="flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-[10px] font-bold text-slate-950 shadow-md backdrop-blur-md"
          title="Descargando recurso a IndexedDB"
        >
          <Loader2 className="h-3 w-3 animate-spin text-slate-950" />
          <span>Descargando</span>
        </span>
      );
    }

    if (isError) {
      return (
        <span
          className="flex items-center gap-1 rounded-full bg-rose-500/90 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md backdrop-blur-md"
          title={item.explanation || 'Error en descarga'}
        >
          <AlertTriangle className="h-3 w-3 text-white" />
          <span>Error</span>
        </span>
      );
    }

    // Link only (Online)
    return (
      <span
        className="flex items-center gap-1 rounded-full bg-sky-500/80 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md backdrop-blur-md"
        title="Enlace guardado - Requiere Internet para reproducirse"
      >
        <Cloud className="h-3 w-3 text-white" />
        <span>☁ ONLINE</span>
      </span>
    );
  };

  const getFormatLabel = () => {
    if (item.format) return item.format.toUpperCase();
    if (item.mimeType.includes('mp4')) return 'MP4';
    if (item.mimeType.includes('mpeg') || item.mimeType.includes('mp3')) return 'MP3';
    if (item.mimeType.includes('wav')) return 'WAV';
    if (item.mimeType.includes('ogg')) return 'OGG';
    if (item.mimeType.includes('webm')) return 'WEBM';
    if (item.mimeType.includes('m4a')) return 'M4A';
    if (item.source === 'youtube') return 'YouTube';
    return item.mediaType.toUpperCase();
  };

  const displaySize = item.size || item.fileSize || 0;

  return (
    <div
      onClick={handlePlayClick}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer ${
        isCurrentPlaying
          ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
          : 'border-white/5 bg-[#0f1422] hover:border-white/20 hover:bg-[#131a2c]'
      }`}
    >
      {/* Thumbnail Aspect Box */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950">
            {item.mediaType === 'video' ? (
              <Video className="h-10 w-10 text-indigo-400/60" />
            ) : (
              <Music className="h-10 w-10 text-emerald-400/60" />
            )}
          </div>
        )}

        {/* Floating Status Badge (✓ OFFLINE / ☁ ONLINE) */}
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {renderStatusBadge()}
        </div>

        {/* Favorite quick toggle (top-right) */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition ${
            item.favorite
              ? 'bg-amber-400 text-slate-950'
              : 'bg-black/50 text-white/70 hover:bg-black/70 hover:text-white'
          }`}
          title={item.favorite ? 'Quitar de favoritos' : '⭐ Marcar favorito'}
        >
          <Star className="h-3.5 w-3.5 fill-current" />
        </button>

        {/* Duration bottom-right badge */}
        {item.duration > 0 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur-sm">
            <Clock className="h-2.5 w-2.5 text-slate-400" />
            <span>{formatDuration(item.duration)}</span>
          </span>
        )}

        {/* Center Play Overlay on hover / active */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity ${
            isCurrentPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-xl shadow-emerald-500/40 transform transition-transform group-hover:scale-110 active:scale-95">
            {item.source === 'youtube' && !isDownloaded ? (
              <ExternalLink className="h-6 w-6 ml-0.5 text-slate-950" />
            ) : (
              <Play className="h-6 w-6 fill-current ml-0.5" />
            )}
          </div>
        </div>
      </div>

      {/* Card Info Details */}
      <div className="flex flex-1 flex-col justify-between p-3.5">
        <div>
          <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
            {item.title}
          </h3>

          {/* Detailed Info: Tipo • Formato • Tamaño • Estado */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-bold uppercase text-slate-200">
              {item.mediaType.toUpperCase()}
            </span>
            <span>•</span>
            <span className="font-semibold text-slate-300">{getFormatLabel()}</span>
            <span>•</span>
            {displaySize > 0 && <span>{formatBytes(displaySize)}</span>}
            {isDownloaded ? (
              <span className="text-emerald-400 font-semibold">• En disco</span>
            ) : (
              <span className="text-sky-300 font-medium">• Web</span>
            )}
          </div>

          {/* Explanation if CORS blocked or notice */}
          {item.explanation && !isDownloaded && (
            <p className="mt-1.5 line-clamp-1 text-[11px] text-amber-300/90 font-medium">
              {item.explanation}
            </p>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-slate-400"
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="text-[10px] text-slate-500 font-mono">
                  +{item.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions Row */}
        <div className="mt-3.5 flex items-center justify-between border-t border-white/5 pt-2.5">
          {/* Main Action Button */}
          {item.source === 'youtube' && !isDownloaded ? (
            <a
              href={item.sourceUrl || item.originalUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Abrir en YouTube</span>
            </a>
          ) : (
            <button
              onClick={handlePlayClick}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{isDownloaded ? 'Reproducir offline' : 'Reproducir'}</span>
            </button>
          )}

          {/* Right Action buttons */}
          <div className="flex items-center gap-1.5 relative">
            {canDownload ? (
              <button
                onClick={handleDownloadClick}
                className="flex items-center gap-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-2 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition active:scale-95"
                title="Descargar para offline"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Descargar</span>
              </button>
            ) : isDownloaded ? (
              <span
                className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-400"
                title="✓ Guardado en IndexedDB"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Offline</span>
              </span>
            ) : isDownloading ? (
              <span className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </span>
            ) : (
              <span
                className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-400"
                title="Enlace online"
              >
                <Cloud className="h-3 w-3 text-sky-400" />
                <span className="hidden sm:inline">Online</span>
              </span>
            )}

            {/* 3-dots more menu */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition"
              title="Más opciones"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {/* Dropdown Options */}
            {showMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full right-0 mb-2 w-56 rounded-xl border border-white/10 bg-[#141b2d] p-1.5 shadow-2xl z-20"
              >
                {/* Share file (if downloaded) */}
                {isDownloaded && (
                  <button
                    onClick={(e) => handleShare(e, true)}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-white/5 transition"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Compartir archivo multimedia</span>
                  </button>
                )}

                {/* Share link */}
                <button
                  onClick={(e) => handleShare(e, false)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5 transition"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  <span>Compartir enlace</span>
                </button>

                {/* Free space (remove blob only) */}
                {isDownloaded && (
                  <button
                    onClick={() => {
                      deleteItem(item.id, true);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 hover:bg-white/5 transition"
                  >
                    <HardDrive className="h-3.5 w-3.5" />
                    <span>Liberar espacio (borrar descarga)</span>
                  </button>
                )}

                {item.sourceUrl && !item.sourceUrl.startsWith('local://') && (
                  <a
                    href={item.sourceUrl || item.originalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Abrir enlace original</span>
                  </a>
                )}

                <button
                  onClick={() => {
                    setShowConfirmDelete(true);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Eliminar de biblioteca</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showConfirmDelete && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101625] p-5 shadow-2xl">
            <h4 className="text-sm font-bold text-white">¿Eliminar este contenido?</h4>
            <p className="mt-1 text-xs text-slate-300">
              Se eliminará "{item.title}" y cualquier archivo guardado localmente en tu dispositivo.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  deleteItem(item.id, false);
                  setShowConfirmDelete(false);
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-500 transition"
              >
                Eliminar
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-semibold text-slate-300 hover:bg-white/20 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
