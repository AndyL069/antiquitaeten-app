# Design Specification: Offline-Katalog & PWA (Phase 1)

* **Datum:** 20.10.2026  
* **Status:** Genehmigt (Approved by User)  
* **Projekt:** Antiquitäten-App (`antiquitaeten-app`)  
* **Ziel:** Vollständige Offline-Lesefähigkeit für den Objektkatalog und Standorte sowie PWA-Installierbarkeit auf Smartphones, Tablets und Desktops.

---

## 1. Übersicht & Zielsetzung

Unterwegs auf Flohmärkten, Messen, Versteigerungen oder in Gebäuden ohne Mobilfunkempfang (z. B. Keller, Lager) muss der gesamte Sammlungs- und Objektbestand jederzeit abrufbar, durchsuchbar und filterbar sein.

In **Phase 1** implementieren wir:
1. **PWA (Progressive Web App):** Installierbarkeit als eigenständige App auf dem Homescreen mit eigenem Icon und Pre-Caching der App-Shell (HTML, CSS, JS, Schriftarten).
2. **Offline-Datenschicht (IndexedDB):** Lokale Spiegelung aller Objekte und Standorte in einer Browser-Datenbank (`antiquitaeten_db`) mit Network-First- und Instant-Fallback-Strategie.
3. **Hybrid-Bilder-Cache:** Automatisches Cachen von Bildern beim Betrachten im CacheStorage plus ein manueller Button zum gezielten Vorab-Download des gesamten Katalogs.
4. **Auth-Resilienz:** Erhalt der Benutzer-Session im Offline-Modus via `localStorage`-Cache, sodass kein Verbindungsverlust den Zugriff blockiert.
5. **Read-Only Schutz:** Deaktivierung von Schreib- und Löschaktionen im Offline-Modus mit verständlichen Hinweisen.

---

## 2. PWA & Service Worker (`vite-plugin-pwa` + Workbox)

### 2.1 Web App Manifest (`manifest.webmanifest`)
Konfiguriert in `frontend/vite.config.ts`:
* **App-Name:** `Antiquitäten & Sammlungsstücke`
* **Short Name:** `Antiquitäten`
* **Beschreibung:** `Katalog- und Inventarverwaltung für Antiquitäten und Sammlungsstücke`
* **Start-URL:** `/`
* **Display:** `standalone` (ohne Browser-Menüleisten)
* **Theme-Color:** `#0f172a` (Slate-900)
* **Background-Color:** `#f8fafc` (Slate-50)
* **Icons:**
  * `pwa-192x192.png` (Standard-Icon für Launcher & Benachrichtigungen)
  * `pwa-512x512.png` (Hi-Res Splash & App-Store)
  * `pwa-maskable-512x512.png` (Adaptives Icon für Android)
  * `apple-touch-icon-180x180.png` (iOS Safari Homescreen)

### 2.2 Pre-Caching & Runtime-Caching
* **App Shell:** Alle statischen HTML-, CSS- und JS-Dateien aus dem Vite-Build werden automatisch vorkompiliert und durch Workbox vorgemerkt.
* **Google Fonts:**
  * `https://fonts.googleapis.com/.*` -> `StaleWhileRevalidate`, Cache-Name `google-fonts-stylesheets`
  * `https://fonts.gstatic.com/.*` -> `CacheFirst`, Cache-Name `google-fonts-webfonts`, Gültigkeit 365 Tage
* **Objekt-Bilder (`/api/uploads/*`):**
  * **Strategie:** `CacheFirst` mit Netzwerk-Fallback
  * **Cache-Name:** `antiquitaeten-images-cache`
  * **Kapazität:** Max. 500 Bilder (`maxEntries: 500`), Verfallszeit 60 Tage (`maxAgeSeconds: 5184000`)
  * **Gültige Statuscodes:** `0` (Opaque), `200`
* **Service-Worker Registrierung:** `registerType: 'autoUpdate'` mit virtuellem Modul `virtual:pwa-register`.

---

## 3. Offline-Datenschicht (IndexedDB via `idb`)

### 3.1 Datenbank-Schema (`frontend/src/services/offlineStorage.ts`)
* **Datenbankname:** `antiquitaeten_db`
* **Version:** `1`
* **Stores:**
  1. `items`:
     * KeyPath: `id` (String)
     * Indizes: `category`, `era`, `locationId`, `updatedAt`
     * Datensatz: Vollständiges `Item`-Objekt inkl. `photos`, `appraisals`, `sales`, `location`
  2. `locations`:
     * KeyPath: `id` (String)
     * Datensatz: Vollständiges `Location`-Objekt inkl. `children` und `itemCount`
  3. `metadata`:
     * KeyPath: `key` (String)
     * Speichert z. B. `lastSyncTime: number`, `lastSyncIso: string`, `cachedImagesCount: number`

