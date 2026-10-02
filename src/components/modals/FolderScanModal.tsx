import React, { useState, useRef } from 'react';
import { useMedia } from '../../context/MediaContext';
import { usePlayer } from '../../context/PlayerContext';
import {
  scanDirectoryWithPicker,
  scanFilesFromInput,
  isDirectoryPickerSupported,
  ScanProgress,
  ScanResult,
} from '../../services/folderScanner';
import {
  X,
  FolderSearch,
  HardDriveDownload,
  FolderOpen,
  FileCheck,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Music,
  Video,
} from 'lucide-react';

interface FolderScanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FolderScanModal: React.FC<FolderScanModalProps> = ({ isOpen, onClose }) => {
  const { categories, refreshMedia } = useMedia();
  const { playItem } = usePlayer();

  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('musica');
  const [autoPlayOnFinish, setAutoPlayOnFinish] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const filesInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleStartDirectoryPicker = async () => {
    setErrorMsg(null);
    setResult(null);
    setIsScanning(true);

    try {
      const scanRes = await scanDirectoryWithPicker((p) => {
        setProgress(p);
      }, selectedCategory);

      setResult(scanRes);
      await refreshMedia();

      if (autoPlayOnFinish && scanRes.newImported.length > 0) {
        await playItem(scanRes.newImported[0]);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMsg(err.message || 'Error al escanear la carpeta.');
      }
    } finally {
      setIsScanning(false);
      setProgress(null);
    }
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setErrorMsg(null);
    setResult(null);
    setIsScanning(true);

    try {
      const scanRes = await scanFilesFromInput(fileList, (p) => {
        setProgress(p);
      }, selectedCategory);

      setResult(scanRes);
      await refreshMedia();

      if (autoPlayOnFinish && scanRes.newImported.length > 0) {
        await playItem(scanRes.newImported[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar archivos.');
    } finally {
      setIsScanning(false);
      setProgress(null);
    }
  };

  const handlePlayFirstImported = async () => {
    if (result && result.newImported.length > 0) {
      await playItem(result.newImported[0]);
      onClose();
    }
  };

  const resetModal = () => {
    setIsScanning(false);
    setProgress(null);
    setResult(null);
    setErrorMsg(null);
  };

  const hasNativeDirectory = isDirectoryPickerSupported();
  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col rounded-3xl border border-white/10 bg-[#0d1322] shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <FolderSearch className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Escanear Carpeta Local</h2>
              <p className="text-xs text-slate-400">Detecta y sincroniza tu música y videos automáticamente</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              resetModal();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Hidden HTML file inputs for cross-platform fallback */}
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <input
          ref={filesInputRef}
          type="file"
          multiple
          accept="audio/*,video/*,.mp3,.wav,.ogg,.m4a,.aac,.opus,.flac,.mp4,.webm,.mov,.mkv"
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Explanation Info */}
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Sincronización 100% Offline Garantizada</span>
            </div>
            <p className="text-emerald-200/90 leading-relaxed text-[11px] sm:text-xs">
              Los archivos de tu carpeta se indexan y guardan físicamente en el almacenamiento de tu navegador (IndexedDB). Podrás abrir la app y reproducirlos en <strong>Modo Avión</strong> y sin conexión a internet.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Active Scanning Progress */}
          {isScanning && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>{progress?.statusText || 'Escaneando archivos multimedia...'}</span>
                <span className="font-mono text-emerald-400">{progressPercent}%</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {progress && progress.total > 0 && (
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-[240px] font-mono">{progress.currentFileName}</span>
                  <span className="font-mono">{progress.current} de {progress.total}</span>
                </div>
              )}
            </div>
          )}

          {/* Scan Results View */}
          {result && !isScanning && (
            <div className="rounded-2xl border border-emerald-500/30 bg-white/[0.02] p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">¡Escaneo completado!</h3>
                  <p className="text-xs text-slate-400">
                    Se procesaron {result.totalScanned} archivos multimedia
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <span className="block text-[11px] font-semibold text-emerald-400">NUEVOS IMPORTADOS</span>
                  <span className="text-lg font-black text-emerald-300">{result.newImported.length}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="block text-[11px] font-semibold text-slate-400">YA EN BIBLIOTECA</span>
                  <span className="text-lg font-black text-slate-200">{result.alreadyExistingCount}</span>
                </div>
              </div>

              {result.newImported.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Archivos listos para reproducir:
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-white/10 bg-white/5 p-2">
                    {result.newImported.slice(0, 10).map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs text-slate-300 py-1 px-1.5 rounded hover:bg-white/5">
                        <div className="flex items-center gap-2 truncate">
                          {item.mediaType === 'video' ? (
                            <Video className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          ) : (
                            <Music className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          )}
                          <span className="truncate">{item.title}</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold shrink-0 ml-2">✓ Offline</span>
                      </div>
                    ))}
                    {result.newImported.length > 10 && (
                      <p className="text-[10px] text-slate-400 text-center pt-1">
                        ...y {result.newImported.length - 10} archivo(s) más.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {result.newImported.length > 0 && (
                  <button
                    type="button"
                    onClick={handlePlayFirstImported}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400 transition active:scale-95"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>REPRODUCIR AHORA</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    resetModal();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 transition active:scale-95"
                >
                  <FileCheck className="h-4 w-4 text-emerald-400" />
                  <span>VER EN BIBLIOTECA</span>
                </button>
              </div>
            </div>
          )}

          {/* Action triggers when not scanning and no result */}
          {!isScanning && !result && (
            <div className="space-y-4">
              {/* Category selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Asignar canciones nuevas a la categoría:
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#141b2d] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto play toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={autoPlayOnFinish}
                  onChange={(e) => setAutoPlayOnFinish(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Iniciar el reproductor automáticamente con la primera canción detectada</span>
              </label>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {hasNativeDirectory ? (
                  <button
                    type="button"
                    onClick={handleStartDirectoryPicker}
                    className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 px-4 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400 transition active:scale-98"
                  >
                    <FolderOpen className="h-5 w-5" />
                    <span>SELECCIONAR CARPETA Y ESCANEAR</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 px-4 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400 transition active:scale-98"
                  >
                    <FolderOpen className="h-5 w-5" />
                    <span>SELECCIONAR CARPETA DE DESCARGAS</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => filesInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-xs sm:text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white transition active:scale-98"
                >
                  <HardDriveDownload className="h-4 w-4 text-emerald-400" />
                  <span>SELECCIONAR ARCHIVOS MULTIMEDIA ESPECÍFICOS</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
