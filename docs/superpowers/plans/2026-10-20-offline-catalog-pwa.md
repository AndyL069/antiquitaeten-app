# Offline-Katalog & PWA (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide full offline read capability for the antique catalog and locations via IndexedDB and Workbox service worker caching, and make the application installable as a Progressive Web App (PWA).

**Architecture:** Use `vite-plugin-pwa` with Workbox for App Shell and image caching (`antiquitaeten-images-cache`); `idb` for structured local storage of items and locations in `antiquitaeten_db`; resilient `AuthContext` falling back to `localStorage` user profile during network outages; and UI read-only guards when offline.

**Tech Stack:** Vite 6, React 19, TypeScript, `vite-plugin-pwa` (Workbox 7), `idb` (v8), Tailwind CSS, Lucide-React.

**Spec:** [docs/superpowers/specs/2026-10-20-offline-catalog-pwa-design.md](file:///C:/Users/Lhurg/Documents/Default%20Project/antiquitaeten-app/docs/superpowers/specs/2026-10-20-offline-catalog-pwa-design.md)

## Global Constraints

- Working directory: `C:\Users\Lhurg\Documents\Default Project\antiquitaeten-app`
- Frontend directory: `C:\Users\Lhurg\Documents\Default Project\antiquitaeten-app\frontend`
- Zero placeholders (`TODO`, `TBD`) in any task
- Typecheck and build verification: `cd frontend; npm run build` must succeed with 0 errors
- Backend test suite: `$env:PYTHONPATH="backend"; .\backend\venv\Scripts\pytest.exe backend/tests/ -v` must stay 46/46 green
- Museum slate design language (`bg-slate-900`, `text-slate-800`, `bg-slate-50`, no brown/amber)

---

### Task 1: PWA Dependencies, Icons & Vite Configuration

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/public/pwa-192x192.png`, `frontend/public/pwa-512x512.png`, `frontend/public/pwa-maskable-512x512.png`, `frontend/public/apple-touch-icon-180x180.png`, `frontend/public/favicon.svg`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/index.html`

**Interfaces:**
- Consumes: Vite configuration
- Produces: Service worker `sw.js` and `manifest.webmanifest` in `frontend/dist/` on build

- [ ] **Step 1: Install `vite-plugin-pwa` and `idb`**

Run:
```powershell
cd frontend
npm install vite-plugin-pwa idb
```

- [ ] **Step 2: Generate PWA app icons in `frontend/public/`**

Create SVG and generate clean high-resolution PWA icons for the antique app:
Create a script or node script to generate the icon assets in `frontend/public/` (Vase/Column emblem on `#0f172a` slate background).

Create `frontend/public/favicon.svg`:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#0f172a"/>
  <path d="M256 96c-44 0-80 36-80 80 0 35 23 65 55 76v108h-35c-11 0-20 9-20 20s9 20 20 20h120c11 0 20-9 20-20s-9-20-20-20h-35V252c32-11 55-41 55-76 0-44-36-80-80-80zm-40 80c0-22 18-40 40-40s40 18 40 40c0 19-13 35-31 39-3 1-5 3-6 5l-3 4-3-4c-1-2-3-4-6-5-18-4-31-20-31-39z" fill="#f8fafc"/>
  <circle cx="256" cy="176" r="16" fill="#38bdf8"/>
</svg>
```

Generate the corresponding PNG icons (`pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `apple-touch-icon-180x180.png`) into `frontend/public/` using Canvas or a Node/Pillow script.

- [ ] **Step 3: Update `frontend/vite.config.ts` with `VitePWA`**

Configure `VitePWA` with manifest and Workbox runtime caching for Google Fonts and `/api/uploads/.*`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Antiquitäten & Sammlungsstücke',
        short_name: 'Antiquitäten',
        description: 'Katalog- und Inventarverwaltung für Antiquitäten und Sammlungsstücke',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\/api\/uploads\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'antiquitaeten-images-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 60, // 60 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
```

- [ ] **Step 4: Update `frontend/index.html`**

Add `<meta name="theme-color" content="#0f172a">`, `<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png">`, and `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`.

- [ ] **Step 5: Verify build produces service worker & manifest**

Run:
```powershell
cd frontend
npm run build
```
Verify that `dist/sw.js` and `dist/manifest.webmanifest` exist.

- [ ] **Step 6: Commit Task 1**

```powershell
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/index.html frontend/public/
git commit -m "feat(pwa): configure vite-plugin-pwa, manifest and icons"
```

---

### Task 2: IndexedDB Offline Storage Service

**Files:**
- Create: `frontend/src/services/offlineStorage.ts`
- Create: `frontend/src/services/__tests__/offlineStorage.test.ts` (or node verification script)

