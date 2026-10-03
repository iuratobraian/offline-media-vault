import { IncomingMessage, ServerResponse } from 'http';
import { spawn, execFile } from 'child_process';
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

// ─────────────────────────────────────────────────────────────────────────────
// InnerTube API – directly query YouTube's internal API used by mobile apps
// This bypasses bot-detection because it mimics the Android YouTube app's
// native API calls, which don't require JavaScript execution or PO tokens.
// ─────────────────────────────────────────────────────────────────────────────

interface InnerTubeFormat {
  itag: number;
  url?: string;
  mimeType?: string;
  bitrate?: number;
  width?: number;
  height?: number;
  contentLength?: string;
  quality?: string;
  qualityLabel?: string;
  audioQuality?: string;
  audioSampleRate?: string;
  approxDurationMs?: string;
}

interface InnerTubeResponse {
  streamingData?: {
    formats?: InnerTubeFormat[];
    adaptiveFormats?: InnerTubeFormat[];
    expiresInSeconds?: string;
  };
  videoDetails?: {
    title?: string;
    author?: string;
    videoId?: string;
    lengthSeconds?: string;
    thumbnail?: { thumbnails?: { url: string; width: number; height: number }[] };
  };
  playabilityStatus?: {
    status?: string;
    reason?: string;
  };
}

// InnerTube clients that work without PO tokens on cloud IPs
const INNERTUBE_CLIENTS = [
  {
    name: 'ANDROID',
    clientName: 'ANDROID',
    clientVersion: '19.30.36',
    androidSdkVersion: 34,
    userAgent: 'com.google.android.youtube/19.30.36 (Linux; U; Android 14; en_US) gzip',
    apiKey: 'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
  },
  {
    name: 'ANDROID_EMBEDDED',
    clientName: 'ANDROID_EMBEDDED_PLAYER',
    clientVersion: '19.30.36',
    androidSdkVersion: 34,
    userAgent: 'com.google.android.youtube/19.30.36 (Linux; U; Android 14; en_US) gzip',
    apiKey: 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
  },
  {
    name: 'TV',
    clientName: 'TVHTML5',
    clientVersion: '7.20240801.18.00',
    userAgent: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 6.5) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.5 TV Safari/538.1',
    apiKey: 'AIzaSyDCU8hByM-4DrUqRUYnGn-3llEO78bcxq8',
  },
];

