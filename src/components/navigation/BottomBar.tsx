import React from 'react';
import { Home, Library, Plus, Star, Settings, Download } from 'lucide-react';

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
    <nav className="fixed bottom-0 left-0 right-0 z-40 block md:hidden border-t border-white/10 bg-[#070b14]/98 backdrop-blur-2xl pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex h-14 items-center justify-around px-2 pt-0.5">
        {/* Inicio */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'dashboard'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="h-5 w-5" strokeWidth={currentTab === 'dashboard' ? 2.5 : 1.75} />
          <span className="text-[10px] mt-0.5">Inicio</span>
        </button>

        {/* Biblioteca */}
        <button
          onClick={() => onSelectTab('library')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'library'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Library className="h-5 w-5" strokeWidth={currentTab === 'library' ? 2.5 : 1.75} />
          <span className="text-[10px] mt-0.5">Biblioteca</span>
        </button>

        {/* ➕ CENTER SIMPLE + BUTTON */}
        <button
          onClick={onOpenAddModal}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-90 transition-transform shrink-0 mx-1"
          aria-label="Agregar contenido"
        >
          <Plus className="h-6 w-6 stroke-[3]" />
        </button>

        {/* Descargas or Favoritos */}
        {activeDownloadsCount > 0 ? (
          <button
            onClick={() => onSelectTab('downloads')}
            className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              currentTab === 'downloads'
                ? 'text-indigo-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="h-5 w-5 animate-pulse" strokeWidth={2.2} />
            <span className="text-[10px] mt-0.5">Descargas</span>
            <span className="absolute top-0.5 right-3 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-black text-white">
              {activeDownloadsCount}
            </span>
          </button>
        ) : (
          <button
            onClick={() => onSelectTab('favorites')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              currentTab === 'favorites'
                ? 'text-amber-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star className="h-5 w-5" strokeWidth={currentTab === 'favorites' ? 2.5 : 1.75} />
            <span className="text-[10px] mt-0.5">Favoritos</span>
          </button>
        )}

        {/* Ajustes */}
        <button
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
            currentTab === 'settings'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="h-5 w-5" strokeWidth={currentTab === 'settings' ? 2.5 : 1.75} />
          <span className="text-[10px] mt-0.5">Ajustes</span>
        </button>
      </div>
    </nav>
  );
};
