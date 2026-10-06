import React, { useState, useEffect } from 'react';
import { useMedia } from '../../context/MediaContext';
import { findDuplicateMediaItems, DuplicateGroup } from '../../services/duplicateFinder';
import { MediaItem } from '../../types/media';
import { formatBytes } from '../../utils/formatters';
import { CopyCheck, Trash2, CheckCircle2, AlertTriangle, X, Sparkles } from 'lucide-react';

interface DuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DuplicatesModal: React.FC<DuplicatesModalProps> = ({ isOpen, onClose }) => {
  const { mediaItems, deleteItem } = useMedia();
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [freedBytes, setFreedBytes] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const groups = findDuplicateMediaItems(mediaItems);
      setDuplicateGroups(groups);
    }
  }, [isOpen, mediaItems]);

  if (!isOpen) return null;

  const handleKeepItem = async (group: DuplicateGroup, itemToKeep: MediaItem) => {
    const toDelete = group.items.filter((i) => i.id !== itemToKeep.id);
    let freed = 0;
    for (const item of toDelete) {
      freed += item.size || 0;
      await deleteItem(item.id, false);
    }
    setFreedBytes((prev) => prev + freed);
    setDuplicateGroups((prev) => prev.filter((g) => g.key !== group.key));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0d1424] p-6 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/20">
              <CopyCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Limpieza de Duplicados</span>
                {freedBytes > 0 && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    +{formatBytes(freedBytes)} liberados
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Detecta y elimina fácilmente archivos repetidos para liberar almacenamiento
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/15 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content list */}
        {duplicateGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-400">
              <Sparkles className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-white">¡Tu biblioteca está limpia!</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              No se han encontrado archivos duplicados en tu almacenamiento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {duplicateGroups.map((group) => (
              <div
                key={group.key}
                className="p-4 rounded-2xl border border-white/5 bg-slate-900/70 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>{group.reason} ({group.items.length} copias)</span>
                  </span>
                </div>

                <div className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.thumbnail ? (
                          <img
                            src={item.thumbnail}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-slate-800 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-400">
                            {formatBytes(item.size)} • {item.mediaType.toUpperCase()}
                            {item.isOffline && (
                              <span className="ml-2 text-emerald-400 font-semibold">✓ Guardado Offline</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleKeepItem(group, item)}
                        className="flex items-center gap-1 rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 transition shrink-0"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Conservar este</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-white/5">
          <button
            onClick={onClose}
            className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
