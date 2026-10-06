/**
 * User Preferences & Gustos Manager for Offline Media Vault.
 * Persists all user choices (download format preference, default view mode, sort order,
 * player behavior, musical tastes, and UI themes) in localStorage & IndexedDB.
 */

import { SortOption } from '../types/media';

export type DownloadFormatPref = 'ask' | 'audio_mp3' | 'audio_m4a' | 'video_720p' | 'video_1080p';

export interface UserPreferences {
  downloadFormat: DownloadFormatPref;
  viewMode: 'grid' | 'list';
  sortOption: SortOption;
  defaultCategory: string;
  autoplayNext: boolean;
  rememberPosition: boolean;
  ambientGlow: boolean;
  compactMode: boolean;
  likedArtists: string[];
  likedGenres: string[];
}

const STORAGE_KEY = 'omv_user_preferences_v1';

const DEFAULT_PREFERENCES: UserPreferences = {
  downloadFormat: 'ask',
  viewMode: 'grid',
  sortOption: 'recent',
  defaultCategory: 'all',
  autoplayNext: true,
  rememberPosition: true,
  ambientGlow: true,
  compactMode: false,
  likedArtists: [],
  likedGenres: ['Música', 'Videos', 'Podcasts'],
};

class PreferencesManager {
  private prefs: UserPreferences;

  constructor() {
    this.prefs = this.load();
  }

  private load(): UserPreferences {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        let loaded: UserPreferences = { ...DEFAULT_PREFERENCES };
        if (raw) {
          loaded = { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
        }

        // Migration check for legacy interests
        const legacyInterests = localStorage.getItem('sharemusic_interests');
        if (legacyInterests && (!loaded.likedArtists || loaded.likedArtists.length === 0)) {
          try {
            const parsed = JSON.parse(legacyInterests);
            if (Array.isArray(parsed)) {
              loaded.likedArtists = parsed;
            }
          } catch {}
        }
        return loaded;
      }
    } catch (e) {
      console.warn('[PreferencesManager] Error loading preferences:', e);
    }
    return { ...DEFAULT_PREFERENCES };
  }

  public getPreferences(): UserPreferences {
    return { ...this.prefs };
  }

  public save(updates: Partial<UserPreferences>): UserPreferences {
    this.prefs = { ...this.prefs, ...updates };
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
        if (this.prefs.likedArtists && this.prefs.likedArtists.length > 0) {
          localStorage.setItem('sharemusic_interests', JSON.stringify(this.prefs.likedArtists));
        }
      }
    } catch (e) {
      console.warn('[PreferencesManager] Error saving preferences:', e);
    }
    return { ...this.prefs };
  }

  public setDownloadFormat(format: DownloadFormatPref): void {
    this.save({ downloadFormat: format });
  }

  public setViewMode(mode: 'grid' | 'list'): void {
    this.save({ viewMode: mode });
  }

  public setSortOption(sort: SortOption): void {
    this.save({ sortOption: sort });
  }

  public setLikedGenres(genres: string[]): void {
    this.save({ likedGenres: genres });
  }

  public setLikedArtists(artists: string[]): void {
    this.save({ likedArtists: artists });
  }
}

export const preferencesManager = new PreferencesManager();
