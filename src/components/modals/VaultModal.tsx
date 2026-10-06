import React, { useState } from 'react';
import { vaultManager } from '../../services/vaultManager';
import { Lock, Unlock, KeyRound, ShieldCheck, X, AlertCircle } from 'lucide-react';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}

export const VaultModal: React.FC<VaultModalProps> = ({ isOpen, onClose, onUnlocked }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [hasPin, setHasPin] = useState(() => vaultManager.hasVaultPin());

  if (!isOpen) return null;

  const handleCreatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length < 4) {
      setError('El PIN debe tener al menos 4 números o caracteres.');
      return;
    }
    if (pin !== confirmPin) {
      setError('Los PINs no coinciden. Inténtalo de nuevo.');
      return;
    }

    try {
      await vaultManager.setVaultPin(pin);
      setHasPin(true);
      onUnlocked();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al configurar el PIN');
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = await vaultManager.unlockVault(pin);
    if (success) {
      onUnlocked();
      onClose();
    } else {
      setError('PIN incorrecto. Revisa el código introducido.');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d1424] p-6 shadow-2xl space-y-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Bóveda Secreta</h2>
              <p className="text-xs text-slate-400">
                {hasPin ? 'Introduce tu PIN de acceso' : 'Crear un nuevo PIN de seguridad'}
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

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {hasPin ? (
          /* Unlock Form */
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">PIN Secreto</label>
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  maxLength={10}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full text-center tracking-[0.5em] text-lg font-mono rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 px-4 py-3 text-sm font-bold text-slate-950 hover:brightness-110 transition shadow-lg shadow-amber-500/20"
            >
              <Unlock className="h-4 w-4" />
              <span>Desbloquear Bóveda</span>
            </button>
          </form>
        ) : (
          /* Create PIN Form */
          <form onSubmit={handleCreatePin} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Crea tu PIN</label>
                <input
                  type="password"
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Escribe tu PIN de 4 dígitos"
                  className="w-full text-center tracking-widest text-base font-mono rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Confirma tu PIN</label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Repite tu PIN"
                  className="w-full text-center tracking-widest text-base font-mono rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 transition"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Guardar PIN y Activar Bóveda</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
