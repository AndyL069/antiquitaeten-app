/**
 * Helper to normalize photo URLs from the backend into absolute client URLs.
 * Handles both legacy Next.js relative paths ('<itemId>/<filename>.jpg')
 * and modern '/api/uploads/...' or external URLs.
 */
export function getPhotoUrl(path: string | undefined | null): string {
  if (!path) return '';
  const clean = path.replace(/\\/g, '/').trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  if (clean.startsWith('/api/uploads/')) return clean;
  if (clean.startsWith('/uploads/')) return `/api${clean}`;
  if (clean.startsWith('api/uploads/')) return `/${clean}`;
  if (clean.startsWith('uploads/')) return `/api/${clean}`;
  return `/api/uploads/${clean.replace(/^\/+/, '')}`;
}
