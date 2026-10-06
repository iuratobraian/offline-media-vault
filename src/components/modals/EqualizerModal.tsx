import React, { useState } from 'react';
import {
  audioEqualizer,
  EQ_FREQUENCIES,
  EQ_PRESETS,
  EQPresetKey,
} from '../../services/audioEqualizer';
import { Sliders, X, Volume2, Sparkles, RotateCcw, Power } from 'lucide-react';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({ isOpen, onClose }) => {
  const [eqState, setEqState] = useState(() => audioEqualizer.getState());

  if (!isOpen) return null;

  const handleBandChange = (index: number, val: number) => {
    audioEqualizer.setBandGain(index, val);
    setEqState(audioEqualizer.getState());
  };

  const handlePresetSelect = (presetKey: EQPresetKey) => {
    audioEqualizer.setPreset(presetKey);
    setEqState(audioEqualizer.getState());
  };

  const handleToggleEq = () => {
    const next = !eqState.eqEnabled;
    audioEqualizer.setEqEnabled(next);
    setEqState(audioEqualizer.getState());
  };

  const handleToggleNormalize = () => {
    const next = !eqState.normalizeEnabled;
    audioEqualizer.setNormalizeEnabled(next);
    setEqState(audioEqualizer.getState());
  };

  const handleReset = () => {
    audioEqualizer.setPreset('plano');
    setEqState(audioEqualizer.getState());
  };

  const formatFreq = (freq: number) => {
    return freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0d1424] p-5 sm:p-7 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20">
              <Sliders className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>Ecualizador Paramétrico V2</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Web Audio API
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Ajusta el sonido a tu gusto y normaliza el volumen en tiempo real
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/15 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Master Controls: EQ Toggle & Volume Normalizer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* EQ Power Switch */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <Power className={`h-4 w-4 ${eqState.eqEnabled ? 'text-emerald-400' : 'text-slate-500'}`} />
              <div>
                <p className="text-xs font-semibold text-slate-200">Activar Ecualizador</p>
                <p className="text-[11px] text-slate-400">
                  {eqState.eqEnabled ? 'Encendido' : 'Bypass (Apagado)'}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleEq}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                eqState.eqEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  eqState.eqEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Normalizer Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-white/5 bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <Sparkles className={`h-4 w-4 ${eqState.normalizeEnabled ? 'text-amber-400' : 'text-slate-500'}`} />
              <div>
                <p className="text-xs font-semibold text-slate-200">Normalizar Volumen</p>
                <p className="text-[11px] text-slate-400">Compresor dinámico (Autolevel)</p>
              </div>
            </div>
            <button
              onClick={handleToggleNormalize}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                eqState.normalizeEnabled ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  eqState.normalizeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Presets Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Presets de Sonido</label>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-emerald-400 transition"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Restablecer</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(EQ_PRESETS) as EQPresetKey[]).map((key) => {
              const isSelected = eqState.currentPreset === key;
              return (
                <button
                  key={key}
                  onClick={() => handlePresetSelect(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    isSelected
                      ? 'bg-emerald-500 font-bold text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {EQ_PRESETS[key].name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 10-Band Sliders */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
            <span>+12 dB</span>
            <span>0 dB</span>
            <span>-12 dB</span>
          </div>

          <div
            className={`grid grid-cols-10 gap-1.5 sm:gap-3 p-4 rounded-2xl border border-white/5 bg-slate-900/60 transition-opacity ${
              eqState.eqEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            {EQ_FREQUENCIES.map((freq, index) => {
              const gainVal = eqState.gains[index];
              return (
                <div key={freq} className="flex flex-col items-center space-y-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-400">
                    {gainVal > 0 ? `+${gainVal}` : gainVal}
                  </span>

                  <div className="relative h-40 flex items-center justify-center">
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={1}
                      value={gainVal}
                      onChange={(e) => handleBandChange(index, parseFloat(e.target.value))}
                      className="h-36 w-2 appearance-none rounded-lg bg-slate-800 accent-emerald-400 cursor-pointer [writing-mode:vertical-lr] [direction:rtl]"
                    />
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 font-semibold">
                    {formatFreq(freq)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-white/5">
          <span className="flex items-center gap-1">
            <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Procesamiento 100% local en navegador</span>
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
