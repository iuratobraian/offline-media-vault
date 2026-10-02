import { IncomingMessage, ServerResponse } from 'http';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Cache directory for downloaded media files before streaming
const CACHE_DIR = path.join(os.tmpdir(), 'offline_media_vault_cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function findYtDlpPath(): string {
  const possiblePaths = [
    path.join(os.homedir(), '.local', 'bin', 'yt-dlp'),
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    'yt-dlp',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'yt-dlp';
}

function findNodePath(): string {
  const possiblePaths = [
    '/usr/bin/node',
    '/usr/local/bin/node',
    '/usr/bin/nodejs',
    process.execPath,
  ];
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) return p;
  }
  return 'node';
}

export function extractYouTubeId(urlStr: string): string | null {
  try {
    const url = new URL(urlStr.trim());
    const host = url.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      return url.pathname.slice(1).split('?')[0].split('/')[0];
    }
    if (host.includes('youtube.com')) {
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.replace('/shorts/', '').split('/')[0].split('?')[0];
      }
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.replace('/embed/', '').split('/')[0].split('?')[0];
      }
      return url.searchParams.get('v');
    }
    return null;
  } catch {
    return null;
  }
}

export async function handleYouTubeInfo(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const targetUrl = parsedUrl.searchParams.get('url');

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Parámetro "url" requerido.' }));
    return;
  }

  const videoId = extractYouTubeId(targetUrl);
  if (!videoId) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'URL de YouTube no válida.' }));
    return;
  }

  const ytDlp = findYtDlpPath();
  const nodePath = findNodePath();
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Helper to respond with fallback formats if yt-dlp metadata fails on datacenter IP
  const respondWithFallback = async () => {
    let title = `Video de YouTube (${videoId})`;
    let author = 'YouTube';
    let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    try {
      const oembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`);
      if (oembedRes.ok) {
        const odata = await oembedRes.json();
        if (odata.title) title = odata.title;
        if (odata.author_name) author = odata.author_name;
        if (odata.thumbnail_url) thumbnail = odata.thumbnail_url;
      }
    } catch {
      // ignore
    }

    const videoFormats = [
      {
        id: 'yt_video_720p',
        label: '720p HD (MP4)',
        format: 'MP4',
        quality: '720p',
        type: 'video',
        ext: '.mp4',
        mimeType: 'video/mp4',
        fileSize: 32000000,
        supportsRangeRequests: true,
        url: `/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=video_720p&title=${encodeURIComponent(title)}`,
      },
      {
        id: 'yt_video_360p',
        label: '360p Rápido (MP4)',
        format: 'MP4',
        quality: '360p',
        type: 'video',
        ext: '.mp4',
        mimeType: 'video/mp4',
        fileSize: 12000000,
        supportsRangeRequests: true,
        url: `/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=video_360p&title=${encodeURIComponent(title)}`,
      },
    ];

    const audioFormats = [
      {
        id: 'yt_audio_mp3',
        label: 'MP3 Alta Calidad (320 kbps)',
        format: 'MP3',
        quality: '320 kbps',
        type: 'audio',
        ext: '.mp3',
        mimeType: 'audio/mpeg',
        fileSize: 8500000,
        supportsRangeRequests: true,
        url: `/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=audio_mp3&title=${encodeURIComponent(title)}`,
      },
      {
        id: 'yt_audio_m4a',
        label: 'M4A / AAC Rápido (128 kbps)',
        format: 'M4A',
        quality: '128 kbps',
        type: 'audio',
        ext: '.m4a',
        mimeType: 'audio/mp4',
        fileSize: 3500000,
        supportsRangeRequests: true,
        url: `/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=audio_m4a&title=${encodeURIComponent(title)}`,
      },
    ];

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(
      JSON.stringify({
        success: true,
        videoId,
        title,
        author,
        duration: 0,
        thumbnail,
        videoFormats,
        audioFormats,
      })
    );
  };

  try {
    const ytdlpArgs = [
      '--dump-single-json',
      '--no-warnings',
      '--no-playlist',
      '--extractor-args',
      'youtube:player_client=android,web',
      '--no-check-certificates',
    ];

    if (nodePath && fs.existsSync(nodePath)) {
      ytdlpArgs.push('--js-runtimes', `node:${nodePath}`);
    }

    ytdlpArgs.push(canonicalUrl);

    const proc = spawn(ytDlp, ytdlpArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', async (code) => {
      if (code !== 0 || !stdout.trim()) {
        console.warn('yt-dlp JSON error, using resilient fallback:', stderr);
        await respondWithFallback();
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const title = data.title || `Video de YouTube (${videoId})`;
        const author = data.uploader || data.channel || 'YouTube';
        const duration = Number(data.duration) || 0;
        const thumbnail =
          data.thumbnail ||
          (data.thumbnails && data.thumbnails.length > 0
            ? data.thumbnails[data.thumbnails.length - 1].url
            : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);

        const formatsRaw = Array.isArray(data.formats) ? data.formats : [];

        // Check available video heights
        const heights = new Set<number>();
        formatsRaw.forEach((f: any) => {
          if (f.vcodec !== 'none' && f.height) heights.add(f.height);
        });

        const videoFormats = [];
        const audioFormats = [];

        // High quality video (1080p if available)
        if (heights.has(1080) || heights.has(1440) || heights.has(2160)) {
          videoFormats.push({
            id: 'yt_video_1080p',
            label: '1080p Full HD (MP4)',
            format: 'MP4',
            quality: '1080p',
            type: 'video',
            ext: '.mp4',
            mimeType: 'video/mp4',
            fileSize: Math.round((duration * 3200 * 1024) / 8),
            supportsRangeRequests: true,
            url: `/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=video_1080p&title=${encodeURIComponent(title)}`,
          });
        }

        // Standard 720p HD
        videoFormats.push({
          id: 'yt_video_720p',
          label: '720p HD (MP4)',
          format: 'MP4',
          quality: '720p',
          type: 'video',
          ext: '.mp4',
          mimeType: 'video/mp4',
          fileSize: Math.round((duration * 1200 * 1024) / 8),
          supportsRangeRequests: true,
          url: `/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=video_720p&title=${encodeURIComponent(title)}`,
        });

        // 480p / 360p lightweight
        videoFormats.push({
          id: 'yt_video_360p',
          label: '360p Rápido (MP4)',
          format: 'MP4',
          quality: '360p',
          type: 'video',
          ext: '.mp4',
          mimeType: 'video/mp4',
          fileSize: Math.round((duration * 500 * 1024) / 8),
          supportsRangeRequests: true,
          url: `/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=video_360p&title=${encodeURIComponent(title)}`,
        });

        // Audio formats: MP3 High Quality (320kbps)
        audioFormats.push({
          id: 'yt_audio_mp3',
          label: 'MP3 Alta Calidad (320 kbps)',
          format: 'MP3',
          quality: '320 kbps',
          type: 'audio',
          ext: '.mp3',
          mimeType: 'audio/mpeg',
          fileSize: Math.round((duration * 320 * 1024) / 8),
          supportsRangeRequests: true,
          url: `/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=audio_mp3&title=${encodeURIComponent(title)}`,
        });

        // Audio format: M4A / AAC Nativo (128kbps)
        audioFormats.push({
          id: 'yt_audio_m4a',
          label: 'M4A / AAC Rápido (128 kbps)',
          format: 'M4A',
          quality: '128 kbps',
          type: 'audio',
          ext: '.m4a',
          mimeType: 'audio/mp4',
          fileSize: Math.round((duration * 128 * 1024) / 8),
          supportsRangeRequests: true,
          url: `/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=audio_m4a&title=${encodeURIComponent(title)}`,
        });

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(
          JSON.stringify({
            success: true,
            videoId,
            title,
            author,
            duration,
            thumbnail,
            videoFormats,
            audioFormats,
          })
        );
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Error al procesar JSON: ' + err.message }));
      }
    });
  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Error ejecutando yt-dlp: ' + err.message }));
  }
}

export async function handleYouTubeStream(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const targetUrl = parsedUrl.searchParams.get('url');
  const formatKey = parsedUrl.searchParams.get('formatKey') || 'video_720p';
  const customTitle = parsedUrl.searchParams.get('title') || 'media';

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Parámetro "url" requerido.');
    return;
  }

  const videoId = extractYouTubeId(targetUrl);
  if (!videoId) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('URL de YouTube no válida.');
    return;
  }

  const ytDlp = findYtDlpPath();
  const nodePath = findNodePath();
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Determine target extension, mimeType and yt-dlp arguments
  let ext = 'mp4';
  let mimeType = 'video/mp4';
  const ytdlpArgs = [
    '--no-warnings',
    '--no-playlist',
    '--extractor-args',
    'youtube:player_client=android,web',
    '--no-check-certificates',
  ];

  if (nodePath && fs.existsSync(nodePath)) {
    ytdlpArgs.push('--js-runtimes', `node:${nodePath}`);
  }

  if (formatKey === 'audio_mp3') {
    ext = 'mp3';
    mimeType = 'audio/mpeg';
    ytdlpArgs.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
  } else if (formatKey === 'audio_m4a') {
    ext = 'm4a';
    mimeType = 'audio/mp4';
    ytdlpArgs.push('-f', '140/ba[ext=m4a]/ba');
  } else if (formatKey === 'video_360p') {
    ext = 'mp4';
    mimeType = 'video/mp4';
    ytdlpArgs.push('-f', '18/best[height<=360][ext=mp4]/best[height<=360]/best');
  } else if (formatKey === 'video_1080p') {
    ext = 'mp4';
    mimeType = 'video/mp4';
    ytdlpArgs.push('-f', 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]/best', '--merge-output-format', 'mp4');
  } else {
    // Default video_720p
    ext = 'mp4';
    mimeType = 'video/mp4';
    ytdlpArgs.push('-f', '22/best[height<=720][ext=mp4]/bestvideo[height<=720]+bestaudio[ext=m4a]/best', '--merge-output-format', 'mp4');
  }

  const cacheFileName = `${videoId}_${formatKey}.${ext}`;
  const cacheFilePath = path.join(CACHE_DIR, cacheFileName);

  // Function to serve the file once downloaded to cache
  const serveCachedFile = () => {
    try {
      const stats = fs.statSync(cacheFilePath);
      const totalSize = stats.size;
      const range = req.headers.range;

      const safeTitle = customTitle.replace(/[/\\?%*:|"<>]/g, '_').trim() || videoId;
      const downloadFileName = `${safeTitle}.${ext}`;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (start >= totalSize || end >= totalSize) {
          res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
          res.end();
          return;
        }

        const chunksize = end - start + 1;
        const fileStream = fs.createReadStream(cacheFilePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${encodeURIComponent(downloadFileName)}"`,
          'Access-Control-Allow-Origin': '*',
        });

        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': totalSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFileName)}"`,
          'Access-Control-Allow-Origin': '*',
        });

        const fileStream = fs.createReadStream(cacheFilePath);
        fileStream.pipe(res);
      }
    } catch (err: any) {
      console.error('Error serving cache file:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error al leer el archivo descargado: ' + err.message);
    }
  };

  // If already cached, serve immediately!
  if (fs.existsSync(cacheFilePath) && fs.statSync(cacheFilePath).size > 1024) {
    serveCachedFile();
    return;
  }

  // Not in cache: download with yt-dlp to cacheFilePath
  const tempDownloadPath = `${cacheFilePath}.tmp_${Date.now()}`;
  ytdlpArgs.push('-o', tempDownloadPath, canonicalUrl);

  const proc = spawn(ytDlp, ytdlpArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

  let stderr = '';
  proc.stderr.on('data', (d) => {
    stderr += d.toString();
  });

  // Handle client abort
  req.on('close', () => {
    if (!res.writableEnded) {
      try {
        proc.kill('SIGTERM');
        if (fs.existsSync(tempDownloadPath)) fs.unlinkSync(tempDownloadPath);
      } catch {
        // ignore
      }
    }
  });

  proc.on('close', (code) => {
    if (code !== 0) {
      console.error(`yt-dlp exited with code ${code}:`, stderr);
      if (fs.existsSync(tempDownloadPath)) {
        try { fs.unlinkSync(tempDownloadPath); } catch {}
      }
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Error al descargar de YouTube (código ${code}): ${stderr}`);
      }
      return;
    }

    try {
      // Find the actual file (yt-dlp may add extension)
      if (fs.existsSync(tempDownloadPath)) {
        fs.renameSync(tempDownloadPath, cacheFilePath);
      } else {
        // Check if yt-dlp saved it with a modified extension
        const dirFiles = fs.readdirSync(CACHE_DIR);
        const matching = dirFiles.find((f) => f.startsWith(path.basename(tempDownloadPath)));
        if (matching) {
          fs.renameSync(path.join(CACHE_DIR, matching), cacheFilePath);
        }
      }

      if (fs.existsSync(cacheFilePath)) {
        serveCachedFile();
      } else {
        throw new Error('El archivo procesado no se encontró en el disco.');
      }
    } catch (err: any) {
      console.error('Error finalizando descarga:', err);
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error al finalizar el archivo: ' + err.message);
      }
    }
  });
}
