import { useEffect, useRef } from 'react';
import { youTubeProvider } from '../services/providers/YouTubeProvider';

export function useClipboardWatcher(onDetect: (url: string, isPlaylist: boolean) => void) {
  const lastCheckedRef = useRef<string>('');

  useEffect(() => {
    const checkClipboard = async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.readText) {
          return;
        }

        const text = await navigator.clipboard.readText();
        if (!text || typeof text !== 'string') return;

        const trimmed = text.trim();
        if (trimmed === lastCheckedRef.current) return;

        // Check if it's a YouTube URL
        if (youTubeProvider.canHandle(trimmed)) {
          lastCheckedRef.current = trimmed;
          const isPlaylist = youTubeProvider.isPlaylistUrl(trimmed);
          onDetect(trimmed, isPlaylist);
        }
      } catch {
        // Clipboard read permission might be denied or unsupported, safely ignore
      }
    };

    // Check on initial mount
    const timer = setTimeout(checkClipboard, 1000);

    // Check on window focus and visibility change
    const handleFocus = () => checkClipboard();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkClipboard();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onDetect]);
}
