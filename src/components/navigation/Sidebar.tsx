import React from 'react';
import { NavTab } from './BottomBar';
import {
  Home,
  Library,
  Download,
  Star,
  FolderKanban,
  HardDrive,
  Settings,
  PlusCircle,
  Database,
} from 'lucide-react';
import { formatBytes } from '../../utils/formatters';
import { StorageBreakdown } from '../../types/media';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  activeDownloadsCount: number;
  storageBreakdown: StorageBreakdown;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddModal,
  activeDownloadsCount,
  storageBreakdown,
}) => {
  const navItems: { tab: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { tab: 'dashboard', label: 'Inicio', icon: <Home className="h-5 w-5" /> },
    { tab: 'library', label: 'Biblioteca', icon: <Library className="h-5 w-5" /> },
    {
      tab: 'downloads',
      label: 'Descargas',
      icon: <Download className="h-5 w-5" />,
      badge: activeDownloadsCount > 0 ? activeDownloadsCount : undefined,
    },
    { tab: 'favorites', label: 'Favoritos', icon: <Star className="h-5 w-5" /> },
    { tab: 'categories', label: 'Categorías', icon: <FolderKanban className="h-5 w-5" /> },
    { tab: 'storage', label: 'Almacenamiento', icon: <HardDrive className="h-5 w-5" /> },
    { tab: 'settings', label: 'Ajustes', icon: <Settings className="h-5 w-5" /> },
  ];

  const percentUsed =
    storageBreakdown.quotaBytes > 0
      ? Math.min(100, Math.round((storageBreakdown.usedBytes / storageBreakdown.quotaBytes) * 100))
      : 5;

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-white/5 md:bg-[#0c101c]/80 md:backdrop-blur-xl">
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="space-y-6">
          {/* Add Content Big Action */}
          <button
            onClick={onOpenAddModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 px-4 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition active:scale-[0.98]"
          >
            <PlusCircle className="h-5 w-5 text-slate-950" />
            <span>AGREGAR CONTENIDO</span>
          </button>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.tab;
              return (
                <button
                  key={item.tab}
                  onClick={() => onSelectTab(item.tab)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 font-semibold shadow-inner shadow-emerald-500/10'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-black text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Storage Quick Widget */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              Almacenamiento
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              {formatBytes(storageBreakdown.usedBytes)}
            </span>
          </div>

          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${percentUsed}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{storageBreakdown.downloadedCount} descargados</span>
            <button
              onClick={() => onSelectTab('storage')}
              className="text-emerald-400 hover:underline font-medium"
            >
              Gestionar
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
