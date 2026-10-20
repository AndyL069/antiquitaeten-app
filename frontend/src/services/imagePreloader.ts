import type { Item } from '../types';
import { getPhotoUrl } from '../utils/formatters';

export interface PreloadResult {
  loaded: number;
  total: number;
  errors: number;
}

export async function preloadCatalogImages(
  items: Item[],
  onProgress?: (loaded: number, total: number) => void
): Promise<PreloadResult> {
  const urlSet = new Set<string>();

  for (const item of items) {
    if (item.photos && item.photos.length > 0) {
      for (const p of item.photos) {
        if (p && p.path) {
          const url = getPhotoUrl(p.path);
          if (url) {
            urlSet.add(url);
          }
        }
      }
    }
  }

  const urls = Array.from(urlSet);
  const total = urls.length;
  if (total === 0) {
    if (onProgress) onProgress(0, 0);
    return { loaded: 0, total: 0, errors: 0 };
  }

  let loaded = 0;
  let errors = 0;
  const CONCURRENCY = 4;
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < urls.length) {
      const idx = currentIndex++;
      if (idx >= urls.length) break;
      const url = urls[idx];
      try {
        await fetch(url, { mode: 'no-cors' });
        loaded++;
      } catch {
        errors++;
      } finally {
        if (onProgress) {
          onProgress(loaded + errors, total);
        }
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker());
  await Promise.all(workers);

  return { loaded, total, errors };
}