**Interfaces:**
- Consumes: `Item`, `Location` from `frontend/src/types`
- Produces:
  ```typescript
  export async function saveItems(items: Item[]): Promise<void>;
  export async function getCachedItems(): Promise<Item[]>;
  export async function saveLocations(locations: Location[]): Promise<void>;
  export async function getCachedLocations(): Promise<Location[]>;
  export async function setSyncMetadata(data: { lastSyncTime: number; lastSyncIso: string }): Promise<void>;
  export async function getSyncMetadata(): Promise<{ lastSyncTime: number; lastSyncIso: string } | null>;
  export async function clearOfflineData(): Promise<void>;
  ```

- [ ] **Step 1: Implement `frontend/src/services/offlineStorage.ts`**

Use `idb` openDB with schema:
```typescript
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Item, Location } from '../types';

interface AntiquitaetenDB extends DBSchema {
  items: {
    key: string;
    value: Item;
    indexes: {
      'by-category': string;
      'by-era': string;
      'by-location': string;
      'by-updated': string;
    };
  };
  locations: {
    key: string;
    value: Location;
  };
  metadata: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'antiquitaeten_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AntiquitaetenDB>> | null = null;

function getDb(): Promise<IDBPDatabase<AntiquitaetenDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AntiquitaetenDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('items')) {
          const itemStore = db.createObjectStore('items', { keyPath: 'id' });
          itemStore.createIndex('by-category', 'category');
          itemStore.createIndex('by-era', 'era');
          itemStore.createIndex('by-location', 'locationId');
          itemStore.createIndex('by-updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('locations')) {
          db.createObjectStore('locations', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveItems(items: Item[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('items', 'readwrite');
  await tx.store.clear();
  for (const item of items) {
    await tx.store.put(item);
  }
  await tx.done;
}

export async function getCachedItems(): Promise<Item[]> {
  const db = await getDb();
  return await db.getAll('items');
}

export async function saveLocations(locations: Location[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('locations', 'readwrite');
  await tx.store.clear();
  for (const loc of locations) {
    await tx.store.put(loc);
  }
  await tx.done;
}

export async function getCachedLocations(): Promise<Location[]> {
  const db = await getDb();
  return await db.getAll('locations');
}

export async function setSyncMetadata(data: { lastSyncTime: number; lastSyncIso: string }): Promise<void> {
  const db = await getDb();
  await db.put('metadata', { key: 'sync', ...data });
}

export async function getSyncMetadata(): Promise<{ lastSyncTime: number; lastSyncIso: string } | null> {
  const db = await getDb();
  const res = await db.get('metadata', 'sync');
  if (!res) return null;
  return { lastSyncTime: res.lastSyncTime, lastSyncIso: res.lastSyncIso };
}

export async function clearOfflineData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['items', 'locations', 'metadata'], 'readwrite');
  await tx.objectStore('items').clear();
  await tx.objectStore('locations').clear();
  await tx.objectStore('metadata').clear();
  await tx.done;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```powershell
cd frontend
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3: Commit Task 2**

```powershell
git add frontend/src/services/offlineStorage.ts
git commit -m "feat(offline): implement indexeddb storage service for items and locations"
```

---

### Task 3: Online Status Hook & Image Preloader Engine

**Files:**
- Create: `frontend/src/hooks/useOnlineStatus.ts`
- Create: `frontend/src/services/imagePreloader.ts`

**Interfaces:**
- Consumes: `getPhotoUrl` from `../utils/formatters`, `Item` from `../types`
- Produces:
  - `useOnlineStatus(): { isOnline: boolean }`
  - `preloadCatalogImages(items: Item[], onProgress?: (loaded: number, total: number) => void): Promise<{ loaded: number; total: number; errors: number }>`

- [ ] **Step 1: Implement `frontend/src/hooks/useOnlineStatus.ts`**

```typescript
import { useState, useEffect } from 'react';

export function useOnlineStatus(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
```

- [ ] **Step 2: Implement `frontend/src/services/imagePreloader.ts`**

Collect all photo URLs from items and fetch them with concurrency pool = 4:
```typescript
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
        if (p.path) {
          urlSet.add(getPhotoUrl(p.path));
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```powershell
cd frontend
npx tsc --noEmit
```

- [ ] **Step 4: Commit Task 3**

```powershell
git add frontend/src/hooks/useOnlineStatus.ts frontend/src/services/imagePreloader.ts
git commit -m "feat(offline): add useOnlineStatus hook and image preloading service"
```

---

### Task 4: AuthContext Resilience & Offline Session Persistence

**Files:**
- Modify: `frontend/src/context/AuthContext.tsx`

**Interfaces:**
- Consumes: `localStorage`
- Produces: `isOfflineSession: boolean` in `AuthContextType`

- [ ] **Step 1: Update `AuthContext.tsx` to cache user profile and handle offline initializations**

1. Add `isOfflineSession: boolean` to `AuthContextType`.
2. In `login` & `register`: upon success, `localStorage.setItem('antiquitaeten_cached_user', JSON.stringify(user))`.
3. In `logout`: call `localStorage.removeItem('antiquitaeten_cached_user')`.
4. In `initializeAuth()`:
   If `api.getMe()` throws an error, check if `!navigator.onLine` or error message contains `'Failed to fetch'` / network issue:
   - If error is network-related (and not HTTP 401 Unauthorized), check `localStorage.getItem('antiquitaeten_cached_user')`.
   - If cached user exists, parse and set `setUser(cachedUser)` and `setIsOfflineSession(true)`.
   - If error is HTTP 401, remove cached user and set `setUser(null)`.

- [ ] **Step 2: Verify `npm run build` passes with zero errors**

Run:
```powershell
cd frontend
npm run build
```

- [ ] **Step 3: Commit Task 4**

```powershell
git add frontend/src/context/AuthContext.tsx
git commit -m "feat(auth): persist user profile to local storage for offline session resilience"
```

---

### Task 5: UI Integration, Offline Status Banner & Read-Only Guarding

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Navbar.tsx`
- Modify: `frontend/src/components/ItemDetailModal.tsx`
- Modify: `frontend/src/components/LocationsView.tsx`

