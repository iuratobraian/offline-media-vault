import React, { useState, useEffect } from 'react';
import { MediaItem, MediaFormatOption } from '../../types/media';
import { analyzeMediaUrl, AnalysisResult, createMediaItemFromAnalysis } from '../../services/analyzer';
import { useMedia } from '../../context/MediaContext';
import { formatBytes, formatDuration } from '../../utils/formatters';
import {
  Download,
  Video,
  Music,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface DownloadFormatModalProps {
  isOpen: boolean;
  item: MediaItem | null;
  onClose: () => void;
  onDownloadStarted?: () => void;
}

export const DownloadFormatModal: React.FC<DownloadFormatModalProps> = ({
  isOpen,
  item,
  onClose,
  onDownloadStarted,
}) => {
  const { addMedia, startDownload, categories } = useMedia();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('musica');
  const [activeFormat, setActiveFormat] = useState<MediaFormatOption | null>(null);
  const [downloadStep, setDownloadStep] = useState<
    'idle' | 'analyzing' | 'preparing' | 'downloading' | 'saving' | 'completed' | 'error'
  >('idle');
  const [stepMessage, setStepMessage] = useState('');

  useEffect(() => {
    if (!isOpen || !item) {
      setAnalysis(null);
      setDownloadStep('idle');
      return;
    }

    const fetchAnalysis = async () => {
      setIsAnalyzing(true);
      setDownloadStep('analyzing');
      setStepMessage('Analizando formatos de video y audio...');
      try {
        const urlToAnalyze = item.sourceUrl || item.originalUrl;
        const res = await analyzeMediaUrl(urlToAnalyze);
        setAnalysis(res);
        if (res.isValid) {
          setSelectedCategory(item.category || (res.mediaType === 'video' ? 'videos' : 'musica'));
        }
      } catch (err: any) {
        console.warn('Analysis error:', err);
      } finally {
        setIsAnalyzing(false);
        setDownloadStep('idle');
      }
    };

    fetchAnalysis();
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSelectFormat = async (format: MediaFormatOption) => {
    setActiveFormat(format);
    setDownloadStep('preparing');
    setStepMessage(`Iniciando descarga en formato ${format.format} (${format.quality || 'Nativo'})...`);

    try {
      const sourceAnalysis = analysis || {
        isValid: true,
        url: item.sourceUrl || item.originalUrl,
        source: item.source,
        provider: item.provider,
        providerName: item.provider,
        mediaType: format.type,
        title: item.title,
        thumbnail: item.thumbnail,
        duration: item.duration,
        fileSize: format.fileSize || item.size || 0,
        fileName: item.fileName,
        mimeType: format.mimeType,
        videoFormats: [],
        audioFormats: [],
        canDownload: true,
        canStreamOffline: true,
        requiresOnlinePlayback: false,
        supportsRangeRequests: true,
        corsStatus: 'allowed',
      };

      const defaultTags = [`#${item.source}`, `#${format.type}`, `#${format.format.toLowerCase()}`];
      const newMediaItem = createMediaItemFromAnalysis(
        sourceAnalysis as AnalysisResult,
        item.title,
        selectedCategory,
        defaultTags,
        format
      );

      setDownloadStep('downloading');
      setStepMessage(`Descargando ${format.label} a la bóveda local...`);

      await addMedia(newMediaItem);
      await startDownload(newMediaItem, format);

      setDownloadStep('completed');
      setStepMessage('¡Descarga completada e indexada para reproducir 100% offline!');

      setTimeout(() => {
        if (onDownloadStarted) onDownloadStarted();
        onClose();
      }, 1500);
    } catch (err: any) {
      setDownloadStep('error');
      setStepMessage(`Error al iniciar la descarga: ${err.message || 'Servidor no disponible'}`);
    }
  };

  const videoFormats = analysis?.videoFormats || [
    {
      id: 'yt_video_1080p',
      label: '1080p Full HD (MP4)',
      format: 'MP4',
      quality: '1080p',
      type: 'video' as const,
      ext: '.mp4',
      mimeType: 'video/mp4',
      fileSize: item.duration ? Math.round(item.duration * 350000) : 45000000,
    },
    {
      id: 'yt_video_720p',
      label: '720p HD (MP4)',
      format: 'MP4',
      quality: '720p',
      type: 'video' as const,
      ext: '.mp4',
      mimeType: 'video/mp4',
      fileSize: item.duration ? Math.round(item.duration * 200000) : 25000000,
    },
    {
      id: 'yt_video_360p',
      label: '360p Rápido (MP4)',
      format: 'MP4',
      quality: '360p',
      type: 'video' as const,
      ext: '.mp4',
      mimeType: 'video/mp4',
      fileSize: item.duration ? Math.round(item.duration * 70000) : 10000000,
    },
  ];

  const audioFormats = analysis?.audioFormats || [
    {
      id: 'yt_audio_mp3',
      label: 'MP3 Solo Audio (320 kbps)',
      format: 'MP3',
      quality: '320 kbps',
      type: 'audio' as const,
      ext: '.mp3',
      mimeType: 'audio/mpeg',
      fileSize: item.duration ? Math.round(item.duration * 40000) : 9000000,
    },
    {
      id: 'yt_audio_m4a',
      label: 'M4A / AAC Nativo (128 kbps)',
      format: 'M4A',
      quality: '128 kbps',
      type: 'audio' as const,
      ext: '.m4a',
      mimeType: 'audio/mp4',
      fileSize: item.duration ? Math.round(item.duration * 16000) : 3800000,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-[#0d1424] p-5 sm:p-7 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20">
              <Download className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Selecciona Formato de Descarga</h2>
              <p className="text-xs text-slate-400 truncate max-w-[300px]">{item.title}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/15 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress / Step Feedback Animation */}
        {downloadStep !== 'idle' && (
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-3 animate-fade-in">
            <div className="flex items-center gap-3">
              {downloadStep === 'completed' ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
              ) : downloadStep === 'error' ? (
                <AlertCircle className="h-6 w-6 text-rose-400 shrink-0" />
              ) : (
                <Loader2 className="h-6 w-6 text-emerald-400 animate-spin shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  {downloadStep === 'analyzing'
                    ? 'Analizando enlace'
                    : downloadStep === 'preparing'
                    ? 'Preparando servidor'
                    : downloadStep === 'downloading'
                    ? 'Descargando recurso'
                    : downloadStep === 'completed'
                    ? '¡Listo para offline!'
                    : 'Error de descarga'}
                </p>
                <p className="text-xs text-emerald-300 mt-0.5">{stepMessage}</p>
              </div>
            </div>

            {/* Pulse bar */}
            {downloadStep !== 'completed' && downloadStep !== 'error' && (
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-2/3 bg-emerald-400 animate-pulse rounded-full" />
              </div>
            )}
          </div>
        )}

        {/* Media Preview Card */}
        <div className="flex gap-3.5 p-3 rounded-2xl border border-white/5 bg-slate-900/60">
          {item.thumbnail ? (
            <img src={item.thumbnail} alt="" className="h-16 w-24 rounded-xl object-cover shrink-0 border border-white/10" />
          ) : (
            <div className="h-16 w-24 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
              <Video className="h-6 w-6 text-slate-500" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-xs sm:text-sm font-bold text-white truncate">{item.title}</h3>
            <p className="text-[11px] text-slate-400">
              {item.duration > 0 ? `Duración: ${formatDuration(item.duration)} • ` : ''}
              Proveedor: {item.provider?.toUpperCase() || 'Directo'}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-slate-400">Categoría:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Format Selection Lists */}
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-300">Cargando opciones de peso y calidad exactas...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* VIDEO OPTIONS */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-400">
                <span className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  <span>🎬 Opciones de Video</span>
                </span>
                <span className="text-[10px] text-slate-400">Video + Audio integrados</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {videoFormats.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => handleSelectFormat(fmt)}
                    disabled={downloadStep !== 'idle'}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-indigo-500/10 hover:border-indigo-500/40 transition active:scale-98 text-left group disabled:opacity-50"
                  >
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-indigo-300">
                        {fmt.label}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {fmt.format} • {fmt.quality || 'HD'} {fmt.fileSize ? `• ~${formatBytes(fmt.fileSize)}` : ''}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition shrink-0">
                      <Download className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AUDIO OPTIONS */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-400">
                <span className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  <span>🎵 Solo Audio (Música / Podcast)</span>
                </span>
                <span className="text-[10px] text-slate-400">Extracción directa de audio</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {audioFormats.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => handleSelectFormat(fmt)}
                    disabled={downloadStep !== 'idle'}
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-emerald-500/10 hover:border-emerald-500/40 transition active:scale-98 text-left group disabled:opacity-50"
                  >
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-emerald-300">
                        {fmt.label}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {fmt.format} {fmt.quality ? `• ${fmt.quality}` : ''} {fmt.fileSize ? `• ~${formatBytes(fmt.fileSize)}` : ''}
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition shrink-0">
                      <Download className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