async function fetchInnerTubeFormats(videoId: string): Promise<{ formats: InnerTubeFormat[], adaptiveFormats: InnerTubeFormat[], title: string, author: string, thumbnail: string } | null> {
  for (const client of INNERTUBE_CLIENTS) {
    try {
      const body: any = {
        videoId,
        context: {
          client: {
            clientName: client.clientName,
            clientVersion: client.clientVersion,
            hl: 'en',
            gl: 'US',
          },
        },
      };
      if (client.androidSdkVersion) {
        body.context.client.androidSdkVersion = client.androidSdkVersion;
        body.context.client.osName = 'Android';
        body.context.client.osVersion = '14';
        body.context.client.platform = 'MOBILE';
      }
      const params = new URLSearchParams({ key: client.apiKey, prettyPrint: 'false' });
      const resp = await fetch(
        `https://www.youtube.com/youtubei/v1/player?${params}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': client.userAgent,
            'X-YouTube-Client-Name': client.clientName === 'TVHTML5' ? '7' : '3',
            'X-YouTube-Client-Version': client.clientVersion,
            'Origin': 'https://www.youtube.com',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!resp.ok) {
        console.warn(`[InnerTube] Client ${client.name} returned HTTP ${resp.status}`);
        continue;
      }

      const data: InnerTubeResponse = await resp.json();

      if (data.playabilityStatus?.status === 'ERROR' || data.playabilityStatus?.status === 'UNPLAYABLE') {
        console.warn(`[InnerTube] Client ${client.name}: ${data.playabilityStatus.reason}`);
        continue;
      }

      const formats = data.streamingData?.formats || [];
      const adaptiveFormats = data.streamingData?.adaptiveFormats || [];

      // Need at least some formats with direct URLs
      const hasUrls = [...formats, ...adaptiveFormats].some(f => f.url);
      if (!hasUrls) {
        console.warn(`[InnerTube] Client ${client.name}: No direct URLs (cipher protected)`);
        continue;
      }

      const title = data.videoDetails?.title || `YouTube ${videoId}`;
      const author = data.videoDetails?.author || 'YouTube';
      const thumbnails = data.videoDetails?.thumbnail?.thumbnails || [];
      const thumbnail = thumbnails.length > 0
        ? thumbnails[thumbnails.length - 1].url
        : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      console.log(`[InnerTube] Client ${client.name} succeeded! Got ${formats.length + adaptiveFormats.length} formats.`);
      return { formats, adaptiveFormats, title, author, thumbnail };

    } catch (e: any) {
      console.warn(`[InnerTube] Client ${client.name} error:`, e.message);
    }
  }
  return null;
}

function selectBestFormat(
  formats: InnerTubeFormat[],
  adaptiveFormats: InnerTubeFormat[],
  formatKey: string
): InnerTubeFormat | null {
  const all = [...formats, ...adaptiveFormats].filter(f => f.url);

  if (formatKey === 'audio_mp3' || formatKey === 'audio_m4a') {
    // Prefer audio-only formats (itag 140=m4a, 141=m4a, 251=webm/opus, 250=webm, 249=webm)
    const audioOnly = all.filter(f => f.mimeType?.startsWith('audio/') && !f.width);
    // Sort by bitrate descending
    audioOnly.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    if (audioOnly.length > 0) return audioOnly[0];

    // Fallback to format 18 (360p mp4 with audio)
    return all.find(f => f.itag === 18) || all[0] || null;
  }

  if (formatKey === 'video_360p') {
    // Prefer format 18 (360p progressive MP4)
    const f18 = all.find(f => f.itag === 18);
    if (f18) return f18;
    const f360 = all.filter(f => (f.height || 0) <= 360 && f.mimeType?.startsWith('video/mp4'));
    return f360[0] || all.find(f => f.mimeType?.startsWith('video/')) || null;
  }

  if (formatKey === 'video_720p') {
    // Prefer format 22 (720p progressive MP4)
    const f22 = all.find(f => f.itag === 22);
    if (f22) return f22;
    const f720 = all.filter(f => (f.height || 0) <= 720 && f.mimeType?.startsWith('video/mp4'));
    f720.sort((a, b) => (b.height || 0) - (a.height || 0));
    return f720[0] || all.find(f => f.itag === 18) || null;
  }

  return all.find(f => f.itag === 18) || all[0] || null;
}

// ─────────────────────────────────────────────────────────────────────────────

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

  // Fetch title/author/thumbnail from YouTube oEmbed (fast, no bot-block)
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
    } catch {}
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
      label: 'MP3 Alta Calidad',
      format: 'MP3',
      quality: 'Alta calidad',
      type: 'audio',
      ext: '.mp3',
      mimeType: 'audio/mpeg',
      fileSize: 9000000,
      supportsRangeRequests: true,
      url: `/api/youtube/stream?url=${encodeURIComponent(canonicalUrl)}&formatKey=audio_mp3&title=${encodeURIComponent(title)}`,
    },
    {
      id: 'yt_audio_m4a',
      label: 'M4A / AAC Nativo',
      format: 'M4A',
      quality: 'Nativa',
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
  const safeTitle = customTitle.replace(/[/\\?%*:|"<>]/g, '_').trim() || videoId;

  let ext = 'mp4';
  let mimeType = 'video/mp4';
  if (formatKey === 'audio_mp3') { ext = 'mp3'; mimeType = 'audio/mpeg'; }
  else if (formatKey === 'audio_m4a') { ext = 'm4a'; mimeType = 'audio/mp4'; }

  const downloadFileName = `${safeTitle}.${ext}`;
  const cacheFileName = `${videoId}_${formatKey}.${ext}`;
  const cacheFilePath = path.join(CACHE_DIR, cacheFileName);

  const isInline = parsedUrl.searchParams.get('inline') === 'true' || parsedUrl.searchParams.get('play') === 'true';
  const disposition = isInline
    ? `inline; filename="${encodeURIComponent(downloadFileName)}"`
    : `attachment; filename="${encodeURIComponent(downloadFileName)}"`;

  const serveCachedFile = () => {
    try {
      const stats = fs.statSync(cacheFilePath);
      const totalSize = stats.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (start >= totalSize || end >= totalSize) {
          res.writeHead(416, { 'Content-Range': `bytes */${totalSize}`, 'Access-Control-Allow-Origin': '*' });
          res.end();
          return;
        }

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Type': mimeType,
          'Content-Disposition': disposition,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition',
        });
        fs.createReadStream(cacheFilePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': totalSize,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Content-Disposition': disposition,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition',
        });
        fs.createReadStream(cacheFilePath).pipe(res);
      }
    } catch (err: any) {
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end('Error al leer el archivo descargado: ' + err.message);
      }
    }
  };

  // Serve from cache if available
  if (fs.existsSync(cacheFilePath) && fs.statSync(cacheFilePath).size > 1024) {
    console.log(`[stream] Serving cached file for ${videoId} (${formatKey})`);
    serveCachedFile();
    return;
  }

  // ─── Strategy 1: InnerTube API (direct URL, no yt-dlp needed) ───────────────
  console.log(`[stream] Trying InnerTube API for ${videoId}...`);
  let innerTubeResult: Awaited<ReturnType<typeof fetchInnerTubeFormats>> = null;
  try {
    innerTubeResult = await fetchInnerTubeFormats(videoId);
  } catch (e: any) {
    console.warn('[InnerTube] fetchInnerTubeFormats error:', e.message);
  }

  if (innerTubeResult) {
    const { formats, adaptiveFormats } = innerTubeResult;
    const selectedFormat = selectBestFormat(formats, adaptiveFormats, formatKey);

    if (selectedFormat?.url) {
      console.log(`[InnerTube] Streaming itag=${selectedFormat.itag} mimeType=${selectedFormat.mimeType}`);
      try {
        // For audio_mp3, we still need to pipe through ffmpeg for conversion
        // For m4a and video, we can proxy the direct URL
        if (formatKey === 'audio_mp3') {
          // Proxy via ffmpeg for MP3 conversion
          await streamViaFfmpeg(selectedFormat.url, res, downloadFileName, mimeType, cacheFilePath, req, disposition);
        } else {
          // Direct proxy: stream YouTube's CDN URL through our server
          await proxyDirectUrl(selectedFormat.url, res, downloadFileName, mimeType, cacheFilePath, req, disposition);
        }
        return;
      } catch (e: any) {
        console.warn('[InnerTube] Direct proxy failed, falling back to yt-dlp:', e.message);
        if (res.writableEnded) return;
      }
    }
  }

  // ─── Strategy 2: yt-dlp with multiple client fallbacks ──────────────────────
  console.log(`[stream] Falling back to yt-dlp for ${videoId}...`);
  await streamViaYtDlp(videoId, canonicalUrl, formatKey, ext, mimeType, downloadFileName, cacheFilePath, req, res, ytDlp, nodePath, disposition);
}

async function proxyDirectUrl(
  directUrl: string,
  res: ServerResponse,
  downloadFileName: string,
  mimeType: string,
  cacheFilePath: string,
  req: IncomingMessage,
  disposition: string = `attachment; filename="${encodeURIComponent(downloadFileName)}"`
): Promise<void> {
  const fetchHeaders: Record<string, string> = {
    'User-Agent': 'com.google.android.youtube/19.30.36 (Linux; U; Android 14) gzip',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://www.youtube.com',
    'Referer': 'https://www.youtube.com/',
  };

  // Forward range request if client sent one
  if (req.headers.range) {
    fetchHeaders['Range'] = req.headers.range;
  }

  const ytResp = await fetch(directUrl, {
    headers: fetchHeaders,
    signal: AbortSignal.timeout(30000),
  });

  if (!ytResp.ok && ytResp.status !== 206) {
    throw new Error(`YouTube CDN returned HTTP ${ytResp.status}`);
  }

  const totalLength = ytResp.headers.get('content-length');
  const contentRange = ytResp.headers.get('content-range');

  const outHeaders: Record<string, string | number> = {
    'Content-Type': mimeType,
    'Content-Disposition': disposition,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition',
    'Accept-Ranges': 'bytes',
  };
  if (totalLength) outHeaders['Content-Length'] = totalLength;
  if (contentRange) outHeaders['Content-Range'] = contentRange;

  res.writeHead(ytResp.status === 206 ? 206 : 200, outHeaders);

  if (!ytResp.body) throw new Error('No response body from YouTube CDN');

  // Pipe the response body and also cache it
  const cacheStream = fs.createWriteStream(cacheFilePath + '.tmp');
  const reader = ytResp.body.getReader();
  let cacheOk = true;

  req.on('close', () => {
    reader.cancel().catch(() => {});
    cacheStream.destroy();
    try { if (fs.existsSync(cacheFilePath + '.tmp')) fs.unlinkSync(cacheFilePath + '.tmp'); } catch {}
  });

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!res.writableEnded) res.write(value);
    if (cacheOk) {
      try { cacheStream.write(value); } catch { cacheOk = false; }
    }
  }

  cacheStream.end();
  if (!res.writableEnded) res.end();

  // Rename temp cache to final
  if (cacheOk && fs.existsSync(cacheFilePath + '.tmp') && fs.statSync(cacheFilePath + '.tmp').size > 1000) {
    try { fs.renameSync(cacheFilePath + '.tmp', cacheFilePath); } catch {}
  }
}

async function streamViaFfmpeg(
  directUrl: string,
  res: ServerResponse,
  downloadFileName: string,
  mimeType: string,
  cacheFilePath: string,
  req: IncomingMessage,
  disposition: string = `attachment; filename="${encodeURIComponent(downloadFileName)}"`
): Promise<void> {
  const cacheTempPath = cacheFilePath + '.tmp';

  const proc = spawn('ffmpeg', [
    '-user_agent', 'com.google.android.youtube/19.30.36 (Linux; U; Android 14) gzip',
    '-headers', 'Origin: https://www.youtube.com\r\nReferer: https://www.youtube.com/\r\n',
    '-i', directUrl,
    '-vn',
    '-acodec', 'libmp3lame',
    '-q:a', '0',
    '-f', 'mp3',
    'pipe:1',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let hasSentHeaders = false;
  const cacheStream = fs.createWriteStream(cacheTempPath);

  req.on('close', () => {
    try { proc.kill('SIGTERM'); } catch {}
    try { cacheStream.destroy(); } catch {}
    try { if (fs.existsSync(cacheTempPath)) fs.unlinkSync(cacheTempPath); } catch {}
  });

  proc.stdout.on('data', (chunk: Buffer) => {
    if (!hasSentHeaders) {
      hasSentHeaders = true;
      res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Disposition': disposition,
        'Access-Control-Allow-Origin': '*',
        'Transfer-Encoding': 'chunked',
      });
    }
    if (!res.writableEnded) res.write(chunk);
    try { cacheStream.write(chunk); } catch {}
  });

  proc.stderr.on('data', (d: Buffer) => {
    const text = d.toString();
    if (text.includes('time=') || text.includes('size=')) {
      process.stdout.write('[ffmpeg] ' + text);
    }
  });

  await new Promise<void>((resolve, reject) => {
    proc.on('close', (code) => {
      cacheStream.end();
      if (code === 0) {
        if (!res.writableEnded) res.end();
        if (fs.existsSync(cacheTempPath) && fs.statSync(cacheTempPath).size > 1000) {
          try { fs.renameSync(cacheTempPath, cacheFilePath); } catch {}
        }
        resolve();
      } else if (!hasSentHeaders) {
        reject(new Error(`ffmpeg exited with code ${code}`));
      } else {
        if (!res.writableEnded) res.end();
        resolve();
      }
    });
  });
}

async function streamViaYtDlp(
  videoId: string,
  canonicalUrl: string,
  formatKey: string,
  ext: string,
  mimeType: string,
  downloadFileName: string,
  cacheFilePath: string,
  req: IncomingMessage,
  res: ServerResponse,
  ytDlp: string,
  nodePath: string,
  disposition: string = `attachment; filename="${encodeURIComponent(downloadFileName)}"`
): Promise<void> {
  const hasCookies = !!process.env.YOUTUBE_COOKIES || fs.existsSync(path.join(process.cwd(), 'cookies.txt'));

  const buildArgs = (clientString: string, extraFlags: string[] = []): string[] => {
    const args: string[] = [
      '--no-warnings',
      '--no-playlist',
      '--no-check-certificates',
    ];

    // Combine player_client and js_runtime into ONE --extractor-args to avoid overwrite
    const denoPath = findDenoPath();
    if (denoPath) {
      args.push('--extractor-args', `youtube:player_client=${clientString};js_runtime=deno`);
    } else if (nodePath && fs.existsSync(nodePath)) {
      args.push('--extractor-args', `youtube:player_client=${clientString}`);
      args.push('--js-runtimes', `node:${nodePath}`);
    } else {
      args.push('--extractor-args', `youtube:player_client=${clientString}`);
    }

    args.push(
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      '--add-header', 'Origin:https://www.youtube.com',
      '--add-header', 'Referer:https://www.youtube.com/',
    );

    // Add cookies if available
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
      args.push('-f', 'bestaudio/140/18/best', '-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else if (formatKey === 'audio_m4a') {
      args.push('-f', '140/bestaudio[ext=m4a]/bestaudio/18/best', '-x', '--audio-format', 'm4a');
    } else if (formatKey === 'video_360p') {
      args.push('-f', '18/best[height<=360]/best');
    } else if (formatKey === 'video_1080p') {
      args.push('-f', '137+140/bestvideo[height<=1080]+bestaudio/best[height<=1080]/18/best');
    } else {
      args.push('-f', '22/18/best[height<=720]/best');
    }

    args.push(...extraFlags);
    return args;
  };

  // When cookies are present: web/tv clients work (android skips cookies!)
  // When no cookies: android client works without PO token
  const clientStrategies: [string, string[]][] = hasCookies
    ? [
        ['web', []],                  // Best with cookies + yt-dlp-ejs
        ['tv', []],                   // TV client accepts cookies
        ['mweb', []],                 // Mobile web with cookies
        ['web', ['--force-ipv4']],    // Force IPv4
        ['android,web', []],          // Android skips cookies but web part uses them
      ]
    : [
        ['android', []],              // No cookies needed, no PO token required
        ['android,web', []],          // Combo fallback
        ['tv', []],
        ['mweb', []],
        ['android_creator', []],
        ['web', ['--force-ipv4']],
      ];

  let strategyIndex = 0;
  let hasSentHeaders = false;
  let accumulatedStderr = '';
  const cacheTempPath = `${cacheFilePath}.part_${Date.now()}`;
  let cacheWriteStream: fs.WriteStream | null = null;

  const tryNextStrategy = () => {
    if (strategyIndex >= clientStrategies.length) {
      if (!res.writableEnded && !hasSentHeaders) {
        res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
        res.end(`No se pudo descargar. Detalle: ${accumulatedStderr.slice(-400)}`);
      }
      try { if (fs.existsSync(cacheTempPath)) fs.unlinkSync(cacheTempPath); } catch {}
      return;
    }

    const [currentClient, extraFlags] = clientStrategies[strategyIndex++];
    const args = buildArgs(currentClient, extraFlags);
    args.push('-o', '-', canonicalUrl);

    console.log(`[yt-dlp] Trying client "${currentClient}" for ${videoId}...`);

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
        console.log(`[yt-dlp] Client "${currentClient}" streaming ${formatKey}...`);
        res.writeHead(200, {
          'Content-Type': mimeType,
          'Content-Disposition': disposition,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition',
          'Transfer-Encoding': 'chunked',
        });
      }
      if (!res.writableEnded) res.write(chunk);
      try { cacheWriteStream?.write(chunk); } catch {}
    });

    proc.stderr.on('data', (d: Buffer) => {
      accumulatedStderr += d.toString();
    });

    proc.on('close', (code) => {
      try { cacheWriteStream?.end(); } catch {}

      if (code !== 0 && !hasSentHeaders) {
        console.warn(`[yt-dlp] Client "${currentClient}" failed (exit ${code}), trying next...`);
        try { if (fs.existsSync(cacheTempPath)) fs.unlinkSync(cacheTempPath); } catch {}
        accumulatedStderr = '';
        tryNextStrategy();
        return;
      }

      if (hasSentHeaders && !res.writableEnded) res.end();

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

  tryNextStrategy();
}

export async function handleYouTubePlaylist(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  let targetUrl = parsedUrl.searchParams.get('url');

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: false, error: 'Parámetro "url" requerido.' }));
    return;
  }

  targetUrl = targetUrl.trim();

  // Normalize URL: If it has list=PL... normalize, but keep RD mixes as watch?v=...&list=RD...
  let normalizedUrl = targetUrl;
  try {
    const u = new URL(targetUrl);
    const listId = u.searchParams.get('list');
    if (listId && !listId.startsWith('RD') && !u.pathname.includes('/playlist')) {
      normalizedUrl = `https://www.youtube.com/playlist?list=${listId}`;
    }
  } catch {}

  const ytDlp = findYtDlpPath();
  const args = [
    '--flat-playlist',
    '--dump-single-json',
    '--yes-playlist',
    '--playlist-end', '50',
    '--extractor-args', 'youtube:player_client=android,web',
    '--no-warnings'
  ];

  const cookiePath = path.join(process.cwd(), 'cookies.txt');
  if (fs.existsSync(cookiePath)) {
    args.push('--cookies', cookiePath);
  }

  args.push(normalizedUrl);

  const proc = spawn(ytDlp, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';

  const timeoutTimer = setTimeout(() => {
    try { proc.kill('SIGTERM'); } catch {}
  }, 25000);

  proc.stdout.on('data', (d) => { stdout += d.toString(); });
  proc.stderr.on('data', (d) => { stderr += d.toString(); });

  proc.on('close', () => {
    clearTimeout(timeoutTimer);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    try {
      const data = JSON.parse(stdout);
      const title = data.title || 'Playlist de YouTube';
      const entries = data.entries || [];
      
      let items = entries
        .filter((e: any) => e && e.id && e.title && !e.title.includes('[Deleted video]') && !e.title.includes('[Private video]'))
        .map((e: any) => {
          const thumbs = e.thumbnails || [];
          const bestThumb = thumbs.length > 0 ? (thumbs[thumbs.length - 1]?.url || thumbs[0]?.url) : `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`;
          return {
            id: e.id,
            title: e.title || `Video ${e.id}`,
            duration: e.duration || 0,
            thumbnail: bestThumb,
            url: `https://www.youtube.com/watch?v=${e.id}`,
          };
        });

      // If entries was empty but data has a direct id (single video passed or fallback)
      if (items.length === 0 && data.id) {
        items = [{
          id: data.id,
          title: data.title || 'Video de YouTube',
          duration: data.duration || 0,
          thumbnail: data.thumbnail || data.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${data.id}`,
        }];
      }

      if (items.length === 0) {
        res.end(JSON.stringify({
          success: false,
          error: stderr ? `No se encontraron videos: ${stderr.slice(-150)}` : 'La lista está vacía o es privada.'
        }));
        return;
      }

      res.end(JSON.stringify({ success: true, title, total: items.length, items }));
    } catch {
      res.end(JSON.stringify({
        success: false,
        error: stderr ? `Error al leer la playlist: ${stderr.slice(-200)}` : 'No se pudo procesar la lista de reproducción.'
      }));
    }
  });
}

export async function handleYouTubeSearch(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const parsedUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const q = parsedUrl.searchParams.get('q') || '';
  const limit = Math.min(parseInt(parsedUrl.searchParams.get('limit') || '8', 10), 20);

  if (!q.trim()) {
    res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ success: false, error: 'Parámetro "q" requerido.' }));
    return;
  }

  const ytDlp = findYtDlpPath();
  const args = [
    '--flat-playlist',
    '--dump-single-json',
    '--no-warnings',
    '--extractor-args', 'youtube:player_client=android,web',
    `ytsearch${limit}:${q}`
  ];

  const cookiePath = path.join(process.cwd(), 'cookies.txt');
  if (fs.existsSync(cookiePath)) {
    args.push('--cookies', cookiePath);
  }

  const proc = spawn(ytDlp, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';

  const timeoutTimer = setTimeout(() => {
    try { proc.kill('SIGTERM'); } catch {}
  }, 15000);

  proc.stdout.on('data', (d) => { stdout += d.toString(); });
  proc.stderr.on('data', (d) => { stderr += d.toString(); });

  proc.on('close', () => {
    clearTimeout(timeoutTimer);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    try {
      const data = JSON.parse(stdout);
      const entries = data.entries || [];
      const items = entries
        .filter((e: any) => e && e.id && e.title)
        .map((e: any) => {
          const thumbs = e.thumbnails || [];
          const bestThumb = thumbs.length > 0 ? (thumbs[thumbs.length - 1]?.url || thumbs[0]?.url) : `https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`;
          return {
            id: e.id,
            title: e.title,
            duration: e.duration || 0,
            thumbnail: bestThumb,
            url: `https://www.youtube.com/watch?v=${e.id}`,
            channel: e.channel || e.uploader || '',
          };
        });
      res.end(JSON.stringify({ success: true, items }));
    } catch {
      res.end(JSON.stringify({ success: false, error: 'Error al buscar en YouTube' }));
    }
  });
}
