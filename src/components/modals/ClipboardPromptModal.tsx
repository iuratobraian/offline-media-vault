import React from 'react';
import { Youtube, Download, X, ListMusic } from 'lucide-react';

interface ClipboardPromptModalProps {
  url: string;
  isPlaylist: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export const ClipboardPromptModal: React.FC<ClipboardPromptModalProps> = ({
  url,
  isPlaylist,
  onConfirm,
  onDismiss,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1422] p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400">
              {isPlaylist ? <ListMusic className="h-6 w-6" /> : <Youtube className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isPlaylist ? '¡Playlist de YouTube detectada!' : '¡Enlace de YouTube detectado!'}
              </h3>
              <p className="text-xs text-slate-400">
                Copiado en tu portapapeles
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs font-mono text-slate-300 truncate">
          {url}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {isPlaylist
            ? 'Detectamos una lista de reproducción. Puedes ver todos los videos y elegir cuáles descargar.'
            : '¿Deseas descargar este audio o video ahora para tenerlo disponible sin conexión?'}
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-300 transition active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>{isPlaylist ? 'Explorar y descargar playlist' : 'Descargar contenido'}</span>
          </button>
          <button
            onClick={onDismiss}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-white/10 transition"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
};
