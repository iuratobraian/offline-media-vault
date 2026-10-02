import React, { useState } from 'react';
import { useMedia } from '../../context/MediaContext';
import { Category } from '../../types/media';
import { X, Plus, Trash2, FolderPlus } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_PRESETS = ['🎵', '🎬', '🎙️', '🎧', '📚', '💼', '🔥', '🎮', '🏋️', '🧠', '✈️', '🌟', '🧘', '📻'];
const COLOR_PRESETS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

export const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose }) => {
  const { categories, createCategory, removeCategory } = useMedia();

  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎵');
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Escribe un nombre para la categoría.');
      return;
    }

    const id = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (categories.some((c) => c.id === id)) {
      setError('Ya existe una categoría con este nombre.');
      return;
    }

    const newCat: Category = {
      id,
      name: name.trim(),
      icon: selectedEmoji,
      color: selectedColor,
      isDefault: false,
    };

    await createCategory(newCat);
    setName('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl border border-white/10 bg-[#0e1424] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Gestionar Categorías</h3>
              <p className="text-xs text-slate-400">Organiza tu contenido multimedia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* New Category Form */}
          <form onSubmit={handleCreate} className="space-y-3 rounded-2xl bg-white/[0.02] p-4 border border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Crear nueva categoría
            </h4>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="Ej. Cursos, Efectos de sonido..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Emoji Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Ícono</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_PRESETS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition ${
                      selectedEmoji === emoji
                        ? 'bg-emerald-500/30 border border-emerald-500 scale-110'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Color de etiqueta</label>
              <div className="flex gap-2">
                {COLOR_PRESETS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    className={`h-6 w-6 rounded-full transition ${
                      selectedColor === col ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-rose-400">{error}</p>}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Guardar categoría</span>
            </button>
          </form>

          {/* Current Categories List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Categorías activas ({categories.length})
            </h4>
            <div className="divide-y divide-white/5 rounded-2xl border border-white/5 bg-white/[0.01]">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-xs sm:text-sm font-medium text-white">{cat.name}</span>
                    {cat.isDefault && (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-slate-400">
                        Por defecto
                      </span>
                    )}
                  </div>

                  {!cat.isDefault && (
                    <button
                      onClick={() => removeCategory(cat.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