### 3.2 Schnittstellen-Methoden
* `saveItems(items: Item[]): Promise<void>`
* `getCachedItems(): Promise<Item[]>`
* `saveLocations(locations: Location[]): Promise<void>`
* `getCachedLocations(): Promise<Location[]>`
* `getSyncMetadata(): Promise<{ lastSyncTime: number; lastSyncIso: string } | null>`
* `clearOfflineData(): Promise<void>`

---

## 4. Bild-Vorlade-Engine (`preloadCatalogImages`)

In `frontend/src/services/imagePreloader.ts`:
* Ermittelt alle Bild-URLs der vorhandenen Items (`item.photos`).
* Lädt Bilder asynchron mit einer Parallelitätsgrenze (Concurrency Limit von 4 parallelen Requests) via `fetch(url, { mode: 'no-cors' })` oder Standard-Fetch.
* Da der Service Worker auf `/api/uploads/*` lauscht, speichert Workbox jede geladene Bildantwort direkt in `antiquitaeten-images-cache`.
* Bietet Fortschritts-Callbacks:
  ```typescript
  preloadCatalogImages(
    items: Item[], 
    onProgress?: (loaded: number, total: number) => void
  ): Promise<{ loaded: number; total: number; errors: number }>
  ```

---

## 5. Auth-Resilienz (`AuthContext.tsx`)

* **Session-Persistierung:**
  * Nach erfolgreichem Login oder erfolgreichem `api.getMe()` wird das Benutzerobjekt in `localStorage.setItem('antiquitaeten_cached_user', JSON.stringify(user))` hinterlegt.
  * Bei manuellem Logout wird `localStorage.removeItem('antiquitaeten_cached_user')` ausgeführt.
* **Offline-Initialisierung:**
  * `api.getMe()` wird wie gewohnt aufgerufen.
  * Tritt ein Netzwerkfehler auf (`!navigator.onLine` oder `Failed to fetch`), und der Server antwortet **nicht** mit HTTP 401 Unauthorized:
    * `AuthContext` stellt das Benutzerobjekt aus dem Cache wieder her.
    * `isAuthenticated` wird auf `true` gesetzt, `isOfflineSession` auf `true`.
  * Antwortet der Server mit HTTP 401:
    * Die Session ist ungültig -> Cache wird geleert, `isAuthenticated = false`.

---

## 6. UI & Status-Integration

### 6.1 Online-/Offline-Erkennung (`useOnlineStatus.ts`)
* Hook, der auf `window.addEventListener('online')` und `window.addEventListener('offline')` reagiert.
* Liefert `isOnline: boolean`.

### 6.2 Offline-Statusleiste (`App.tsx`)
* Bei `!isOnline`:
  * Schmale, elegante Statusleiste unterhalb der Navbar:
    * `📡 Offline-Modus aktiv – Sie betrachten den lokalen Katalog (Stand: dd.MM.yyyy HH:mm)`
* Bei Wechsel von offline zu online:
  * Grüner Toast: `Wieder online – Katalogdaten aktualisiert.`
  * Automatischer Hintergrundabruf von `api.getItems()` und `api.getLocations()`.

### 6.3 Read-Only Absicherung
* **`Navbar.tsx`:**
  * Button `+ Neues Objekt`: Wenn `!isOnline`, deaktiviert (`opacity-50 cursor-not-allowed pointer-events-none` oder mit Tooltip `Offline nicht verfügbar`).
  * Button `Offline-Vorladen`: Kleiner Wolken-/Download-Button mit Fortschritts-Pill.
* **`ItemDetailModal.tsx`:**
  * Bearbeiten-Icon & Löschen-Icon sind im Offline-Modus deaktiviert.
  * Formulare für Schätzungen & Verkäufe sind im Offline-Modus gesperrt mit Hinweistext `Nur im Online-Modus verfügbar`.
* **`LocationsView.tsx`:**
  * Buttons zum Erstellen oder Bearbeiten von Standorten sind im Offline-Modus deaktiviert.

---

## 7. Verifikationsplan

1. **Typ- & Build-Prüfung:**
   * `cd frontend; npm run build` -> Erzeugt sauberen Produktions-Build inkl. generiertem `sw.js` und `manifest.webmanifest`.
2. **Backend-Tests:**
   * `$env:PYTHONPATH="backend"; .\backend\venv\Scripts\pytest.exe backend/tests/ -v` -> Alle 46 Tests bleiben grün.
3. **Offline-Funktionstests:**
   * Simulieren des Offline-Modus (DevTools Network -> Offline oder Netzwerk trennen).
   * Verifizieren, dass der Katalog ohne Verzögerung lädt.
   * Prüfen, dass zuvor gecachte oder vorgeladene Bilder im Offline-Modus sauber gerendert werden.
   * Prüfen, dass Schreib-Aktionen gesperrt sind.
   * Prüfen, dass bei Wiederverbindung die Aktualisierung erfolgt.
