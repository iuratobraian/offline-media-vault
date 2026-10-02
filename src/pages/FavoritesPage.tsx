import React from 'react';
import { useMedia } from '../context/MediaContext';
import { MediaCard } from '../components/library/MediaCard';
import { Star, PlusCircle, Sparkles } from 'lucide-react';

interface FavoritesPageProps {
  onOpenAddModal: () => void;
  onNavigateToLibrary: () => void;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({
  onOpenAddModal,
  onNavigateToLibrary,
}) => {
  const { mediaItems } = useMedia();
  const favoriteItems = mediaItems.filter((m) => m.favorite);

  return (
    <div className="space-y-4 pb-24 sm:pb-16 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <Star className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-white">Tus Favoritos</h2>
            <p className="text-xs text-slate-400">
              {favoriteItems.length} elemento(s) destacados en tu colección
            </p>
          </div>
        </div>
      </div>

      {favoriteItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {favoriteItems.map((item) => (
            <MediaCard key={item.id} item={item} allQueue={favoriteItems} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
            <Star className="h-6 w-6" />
          </div>
          <h4 className="text-base font-bold text-white">No tienes favoritos aún</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Haz clic en la estrella ⭐ en cualquier canción o video para agregarlo a esta lista de
            acceso rápido.
          </p>
          <div className="pt-2">
            <button
              onClick={onNavigateToLibrary}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              Explorar biblioteca
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
