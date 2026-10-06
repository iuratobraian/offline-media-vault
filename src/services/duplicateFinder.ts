import { MediaItem } from '../types/media';

export interface DuplicateGroup {
  key: string;
  reason: 'URL idéntica' | 'Nombre y tamaño duplicados' | 'Título idéntico';
  items: MediaItem[];
}

export function findDuplicateMediaItems(items: MediaItem[]): DuplicateGroup[] {
  const groupsByKey: Map<string, { reason: DuplicateGroup['reason']; items: MediaItem[] }> = new Map();

  // Helper to add to group
  const addToGroup = (key: string, reason: DuplicateGroup['reason'], item: MediaItem) => {
    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, { reason, items: [] });
    }
    const group = groupsByKey.get(key)!;
    if (!group.items.some((i) => i.id === item.id)) {
      group.items.push(item);
    }
  };

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];

      // Match 1: Exact URL
      if (a.sourceUrl && b.sourceUrl && a.sourceUrl === b.sourceUrl) {
        addToGroup(`url_${a.sourceUrl}`, 'URL idéntica', a);
        addToGroup(`url_${a.sourceUrl}`, 'URL idéntica', b);
        continue;
      }

      // Match 2: Same fileName and non-zero size
      if (
        a.fileName &&
        b.fileName &&
        a.fileName.toLowerCase() === b.fileName.toLowerCase() &&
        a.size > 0 &&
        a.size === b.size
      ) {
        addToGroup(`file_${a.fileName}_${a.size}`, 'Nombre y tamaño duplicados', a);
        addToGroup(`file_${a.fileName}_${a.size}`, 'Nombre y tamaño duplicados', b);
        continue;
      }

      // Match 3: Normalized title match
      const titleA = a.title.toLowerCase().trim().replace(/[^\w]/g, '');
      const titleB = b.title.toLowerCase().trim().replace(/[^\w]/g, '');
      if (titleA.length > 5 && titleA === titleB && a.mediaType === b.mediaType) {
        addToGroup(`title_${titleA}`, 'Título idéntico', a);
        addToGroup(`title_${titleA}`, 'Título idéntico', b);
      }
    }
  }

  return Array.from(groupsByKey.entries())
    .map(([key, value]) => ({ key, reason: value.reason, items: value.items }))
    .filter((group) => group.items.length > 1);
}
