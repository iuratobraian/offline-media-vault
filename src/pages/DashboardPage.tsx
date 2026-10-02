import React from 'react';
import { useMedia } from '../context/MediaContext';
import { usePlayer } from '../context/PlayerContext';
import { formatBytes } from '../utils/formatters';
import { MediaCard } from '../components/library/MediaCard';
import { UrlDownloader } from '../components/downloader/UrlDownloader';
import {
  Music,
  Video,
  Download,
  HardDrive,
  PlusCircle,
  FolderOpen,
  Sparkles,
  WifiOff,
  Flame,
  Clock,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface DashboardPageProps {
  onOpenAddModal: () => void;
  onNavigateToLibrary: () => void;
  onNavigateToDownloads: () => void;
  onNavigateToStorage: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenAddModal,
  onNavigateToLibrary,
  onNavigateToDownloads,
  onNavigateToStorage,
}) => {
  const { mediaItems, storageBreakdown, downloadTasks, loadSampleData } = useMedia();
  const { playItem } = usePlayer();

  const activeDownloads = downloadTasks.filter(
    (t) => t.status === 'downloading' || t.status === 'preparing'
  );

  const recentlyPlayed = mediaItems
    .filter((m) => m.lastPlayedAt && m.lastPlayedAt > 0)
    .sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0))
    .slice(0, 4);

  const downloadedItems = mediaItems
    .filter((m) => m.isOffline || m.hasLocalBlob)
    .slice(0, 6);

  const recentAdditions = mediaItems.slice(0, 6);

  return (
    <div className="space-y-6 pb-24 sm:pb-16 animate-fade-in">
      {/* Prominent URL Downloader - Section 2 & 33 */}
      <UrlDownloader
        onDownloadStarted={onNavigateToDownloads}
        onOpenLocalImport={onOpenAddModal}
        variant="hero"
      />

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Files */}
        <div
          onClick={onNavigateToLibrary}
          className="group rounded-2xl border border-white/5 bg-[#0f1422] p-4 hover:border-white/15 hover:bg-[#131a2c] transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Biblioteca</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-300 group-hover:text-emerald-400 transition">
              <FolderOpen className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {mediaItems.length}
            </span>
            <span className="text-[11px] text-slate-400">ítems</span>
          </div>
        </div>

        {/* Offline Ready */}
        <div
          onClick={onNavigateToLibrary}
          className="group rounded-2xl border border-white/5 bg-[#0f1422] p-4 hover:border-emerald-500/30 hover:bg-[#131a2c] transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-emerald-400">Disponible Offline</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">
              {storageBreakdown.downloadedCount}
            </span>
            <span className="text-[11px] text-slate-400">en IndexedDB</span>
          </div>
        </div>

        {/* Enlaces Online */}
        <div
          onClick={onNavigateToLibrary}
          className="group rounded-2xl border border-white/5 bg-[#0f1422] p-4 hover:border-sky-500/30 hover:bg-[#131a2c] transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-sky-400">Enlaces Online</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <Download className="h-4 w-4 text-sky-400" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-sky-400">
              {storageBreakdown.linksCount}
            </span>
            <span className="text-[11px] text-slate-400">requiere web</span>
          </div>
        </div>

        {/* Storage */}
        <div
          onClick={onNavigateToStorage}
          className="group rounded-2xl border border-white/5 bg-[#0f1422] p-4 hover:border-white/15 hover:bg-[#131a2c] transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Espacio Utilizado</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <HardDrive className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-white">
              {formatBytes(storageBreakdown.usedBytes)}
            </span>
          </div>
        </div>
      </div>

      {/* Active Downloads Quick Bar (if any downloading) */}
      {activeDownloads.length > 0 && (
        <div
          onClick={onNavigateToDownloads}
          className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 cursor-pointer hover:bg-indigo-500/15 transition shadow-lg"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <Download className="h-5 w-5 animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                  Descargando {activeDownloads.length} archivo(s)...
                </h4>
                <span className="rounded-full bg-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-200">
                  {activeDownloads[0].progressPercent > 0 ? `${activeDownloads[0].progressPercent}%` : 'En curso'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {activeDownloads[0].title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-indigo-300">
            <span>Ver descargas</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* Empty State / Quick Sample Loader */}
      {mediaItems.length === 0 && (
        <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 mb-3">
            <Sparkles className="h-7 w-7" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">
            Tu biblioteca está vacía por ahora
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            Pega una URL arriba para descargar tu primer video o audio, o importa archivos de tu dispositivo para reproducir offline.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              onClick={onOpenAddModal}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              + Importar archivos del dispositivo
            </button>
            <button
              onClick={loadSampleData}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
            >
              Cargar datos de demostración
            </button>
          </div>
        </div>
      )}

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">Continuar escuchando</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentlyPlayed.map((item) => (
              <MediaCard key={item.id} item={item} allQueue={recentlyPlayed} />
            ))}
          </div>
        </section>
      )}

      {/* Downloaded for Offline */}
      {downloadedItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">Disponibles sin conexión (✓ Offline)</h3>
            </div>
            <button
              onClick={onNavigateToLibrary}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              Ver todos ({storageBreakdown.downloadedCount})
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {downloadedItems.map((item) => (
              <MediaCard key={item.id} item={item} allQueue={downloadedItems} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Additions */}
      {recentAdditions.length > 0 && downloadedItems.length === 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">Agregados recientemente</h3>
            </div>
            <button
              onClick={onNavigateToLibrary}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              Ver biblioteca
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentAdditions.map((item) => (
              <MediaCard key={item.id} item={item} allQueue={recentAdditions} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
