import React, { useState } from 'react';
import { Sparkles, Music, Plus, X, Check } from 'lucide-react';
import { preferencesManager } from '../../services/preferencesManager';

interface OnboardingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSave?: (interests: string[]) => void;
  onStart?: () => void;
  initialInterests?: string[];
}

const POPULAR_SUGGESTIONS = [
  'Duki',
  'Coldplay',
  'Bizarrap',
  'Bad Bunny',
  'Taylor Swift',
  'Queen',
  'Rock Nacional',
  'Cuarteto',
  'Lofi Hip Hop',
  'Milo J',
  'Eminem',
  'Wos',
  'Cazzu',
  'The Beatles',
  'Musica para estudiar',
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onStart,
  initialInterests = [],
}) => {
  const [internalOpen, setInternalOpen] = useState(() => {
    return typeof window !== 'undefined' && !localStorage.getItem('sharemusic_onboarded');
  });

  const isVisible = isOpen !== undefined ? isOpen : internalOpen;

  const handleClose = () => {
    if (onClose) onClose();
    else setInternalOpen(false);
  };

  const [selectedInterests, setSelectedInterests] = useState<string[]>(() => {
    if (initialInterests.length > 0) return initialInterests;
    const prefs = preferencesManager.getPreferences();
    if (prefs.likedArtists && prefs.likedArtists.length > 0) return prefs.likedArtists;
    return ['Coldplay', 'Duki', 'Lofi Hip Hop'];
  });

  const [customInput, setCustomInput] = useState('');

  if (!isVisible) return null;

  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;

    // Support comma separated
    const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
    const newItems = parts.filter((p) => !selectedInterests.includes(p));

    if (newItems.length > 0) {
      setSelectedInterests([...selectedInterests, ...newItems]);
    }
    setCustomInput('');
  };

  const handleToggleSuggestion = (item: string) => {
    if (selectedInterests.includes(item)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== item));
    } else {
      setSelectedInterests([...selectedInterests, item]);
    }
  };

  const handleRemoveInterest = (item: string) => {
    setSelectedInterests(selectedInterests.filter((i) => i !== item));
  };

  const handleSaveAndStart = () => {
    preferencesManager.setLikedArtists(selectedInterests);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sharemusic_onboarded', 'true');
    }
    onSave?.(selectedInterests);
    if (onStart) onStart();
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl animate-fade-in">
      <div className="flex flex-col w-full max-w-lg rounded-3xl border border-white/10 bg-[#0f1422] p-5 sm:p-7 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Personaliza tu música</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Tus Gustos Musicales
            </h2>
            <p className="text-xs text-slate-400">
              Escribe tus cantantes, bandas o géneros preferidos para que aparezcan en tu inicio listos para escuchar y descargar offline.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Custom Input */}
        <form onSubmit={handleAddCustom} className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Escribe un cantante, banda o video:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Ej: Duki, Queen, Cuarteto..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar</span>
            </button>
          </div>
        </form>

        {/* Selected Tags */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400">Tus seleccionados:</span>
          <div className="flex flex-wrap gap-1.5 min-h-[36px] max-h-32 overflow-y-auto p-2 rounded-xl bg-white/[0.02] border border-white/5">
            {selectedInterests.length === 0 ? (
              <span className="text-xs text-slate-500 italic p-1">No has seleccionado ninguno todavía. Elige de la lista abajo.</span>
            ) : (
              selectedInterests.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-300"
                >
                  <Music className="h-3 w-3" />
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(item)}
                    className="hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Popular Suggestions */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400">Sugerencias populares (toca para agregar):</span>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
            {POPULAR_SUGGESTIONS.map((item) => {
              const isSelected = selectedInterests.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleToggleSuggestion(item)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                  <span>{item}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
          >
            Saltar
          </button>
          <button
            type="button"
            onClick={handleSaveAndStart}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 transition"
          >
            <span>Guardar gustos y continuar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
