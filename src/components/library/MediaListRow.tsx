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
  Music,
  Video,
  CheckCircle2,
  Trash2,
  Globe,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Share2,
  Cloud,
} from 'lucide-react';

interface MediaListRowProps {
  item: MediaItem;
  allQueue?: MediaItem[];
}

export const MediaListRow: React.FC<MediaListRowProps> = ({ item, allQueue }) => {
  const { playItem, currentItem, isPlaying } = usePlayer();
  const { toggleFavorite, startDownload, deleteItem } = useMedia();

  const isCurrentPlaying = currentItem?.id === item.id && isPlaying;
  const isDownloaded = !!(item.isOffline || item.hasLocalBlob);
  const isDownloading = item.downloadStatus === 'downloading' || item.downloadStatus === 'preparing';
  const isError = item.downloadStatus === 'error';

  const canDownload =
    !isDownloaded &&
    !isDownloading &&
    item.canDownload !== false &&
    item.metadata?.canDirectDownload !== false &&
    item.source !== 'youtube';

  const handleRowClick = () => {
    if (item.source === 'youtube' && !isDownloaded) {
      window.open(item.sourceUrl || item.originalUrl, '_blank');
      return;
    }
    playItem(item, allQueue);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isDownloaded) {
        const record = await getMediaBlob(item.id);
        if (record && record.blob && typeof navigator !== 'undefined' && 'share' in navigator) {
          const file = new File([record.blob], item.fileName, { type: record.mimeType });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: item.title, files: [file] });
            return;
          }
        }
      }

      const shareUrl = item.sourceUrl || item.originalUrl;
      if (typeof navigator !== 'undefined' && 'share' in navigator && shareUrl && !shareUrl.startsWith('local://')) {
        await navigator.share({ title: item.title, url: shareUrl });
      } else if (shareUrl && !shareUrl.startsWith('local://')) {
        await navigator.clipboard.writeText(shareUrl);
        alert('Enlace copiado al portapapeles');
      }
    } catch {
      // ignore
    }
  };

  const getFormatLabel = () => {
    if (item.format) return item.format.toUpperCase();
    if (item.mimeType.includes('mp4')) return 'MP4';
    if (item.mimeType.includes('mpeg') || item.mimeType.includes('mp3')) return 'MP3';
    if (item.mimeType.includes('wav')) return 'WAV';
    if (item.mimeType.includes('ogg')) return 'OGG';
    if (item.mimeType.includes('webm')) return 'WEBM';
    if (item.source === 'youtube') return 'YouTube';
    return item.mediaType.toUpperCase();
  };

  const displaySize = item.size || item.fileSize || 0;

  return (
    <div
      onClick={handleRowClick}
      className={`group flex items-center justify-between gap-3 rounded-xl border p-2.5 transition cursor-pointer ${
        isCurrentPlaying
          ? 'border-emerald-500 bg-emerald-500/10'
          : 'border-white/5 bg-[#0f1422] hover:border-white/15 hover:bg-[#131a2c]'
      }`}
    >
      {/* Left: Thumbnail & Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-800">
          {item.thumbnail ? (
            <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-800">
              {item.mediaType === 'video' ? (
                <Video className="h-5 w-5 text-indigo-400" />
              ) : (
                <Music className="h-5 w-5 text-emerald-400" />
              )}
            </div>
          )}

          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
              isCurrentPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {item.source === 'youtube' && !isDownloaded ? (
              <ExternalLink className="h-4 w-4 text-white" />
            ) : (
              <Play className="h-4 w-4 fill-white text-white" />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-xs sm:text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
              {item.title}
            </h4>

            {isDownloaded ? (
              <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.2 text-[10px] font-bold text-emerald-300">
                ✓ OFFLINE
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-sky-500/20 px-2 py-0.2 text-[10px] font-bold text-sky-300">
                ☁ ONLINE
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
            <span className="font-semibold text-slate-300">{getFormatLabel()}</span>
            <span>•</span>
            {item.duration > 0 && <span>{formatDuration(item.duration)}</span>}
            {item.duration > 0 && <span>•</span>}
            {displaySize > 0 && <span>{formatBytes(displaySize)}</span>}
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {canDownload && (
          <button
            onClick={() => startDownload(item)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition"
            title="Descargar para offline"
          >
            <Download className="h-4 w-4" />
          </button>
        )}

        {isDownloading && (
          <span className="flex h-8 w-8 items-center justify-center text-amber-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        )}

        <button
          onClick={handleShare}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition"
          title="Compartir"
        >
          <Share2 className="h-4 w-4" />
        </button>

        <button
          onClick={() => toggleFavorite(item.id)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            item.favorite
              ? 'text-amber-400'
              : 'text-slate-400 hover:bg-white/10 hover:text-white'
          }`}
          title="Favorito"
        >
          <Star className={`h-4 w-4 ${item.favorite ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={() => {
            if (confirm(`¿Eliminar "${item.title}"?`)) {
              deleteItem(item.id, false);
            }
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
