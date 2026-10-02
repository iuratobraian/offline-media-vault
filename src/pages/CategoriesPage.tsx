import React from 'react';
import { useMedia } from '../context/MediaContext';
import { FolderKanban, Plus, ArrowRight, Trash2 } from 'lucide-react';

interface CategoriesPageProps {
  onOpenCategoryModal: () => void;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  onOpenCategoryModal,
  onSelectCategory,
}) => {
  const { categories, mediaItems, removeCategory } = useMedia();

  const getCategoryCount = (id: string) => {
    return mediaItems.filter((m) => m.category === id).length;
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-16 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-white">Categorías</h2>
            <p className="text-xs text-slate-400">
              {categories.length} categorías configuradas para tu biblioteca
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCategoryModal}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Nueva categoría</span>
        </button>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {categories.map((cat) => {
          const count = getCategoryCount(cat.id);
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="group relative flex items-center justify-between rounded-2xl border border-white/10 bg-[#0f1422] p-4 hover:border-emerald-500/40 hover:bg-[#131a2c] transition cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-md transition-transform group-hover:scale-105"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  {cat.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {count} {count === 1 ? 'archivo' : 'archivos'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!cat.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
                        removeCategory(cat.id);
                      }
                    }}
                    className="p-2 text-slate-500 hover:text-rose-400 transition"
                    title="Eliminar categoría"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
