import React, { useState } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { HardDrive, Download, Sparkles, Smartphone, Check, FolderSearch } from 'lucide-react';

interface NavbarProps {
  onOpenAddModal: () => void;
  onOpenFolderScanModal?: () => void;
  activeDownloadsCount: number;
  onNavigateToDownloads: () => void;
  onNavigateToStorage: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddModal,
  onOpenFolderScanModal,
  activeDownloadsCount,
  onNavigateToDownloads,
  onNavigateToStorage,
}) => {
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/5 bg-[#090d16]/90 backdrop-blur-xl pt-[var(--sat)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 shadow-md shadow-emerald-500/20">
            <span className="text-lg font-black tracking-tighter text-white">MV</span>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span
                className={`inline-flex h-full w-full rounded-full ${
                  isOnline ? 'bg-emerald-400' : 'bg-rose-500'
                } ring-2 ring-[#090d16]`}
              />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">
                Offline Media Vault
              </h1>
              {/* Online / Offline Pill */}
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
                  isOnline
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                />
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              Tu biblioteca personal de audio y video offline
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active downloads counter pill */}
          {activeDownloadsCount > 0 && (
            <button
              onClick={onNavigateToDownloads}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition active:scale-95"
              title="Descargas activas"
            >
              <Download className="h-3.5 w-3.5 animate-bounce text-indigo-400" />
              <span>{activeDownloadsCount}</span>
            </button>
          )}

          {/* Quick Storage button */}
          <button
            onClick={onNavigateToStorage}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition active:scale-95"
            title="Almacenamiento"
          >
            <HardDrive className="h-3.5 w-3.5 text-emerald-400" />
            <span>Espacio</span>
          </button>

          {/* PWA Install Button */}
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-500 transition active:scale-95"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Instalar app</span>
              <span className="sm:hidden">Instalar</span>
            </button>
          )}

          {!isInstalled && isIOS && !isInstallable && (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition active:scale-95"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Instalar en iOS</span>
            </button>
          )}

          {/* Escanear Carpeta Quick Button */}
          {onOpenFolderScanModal && (
            <button
              onClick={onOpenFolderScanModal}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/60 transition active:scale-95"
              title="Escanear y sincronizar carpeta local"
            >
              <FolderSearch className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Escanear Carpeta</span>
              <span className="sm:hidden">Escanear</span>
            </button>
          )}

          {/* + AGREGAR Desktop Quick Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400 transition active:scale-95"
          >
            <span className="text-base leading-none font-extrabold">+</span>
            <span className="hidden sm:inline">AGREGAR CONTENIDO</span>
            <span className="sm:hidden">Agregar</span>
          </button>
        </div>
      </div>

      {/* iOS Install Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#101625] p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instalar en iPhone / iPad</h3>
                <p className="text-xs text-slate-400">Funciona offline desde tu pantalla de inicio</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-xl bg-white/5 p-4 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400">
                  1
                </span>
                <p>
                  Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba)
                  en la barra de Safari.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400">
                  2
                </span>
                <p>
                  Desliza hacia abajo y selecciona <strong>Agregar a pantalla de inicio</strong>.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-400">
                  3
                </span>
                <p>Abre la app instalada para usarla sin conexión a Internet.</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition active:scale-95"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
