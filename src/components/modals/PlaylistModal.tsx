import React, { useState, useEffect } from 'react';
import { Playlist, MediaItem } from '../../types/media';
import { getAllPlaylists, savePlaylist, deletePlaylist } from '../../database/db';
import { useMedia } from '../../context/MediaContext';
import { usePlayer } from '../../context/PlayerContext';
import { ListMusic, Plus, Trash2, Play, Check, X, Music } from 'lucide-react';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetMediaItem?: MediaItem | null; // If provided, user is adding this item to a playlist
}

export const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  targetMediaItem,
}) => {
  const { mediaItems } = useMedia();
  const { playItem } = usePlayer();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadPlaylists = async () => {
    const list = await getAllPlaylists();
    setPlaylists(list);
    if (!selectedPlaylistId && list.length > 0) {
      setSelectedPlaylistId(list[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const newP: Playlist = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: newPlaylistName.trim(),
      itemIds: targetMediaItem ? [targetMediaItem.id] : [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await savePlaylist(newP);
    setNewPlaylistName('');
    setIsCreating(false);
    await loadPlaylists();
    setSelectedPlaylistId(newP.id);
  };

  const handleDeletePlaylist = async (id: string, name: string) => {
    if (confirm(`¿Eliminar la playlist "${name}"?`)) {
      await deletePlaylist(id);
      await loadPlaylists();
      if (selectedPlaylistId === id) {
        setSelectedPlaylistId(null);
      }
    }
  };

  const handleToggleSongInPlaylist = async (playlist: Playlist, itemId: string) => {
    const hasItem = playlist.itemIds.includes(itemId);
    const updatedIds = hasItem
      ? playlist.itemIds.filter((id) => id !== itemId)
      : [...playlist.itemIds, itemId];

    const updated: Playlist = {
      ...playlist,
      itemIds: updatedIds,
      updatedAt: Date.now(),
    };

    await savePlaylist(updated);
    await loadPlaylists();
  };

  const handlePlayPlaylist = (playlist: Playlist) => {
    const songs = mediaItems.filter((m) => playlist.itemIds.includes(m.id));
    if (songs.length > 0) {
      playItem(songs[0], songs);
      onClose();
    }
  };

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);
  const selectedPlaylistSongs = selectedPlaylist
    ? mediaItems.filter((m) => selectedPlaylist.itemIds.includes(m.id))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-xl animate-fade-in">
      <div className="flex flex-col h-full max-h-[85vh] w-full max-w-xl rounded-3xl border border-white/10 bg-[#0f1422] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
              <ListMusic className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {targetMediaItem
                  ? `Agregar "${targetMediaItem.title.slice(0, 24)}..." a playlist`
                  : 'Tus Playlists'}
              </h3>
              <p className="text-xs text-slate-400">
                {playlists.length} playlist(s) creadas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Create new playlist trigger */}
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-3 text-xs font-semibold text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition"
            >
              <Plus className="h-4 w-4" />
              <span>+ Crear Nueva Playlist</span>
            </button>
          ) : (
            <form onSubmit={handleCreatePlaylist} className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Nombre de la nueva playlist..."
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </form>
          )}

          {/* If target media item: quick check to add/remove from playlists */}
          {targetMediaItem && playlists.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400">Selecciona las playlists donde incluir esta canción:</span>
              <div className="space-y-1.5">
                {playlists.map((pl) => {
                  const hasSong = pl.itemIds.includes(targetMediaItem.id);
                  return (
                    <div
                      key={pl.id}
                      onClick={() => handleToggleSongInPlaylist(pl, targetMediaItem.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                        hasSong
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${hasSong ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-slate-400'}`}>
                          {hasSong ? <Check className="h-4 w-4" /> : <Music className="h-4 w-4" />}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-white">{pl.name}</h4>
                          <p className="text-[10px] text-slate-400">{pl.itemIds.length} canciones</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400">
                        {hasSong ? 'Incluido ✓' : '+ Agregar'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* General playlist view (when not adding a specific target item) */}
          {!targetMediaItem && (
            <div className="space-y-3">
              {playlists.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No tienes playlists aún. Crea una arriba para organizar tu música.
                </div>
              ) : (
                playlists.map((pl) => {
                  const isSelected = selectedPlaylistId === pl.id;
                  const count = pl.itemIds.length;
                  return (
                    <div
                      key={pl.id}
                      className="rounded-2xl border border-white/5 bg-white/[0.02] p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div
                          onClick={() => setSelectedPlaylistId(isSelected ? null : pl.id)}
                          className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400">
                            <ListMusic className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{pl.name}</h4>
                            <p className="text-[11px] text-slate-400">{count} canciones</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {count > 0 && (
                            <button
                              onClick={() => handlePlayPlaylist(pl)}
                              className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" />
                              <span>Reproducir</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePlaylist(pl.id, pl.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                            title="Eliminar playlist"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded songs */}
                      {isSelected && (
                        <div className="pt-2 border-t border-white/5 space-y-1.5">
                          {selectedPlaylistSongs.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic p-1">Esta playlist está vacía. Añade canciones tocando los tres puntos o la estrella en cualquier canción.</p>
                          ) : (
                            selectedPlaylistSongs.map((s, idx) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-black/30 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-slate-500 w-4 text-right">{idx + 1}</span>
                                  <span className="truncate text-slate-200">{s.title}</span>
                                </div>
                                <button
                                  onClick={() => handleToggleSongInPlaylist(pl, s.id)}
                                  className="text-slate-500 hover:text-rose-400 p-1"
                                  title="Quitar de playlist"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 bg-white/[0.02] flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-white/10 px-5 py-2 text-xs font-semibold text-white hover:bg-white/15"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
