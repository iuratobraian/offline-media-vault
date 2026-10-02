import React, { useState, useRef } from 'react';
import { useMedia } from '../context/MediaContext';
import { formatBytes } from '../utils/formatters';
import {
  HardDrive,
  Music,
  Video,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Download,
  Upload,
  Archive,
  FileText,
  Loader2,
  PieChart,
} from 'lucide-react';

export const StoragePage: React.FC = () => {
  const {
    mediaItems,
    storageBreakdown,
    deleteItem,
    batchDelete,
    deleteAllVideos,
    deleteAllAudios,
    deleteAllOfflineBlobs,
    clearAll,
    exportMetadataJson,
    importMetadataJson,
    exportFullBackupZip,
    importFullBackupZip,
  } = useMedia();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showDeleteBatchModal, setShowDeleteBatchModal] = useState(false);
  const [showDeleteAllVideosModal, setShowDeleteAllVideosModal] = useState(false);
  const [showDeleteAllAudiosModal, setShowDeleteAllAudiosModal] = useState(false);
  const [showDeleteOnlyOfflineModal, setShowDeleteOnlyOfflineModal] = useState(false);
  const [deleteBlobsOnlyMode, setDeleteBlobsOnlyMode] = useState(false);

  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipExportProgress, setZipExportProgress] = useState(0);
  const [isImportingZip, setIsImportingZip] = useState(false);
  const [importZipStatus, setImportZipStatus] = useState<string | null>(null);

  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const zipFileInputRef = useRef<HTMLInputElement | null>(null);

  const downloadedItems = mediaItems.filter((m) => m.isOffline || m.hasLocalBlob);

  const audioPercent =
    storageBreakdown.usedBytes > 0
      ? (storageBreakdown.audioBytes / storageBreakdown.usedBytes) * 100
      : 0;

  const videoPercent =
    storageBreakdown.usedBytes > 0
      ? (storageBreakdown.videoBytes / storageBreakdown.usedBytes) * 100
      : 0;

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllDownloaded = () => {
    if (selectedIds.length === downloadedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(downloadedItems.map((d) => d.id));
    }
  };

  const executeBatchDelete = async () => {
    await batchDelete(selectedIds, deleteBlobsOnlyMode);
    setSelectedIds([]);
    setShowDeleteBatchModal(false);
  };

  const handleExportZip = async () => {
    setIsExportingZip(true);
    setZipExportProgress(0);
    try {
      await exportFullBackupZip((p) => setZipExportProgress(p));
    } catch (err: any) {
      alert(`Error al exportar ZIP: ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleImportZip = async (file: File | null) => {
    if (!file) return;
    setIsImportingZip(true);
    setImportZipStatus('Descomprimiendo archivos multimedia...');
    try {
      const res = await importFullBackupZip(file, (msg) => setImportZipStatus(msg));
      setImportZipStatus(`¡Se importaron ${res.importedCount} elementos correctamente!`);
      setTimeout(() => setImportZipStatus(null), 3000);
    } catch (err: any) {
      alert(`Error al importar ZIP: ${err.message}`);
      setImportZipStatus(null);
    } finally {
      setIsImportingZip(false);
    }
  };

  const handleExportJson = () => {
    const jsonStr = exportMetadataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OfflineMediaVault_Metadata_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importMetadataJson(text);
      alert(`Se importaron ${res.importedCount} marcadores desde el respaldo JSON.`);
    } catch (err: any) {
      alert(err.message || 'Error al importar JSON.');
    }
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-16 animate-fade-in">
      {/* Hidden File Inputs for Backups */}
      <input
        ref={jsonFileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => handleImportJson(e.target.files?.[0] || null)}
      />
      <input
        ref={zipFileInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={(e) => handleImportZip(e.target.files?.[0] || null)}
      />

      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-white">Almacenamiento</h2>
            <p className="text-xs text-slate-400">
              Espacio en IndexedDB y copias de seguridad de tus archivos
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowClearAllModal(true)}
          className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Limpiar todo</span>
        </button>
      </div>

      {/* Main Storage Utilization Card - Section 18 */}
      <div className="rounded-3xl border border-white/10 bg-[#0f1422] p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <div className="text-2xl sm:text-4xl font-black text-white">
              {formatBytes(storageBreakdown.usedBytes)}
              <span className="text-xs sm:text-sm font-normal text-slate-400 ml-2">utilizados</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {downloadedItems.length} archivos almacenados físicamente • {storageBreakdown.linksCount} enlaces online
            </p>
          </div>

          {storageBreakdown.freeBytes !== undefined && storageBreakdown.freeBytes > 0 && (
            <div className="text-left sm:text-right">
              <span className="text-xs sm:text-sm font-bold text-emerald-400">
                {formatBytes(storageBreakdown.freeBytes)} libres
              </span>
              <p className="text-[11px] text-slate-400">
                de {formatBytes(storageBreakdown.quotaBytes)} de cuota en tu navegador
              </p>
            </div>
          )}
        </div>

        {/* Visual Multi-Segment Storage Bar */}
        <div className="space-y-2">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="bg-emerald-500 transition-all duration-500"
              style={{ width: `${audioPercent}%` }}
              title={`Audio: ${formatBytes(storageBreakdown.audioBytes)}`}
            />
            <div
              className="bg-indigo-500 transition-all duration-500"
              style={{ width: `${videoPercent}%` }}
              title={`Video: ${formatBytes(storageBreakdown.videoBytes)}`}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Music className="h-4 w-4" />
                <span>Audio Almacenado</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-white mt-1">
                {formatBytes(storageBreakdown.audioBytes)}
              </div>
              <div className="text-[11px] text-slate-400">
                {storageBreakdown.audioCount} archivo(s)
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                <Video className="h-4 w-4" />
                <span>Video Almacenado</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-white mt-1">
                {formatBytes(storageBreakdown.videoBytes)}
              </div>
              <div className="text-[11px] text-slate-400">
                {storageBreakdown.videoCount} archivo(s)
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Disponibles Offline</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-white mt-1">
                {downloadedItems.length}
              </div>
              <div className="text-[11px] text-slate-400">Guardados en disco</div>
            </div>
          </div>
        </div>
      </div>

      {/* Administration Quick Actions - Section 19 */}
      <div className="rounded-2xl border border-white/10 bg-[#0f1422] p-4 sm:p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Administración de Almacenamiento
        </h3>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowDeleteOnlyOfflineModal(true)}
            disabled={downloadedItems.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition active:scale-95 disabled:opacity-40"
          >
            <HardDrive className="h-3.5 w-3.5" />
            <span>Eliminar solamente archivos offline</span>
          </button>

          <button
            onClick={() => setShowDeleteAllVideosModal(true)}
            disabled={storageBreakdown.videoCount === 0}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition active:scale-95 disabled:opacity-40"
          >
            <Video className="h-3.5 w-3.5" />
            <span>Eliminar todos los videos</span>
          </button>

          <button
            onClick={() => setShowDeleteAllAudiosModal(true)}
            disabled={storageBreakdown.audioCount === 0}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition active:scale-95 disabled:opacity-40"
          >
            <Music className="h-3.5 w-3.5" />
            <span>Eliminar todos los audios</span>
          </button>
        </div>
      </div>

      {/* Backup and Export Section - Section 21 */}
      <div className="rounded-2xl border border-white/10 bg-[#0f1422] p-4 sm:p-5 space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Copias de Seguridad (Backup)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Exporta tus metadatos en JSON o empaqueta todos tus archivos multimedia reales en un archivo ZIP.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Full Multimedia ZIP Backup */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
              <Archive className="h-4 w-4" />
              <span>Copia Completa con Archivos Multimedia (ZIP)</span>
            </div>
            <p className="text-xs text-slate-300">
              Empaqueta todos los Blobs descargados y metadatos dentro de un archivo ZIP para transferir a otro dispositivo.
            </p>

            {isExportingZip ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-emerald-300">
                  <span>Generando ZIP...</span>
                  <span>{zipExportProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-200"
                    style={{ width: `${zipExportProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleExportZip}
                  disabled={downloadedItems.length === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Exportar ZIP</span>
                </button>

                <button
                  onClick={() => zipFileInputRef.current?.click()}
                  disabled={isImportingZip}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Restaurar ZIP</span>
                </button>
              </div>
            )}

            {importZipStatus && (
              <div className="text-xs text-emerald-300 flex items-center gap-2 pt-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{importZipStatus}</span>
              </div>
            )}
          </div>

          {/* Metadata JSON Backup */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-sky-400">
              <FileText className="h-4 w-4" />
              <span>Respaldo Ligero de Metadatos (JSON)</span>
            </div>
            <p className="text-xs text-slate-300">
              Exporta títulos, enlaces, categorías y etiquetas sin incluir los archivos multimedia binarios pesados.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-400 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Exportar JSON</span>
              </button>

              <button
                onClick={() => jsonFileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Importar JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Files List Table for Batch Selection */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Archivos Guardados en Disco ({downloadedItems.length})
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllDownloaded}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              {selectedIds.length === downloadedItems.length && downloadedItems.length > 0
                ? 'Deseleccionar todos'
                : 'Seleccionar todos'}
            </button>

            {selectedIds.length > 0 && (
              <button
                onClick={() => setShowDeleteBatchModal(true)}
                className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500"
              >
                Eliminar {selectedIds.length} seleccionados
              </button>
            )}
          </div>
        </div>

        {downloadedItems.length > 0 ? (
          <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-[#0f1422] overflow-hidden">
            {downloadedItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between gap-3 p-3.5 transition ${
                    isSelected ? 'bg-emerald-500/10' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(item.id)}
                      className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                    />

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300">
                      {item.mediaType === 'video' ? (
                        <Video className="h-4 w-4 text-indigo-400" />
                      ) : (
                        <Music className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="truncate text-xs sm:text-sm font-semibold text-white">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {formatBytes(item.size || item.fileSize)} • {item.format || (item.mediaType === 'video' ? 'MP4' : 'MP3')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deleteItem(item.id, true)}
                      className="hidden sm:inline-flex rounded-lg border border-amber-500/30 px-2.5 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/10 transition"
                      title="Elimina el Blob de IndexedDB pero conserva el marcador"
                    >
                      Liberar espacio
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar definitivamente "${item.title}"?`)) {
                          deleteItem(item.id, false);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                      title="Eliminar de biblioteca"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-8 text-center text-xs text-slate-400">
            No hay archivos descargados en IndexedDB.
          </div>
        )}
      </div>

      {/* Modal: Delete Only Offline Blobs */}
      {showDeleteOnlyOfflineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-amber-500/40 bg-[#14121a] p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <h4 className="text-sm font-bold text-white">Liberar espacio de descargas</h4>
            </div>
            <p className="text-xs text-slate-300">
              Se eliminarán físicamente todos los Blobs descargados de IndexedDB, recuperando espacio en disco. Tus enlaces se mantendrán en la biblioteca como marcadores online.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={async () => {
                  await deleteAllOfflineBlobs();
                  setShowDeleteOnlyOfflineModal(false);
                }}
                className="flex-1 rounded-xl bg-amber-500 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
              >
                Liberar espacio
              </button>
              <button
                onClick={() => setShowDeleteOnlyOfflineModal(false)}
                className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-semibold text-slate-300 hover:bg-white/20 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete All Videos */}
      {showDeleteAllVideosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/40 bg-[#160f18] p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <h4 className="text-sm font-bold text-white">Eliminar todos los videos</h4>
            </div>
            <p className="text-xs text-slate-300">
              ¿Confirmas eliminar todos los videos guardados en tu biblioteca y almacenamiento?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={async () => {
                  await deleteAllVideos();
                  setShowDeleteAllVideosModal(false);
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-500 transition"
              >
                Eliminar videos
              </button>
              <button
                onClick={() => setShowDeleteAllVideosModal(false)}
                className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-semibold text-slate-300 hover:bg-white/20 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete All Audios */}
      {showDeleteAllAudiosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/40 bg-[#160f18] p-5 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <h4 className="text-sm font-bold text-white">Eliminar todos los audios</h4>
            </div>
            <p className="text-xs text-slate-300">
              ¿Confirmas eliminar todos los audios guardados en tu biblioteca y almacenamiento?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={async () => {
                  await deleteAllAudios();
                  setShowDeleteAllAudiosModal(false);
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-500 transition"
              >
                Eliminar audios
              </button>
              <button
                onClick={() => setShowDeleteAllAudiosModal(false)}
                className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-semibold text-slate-300 hover:bg-white/20 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showDeleteBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101625] p-5 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber-400 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <h4 className="text-sm font-bold text-white">Confirmar eliminación múltiple</h4>
            </div>
            <p className="text-xs text-slate-300">
              Se eliminarán {selectedIds.length} elemento(s) de tu biblioteca y almacenamiento.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={executeBatchDelete}
                className="flex-1 rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-500 transition"
              >
                Confirmar
              </button>
              <button
                onClick={() => setShowDeleteBatchModal(false)}
                className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-semibold text-slate-300 hover:bg-white/20 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/40 bg-[#140e1b] p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 mb-3">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h4 className="text-base font-bold text-white">¿Limpiar toda la biblioteca?</h4>
            <p className="mt-2 text-xs text-slate-300">
              Esta acción eliminará todos los archivos multimedia, descargas y marcadores almacenados en este dispositivo. Esta acción no se puede deshacer.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={async () => {
                  await clearAll();
                  setShowClearAllModal(false);
                }}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-500 transition"
              >
                Sí, limpiar todo
              </button>
              <button
                onClick={() => setShowClearAllModal(false)}
                className="flex-1 rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/20 transition"
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
