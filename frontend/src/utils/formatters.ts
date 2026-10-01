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

/**
 * Formats a date string (ISO 8601, timestamp, YYYY-MM-DD, etc.) into German 'dd.MM.yyyy' (e.g. 28.08.2026).
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '';

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();
    return `${day}.${month}.${year}`;
  }

  const str = String(value).trim();
  if (!str) return '';

  // If already in dd.MM.yyyy format
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
    return str;
  }

  // If in YYYY-MM-DD or YYYY-MM-DDTHH:mm... format
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}.${month}.${year}`;
  }

  // Fallback to Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}.${month}.${year}`;
  }

  return str;
}
