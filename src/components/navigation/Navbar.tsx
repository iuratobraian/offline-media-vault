import React, { useState } from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Smartphone, FolderSearch, Plus, Music } from 'lucide-react';

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
}) => {
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/5 bg-[#070b14]/90 backdrop-blur-xl pt-[var(--sat)]">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-6">
        {/* Brand: sharemusic + simple online/offline dot */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20">
            <Music className="h-5 w-5 stroke-[2.5]" />
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white lowercase">
              sharemusic
            </h1>

            {/* Simple online dot (green if on, red if off) */}
            <span
              className={`flex h-2.5 w-2.5 rounded-full ${
                isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'
              }`}
              title={isOnline ? 'Conectado a internet' : 'Modo offline'}
            />
          </div>
        </div>

        {/* Action Controls: minimalist icons only */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Active downloads counter pill */}
          {activeDownloadsCount > 0 && (
            <button
              onClick={onNavigateToDownloads}
              className="flex items-center gap-1 rounded-xl bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition active:scale-95"
              title="Descargas activas"
            >
              <Download className="h-3.5 w-3.5 animate-bounce text-indigo-400" />
              <span>{activeDownloadsCount}</span>
            </button>
          )}

          {/* PWA Install Button (Compact icon or pill) */}
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-500 transition active:scale-95"
              title="Instalar app"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          )}

          {!isInstalled && isIOS && !isInstallable && (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition active:scale-95"
              title="Instalar en pantalla de inicio de iPhone"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          )}

          {/* Escanear Carpeta (Solo icono) */}
          {onOpenFolderScanModal && (
            <button
              onClick={onOpenFolderScanModal}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition active:scale-95"
              title="Escanear carpeta de música"
            >
              <FolderSearch className="h-4 w-4 text-emerald-400" />
            </button>
          )}

          {/* + AGREGAR (Solo icono) */}
          <button
            onClick={onOpenAddModal}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 hover:scale-105 transition active:scale-95"
            title="Agregar o descargar contenido"
          >
            <Plus className="h-5 w-5 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* iOS Install Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0e1424] p-6 text-center space-y-4 shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
              <Smartphone className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Instalar sharemusic en tu iPhone</h3>
            <p className="text-xs text-slate-300 leading-relaxed text-left space-y-2">
              1. En Safari, toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba en la barra inferior).<br /><br />
              2. Desplázate hacia abajo y selecciona <strong>"Agregar al inicio"</strong>.<br /><br />
              3. Toca <strong>Agregar</strong> en la esquina superior derecha.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
