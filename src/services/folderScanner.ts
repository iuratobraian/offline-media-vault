import { MediaItem } from '../types/media';
import { getAllMedia } from '../database/db';
import { importLocalFile } from './localImport';

export interface ScanProgress {
  current: number;
  total: number;
  currentFileName: string;
  statusText: string;
}

export interface ScanResult {
  totalScanned: number;
  newImported: MediaItem[];
  alreadyExistingCount: number;
  failedCount: number;
  errors: { fileName: string; error: string }[];
}

const MEDIA_FILE_REGEX = /\.(mp3|wav|ogg|m4a|aac|opus|flac|wma|mp4|webm|mov|mkv|avi|m4v)$/i;

export function isMediaFileName(name: string): boolean {
  return MEDIA_FILE_REGEX.test(name);
}

/**
 * Checks if File System Access API (showDirectoryPicker) is supported.
 */
export function isDirectoryPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Scans a folder selected via the File System Access API (Chromium / Desktop / modern Android).
 */
export async function scanDirectoryWithPicker(
  onProgress?: (progress: ScanProgress) => void,
  category = 'musica'
): Promise<ScanResult> {
  if (!isDirectoryPickerSupported()) {
    throw new Error('Tu navegador no soporta el selector nativo de carpetas. Usa la opción de seleccionar archivos o carpeta compatible.');
  }

  // Request directory picker
  const dirHandle = await (window as any).showDirectoryPicker({
    mode: 'read',
    startIn: 'downloads',
  });

  // Collect all media file entries
  const fileEntries: File[] = [];

  async function readDirRecursive(handle: any) {
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        if (isMediaFileName(entry.name)) {
          try {
            const file = await entry.getFile();
            fileEntries.push(file);
          } catch (e) {
            console.warn('Error reading file entry:', entry.name, e);
          }
        }
      } else if (entry.kind === 'directory') {
        // Scan subdirectories 1 level deep (e.g., Music/Album)
        try {
          await readDirRecursive(entry);
        } catch {
          // Ignore directory read errors
        }
      }
    }
  }

  onProgress?.({
    current: 0,
    total: 0,
    currentFileName: '',
    statusText: 'Explorando archivos en la carpeta seleccionada...',
  });

  await readDirRecursive(dirHandle);

  return importScannedFiles(fileEntries, onProgress, category);
}

/**
 * Scans files from standard HTML file input (supports webkitdirectory and multiple files).
 */
export async function scanFilesFromInput(
  files: FileList | File[],
  onProgress?: (progress: ScanProgress) => void,
  category = 'musica'
): Promise<ScanResult> {
  const fileArray = Array.from(files).filter((f) => isMediaFileName(f.name) || f.type.startsWith('audio/') || f.type.startsWith('video/'));
  return importScannedFiles(fileArray, onProgress, category);
}

/**
 * Common processing engine: compares against IndexedDB to avoid duplicates,
 * extracts thumbnails/durations, and saves to IndexedDB.
 */
async function importScannedFiles(
  files: File[],
  onProgress?: (progress: ScanProgress) => void,
  defaultCategory = 'musica'
): Promise<ScanResult> {
  const existingMedia = await getAllMedia();

  // Create lookup map of existing files by clean name or title + size
  const existingMap = new Set<string>();
  existingMedia.forEach((item) => {
    if (item.fileName) existingMap.add(item.fileName.toLowerCase());
    if (item.title) existingMap.add(`${item.title.toLowerCase()}_${item.size || item.fileSize}`);
  });

  const result: ScanResult = {
    totalScanned: files.length,
    newImported: [],
    alreadyExistingCount: 0,
    failedCount: 0,
    errors: [],
  };

  const total = files.length;
  let current = 0;

  for (const file of files) {
    current++;
    const fileNameClean = file.name.trim().toLowerCase();
    const sizeKey = `${file.name.replace(/\.[^/.]+$/, '').toLowerCase()}_${file.size}`;

    if (existingMap.has(fileNameClean) || existingMap.has(sizeKey)) {
      result.alreadyExistingCount++;
      onProgress?.({
        current,
        total,
        currentFileName: file.name,
        statusText: `Ya en biblioteca: ${file.name}`,
      });
      continue;
    }

    onProgress?.({
      current,
      total,
      currentFileName: file.name,
      statusText: `Importando a almacenamiento offline: ${file.name}`,
    });

    try {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(file.name);
      const cat = isVideo ? 'videos' : defaultCategory;
      const importedItem = await importLocalFile(file, cat);
      result.newImported.push(importedItem);
      // Mark as existing so duplicates within the same batch are skipped
      existingMap.add(fileNameClean);
    } catch (err: any) {
      result.failedCount++;
      result.errors.push({ fileName: file.name, error: err.message || 'Error desconocido' });
      console.error(`Error importing ${file.name}:`, err);
    }
  }

  onProgress?.({
    current: total,
    total,
    currentFileName: '',
    statusText: `Escaneo completado: ${result.newImported.length} nuevos, ${result.alreadyExistingCount} ya existentes.`,
  });

  return result;
}
