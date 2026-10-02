import React from 'react';
import { useMedia } from '../context/MediaContext';
import { formatBytes, formatETA, formatSpeed } from '../utils/formatters';
import {
  Download,
  Pause,
  Play,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Gauge,
  Video,
  Music,
  ArrowRight,
  Info,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

interface DownloadsPageProps {
  onNavigateToLibrary: () => void;
}

export const DownloadsPage: React.FC<DownloadsPageProps> = ({ onNavigateToLibrary }) => {
  const {
    downloadTasks,
    mediaItems,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    retryDownload,
  } = useMedia();
  const { playItem } = usePlayer();

  const activeOrPendingTasks = downloadTasks.filter(
    (t) => t.status !== 'completed'
  );

  const completedItems = mediaItems.filter((m) => m.isOffline || m.hasLocalBlob);

  const getStatusBadge = (status: string, statusLabel?: string) => {
    switch (status) {
      case 'downloading':
        return (
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
            Descargando
          </span>
        );
      case 'analyzing':
        return (
          <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 text-[11px] font-bold text-sky-400 animate-pulse">
            Analizando
          </span>
        );
      case 'preparing':
        return (
          <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-[11px] font-bold text-indigo-400 animate-pulse">
            Preparando
          </span>
        );
      case 'processing':
        return (
          <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 text-[11px] font-bold text-purple-400 animate-pulse">
            Procesando
          </span>
        );
      case 'saving':
        return (
          <span className="rounded-full bg-teal-500/15 border border-teal-500/30 px-2.5 py-0.5 text-[11px] font-bold text-teal-400 animate-pulse">
            Guardando
          </span>
        );
      case 'paused':
        return (
          <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">
            Pausado
          </span>
        );
      case 'error':
        return (
          <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold text-rose-400">
            Error
          </span>
        );
      case 'cancelled':
        return (
          <span className="rounded-full bg-slate-500/15 border border-slate-500/30 px-2.5 py-0.5 text-[11px] font-bold text-slate-400">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] text-slate-300">
            {statusLabel || status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-16 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-white">Gestor de Descargas</h2>
            <p className="text-xs text-slate-400">
              {activeOrPendingTasks.length} descarga(s) activas • {completedItems.length} guardados offline
            </p>
          </div>
        </div>
      </div>

      {/* Active Tasks Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          En curso / Activas ({activeOrPendingTasks.length})
        </h3>

        {activeOrPendingTasks.length > 0 ? (
          <div className="space-y-3">
            {activeOrPendingTasks.map((task) => {
              const matchedItem = mediaItems.find((m) => m.id === task.id);
              const hasContentLength = task.totalBytes > 0;

              return (
                <div
                  key={task.id}
                  className="rounded-2xl border border-white/10 bg-[#0f1422] p-4 shadow-lg space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Thumbnail & Title */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 border border-white/10">
                        {task.thumbnail ? (
                          <img
                            src={task.thumbnail}
                            alt={task.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-white/5">
                            {task.mediaType === 'video' ? (
                              <Video className="h-5 w-5 text-indigo-400" />
                            ) : (
                              <Music className="h-5 w-5 text-emerald-400" />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-xs sm:text-sm font-bold text-white">
                            {task.title}
                          </h4>
                          {getStatusBadge(task.status, task.statusLabel)}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {task.format && (
                            <span className="rounded bg-white/10 px-1.5 py-0.2 font-semibold text-slate-200">
                              {task.format}
                            </span>
                          )}
                          {task.quality && <span>{task.quality}</span>}
                          <span className="truncate font-mono">{task.url}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Pause, Resume, Cancel, Retry */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {task.status === 'downloading' && (
                        <button
                          onClick={() => {
                            if (!task.canPause) {
                              alert('Esta fuente no permite reanudar la descarga.');
                              return;
                            }
                            pauseDownload(task.id);
                          }}
                          disabled={!task.canPause}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                            task.canPause
                              ? 'bg-white/10 text-slate-200 hover:bg-white/20'
                              : 'bg-white/5 text-slate-600 cursor-not-allowed'
                          }`}
                          title={
                            task.canPause
                              ? 'Pausar descarga'
                              : 'Esta fuente no permite reanudar la descarga.'
                          }
                        >
                          <Pause className="h-4 w-4" />
                        </button>
                      )}

                      {task.status === 'paused' && matchedItem && (
                        <button
                          onClick={() => resumeDownload(matchedItem)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition"
                          title="Reanudar descarga"
                        >
                          <Play className="h-4 w-4 fill-current ml-0.5" />
                        </button>
                      )}

                      {(task.status === 'error' || task.status === 'cancelled') && matchedItem && (
                        <button
                          onClick={() => retryDownload(matchedItem)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition"
                          title="Reintentar descarga"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => cancelDownload(task.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition"
                        title="Cancelar y liberar memoria"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      {hasContentLength ? (
                        <div
                          className={`h-full transition-all duration-300 ${
                            task.status === 'error'
                              ? 'bg-rose-500'
                              : task.status === 'paused'
                              ? 'bg-amber-500'
                              : 'bg-gradient-to-r from-emerald-500 to-indigo-500'
                          }`}
                          style={{ width: `${task.progressPercent}%` }}
                        />
                      ) : (
                        <div className="h-full w-1/3 animate-[pulse_1.5s_ease-in-out_infinite] bg-indigo-500" />
                      )}
                    </div>

                    {/* Stats Metrics (Bytes, Speed, ETA) */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-0.5">
                      <div className="flex items-center gap-2">
                        {hasContentLength ? (
                          <>
                            <span className="font-semibold text-white">
                              {task.progressPercent}%
                            </span>
                            <span>•</span>
                            <span>
                              {formatBytes(task.downloadedBytes)} de {formatBytes(task.totalBytes)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold text-white">
                              Descargando...
                            </span>
                            <span>•</span>
                            <span>{formatBytes(task.downloadedBytes)} recibidos</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {task.status === 'downloading' && task.speedBps > 0 && (
                          <span className="flex items-center gap-1 font-mono text-emerald-400">
                            <Gauge className="h-3 w-3" />
                            {formatSpeed(task.speedBps)}
                          </span>
                        )}

                        {task.status === 'downloading' && task.etaSeconds > 0 && (
                          <span className="flex items-center gap-1 font-mono text-indigo-300">
                            <Clock className="h-3 w-3" />
                            ETA: {formatETA(task.etaSeconds)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Range Request Notice if unsupported */}
                  {!task.canPause && task.status === 'downloading' && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                      <Info className="h-3 w-3 text-slate-500 shrink-0" />
                      <span>Esta fuente no permite pausar/reanudar la descarga (sin soporte de Range Requests).</span>
                    </div>
                  )}

                  {/* Error display if any */}
                  {task.errorMessage && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                      <span>{task.errorMessage}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 text-center text-xs text-slate-400">
            No hay descargas activas en este momento.
          </div>
        )}
      </div>

      {/* Completed Offline Content Section */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Completados y Guardados Localmente ({completedItems.length})
          </h3>
          <button
            onClick={onNavigateToLibrary}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
          >
            <span>Ver en Biblioteca</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {completedItems.length > 0 ? (
          <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-[#0f1422] overflow-hidden">
            {completedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => playItem(item, completedItems)}
                className="flex items-center justify-between gap-3 p-3.5 hover:bg-white/[0.03] transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-xs sm:text-sm font-semibold text-white">
                        {item.title}
                      </h4>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 text-[10px] font-bold text-emerald-300">
                        ✓ OFFLINE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {formatBytes(item.size || item.fileSize)} • {item.format || (item.mediaType === 'video' ? 'MP4' : 'MP3')} • Guardado en IndexedDB
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playItem(item, completedItems);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition"
                  title="Reproducir ahora sin internet"
                >
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-6 text-center text-xs text-slate-400">
            Aún no has completado descargas en este dispositivo.
          </div>
        )}
      </div>
    </div>
  );
};
