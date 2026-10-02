import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker immediately for 100% offline PWA caching
registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('[MediaVault] App lista para funcionar 100% offline y en Modo Avión.');
  },
  onNeedRefresh() {
    console.log('[MediaVault] Nueva versión disponible.');
  },
});

// Explicit cache warming for iOS Safari standalone WebClips
if (typeof window !== 'undefined' && 'caches' in window) {
  window.addEventListener('load', async () => {
    try {
      const cache = await caches.open('offline-shell-v1');
      await cache.addAll(['/', '/index.html']);
    } catch (e) {
      // Ignored if offline
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);

