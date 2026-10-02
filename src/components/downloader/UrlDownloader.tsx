import React, { useState } from 'react';
import {
  Search,
  Download,
  Link2,
  Video,
  Music,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Clipboard,
  X,
  FileCheck,
  Bookmark,
  Copy,
  ExternalLink,
  FolderOpen,
  ShieldAlert,
} from 'lucide-react';
import { analyzeMediaUrl, AnalysisResult, createMediaItemFromAnalysis } from '../../services/analyzer';
import { MediaFormatOption } from '../../types/media';
import { useMedia } from '../../context/MediaContext';
import { formatBytes, formatDuration } from '../../utils/formatters';

interface UrlDownloaderProps {
  onDownloadStarted?: () => void;
  onOpenLocalImport?: () => void;
  variant?: 'hero' | 'compact';
}

export const UrlDownloader: React.FC<UrlDownloaderProps> = ({
  onDownloadStarted,
  onOpenLocalImport,
  variant = 'hero',
}) => {
  const { addMedia, startDownload, categories } = useMedia();

  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('musica');
  const [copiedUrlSuccess, setCopiedUrlSuccess] = useState(false);
  const [downloadingFormatId, setDownloadingFormatId] = useState<string | null>(null);

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim().startsWith('http')) {
          setUrlInput(text.trim());
          performAnalysis(text.trim());
        }
      }
    } catch {
      // Permission denied or not supported
    }
  };

  const performAnalysis = async (urlToAnalyze: string) => {
    const trimmed = urlToAnalyze.trim();
    if (!trimmed) return;

    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await analyzeMediaUrl(trimmed);
      setAnalysis(result);
      if (result.isValid) {
        setSelectedCategory(result.mediaType === 'video' ? 'videos' : 'musica');
      }
    } catch (err: any) {
      setAnalysis({
        isValid: false,
        url: trimmed,
        source: 'other',
        provider: 'unknown',
        providerName: 'Desconocido',
        mediaType: 'audio',
        title: '',
        duration: 0,
        fileSize: 0,
        fileName: '',
        mimeType: '',
        videoFormats: [],
        audioFormats: [],
        canDownload: false,
        canStreamOffline: false,
        requiresOnlinePlayback: false,
        supportsRangeRequests: false,
        corsStatus: 'not_applicable',
        error: err.message || 'El enlace no parece ser un recurso multimedia válido.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performAnalysis(urlInput);
  };

  const handleDownloadFormat = async (format: MediaFormatOption) => {
    if (!analysis || !analysis.isValid) return;
    setDownloadingFormatId(format.id);
    try {
      const defaultTags = [`#${analysis.source}`, `#${format.type}`, `#${format.format.toLowerCase()}`];
      const item = createMediaItemFromAnalysis(
        analysis,
        analysis.title,
        selectedCategory,
        defaultTags,
        format
      );
      await addMedia(item);
      await startDownload(item, format);
      if (onDownloadStarted) {
        onDownloadStarted();
      }
    } catch (err) {
      console.error('Error starting download:', err);
    } finally {
      setDownloadingFormatId(null);
    }
  };

  const handleSaveOnlineLink = async () => {
    if (!analysis || !analysis.isValid) return;
    try {
      const defaultTags = [`#${analysis.source}`, `#online`, `#${analysis.mediaType}`];
      const item = createMediaItemFromAnalysis(
        analysis,
        analysis.title,
        selectedCategory,
        defaultTags
      );
      await addMedia(item);
      if (onDownloadStarted) {
        onDownloadStarted();
      }
    } catch (err) {
      console.error('Error saving link:', err);
    }
  };

  const handleCopyUrl = async () => {
    if (analysis?.url) {
      try {
        await navigator.clipboard.writeText(analysis.url);
        setCopiedUrlSuccess(true);
        setTimeout(() => setCopiedUrlSuccess(false), 2000);
      } catch {
        // fallback
      }
    }
  };

  const videoFormats = analysis?.videoFormats || [];
  const audioFormats = analysis?.audioFormats || [];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#111827] via-[#0d1322] to-[#0a0e1a] shadow-2xl transition-all ${
        variant === 'hero' ? 'p-5 sm:p-7' : 'p-4 sm:p-5'
      }`}
    >
      {/* Decorative ambient gradients */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Header section */}
      <div className="relative z-10 space-y-2 mb-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
          <Download className="h-3.5 w-3.5" />
          <span>Descargar contenido</span>
        </div>
        <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
          Pega una URL y descarga video o audio directo
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          Analiza el enlace, elige calidad de video o solo audio y guárdalo en tu dispositivo para reproducir offline.
        </p>
      </div>

      {/* Input URL Form */}
      <form onSubmit={handleSubmit} className="relative z-10 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Link2 className="h-4 w-4" />
            </div>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Pegá una URL (ej: https://...)"
              className="w-full rounded-2xl border border-white/15 bg-white/5 py-3.5 pl-10 pr-20 text-xs sm:text-sm text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              required
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {urlInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput('');
                    setAnalysis(null);
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:text-white"
                  title="Limpiar"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="hidden sm:inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/20 transition"
                  title="Pegar del portapapeles"
                >
                  <Clipboard className="h-3 w-3" />
                  <span>Pegar</span>
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isAnalyzing || !urlInput.trim()}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-6 py-3.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-300 transition active:scale-95 disabled:opacity-50 shrink-0"
          >
            {isAnalyzing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                <span>ANALIZANDO...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>ANALIZAR</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Analysis Result Display */}
      {analysis && (
        <div className="relative z-10 mt-5 rounded-2xl border border-white/10 bg-[#0d1424] p-4 sm:p-5 space-y-4 animate-fade-in shadow-xl">
          {!analysis.isValid ? (
            <div className="flex items-start gap-3 text-rose-400">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">No se pudo analizar el enlace</h4>
                <p className="text-xs text-rose-300/90 mt-0.5">
                  {analysis.error || 'La URL ingresada no es válida o no está permitida.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Media Summary: Provider, Title, Thumbnail, Duration, Type */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Thumbnail */}
                <div className="relative flex h-24 w-full sm:w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 border border-white/10">
                  {analysis.thumbnail ? (
                    <img
                      src={analysis.thumbnail}
                      alt={analysis.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20">
                      {analysis.mediaType === 'video' ? (
                        <Video className="h-8 w-8 text-indigo-400" />
                      ) : (
                        <Music className="h-8 w-8 text-emerald-400" />
                      )}
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-mono text-white">
                    {analysis.mediaType.toUpperCase()}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      {analysis.providerName || analysis.source.toUpperCase()}
                    </span>
                    {analysis.duration > 0 && (
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{formatDuration(analysis.duration)}</span>
                      </span>
                    )}
                    {analysis.fileSize > 0 && (
                      <span className="text-[11px] text-slate-400">
                        {formatBytes(analysis.fileSize)}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2">
                    {analysis.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Categoría:</span>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="rounded-lg border border-white/10 bg-[#141b2d] px-2 py-0.5 text-xs text-white focus:outline-none focus:border-emerald-500"
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

              {/* Formats or Fallback Options */}
              {analysis.canDownload && (videoFormats.length > 0 || audioFormats.length > 0) ? (
                <div className="space-y-4 pt-2 border-t border-white/5">
                  {/* VIDEO FORMATS */}
                  {videoFormats.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400">
                        <Video className="h-4 w-4" />
                        <span>🎬 FORMATOS DE VIDEO</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {videoFormats.map((fmt) => (
                          <div
                            key={fmt.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition"
                          >
                            <div>
                              <div className="text-xs sm:text-sm font-bold text-white">
                                {fmt.label}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {fmt.format} • {fmt.quality || 'HD'} {fmt.fileSize ? `• ${formatBytes(fmt.fileSize)}` : ''}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDownloadFormat(fmt)}
                              disabled={downloadingFormatId === fmt.id}
                              className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-400 transition active:scale-95 disabled:opacity-50"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>{downloadingFormatId === fmt.id ? 'Descargando...' : 'DESCARGAR'}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AUDIO FORMATS */}
                  {audioFormats.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                        <Music className="h-4 w-4" />
                        <span>🎵 FORMATOS DE AUDIO / SOLO AUDIO</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {audioFormats.map((fmt) => (
                          <div
                            key={fmt.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition"
                          >
                            <div>
                              <div className="text-xs sm:text-sm font-bold text-white">
                                {fmt.label}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {fmt.format} {fmt.bitrate ? `• ${fmt.bitrate}` : ''} {fmt.fileSize ? `• ${formatBytes(fmt.fileSize)}` : ''}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDownloadFormat(fmt)}
                              disabled={downloadingFormatId === fmt.id}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition active:scale-95 disabled:opacity-50"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>{downloadingFormatId === fmt.id ? 'Descargando...' : 'DESCARGAR'}</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Non-downloadable fallback options */
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold text-white">
                          Esta fuente no proporciona un archivo descargable mediante este método.
                        </p>
                        <p className="text-[11px] text-amber-300/80">
                          {analysis.explanation ||
                            'Puedes guardar este recurso como enlace online para escucharlo/verlo con conexión, o importar el archivo multimedia desde tu dispositivo.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {onOpenLocalImport && (
                      <button
                        type="button"
                        onClick={onOpenLocalImport}
                        className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition active:scale-95"
                      >
                        <FolderOpen className="h-4 w-4" />
                        <span>IMPORTAR ARCHIVO</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveOnlineLink}
                      className="flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 px-3.5 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition active:scale-95"
                    >
                      <Bookmark className="h-4 w-4" />
                      <span>GUARDAR ENLACE</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition active:scale-95"
                    >
                      <Copy className="h-4 w-4" />
                      <span>{copiedUrlSuccess ? '¡COPIADO!' : 'COPIAR URL'}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
