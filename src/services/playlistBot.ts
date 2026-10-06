import { MediaItem, Playlist } from '../types/media';
import { getAllMedia, getAllPlaylists, savePlaylist, updateMediaItem, saveMediaItem } from '../database/db';
import { preferencesManager } from './preferencesManager';
import { youTubeProvider } from './providers/YouTubeProvider';

export interface BotPlaylistSummary {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'most_played' | 'top_10' | 'top_100' | 'artist_album' | 'smart_mix';
  itemCount: number;
}

class PlaylistBot {
  /**
   * Records a playback event to update play count and last played timestamp.
   */
  public async recordPlayback(item: MediaItem): Promise<void> {
    try {
      const currentCount = item.metadata?.playCount || 0;
      await updateMediaItem(item.id, {
        lastPlayedAt: Date.now(),
        metadata: {
          ...(item.metadata || {}),
          playCount: currentCount + 1,
        },
      });

      // Trigger automatic bot refresh in background
      this.generateAllBotPlaylists().catch(() => {});
    } catch (err) {
      console.warn('[PlaylistBot] Error recording playback:', err);
    }
  }

  /**
   * Scans library and YouTube trends to generate/update all smart bot playlists.
   */
  public async generateAllBotPlaylists(): Promise<BotPlaylistSummary[]> {
    const allMedia = await getAllMedia();
    const prefs = preferencesManager.getPreferences();
    const likedArtists = prefs.likedArtists && prefs.likedArtists.length > 0
      ? prefs.likedArtists
      : ['Coldplay', 'Duki', 'Bad Bunny', 'Queen'];

    const botSummaries: BotPlaylistSummary[] = [];

    // 1. "Lo Más Escuchado por Ti"
    const mostPlayedPlaylist = await this.generateMostPlayedPlaylist(allMedia);
    if (mostPlayedPlaylist) {
      botSummaries.push({
        id: mostPlayedPlaylist.id,
        name: mostPlayedPlaylist.name,
        description: mostPlayedPlaylist.description || '',
        icon: '🌟',
        category: 'most_played',
        itemCount: mostPlayedPlaylist.itemIds.length,
      });
    }

    // 2. "Top 10 Tendencias del Momento"
    const top10Playlist = await this.generateTop10TrendingPlaylist(likedArtists[0] || 'Musica popular');
    if (top10Playlist) {
      botSummaries.push({
        id: top10Playlist.id,
        name: top10Playlist.name,
        description: top10Playlist.description || '',
        icon: '🔥',
        category: 'top_10',
        itemCount: top10Playlist.itemIds.length,
      });
    }

    // 3. "Top 100 Éxitos Globales"
    const top100Playlist = await this.generateTop100GlobalPlaylist(allMedia, likedArtists);
    if (top100Playlist) {
      botSummaries.push({
        id: top100Playlist.id,
        name: top100Playlist.name,
        description: top100Playlist.description || '',
        icon: '💯',
        category: 'top_100',
        itemCount: top100Playlist.itemIds.length,
      });
    }

    // 4. Álbumes por Artista
    for (const artist of likedArtists.slice(0, 3)) {
      const albumPlaylist = await this.generateArtistAlbumPlaylist(allMedia, artist);
      if (albumPlaylist) {
        botSummaries.push({
          id: albumPlaylist.id,
          name: albumPlaylist.name,
          description: albumPlaylist.description || '',
          icon: '💿',
          category: 'artist_album',
          itemCount: albumPlaylist.itemIds.length,
        });
      }
    }

    return botSummaries;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helper Generators
  // ───────────────────────────────────────────────────────────────────────────

  private async generateMostPlayedPlaylist(allMedia: MediaItem[]): Promise<Playlist | null> {
    const sorted = [...allMedia].sort((a, b) => {
      const countA = a.metadata?.playCount || 0;
      const countB = b.metadata?.playCount || 0;
      if (countB !== countA) return countB - countA;
      return (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0);
    });

    const topItems = sorted.slice(0, 30);
    if (topItems.length === 0) return null;

    const playlist: Playlist = {
      id: 'bot_playlist_most_played',
      name: '🌟 Lo Más Escuchado por Ti',
      description: 'Bot Playlist: Generada automáticamente con tus canciones y videos más reproducidos',
      itemIds: topItems.map((m) => m.id),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await savePlaylist(playlist);
    return playlist;
  }

  private async generateTop10TrendingPlaylist(searchTopic: string): Promise<Playlist | null> {
    try {
      const results = await youTubeProvider.search(searchTopic, 10);
      if (results.length === 0) return null;

      const itemIds: string[] = [];
      for (const track of results) {
        const item: MediaItem = {
          id: track.id,
          title: track.title,
          sourceUrl: track.url,
          originalUrl: track.url,
          provider: 'youtube',
          source: 'youtube',
          mediaType: 'audio',
          thumbnail: track.thumbnail,
          duration: track.duration,
          fileName: `${track.id}.mp3`,
          mimeType: 'audio/mpeg',
          size: 0,
          fileSize: 0,
          hasLocalBlob: false,
          isOffline: false,
          category: 'musica',
          tags: ['#bot_top10', '#tendencias'],
          favorite: false,
          downloadStatus: 'not_downloaded',
          createdAt: Date.now(),
          progress: 0,
          canDownload: false,
          canStreamOffline: false,
          requiresOnlinePlayback: true,
        };
        await saveMediaItem(item);
        itemIds.push(item.id);
      }

      const playlist: Playlist = {
        id: 'bot_playlist_top_10',
        name: `🔥 Top 10 Tendencias (${searchTopic})`,
        description: `Bot Playlist: Éxitos del momento actualizados para ${searchTopic}`,
        itemIds,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await savePlaylist(playlist);
      return playlist;
    } catch {
      return null;
    }
  }

  private async generateTop100GlobalPlaylist(allMedia: MediaItem[], artists: string[]): Promise<Playlist | null> {
    try {
      const itemIds: string[] = allMedia.map((m) => m.id);

      // Search trends for top artists to populate top 100
      for (const artist of artists.slice(0, 2)) {
        if (itemIds.length >= 100) break;
        const results = await youTubeProvider.search(`${artist} top exitos`, 15);
        for (const track of results) {
          if (itemIds.length >= 100) break;
          const item: MediaItem = {
            id: track.id,
            title: track.title,
            sourceUrl: track.url,
            originalUrl: track.url,
            provider: 'youtube',
            source: 'youtube',
            mediaType: 'audio',
            thumbnail: track.thumbnail,
            duration: track.duration,
            fileName: `${track.id}.mp3`,
            mimeType: 'audio/mpeg',
            size: 0,
            fileSize: 0,
            hasLocalBlob: false,
            isOffline: false,
            category: 'musica',
            tags: ['#top100'],
            favorite: false,
            downloadStatus: 'not_downloaded',
            createdAt: Date.now(),
            progress: 0,
            canDownload: false,
            canStreamOffline: false,
            requiresOnlinePlayback: true,
          };
          await saveMediaItem(item);
          if (!itemIds.includes(item.id)) itemIds.push(item.id);
        }
      }

      const playlist: Playlist = {
        id: 'bot_playlist_top_100',
        name: '💯 Top 100 Éxitos Globales',
        description: 'Bot Playlist: Selección masiva de 100 mejores éxitos basados en tus gustos',
        itemIds: itemIds.slice(0, 100),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await savePlaylist(playlist);
      return playlist;
    } catch {
      return null;
    }
  }

  private async generateArtistAlbumPlaylist(allMedia: MediaItem[], artist: string): Promise<Playlist | null> {
    const matchingLocal = allMedia.filter(
      (m) => m.title.toLowerCase().includes(artist.toLowerCase()) || m.metadata?.artist?.toLowerCase().includes(artist.toLowerCase())
    );

    const itemIds = matchingLocal.map((m) => m.id);

    // If local matches are few, fetch online songs for artist
    if (itemIds.length < 5) {
      try {
        const results = await youTubeProvider.search(artist, 10);
        for (const track of results) {
          const item: MediaItem = {
            id: track.id,
            title: track.title,
            sourceUrl: track.url,
            originalUrl: track.url,
            provider: 'youtube',
            source: 'youtube',
            mediaType: 'audio',
            thumbnail: track.thumbnail,
            duration: track.duration,
            fileName: `${track.id}.mp3`,
            mimeType: 'audio/mpeg',
            size: 0,
            fileSize: 0,
            hasLocalBlob: false,
            isOffline: false,
            category: 'musica',
            tags: [`#${artist.toLowerCase().replace(/\s+/g, '')}`],
            favorite: false,
            downloadStatus: 'not_downloaded',
            createdAt: Date.now(),
            progress: 0,
            canDownload: false,
            canStreamOffline: false,
            requiresOnlinePlayback: true,
          };
          await saveMediaItem(item);
          if (!itemIds.includes(item.id)) itemIds.push(item.id);
        }
      } catch {}
    }

    if (itemIds.length === 0) return null;

    const playlist: Playlist = {
      id: `bot_playlist_artist_${artist.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      name: `💿 Colección Especial: ${artist}`,
      description: `Bot Playlist: Álbum y mejores temas de ${artist}`,
      itemIds: itemIds.slice(0, 30),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await savePlaylist(playlist);
    return playlist;
  }
}

export const playlistBot = new PlaylistBot();
