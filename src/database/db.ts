import { MediaItem, Category } from '../types/media';

const DB_NAME = 'OfflineMediaVaultDB';
const DB_VERSION = 1;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'musica', name: 'Música', icon: '🎵', color: '#10b981', isDefault: true },
  { id: 'podcasts', name: 'Podcasts', icon: '🎙️', color: '#f59e0b', isDefault: true },
  { id: 'trading', name: 'Trading', icon: '📈', color: '#06b6d4', isDefault: true },
  { id: 'educacion', name: 'Educación', icon: '📚', color: '#3b82f6', isDefault: true },
  { id: 'videos', name: 'Videos', icon: '🎬', color: '#6366f1', isDefault: true },
  { id: 'clips', name: 'Clips', icon: '⚡', color: '#ec4899', isDefault: true },
  { id: 'otros', name: 'Otros', icon: '📁', color: '#8b5cf6', isDefault: true },
];

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está disponible en este entorno.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Metadata store for fast listing without loading blobs into memory
      if (!db.objectStoreNames.contains('media_meta')) {
        const metaStore = db.createObjectStore('media_meta', { keyPath: 'id' });
        metaStore.createIndex('mediaType', 'mediaType', { unique: false });
        metaStore.createIndex('category', 'category', { unique: false });
        metaStore.createIndex('favorite', 'favorite', { unique: false });
        metaStore.createIndex('downloadStatus', 'downloadStatus', { unique: false });
        metaStore.createIndex('isOffline', 'isOffline', { unique: false });
        metaStore.createIndex('createdAt', 'createdAt', { unique: false });
        metaStore.createIndex('lastPlayedAt', 'lastPlayedAt', { unique: false });
      }

      // 2. Binary Blobs store
      if (!db.objectStoreNames.contains('media_blobs')) {
        db.createObjectStore('media_blobs', { keyPath: 'id' });
      }

      // 3. Categories store
      if (!db.objectStoreNames.contains('categories')) {
        const catStore = db.createObjectStore('categories', { keyPath: 'id' });
        // Seed default categories
        DEFAULT_CATEGORIES.forEach((cat) => catStore.put(cat));
      }

      // 4. App settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('No se pudo abrir la base de datos IndexedDB'));
    };
  });

  return dbPromise;
}

// Media Metadata Operations
export async function getAllMedia(): Promise<MediaItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('media_meta', 'readonly');
    const store = transaction.objectStore('media_meta');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getMediaById(id: string): Promise<MediaItem | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('media_meta', 'readonly');
    const store = transaction.objectStore('media_meta');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveMediaItem(item: MediaItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('media_meta', 'readwrite');
    const store = transaction.objectStore('media_meta');
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateMediaItem(id: string, updates: Partial<MediaItem>): Promise<MediaItem> {
  const current = await getMediaById(id);
  if (!current) throw new Error(`Elemento con id ${id} no encontrado`);

  // Ensure isOffline and hasLocalBlob stay in sync
  if (updates.isOffline !== undefined && updates.hasLocalBlob === undefined) {
    updates.hasLocalBlob = updates.isOffline;
  }
  if (updates.hasLocalBlob !== undefined && updates.isOffline === undefined) {
    updates.isOffline = updates.hasLocalBlob;
  }
  if (updates.playbackPosition !== undefined && updates.progress === undefined) {
    updates.progress = updates.playbackPosition;
  }
  if (updates.progress !== undefined && updates.playbackPosition === undefined) {
    updates.playbackPosition = updates.progress;
  }

  const updated: MediaItem = { ...current, ...updates };
  await saveMediaItem(updated);
  return updated;
}

export async function deleteMediaItem(id: string, deleteBlobOnly: boolean = false): Promise<void> {
  const db = await getDB();

  if (deleteBlobOnly) {
    // Only remove the local blob and mark offline as false
    await deleteMediaBlob(id);
    await updateMediaItem(id, {
      hasLocalBlob: false,
      isOffline: false,
      downloadStatus: 'not_downloaded',
      downloadedAt: undefined,
      explanation: 'Descarga eliminada para liberar espacio. Guardado como enlace online.',
    });
    return;
  }

  // Delete both blob and metadata to avoid orphan blobs
  await deleteMediaBlob(id);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('media_meta', 'readwrite');
    const store = transaction.objectStore('media_meta');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Media Blobs Operations
export async function getMediaBlob(id: string): Promise<{ blob: Blob; mimeType: string } | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('media_blobs', 'readonly');
    const store = transaction.objectStore('media_blobs');
    const request = store.get(id);

    request.onsuccess = () => {
      const record = request.result;
      if (record && record.blob) {
        resolve({ blob: record.blob, mimeType: record.mimeType });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveMediaBlob(id: string, blob: Blob, mimeType: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('media_blobs', 'readwrite');
    const store = transaction.objectStore('media_blobs');
    const request = store.put({
      id,
      blob,
      mimeType,
      size: blob.size,
      updatedAt: Date.now(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteMediaBlob(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('media_blobs', 'readwrite');
    const store = transaction.objectStore('media_blobs');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Category Operations
export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB();
  return new Promise((resolve) => {
    const transaction = db.transaction('categories', 'readonly');
    const store = transaction.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = () => {
      const list = request.result || [];
      if (list.length === 0) {
        resolve(DEFAULT_CATEGORIES);
      } else {
        // Ensure default categories are all present
        const map = new Map<string, Category>();
        DEFAULT_CATEGORIES.forEach((c) => map.set(c.id, c));
        list.forEach((c: Category) => map.set(c.id, c));
        resolve(Array.from(map.values()));
      }
    };
    request.onerror = () => resolve(DEFAULT_CATEGORIES);
  });
}

export async function saveCategory(category: Category): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('categories', 'readwrite');
    const store = transaction.objectStore('categories');
    const request = store.put(category);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('categories', 'readwrite');
    const store = transaction.objectStore('categories');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Settings Operations
export async function getSetting<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction('settings', 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result && request.result.value !== undefined) {
          resolve(request.result.value);
        } else {
          resolve(defaultValue);
        }
      };
      request.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

export async function setSetting(key: string, value: any): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('settings', 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Error saving setting:', err);
  }
}

// Database clear
export async function clearEntireDatabase(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['media_meta', 'media_blobs'], 'readwrite');
    transaction.objectStore('media_meta').clear();
    transaction.objectStore('media_blobs').clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
