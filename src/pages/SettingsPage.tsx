import React, { useState, useRef, useEffect } from 'react';
import { useMedia } from '../context/MediaContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Settings,
  Download,
  Upload,
  Sparkles,
  Smartphone,
  Trash2,
  CheckCircle2,
  Info,
  ShieldCheck,
  HardDrive,
  FileJson,
  Cpu,
  Server,
  Radio,
  Wifi,
  Globe,
  RefreshCw,
  Cookie,
  Key,
  AlertTriangle,
  CheckCheck,
} from 'lucide-react';

interface SettingsPageProps {
  onNavigateToStorage: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigateToStorage }) => {
  const {
    exportMetadataJson,
    importMetadataJson,
    loadSampleData,
    clearSampleData,
    mediaItems,
  } = useMedia();

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [sampleStatus, setSampleStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Backend 24/7 / Wi-Fi URL management
  const [backendUrlInput, setBackendUrlInput] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('omv_backend_url')) || '';
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  // YouTube Cookies management
  const [cookieText, setCookieText] = useState('');
  const [cookieStatus, setCookieStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [cookieMessage, setCookieMessage] = useState<string | null>(null);
  const [cookieInfo, setCookieInfo] = useState<{ hasCookies: boolean; source: string; cookieFileBytes: number } | null>(null);

  // Get backend base URL for cookie submission
  const getBackendBase = () => {
    const stored = (typeof window !== 'undefined' && localStorage.getItem('omv_backend_url')) || '';
    if (stored) return stored.replace(/\/+$/, '');
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (host === 'localhost' || host.startsWith('192.') || host.startsWith('10.')) return '';
    // Default Render backend
    return 'https://offline-media-vault.onrender.com';
  };

  // Check cookie status on mount
  useEffect(() => {
    const base = getBackendBase();
    fetch(`${base}/api/youtube/cookies/status`, { signal: AbortSignal.timeout(5000) })
      .then(r => r.json())
      .then(data => setCookieInfo(data))
      .catch(() => {});
  }, []);

  const handleSaveCookies = async () => {
    if (!cookieText.trim()) {
      setCookieStatus('error');
      setCookieMessage('Pega el contenido del archivo cookies.txt primero.');
      return;
    }
    setCookieStatus('saving');
    setCookieMessage('Enviando cookies al servidor...');
    const base = getBackendBase();
    try {
      const resp = await fetch(`${base}/api/youtube/cookies`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: cookieText,
        signal: AbortSignal.timeout(10000),
      });
      const data = await resp.json();
      if (data.success) {
        setCookieStatus('saved');
        setCookieMessage(`¡Cookies guardadas! (${data.bytes} bytes). Las descargas de YouTube deberían funcionar ahora.`);
        setCookieInfo({ hasCookies: true, source: 'file', cookieFileBytes: data.bytes });
        setCookieText('');
      } else {
        setCookieStatus('error');
        setCookieMessage(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setCookieStatus('error');
      setCookieMessage(`No se pudo conectar al backend: ${e.message}`);
    }
  };

  const handleSaveBackendUrl = (urlToSave: string) => {
    const trimmed = urlToSave.trim().replace(/\/+$/, '');
    setBackendUrlInput(trimmed);
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem('omv_backend_url', trimmed);
      } else {
        localStorage.removeItem('omv_backend_url');
      }
    }
  };

  const handleTestBackend = async (urlToTest = backendUrlInput) => {
    setTestStatus('testing');
    setTestMessage('Probando conexión con el motor de descargas...');
    const baseUrl = urlToTest.trim().replace(/\/+$/, '');
    const endpoint = `${baseUrl}/api/health`;

    try {
      const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const data = await res.json();
        setTestStatus('success');
        setTestMessage(`¡Conectado exitosamente! (${data.service || 'Servidor activo'})`);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(
        `No se pudo conectar al servidor: ${err.message || 'Verifica que iniciar_servidor.sh esté activo.'}`
      );
    }
  };

  const sampleCount = mediaItems.filter(
    (m) => m.metadata?.isSample || m.id.startsWith('sample_')
  ).length;

  const handleExportJson = () => {
    const jsonStr = exportMetadataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offline-media-vault-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importMetadataJson(text);
      setImportStatus(`¡Se importaron ${result.importedCount} elementos correctamente!`);
    } catch (err: any) {
      setImportStatus(`Error al importar: ${err.message}`);
    }
  };

  const handleLoadSamples = async () => {
    await loadSampleData();
    setSampleStatus('Datos de prueba cargados correctamente.');
    setTimeout(() => setSampleStatus(null), 3000);
  };

  const handleClearSamples = async () => {
    await clearSampleData();
    setSampleStatus('Datos de prueba eliminados.');
    setTimeout(() => setSampleStatus(null), 3000);
  };

  // Browser capability check
  const capabilities = [
    {
      name: 'IndexedDB (Almacenamiento Local)',
      supported: typeof window !== 'undefined' && 'indexedDB' in window,
    },
    {
      name: 'Service Worker & PWA Caching',
      supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    },
    {
      name: 'Picture-in-Picture (PiP)',
      supported: typeof document !== 'undefined' && 'pictureInPictureEnabled' in document,
    },
    {
      name: 'Media Session API (Pantalla de bloqueo)',
      supported: typeof navigator !== 'undefined' && 'mediaSession' in navigator,
    },
    {
      name: 'ReadableStreams (Descargas progresivas)',
      supported: typeof window !== 'undefined' && 'ReadableStream' in window,
    },
  ];

  return (
    <div className="space-y-6 pb-24 sm:pb-16 animate-fade-in max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-white">Ajustes y Respaldo</h2>
            <p className="text-xs text-slate-400">
              Configuración general, exportación/importación y estado del sistema
            </p>
          </div>
        </div>
      </div>

      {/* PWA Installation Section */}
      <div className="rounded-3xl border border-white/10 bg-[#0f1422] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Instalación como App</h3>
              <p className="text-xs text-slate-400">
                {isInstalled
                  ? 'La aplicación ya está instalada en tu dispositivo'
                  : 'Instala la aplicación para acceder instantáneamente sin navegador'}
              </p>
            </div>
          </div>

          {isInstalled ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Instalada
            </span>
          ) : isInstallable ? (
            <button
              onClick={install}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition active:scale-95"
            >
              Instalar aplicación
            </button>
          ) : isIOS ? (
            <span className="text-xs text-slate-400 font-medium">Usa Safari: Compartir ➜ Pantalla de inicio</span>
          ) : (
            <span className="text-xs text-slate-500">Disponible vía menú de navegador</span>
          )}
        </div>
      </div>

      {/* Backup: Export / Import JSON Metadata */}
      <div className="rounded-3xl border border-white/10 bg-[#0f1422] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
            <FileJson className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">Respaldo de Biblioteca</h3>
            <p className="text-xs text-slate-400">
              Exporta o importa los metadatos, categorías, tags y favoritos
            </p>
          </div>
        </div>

        {/* Notice regarding JSON vs Binary Blobs */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-3.5 text-xs text-indigo-200">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Nota sobre respaldos:</strong> El archivo JSON exporta la estructura de tu biblioteca
              (títulos, categorías, tags, favoritos y URLs de origen). Debido a las limitaciones de memoria
              del navegador con archivos multimedia de cientos de megabytes o gigabytes, los archivos de audio y
              video permanecen de forma segura en el almacenamiento IndexedDB de tu dispositivo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 transition active:scale-95"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Exportar biblioteca (JSON)</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportJsonFile}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition active:scale-95"
          >
            <Upload className="h-4 w-4 text-indigo-400" />
            <span>Importar biblioteca (JSON)</span>
          </button>
        </div>

        {importStatus && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300">
            {importStatus}
          </div>
        )}
      </div>

      {/* Backend 24/7 / Wi-Fi Connection Card */}
      <div className="rounded-3xl border border-white/10 bg-[#0f1422] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Servidor de Descargas (Backend 24/7 o Wi-Fi)</h3>
              <p className="text-xs text-slate-400">
                Conecta la app al motor de extracción para descargar videos y música de YouTube
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <label className="block text-xs font-semibold text-slate-300">
            URL del Servidor Backend:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={backendUrlInput}
              onChange={(e) => setBackendUrlInput(e.target.value)}
              placeholder="Ej: http://192.168.1.97:3000 o https://tu-backend.onrender.com"
              className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={() => handleSaveBackendUrl(backendUrlInput)}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition active:scale-95"
            >
              Guardar URL
            </button>
            <button
              onClick={() => handleTestBackend(backendUrlInput)}
              disabled={testStatus === 'testing'}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10 transition active:scale-95"
            >
              {testStatus === 'testing' ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span>Probar</span>
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400">Accesos directos:</span>
            <button
              type="button"
              onClick={() => {
                const ipUrl = 'http://192.168.1.97:3000';
                handleSaveBackendUrl(ipUrl);
                handleTestBackend(ipUrl);
              }}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 transition"
            >
              📡 Usar Wi-Fi Local (192.168.1.97:3000)
            </button>
            <button
              type="button"
              onClick={() => {
                handleSaveBackendUrl('');
                handleTestBackend('');
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 transition"
            >
              🔄 Mismo Servidor (Por defecto)
            </button>
          </div>

          {testMessage && (
            <div
              className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
                testStatus === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : testStatus === 'error'
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  : 'bg-white/5 border border-white/10 text-slate-300'
              }`}
            >
              <Info className="h-4 w-4 shrink-0" />
              <span>{testMessage}</span>
            </div>
          )}

          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-[11px] text-sky-300/90 leading-relaxed">
            💡 <strong>Para usar 24/7 desde cualquier lugar del mundo:</strong> Puedes alojar este mismo
            servidor backend de forma gratuita en <strong>Render.com</strong> o <strong>Railway</strong> usando el{' '}
            <code className="text-white bg-black/40 px-1 py-0.5 rounded">Dockerfile</code> incluido en el proyecto, o
            iniciar el servicio en tu PC con <code className="text-white bg-black/40 px-1 py-0.5 rounded">offline-media-vault.service</code>.
          </div>
        </div>
      </div>

      {/* ──────────── YouTube Cookies (Unlock cloud downloads) ──────────── */}
      <div className="rounded-3xl border border-amber-500/20 bg-[#0f1422] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Cookie className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Cookies de YouTube (Descargas en la nube)</h3>
              <p className="text-xs text-slate-400">
                Desbloquea las descargas desde el servidor 24/7 en la nube
              </p>
            </div>
          </div>
          {cookieInfo !== null && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              cookieInfo.hasCookies
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
            }`}>
              {cookieInfo.hasCookies ? <><CheckCheck className="h-3 w-3" /> Activas</> : <><AlertTriangle className="h-3 w-3" /> Sin cookies</>}
            </span>
          )}
        </div>

        {/* Why cookies are needed */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-200/90 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <p>
              <strong>¿Por qué necesito esto?</strong> YouTube bloquea las descargas desde servidores en la nube (Render, Railway, etc.) porque detecta que son IPs de datacenter.
              Al usar tus propias cookies de sesión de YouTube, el servidor descarga como si fueras tú, evitando el bloqueo.
              <br /><br />
              <strong>100% seguro:</strong> las cookies se guardan solo en tu servidor privado y nunca se comparten con terceros.
            </p>
          </div>
        </div>

        {/* Step-by-step instructions */}
        <div className="space-y-2 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">Cómo obtener las cookies de YouTube en 3 pasos:</p>
          <div className="space-y-2 rounded-2xl border border-white/5 bg-white/[0.02] p-3.5">
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 font-bold text-amber-400 text-[10px]">1</span>
              <p>En tu PC, instala la extensión de Chrome/Firefox: <strong className="text-white">"Get cookies.txt LOCALLY"</strong> o <strong className="text-white">"cookies.txt"</strong></p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 font-bold text-amber-400 text-[10px]">2</span>
              <p>Entra a <strong className="text-white">youtube.com</strong> con tu cuenta, luego haz clic en la extensión y elige <strong className="text-white">"Export cookies.txt"</strong> (formato Netscape)</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 font-bold text-amber-400 text-[10px]">3</span>
              <p>Abre el archivo descargado con el Bloc de Notas, copia TODO el contenido y pégalo aquí abajo</p>
            </div>
          </div>
        </div>

        {/* Cookie textarea */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Pega aquí el contenido de cookies.txt:
          </label>
          <textarea
            value={cookieText}
            onChange={(e) => { setCookieText(e.target.value); setCookieStatus('idle'); setCookieMessage(null); }}
            placeholder={"# Netscape HTTP Cookie File\n# Export from youtube.com with 'Get cookies.txt LOCALLY' extension\n.youtube.com\tTRUE\t/\tTRUE\t...\n..."}
            className="w-full h-28 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none font-mono resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveCookies}
              disabled={cookieStatus === 'saving' || !cookieText.trim()}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition active:scale-95 disabled:opacity-50"
            >
              {cookieStatus === 'saving' ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
              ) : (
                <Key className="h-3.5 w-3.5" />
              )}
              <span>Guardar cookies en el servidor</span>
            </button>
            {cookieInfo?.hasCookies && (
              <span className="text-[11px] text-emerald-400">
                Cookies activas ({cookieInfo.cookieFileBytes} bytes)
              </span>
            )}
          </div>
          {cookieMessage && (
            <div className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
              cookieStatus === 'saved'
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                : cookieStatus === 'error'
                ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                : 'bg-white/5 border border-white/10 text-slate-300'
            }`}>
              <Info className="h-4 w-4 shrink-0" />
              <span>{cookieMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sample / Test Data Section */}
      <div className="rounded-3xl border border-white/10 bg-[#0f1422] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Datos de Demostración</h3>
              <p className="text-xs text-slate-400">
                Prueba audio y video libre de derechos (Creative Commons / Dominio Público)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSamples}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
            >
              Cargar demos
            </button>
            {sampleCount > 0 && (
              <button
                onClick={handleClearSamples}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
              >
                Eliminar ({sampleCount})
              </button>
            )}
          </div>
        </div>

        {sampleStatus && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-xs text-slate-300">
            {sampleStatus}
          </div>
        )}
      </div>

      {/* Browser Capabilities & System Health */}
      <div className="rounded-3xl border border-white/10 bg-[#0f1422] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">Capacidades del Navegador</h3>
            <p className="text-xs text-slate-400">Verificación de APIs modernas requeridas</p>
          </div>
        </div>

        <div className="divide-y divide-white/5 rounded-2xl border border-white/5 bg-white/[0.01]">
          {capabilities.map((cap) => (
            <div key={cap.name} className="flex items-center justify-between p-3 text-xs">
              <span className="font-medium text-slate-300">{cap.name}</span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
                  cap.supported
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-rose-500/15 text-rose-400'
                }`}
              >
                {cap.supported ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> Compatible
                  </>
                ) : (
                  'No soportado'
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