**Interfaces:**
- Consumes: `useOnlineStatus`, `offlineStorage`, `preloadCatalogImages`
- Produces:
  - Immediate IndexedDB population on boot
  - Offline banner when `!isOnline`
  - Disabled write buttons in Navbar, ItemDetailModal, LocationsView when `!isOnline`
  - Offline preloading button in Navbar with visual progress indicator

- [ ] **Step 1: Update `frontend/src/App.tsx`**

1. Import `useOnlineStatus`, `getCachedItems`, `saveItems`, `getCachedLocations`, `saveLocations`, `getSyncMetadata`, `setSyncMetadata`.
2. On initial mount / authentication, load from `getCachedItems()` and `getCachedLocations()` immediately so items are rendered with 0 delay.
3. In `loadItems()`: when `api.getItems()` succeeds, write to `saveItems(data)` and update `lastSyncTime`. If it fails and `!isOnline`, keep cached items and do not show an error banner.
4. Render the `OfflineBanner` beneath Navbar when `!isOnline`:
   ```tsx
   {!isOnline && (
     <div className="bg-slate-800 text-slate-200 border-b border-slate-700 px-4 py-2 text-xs flex items-center justify-between">
       <div className="flex items-center gap-2">
         <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
         <span>
           <strong>Offline-Modus aktiv:</strong> Sie betrachten den lokal gespeicherten Katalog
           {lastSync && ` (Stand: ${formatDate(lastSync)})`}.
         </span>
       </div>
       <span className="text-slate-400">Schreib-Aktionen sind deaktiviert</span>
     </div>
   )}
   ```
5. Pass `isOnline` down to `Navbar`, `CatalogView`, `ItemDetailModal`, and `LocationsView`.

- [ ] **Step 2: Update `frontend/src/components/Navbar.tsx`**

1. Accept `isOnline: boolean` prop.
2. Disable `+ Neues Objekt` button when `!isOnline` (`disabled`, `opacity-50 cursor-not-allowed`, `title="Im Offline-Modus nicht verfügbar"`).
3. Add the *„Bilder vorladen“* button with CloudDownload icon:
   - When clicked, calls `preloadCatalogImages(items, (loaded, total) => setProgress(...))`
   - Shows progress badge (e.g. `42/120`) and checkmark upon completion.

- [ ] **Step 3: Update `frontend/src/components/ItemDetailModal.tsx`**

1. Accept `isOnline: boolean` prop.
2. In the header actions:
   - Disable Edit button (`Pencil`) when `!isOnline` with tooltip *"Im Offline-Modus nicht verfügbar"*.
   - Disable Delete button (`Trash2`) when `!isOnline`.
3. In Appraisal & Sales sections:
   - Disable the "Hinzufügen"-Buttons or show note *"Wertschätzungen können nur online hinzugefügt werden"*.

- [ ] **Step 4: Update `frontend/src/components/LocationsView.tsx`**

1. Accept `isOnline: boolean` prop.
2. Disable "+ Neuer Standort" and edit/delete actions when `!isOnline`.

- [ ] **Step 5: Verify build**

Run:
```powershell
cd frontend
npm run build
```
Expected: 0 errors.

- [ ] **Step 6: Commit Task 5**

```powershell
git add frontend/src/App.tsx frontend/src/components/Navbar.tsx frontend/src/components/ItemDetailModal.tsx frontend/src/components/LocationsView.tsx
git commit -m "feat(ui): add offline status banner, preloading trigger and read-only action guards"
```

---

### Task 6: Full Verification, Backend Tests & Container Build Check

**Files:**
- Test all components and integration

- [ ] **Step 1: Run frontend build**

Run:
```powershell
cd frontend
npm run build
```
Verify `dist/` contains:
- `index.html`
- `sw.js`
- `manifest.webmanifest`
- `assets/*.js` and `assets/*.css`

- [ ] **Step 2: Run backend test suite**

Run:
```powershell
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\pytest.exe backend/tests/ -v
```
Verify all 46 tests pass.

- [ ] **Step 3: Commit and Push**

Commit any remaining touches and push:
```powershell
git push origin master
```
Monitor GitHub Actions build.
