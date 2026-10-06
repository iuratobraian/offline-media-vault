import React, { useState, useEffect } from 'react';
import { MediaItem } from '../../types/media';
import { generateQRCodeSVG } from '../../utils/qrGenerator';
import { getMediaBlob } from '../../database/db';
import {
  QrCode,
  Share2,
  Copy,
  Check,
  Download,
  X,
  Wifi,
  Smartphone,
  ExternalLink,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  item: MediaItem | null;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, item, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [lanIp, setLanIp] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) return;

    // Detect LAN IP or current window location
    const origin = window.location.origin;
    const shareUrl = `${origin}/#item=${encodeURIComponent(item.id)}`;

    // Generate QR SVG
    setQrSvg(generateQRCodeSVG(shareUrl, 240));

    // Attempt to fetch actual LAN IP from server
    fetch('/api/lan/info')
      .then((res) => res.json())
      .then((data) => {
        if (data.ips && data.ips.length > 0) {
          const firstIp = data.ips[0];
          const fullLanUrl = `http://${firstIp}:${data.port || 3000}/#item=${encodeURIComponent(item.id)}`;
          setLanIp(fullLanUrl);
          setQrSvg(generateQRCodeSVG(fullLanUrl, 240));
        } else {
          setLanIp(shareUrl);
        }
      })
      .catch(() => {
        setLanIp(shareUrl);
      });
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleCopyLink = () => {
    const link = lanIp || window.location.href;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      // Check if we have local blob to share as file
      const blobRecord = await getMediaBlob(item.id);
      if (blobRecord?.blob && navigator.canShare) {
        const file = new File([blobRecord.blob], item.fileName || `${item.title}.mp4`, {
          type: item.mimeType || 'video/mp4',
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: item.title,
            text: `Compartido desde Offline Media Vault: ${item.title}`,
            files: [file],
          });
          return;
        }
      }

      await navigator.share({
        title: item.title,
        text: `Mira ${item.title} en Offline Media Vault`,
        url: lanIp || item.sourceUrl || item.originalUrl,
      });
    } catch (e) {
      console.warn('Native share cancelled or failed:', e);
    }
  };

  const handleExportFile = async () => {
    setIsExporting(true);
    try {
      const blobRecord = await getMediaBlob(item.id);
      if (blobRecord?.blob) {
        const url = URL.createObjectURL(blobRecord.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.fileName || `${item.title}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        window.open(item.sourceUrl || item.originalUrl, '_blank');
      }
    } catch (err) {
      console.warn('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1424] p-6 shadow-2xl space-y-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Compartir en Red Local (LAN)</h2>
              <p className="text-xs text-slate-400 truncate max-w-[220px]">{item.title}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/15 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center space-y-3 p-4 rounded-2xl border border-white/5 bg-slate-900/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <Wifi className="h-4 w-4 animate-pulse" />
            <span>Escanea para abrir en cualquier celular/PC (Misma Wi-Fi)</span>
          </div>

          {/* Rendered SVG QR */}
          <div
            className="p-3 rounded-2xl bg-[#070b14] border border-white/10 shadow-inner"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          <div className="w-full flex items-center gap-2 pt-1">
            <input
              type="text"
              readOnly
              value={lanIp || 'Cargando IP de red...'}
              className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-xs font-mono text-slate-300 border border-white/10 focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition shrink-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/20 transition"
            >
              <Smartphone className="h-4 w-4 text-emerald-400" />
              <span>Compartir nativo</span>
            </button>
          )}

          <button
            onClick={handleExportFile}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/20 transition col-span-1"
          >
            <Download className="h-4 w-4 text-teal-400" />
            <span>{isExporting ? 'Exportando...' : 'Exportar archivo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
