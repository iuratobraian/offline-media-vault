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

function findDenoPath(): string | null {
  const possiblePaths = [
    '/usr/local/bin/deno',
    '/usr/bin/deno',
    '/root/.deno/bin/deno',
    path.join(os.homedir(), '.deno', 'bin', 'deno'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
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

  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let title = `Video de YouTube (${videoId})`;
  let author = 'YouTube';
  let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  // Fetch official YouTube oEmbed metadata in < 150ms without blocking on heavy yt-dlp manifests
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      if (data.title) title = data.title;
      if (data.author_name) author = data.author_name;
      if (data.thumbnail_url) thumbnail = data.thumbnail_url;
    }
  } catch {
    // Fallback to noembed if official oEmbed had network timeout
    try {
      const noembedRes = await fetch(
        `https://noembed.com/embed?url=${encodeURIComponent(canonicalUrl)}`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (noembedRes.ok) {
        const data = await noembedRes.json();
        if (data.title) title = data.title;
        if (data.author_name) author = data.author_name;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch {
      // Keep defaults
    }
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
      fileSize: 38000000,
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
      fileSize: 14000000,
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
      fileSize: 9000000,
      supportsRangeRequests: true,
      url: `/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=audio_mp3&title=${encodeURIComponent(title)}`,
    },
    {
      id: 'yt_audio_m4a',
      label: 'M4A / AAC Nativo (128 kbps)',
      format: 'M4A',
      quality: '128 kbps',
      type: 'audio',
      ext: '.m4a',
      mimeType: 'audio/mp4',
      fileSize: 3800000,
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
}

const activeDownloads = new Map<string, Promise<void>>();

export async function handleYouTubeStream(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const targetUrl = parsedUrl.searchParams.get('url');
  const formatKey = parsedUrl.searchParams.get('formatKey') || 'video_720p';
  const customTitle = parsedUrl.searchParams.get('title') || 'media';

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end('Parámetro "url" requerido.');
    return;
  }

  const videoId = extractYouTubeId(targetUrl);
  if (!videoId) {
    res.writeHead(400, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end('URL de YouTube no válida.');
    return;
  }

  const ytDlp = findYtDlpPath();
  const nodePath = findNodePath();
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Determine target extension and mimeType
  let ext = 'mp4';
  let mimeType = 'video/mp4';

  if (formatKey === 'audio_mp3') {
    ext = 'mp3';
    mimeType = 'audio/mpeg';
  } else if (formatKey === 'audio_m4a') {
    ext = 'm4a';
    mimeType = 'audio/mp4';
  } else {
    ext = 'mp4';
    mimeType = 'video/mp4';
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
          res.writeHead(416, {
            'Content-Range': `bytes */${totalSize}`,
            'Access-Control-Allow-Origin': '*',
          });
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
          'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition',
        });

        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': totalSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFileName)}"`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition',
        });

        const fileStream = fs.createReadStream(cacheFilePath);
        fileStream.pipe(res);
      }
    } catch (err: any) {
      console.error('Error serving cache file:', err);
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Error al leer el archivo descargado: ' + err.message);
      }
    }
  };

  // 1. If already cached on server, serve immediately!
  if (fs.existsSync(cacheFilePath) && fs.statSync(cacheFilePath).size > 1024) {
    serveCachedFile();
    return;
  }

  // 2. Build arguments builder with client fallback
  const buildArgs = (clientString: string): string[] => {
    const args = [
      '--no-warnings',
      '--no-playlist',
      '--extractor-args',
      `youtube:player_client=${clientString}`,
      '--no-check-certificates',
      '--user-agent',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    ];

    const denoPath = findDenoPath();
    if (denoPath) {
      args.push('--js-runtimes', `deno:${denoPath}`);
    } else if (nodePath && fs.existsSync(nodePath)) {
      args.push('--js-runtimes', `node:${nodePath}`);
    }

    if (process.env.YOUTUBE_COOKIES) {
      try {
        const cookieTmp = path.join(CACHE_DIR, 'yt_cookies.txt');
        fs.writeFileSync(cookieTmp, process.env.YOUTUBE_COOKIES);
        args.push('--cookies', cookieTmp);
      } catch {}
    } else if (fs.existsSync(path.join(process.cwd(), 'cookies.txt'))) {
      args.push('--cookies', path.join(process.cwd(), 'cookies.txt'));
    }

    if (formatKey === 'audio_mp3') {
      args.push('-f', 'bestaudio/ba/18/best', '-x', '--audio-format', 'mp3', '--audio-quality', '2');
    } else if (formatKey === 'audio_m4a') {
      args.push('-f', '140/ba[ext=m4a]/bestaudio/18/best', '-x', '--audio-format', 'm4a');
    } else if (formatKey === 'video_360p') {
      args.push('-f', '18/best[height<=360]/best');
    } else if (formatKey === 'video_1080p') {
      args.push('-f', 'bestvideo[height<=1080]+bestaudio/best[height<=1080]/18/best');
    } else {
      // Default video_720p
      args.push('-f', 'best[height<=720]/18/best');
    }

    return args;
  };

  const safeTitle = customTitle.replace(/[/\\?%*:|"<>]/g, '_').trim() || videoId;
  const downloadFileName = `${safeTitle}.${ext}`;

  // Priority list of player clients: android (bypasses bot check without PO token) -> tv,mweb -> web
  const clientCandidates = ['android,web', 'tv,mweb', 'android_creator'];

  let clientIndex = 0;
  let hasSentHeaders = false;
  let accumulatedStderr = '';
  const cacheTempPath = `${cacheFilePath}.part_${Date.now()}`;
  let cacheWriteStream: fs.WriteStream | null = null;

  const tryNextClient = () => {
    if (clientIndex >= clientCandidates.length) {
      if (!res.writableEnded && !hasSentHeaders) {
        res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end(`Error al descargar de YouTube: ${accumulatedStderr.slice(-300)}`);
      }
      try { if (fs.existsSync(cacheTempPath)) fs.unlinkSync(cacheTempPath); } catch {}
      return;
    }

    const currentClient = clientCandidates[clientIndex++];
    const args = buildArgs(currentClient);
    args.push('-o', '-', canonicalUrl);

    cacheWriteStream = fs.createWriteStream(cacheTempPath);
    const proc = spawn(ytDlp, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    req.on('close', () => {
      if (!res.writableEnded) {
        try { proc.kill('SIGTERM'); } catch {}
        try { cacheWriteStream?.destroy(); } catch {}
        try { if (fs.existsSync(cacheTempPath)) fs.unlinkSync(cacheTempPath); } catch {}
      }
    });

    proc.stdout.on('data', (chunk: Buffer) => {
      if (!hasSentHeaders) {
        hasSentHeaders = true;
        res.writeHead(200, {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadFileName)}"`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition',
          'Transfer-Encoding': 'chunked',
        });
      }
      res.write(chunk);
      try {
        cacheWriteStream?.write(chunk);
      } catch {}
    });

    proc.stderr.on('data', (d: Buffer) => {
      accumulatedStderr += d.toString();
    });

    proc.on('close', (code) => {
      try { cacheWriteStream?.end(); } catch {}

      if (code !== 0 && !hasSentHeaders) {
        console.warn(`yt-dlp client "${currentClient}" failed (exit code ${code}), trying fallback...`);
        tryNextClient();
        return;
      }

      if (hasSentHeaders && !res.writableEnded) {
        res.end();
      }

      if (code === 0 && fs.existsSync(cacheTempPath) && fs.statSync(cacheTempPath).size > 1000) {
        try {
          if (fs.existsSync(cacheFilePath)) fs.unlinkSync(cacheFilePath);
          fs.renameSync(cacheTempPath, cacheFilePath);
        } catch {}
      } else {
        try { if (fs.existsSync(cacheTempPath)) fs.unlinkSync(cacheTempPath); } catch {}
      }
    });
  };

  tryNextClient();
}

