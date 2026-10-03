import express from 'express';
import path from 'path';
import fs from 'fs';
import { handleYouTubeInfo, handleYouTubeStream, handleYouTubePlaylist, handleYouTubeSearch, ensureDefaultCookies } from './src/server/youtubeBackend';

const app = express();
ensureDefaultCookies();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Enable CORS and CSP for media streaming and PWA features
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition');
  res.header(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:; media-src 'self' blob: data: https: http:; connect-src 'self' blob: data: https: http:;"
  );
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'Offline Media Vault Engine',
  });
});

// YouTube API endpoints
app.get('/api/youtube/info', (req, res) => {
  handleYouTubeInfo(req, res);
});

app.get('/api/youtube/stream', (req, res) => {
  handleYouTubeStream(req, res);
});

app.get('/api/youtube/playlist', (req, res) => {
  handleYouTubePlaylist(req, res);
});

app.get('/api/youtube/search', (req, res) => {
  handleYouTubeSearch(req, res);
});

// Cookie management endpoint – save cookies.txt (Netscape format) for yt-dlp
app.post('/api/youtube/cookies', express.text({ type: '*/*', limit: '2mb' }), (req, res) => {
  try {
    let cookieText = typeof req.body === 'string' ? req.body : req.body?.cookies || '';
    if (typeof cookieText === 'string' && cookieText.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(cookieText);
        if (parsed.cookies) cookieText = parsed.cookies;
      } catch {}
    }
    if (!cookieText || cookieText.trim().length < 20) {
      res.status(400).json({ success: false, error: 'Cookie text too short or empty' });
      return;
    }
    const cookiePath = path.join(process.cwd(), 'cookies.txt');
    fs.writeFileSync(cookiePath, cookieText, 'utf8');
    res.json({ success: true, message: 'Cookies saved successfully', bytes: cookieText.length });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Check if cookies are loaded
app.get('/api/youtube/cookies/status', (req, res) => {
  const cookiePath = path.join(process.cwd(), 'cookies.txt');
  const hasCookieFile = fs.existsSync(cookiePath);
  const hasCookieEnv = !!process.env.YOUTUBE_COOKIES;
  res.json({
    hasCookies: hasCookieFile || hasCookieEnv,
    source: hasCookieFile ? 'file' : hasCookieEnv ? 'env' : 'none',
    cookieFileBytes: hasCookieFile ? fs.statSync(cookiePath).size : 0,
  });
});

// Serve frontend static build (dist folder) if available
const distPath = path.join(import.meta.dirname || process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send('<h1>Offline Media Vault Backend API</h1><p>El backend está activo y listo para procesar descargas.</p>');
  });
}

app.listen(Number(PORT), HOST, () => {
  console.log(`\n==================================================`);
  console.log(` 🚀 OFFLINE MEDIA VAULT SERVER ACTIVO`);
  console.log(` 💻 Local:    http://localhost:${PORT}`);
  console.log(` 🌐 Red LAN:  http://${HOST}:${PORT}`);
  console.log(`==================================================\n`);
});
