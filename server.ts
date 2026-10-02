import express from 'express';
import path from 'path';
import fs from 'fs';
import { handleYouTubeInfo, handleYouTubeStream } from './src/server/youtubeBackend';

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Enable CORS for all origins (allows Vercel frontend or mobile apps to connect)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Disposition');
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
