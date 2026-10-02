import React from 'react';
import { Home, Library, PlusCircle, Star, Settings, Download } from 'lucide-react';

export type NavTab = 'dashboard' | 'library' | 'downloads' | 'favorites' | 'categories' | 'storage' | 'settings';

interface BottomBarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  activeDownloadsCount: number;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddModal,
  activeDownloadsCount,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block md:hidden border-t border-white/5 bg-[#090d16]/95 backdrop-blur-xl pb-[var(--sab)]">
      <div className="flex h-16 items-center justify-around px-2">
        {/* Inicio */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-all ${
            currentTab === 'dashboard'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="h-5 w-5" strokeWidth={currentTab === 'dashboard' ? 2.5 : 1.75} />
          <span className="text-[10px] mt-1">Inicio</span>
        </button>

        {/* Biblioteca */}
        <button
          onClick={() => onSelectTab('library')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-all ${
            currentTab === 'library'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Library className="h-5 w-5" strokeWidth={currentTab === 'library' ? 2.5 : 1.75} />
          <span className="text-[10px] mt-1">Biblioteca</span>
        </button>

        {/* ➕ AGREGAR Center Button */}
        <button
          onClick={onOpenAddModal}
          className="group relative -top-3 flex flex-col items-center justify-center focus:outline-none"
          aria-label="Agregar contenido"
        >
          <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 group-active:scale-95 transition-transform">
            <PlusCircle className="h-7 w-7 text-slate-950 fill-none" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-bold text-emerald-400 mt-0.5">Agregar</span>
        </button>

        {/* Descargas or Favoritos */}
        {activeDownloadsCount > 0 ? (
          <button
            onClick={() => onSelectTab('downloads')}
            className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-all ${
              currentTab === 'downloads'
                ? 'text-indigo-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="h-5 w-5 animate-pulse" strokeWidth={2.2} />
            <span className="text-[10px] mt-1">Descargas</span>
            <span className="absolute top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-black text-white">
              {activeDownloadsCount}
            </span>
          </button>
        ) : (
          <button
            onClick={() => onSelectTab('favorites')}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-all ${
              currentTab === 'favorites'
                ? 'text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star className="h-5 w-5" strokeWidth={currentTab === 'favorites' ? 2.5 : 1.75} />
            <span className="text-[10px] mt-1">Favoritos</span>
          </button>
        )}

        {/* Ajustes */}
        <button
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 transition-all ${
            currentTab === 'settings'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="h-5 w-5" strokeWidth={currentTab === 'settings' ? 2.5 : 1.75} />
          <span className="text-[10px] mt-1">Ajustes</span>
        </button>
      </div>
    </nav>
  );
};
