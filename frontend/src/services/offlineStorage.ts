import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Item, Location } from '../types';

export interface SyncMetadata {
  lastSyncTime: number;
  lastSyncIso: string;
}

export interface AntiquitaetenDB extends DBSchema {
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

export const DB_NAME = 'antiquitaeten_db';
export const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AntiquitaetenDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<AntiquitaetenDB>> {
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
    }).catch((err) => {
      dbPromise = null;
      throw err;
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

/**
 * Resets the cached database promise. Mainly useful for test isolation or cleanup.
 */
export async function closeDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise.catch(() => null);
    dbPromise = null;
    if (db) {
      db.close();
    }
  }
}
