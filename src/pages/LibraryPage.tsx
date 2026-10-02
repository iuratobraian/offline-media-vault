import React from 'react';
import { useMedia } from '../context/MediaContext';
import { FilterOption, SortOption } from '../types/media';
import { MediaCard } from '../components/library/MediaCard';
import { MediaListRow } from '../components/library/MediaListRow';
import {
  Search,
  LayoutGrid,
  List,
  FolderOpen,
  PlusCircle,
  X,
  Music,
  Video,
  CheckCircle2,
  Star,
  Clock,
  Sparkles,
  Tag,
  WifiOff,
  Globe,
  Download,
  FolderSearch,
} from 'lucide-react';

interface LibraryPageProps {
  onOpenAddModal: () => void;
  onOpenFolderScanModal?: () => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ onOpenAddModal, onOpenFolderScanModal }) => {
  const {
    filteredItems,
    mediaItems,
    categories,
    allTags,
    searchQuery,
    selectedFilter,
    selectedCategory,
    selectedTag,
    sortOption,
    viewMode,
    downloadTasks,
    setSearchQuery,
    setSelectedFilter,
    setSelectedCategory,
    setSelectedTag,
    setSortOption,
    setViewMode,
    loadSampleData,
  } = useMedia();

  const offlineCount = mediaItems.filter((m) => m.isOffline || m.hasLocalBlob).length;
  const audioCount = mediaItems.filter((m) => m.mediaType === 'audio').length;
  const videoCount = mediaItems.filter((m) => m.mediaType === 'video').length;
  const favoritesCount = mediaItems.filter((m) => m.favorite).length;
  const activeDownloadsCount = downloadTasks.filter(
    (t) => t.status === 'downloading' || t.status === 'preparing'
  ).length;

  // Section 15: TODO, AUDIO, VIDEO, OFFLINE, FAVORITOS, DESCARGAS
  const filterTabs: { id: FilterOption; label: string; count?: number; icon?: React.ReactNode }[] = [
    { id: 'all', label: 'TODO', count: mediaItems.length },
    { id: 'audio', label: 'AUDIO', count: audioCount, icon: <Music className="h-3.5 w-3.5 text-emerald-400" /> },
    { id: 'video', label: 'VIDEO', count: videoCount, icon: <Video className="h-3.5 w-3.5 text-indigo-400" /> },
    { id: 'offline', label: 'OFFLINE', count: offlineCount, icon: <WifiOff className="h-3.5 w-3.5 text-emerald-400" /> },
    { id: 'favorites', label: 'FAVORITOS', count: favoritesCount, icon: <Star className="h-3.5 w-3.5 text-amber-400" /> },
    {
      id: 'downloads',
      label: 'DESCARGAS',
      count: activeDownloadsCount > 0 ? activeDownloadsCount : offlineCount,
      icon: <Download className="h-3.5 w-3.5 text-sky-400" />,
    },
  ];

  const sortOptions: { id: SortOption; label: string }[] = [
    { id: 'recent', label: 'Más recientes' },
    { id: 'oldest', label: 'Más antiguos' },
    { id: 'alpha_asc', label: 'Nombre A-Z' },
    { id: 'alpha_desc', label: 'Nombre Z-A' },
    { id: 'size_desc', label: 'Mayor tamaño' },
    { id: 'size_asc', label: 'Menor tamaño' },
    { id: 'last_played', label: 'Última reproducción' },
  ];

  return (
    <div className="space-y-4 pb-24 sm:pb-16 animate-fade-in">
      {/* Top Search & Layout Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, proveedor, categoría, formato o #tag..."
            className="w-full rounded-2xl border border-white/10 bg-[#0f1422] py-2.5 pl-10 pr-10 text-xs sm:text-sm text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Sort & View Mode Switcher */}
        <div className="flex items-center gap-2">
          {/* Sort Selector */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="w-full rounded-xl border border-white/10 bg-[#0f1422] py-2.5 px-3 text-xs font-semibold text-slate-300 focus:border-emerald-500 focus:outline-none"
            >
              {sortOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Grid / List View Toggle */}
          <div className="flex rounded-xl border border-white/10 bg-[#0f1422] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vista de cuadrícula"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Vista de lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Filter Tabs - Section 15 */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive ? 'bg-slate-950/30 text-slate-950' : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Category Pills Bar */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider pl-1 pr-1 shrink-0">
          Categoría:
        </span>
        <button
          onClick={() => setSelectedCategory('all')}
          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
            selectedCategory === 'all'
              ? 'bg-white/15 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Todas
        </button>
        {categories.map((cat) => {
          const isCatActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs transition ${
                isCatActive
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tags Chips Filter Bar (if tags exist) */}
      {allTags.length > 0 && (
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
          <Tag className="h-3 w-3 text-slate-500 shrink-0 ml-1" />
          {allTags.map((tag) => {
            const isTagActive = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setSelectedTag(isTagActive ? null : tag)}
                className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] transition ${
                  isTagActive
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-bold'
                    : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Header Results Info */}
      <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span>
            Mostrando <strong>{filteredItems.length}</strong> de {mediaItems.length} elementos
          </span>
          {onOpenFolderScanModal && (
            <button
              onClick={onOpenFolderScanModal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
              title="Escanear y agregar canciones de tu carpeta"
            >
              <FolderSearch className="h-3 w-3 text-emerald-400" />
              <span>Escanear carpeta</span>
            </button>
          )}
        </div>
        {(searchQuery || selectedCategory !== 'all' || selectedTag || selectedFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedTag(null);
              setSelectedFilter('all');
            }}
            className="text-emerald-400 hover:underline font-medium"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Library Grid or List */}
      {filteredItems.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredItems.map((item) => (
              <MediaCard key={item.id} item={item} allQueue={filteredItems} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <MediaListRow key={item.id} item={item} allQueue={filteredItems} />
            ))}
          </div>
        )
      ) : (
        /* Empty results state */
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-slate-400">
            <Search className="h-6 w-6" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-white">
            No se encontraron elementos
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {mediaItems.length === 0
              ? 'Aún no tienes contenidos guardados. Agrega un archivo para empezar.'
              : 'Ningún elemento coincide con tus criterios de búsqueda o filtros activos.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {onOpenFolderScanModal && (
              <button
                onClick={onOpenFolderScanModal}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 transition"
              >
                <FolderSearch className="h-3.5 w-3.5 text-slate-950" />
                <span>Escanear carpeta local</span>
              </button>
            )}
            <button
              onClick={onOpenAddModal}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 transition"
            >
              + Agregar contenido
            </button>
            {mediaItems.length === 0 && (
              <button
                onClick={loadSampleData}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/10 transition"
              >
                Cargar demos
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
