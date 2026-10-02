import React, { useState, useEffect } from 'react';
import { getSetting, setSetting } from '../../database/db';
import { Sparkles, Download, WifiOff, PlusCircle, ArrowRight, Check } from 'lucide-react';

interface OnboardingModalProps {
  onStart: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onStart }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    getSetting('hasSeenOnboarding', false).then((seen) => {
      if (!seen) {
        setIsOpen(true);
      }
    });
  }, []);

  if (!isOpen) return null;

  const handleComplete = async () => {
    await setSetting('hasSeenOnboarding', true);
    setIsOpen(false);
    onStart();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0e1424] p-6 sm:p-8 shadow-2xl text-center">
        {/* Glow decoration */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-emerald-500 to-indigo-600 shadow-xl shadow-emerald-500/25">
          <Sparkles className="h-8 w-8 text-white" />
        </div>

        <h2 className="mt-5 text-xl sm:text-2xl font-black tracking-tight text-white">
          Tu biblioteca multimedia offline
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-300">
          Guarda tus archivos autorizados y llévalos contigo.
        </p>

        {/* 3 Steps */}
        <div className="mt-6 space-y-3 text-left">
          <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">1. Agrega un contenido</h4>
              <p className="text-[11px] text-slate-400">
                Pega un enlace autorizado o importa desde tu dispositivo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">2. Descárgalo</h4>
              <p className="text-[11px] text-slate-400">
                Almacena el archivo físicamente en tu navegador con IndexedDB.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <WifiOff className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">3. Reprodúcelo sin conexión</h4>
              <p className="text-[11px] text-slate-400">
                Disfruta de audio y video sin necesidad de Internet ni datos móviles.
              </p>
            </div>
          </div>
        </div>

        {/* Button: Comenzar */}
        <button
          onClick={handleComplete}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-300 transition active:scale-[0.98]"
        >
          <span>Comenzar</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
