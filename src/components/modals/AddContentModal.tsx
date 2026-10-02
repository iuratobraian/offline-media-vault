import React, { useState, useRef } from 'react';
import { useMedia } from '../../context/MediaContext';
import {
  analyzeMediaUrl,
  AnalysisResult,
  createMediaItemFromAnalysis,
} from '../../services/analyzer';
import { importMultipleFiles } from '../../services/localImport';
import { formatBytes, formatDuration } from '../../utils/formatters';
import { MediaFormatOption } from '../../types/media';
import {
  X,
  Link2,
  FolderOpen,
  Search,
  Download,
  Bookmark,
  AlertTriangle,
  Music,
  Video,
  UploadCloud,
  FileCheck,
  Copy,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadStarted?: () => void;
}

export const AddContentModal: React.FC<AddContentModalProps> = ({
  isOpen,
  onClose,
  onDownloadStarted,
}) => {
  const { categories, addMedia, startDownload } = useMedia();

  const [activeTab, setActiveTab] = useState<'url' | 'local'>('url');
  const [urlInput, setUrlInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('musica');
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importedStatus, setImportedStatus] = useState<string | null>(null);
  const [copiedUrlSuccess, setCopiedUrlSuccess] = useState(false);
  const [downloadingFormatId, setDownloadingFormatId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;

    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await analyzeMediaUrl(urlInput);
      setAnalysis(result);
      if (result.isValid) {
        setCustomTitle(result.title);
        setSelectedCategory(result.mediaType === 'video' ? 'videos' : 'musica');
        const defaultTags = [`#${result.source}`, `#${result.mediaType}`];
        setTagsInput(defaultTags.join(' '));
      }
    } catch (err: any) {
      setAnalysis({
        isValid: false,
        url: urlInput,
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

  const parseTags = (): string[] => {
    return tagsInput
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));
  };

  const handleSaveOnly = async () => {
    if (!analysis || !analysis.isValid) return;
    setIsSaving(true);
    try {
      const item = createMediaItemFromAnalysis(
        analysis,
        customTitle,
        selectedCategory,
        parseTags()
      );
      await addMedia(item);
      onClose();
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadFormat = async (format: MediaFormatOption) => {
    if (!analysis || !analysis.isValid) return;
    setDownloadingFormatId(format.id);
    setIsSaving(true);
    try {
      const item = createMediaItemFromAnalysis(
        analysis,
        customTitle,
        selectedCategory,
        parseTags(),
        format
      );
      await addMedia(item);
      await startDownload(item, format);
      if (onDownloadStarted) onDownloadStarted();
      onClose();
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
      setDownloadingFormatId(null);
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

  const handleLocalFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsSaving(true);
    setImportedStatus('Procesando archivos y guardando en IndexedDB...');
    try {
      const items = await importMultipleFiles(files, selectedCategory);
      setImportedStatus(`¡${items.length} archivo(s) guardados correctamente para uso offline!`);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1000);
    } catch (err: any) {
      setImportedStatus(`Error al importar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setUrlInput('');
    setAnalysis(null);
    setCustomTitle('');
    setTagsInput('');
    setImportedStatus(null);
    setDownloadingFormatId(null);
  };

  const videoFormats = analysis?.videoFormats || [];
  const audioFormats = analysis?.audioFormats || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-md">
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl border border-white/10 bg-[#0d1322] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">Agregar contenido</h2>
              <p className="text-xs text-slate-400">Descarga desde URL o importa archivos locales</p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-white/5 px-5 pt-3">
          <button
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-2 border-b-2 pb-3 px-3 text-xs sm:text-sm font-semibold transition ${
              activeTab === 'url'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="h-4 w-4" />
            <span>Pegar enlace</span>
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`flex items-center gap-2 border-b-2 pb-3 px-3 text-xs sm:text-sm font-semibold transition ${
              activeTab === 'local'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            <span>Importar desde dispositivo</span>
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'url' ? (
            <>
              {/* URL Input Form */}
              <form onSubmit={handleAnalyze} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Enlace del recurso multimedia
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Pega aquí el enlace del contenido..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-4 pr-12 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                  {urlInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setUrlInput('');
                        setAnalysis(null);
                      }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isAnalyzing || !urlInput.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-slate-950 shadow-md shadow-emerald-500/25 hover:bg-emerald-400 transition active:scale-[0.99] disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                      <span>Analizando enlace...</span>
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      <span>ANALIZAR</span>
                    </>
                  )}
                </button>
              </form>

              {/* Analysis Result Card */}
              {analysis && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4 animate-fade-in">
                  {!analysis.isValid ? (
                    <div className="flex items-start gap-3 text-rose-400">
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold">Error de análisis</h4>
                        <p className="text-xs text-rose-300/90 mt-0.5">
                          {analysis.error || 'El enlace no es válido.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Media Header details */}
                      <div className="flex gap-3">
                        <div className="relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800 border border-white/10">
                          {analysis.thumbnail ? (
                            <img
                              src={analysis.thumbnail}
                              alt="preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-emerald-500/20 to-indigo-500/20">
                              {analysis.mediaType === 'video' ? (
                                <Video className="h-6 w-6 text-indigo-400" />
                              ) : (
                                <Music className="h-6 w-6 text-emerald-400" />
                              )}
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[9px] font-mono text-white">
                            {analysis.mediaType.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Título
                          </label>
                          <input
                            type="text"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs sm:text-sm font-semibold text-white focus:border-emerald-500 focus:outline-none"
                          />
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                            <span className="rounded bg-white/10 px-1.5 py-0.5 font-medium text-slate-300">
                              {analysis.providerName || analysis.source.toUpperCase()}
                            </span>
                            {analysis.duration > 0 && (
                              <span className="flex items-center gap-1 font-mono text-slate-300">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {formatDuration(analysis.duration)}
                              </span>
                            )}
                            {analysis.fileSize > 0 && (
                              <span>{formatBytes(analysis.fileSize)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Category & Tags Selectors */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Categoría
                          </label>
                          <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[#141b2d] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.icon} {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Etiquetas
                          </label>
                          <input
                            type="text"
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            placeholder="#musica #intro"
                            className="w-full rounded-xl border border-white/10 bg-[#141b2d] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Available Formats (Video / Solo Audio) */}
                      {analysis.canDownload && (videoFormats.length > 0 || audioFormats.length > 0) ? (
                        <div className="space-y-3 pt-2 border-t border-white/10">
                          {/* VIDEO */}
                          {videoFormats.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                                🎬 Video
                              </span>
                              <div className="space-y-1.5">
                                {videoFormats.map((fmt) => (
                                  <div
                                    key={fmt.id}
                                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-2.5 hover:border-indigo-500/40"
                                  >
                                    <div className="text-xs text-white font-semibold">
                                      {fmt.label} {fmt.fileSize ? `(${formatBytes(fmt.fileSize)})` : ''}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadFormat(fmt)}
                                      disabled={isSaving}
                                      className="flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-400 active:scale-95 disabled:opacity-50"
                                    >
                                      <Download className="h-3 w-3" />
                                      <span>DESCARGAR</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* AUDIO */}
                          {audioFormats.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                                🎵 Audio (Solo Audio)
                              </span>
                              <div className="space-y-1.5">
                                {audioFormats.map((fmt) => (
                                  <div
                                    key={fmt.id}
                                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-2.5 hover:border-emerald-500/40"
                                  >
                                    <div className="text-xs text-white font-semibold">
                                      {fmt.label} {fmt.fileSize ? `(${formatBytes(fmt.fileSize)})` : ''}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadFormat(fmt)}
                                      disabled={isSaving}
                                      className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1 text-xs font-bold text-slate-950 hover:bg-emerald-400 active:scale-95 disabled:opacity-50"
                                    >
                                      <Download className="h-3 w-3" />
                                      <span>DESCARGAR</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Non-downloadable fallback options */
                        <div className="space-y-3 pt-2 border-t border-white/10">
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
                            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                            <span>
                              {analysis.explanation || 'Esta fuente no proporciona un archivo descargable mediante este método.'}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveTab('local')}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition"
                            >
                              <FolderOpen className="h-3.5 w-3.5" />
                              <span>IMPORTAR ARCHIVO</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleSaveOnly}
                              disabled={isSaving}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition"
                            >
                              <Bookmark className="h-3.5 w-3.5" />
                              <span>GUARDAR ENLACE</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleCopyUrl}
                              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span>{copiedUrlSuccess ? '¡COPIADO!' : 'COPIAR URL'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Local Device Import Tab */
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*,video/*,.mp3,.wav,.ogg,.m4a,.aac,.opus,.mp4,.webm,.mov,.mkv"
                className="hidden"
                onChange={(e) => handleLocalFileSelect(e.target.files)}
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files) {
                    handleLocalFileSelect(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-white/15 bg-white/[0.02] hover:border-emerald-500/50 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-3">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Selecciona archivos de tu dispositivo
                </h3>
                <p className="mt-1 text-xs text-slate-400 max-w-sm">
                  Soporta MP3, WAV, M4A, AAC, OGG, OPUS, MP4, WebM, MOV. Se almacenarán físicamente en
                  IndexedDB y estarán disponibles sin internet.
                </p>
                <button
                  type="button"
                  className="mt-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
                >
                  Explorar archivos locales
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Asignar a categoría
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#141b2d] px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {importedStatus && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300">
                  <FileCheck className="h-4 w-4 shrink-0" />
                  <span>{importedStatus}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
