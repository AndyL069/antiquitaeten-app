# Architektur- und Migrationsdesign: Antiquitäten-App auf Vite/React + FastAPI (Fitcast-Architektur)

- **Datum:** 2026-10-01
- **Status:** Angenommen / Bereit zur Implementierung
- **Ziel:** Vollständige Umstellung der bestehenden Next.js-App auf die getrennte Python FastAPI + Vite/React 19 Architektur nach dem Vorbild der Fitcast-App (`outfit-picker`).

---

## 1. Motivation & Zielsetzung

Die Antiquitäten-App wurde ursprünglich als monolithische Next.js 16 (App Router) Anwendung konzipiert. Nach dem Vorbild der Fitcast-App (`outfit-picker`) soll die App auf eine klar getrennte, robuste und extrem performante Stack-Architektur umgestellt werden:
- **Backend:** Schlanke, asynchrone REST-API mit Python **FastAPI**, **SQLAlchemy** und offiziellem **Google GenAI SDK** (`google-genai`).
- **Frontend:** Blitzschnelle **Vite + React 19** Single-Page-Application (SPA) mit **Tailwind CSS** und **Lucide-React**.
- **Deployment:** Single-Container Multi-Stage Dockerfile (Stage 1 baut Frontend, Stage 2 hostet FastAPI + statische Assets + `/uploads`), voll kompatibel mit Portainer und bestehenden Docker-Volumes (`db_data`, `uploads_data`).
- **Datenintegrität:** 100%ige Kompatibilität mit dem bestehenden PostgreSQL-Datenbankschema (Prisma-Tabellen `"User"`, `"Location"`, `"Item"`, `"Photo"`, `"Appraisal"`, `"Sale"`).

---

## 2. Projektstruktur

Die Struktur spiegelt exakt das Fitcast-Repository wider:

```text
antiquitaeten-app/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py              # Pydantic Settings (DB, Gemini, Authentik, Uploads, JWT)
│   │   ├── database.py            # SQLAlchemy Engine, SessionLocal, get_db Dependency
│   │   ├── models.py              # 1:1 Tabellenmodelle zu bestehendem PostgreSQL-Prisma-Schema
│   │   ├── schemas.py             # Pydantic Schemas für Request-/Response-Validierung
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py            # Lokaler Login/Registrierung, Me, Authentik OIDC
│   │   │   ├── items.py           # CRUD für Antiquitäten, Bildanalyse, Foto-Uploads
│   │   │   ├── locations.py       # Standorte (Hierarchie Baumstruktur)
│   │   │   ├── appraisals.py      # Wertschätzungen
│   │   │   ├── sales.py           # Verkäufe
│   │   │   └── users.py           # Admin Benutzerverwaltung (Rollen, Löschen)
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── gemini_service.py  # Google GenAI Vision (Multimodal mit Prompt-Parität)
│   │       ├── auth_service.py    # bcrypt Passworthash, JWT Access Tokens
│   │       └── authentik_service.py # OIDC SSO Handshake mit Authentik
│   ├── tests/
│   │   ├── test_auth.py
│   │   ├── test_items.py
│   │   └── test_locations.py
│   ├── requirements.txt           # fastapi, uvicorn, sqlalchemy, psycopg2-binary, google-genai, pillow, etc.
│   └── uploads/                   # Lokaler Upload-Ordner für Entwicklungsbetrieb
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx         # Fitcast-Style Navigation (Logo, Tabs, Erfassen-Button, User)
│   │   │   ├── CatalogView.tsx    # Filterleiste (Kategorien, Epoche, Zustand, Standort) + Grid
│   │   │   ├── ItemCard.tsx       # Antiquitäten-Karte mit Bild, Epoche, Preis/Wert-Badge
│   │   │   ├── ItemDetailModal.tsx# Detailansicht mit Galerie, Buch-/eBay-Infos & Historie
│   │   │   ├── ItemFormModal.tsx  # Erfassungs- & Bearbeitungs-Modal mit 1-Klick Gemini-Scan
│   │   │   ├── LocationsView.tsx  # Standort-Verwaltung als interaktiver Baum
│   │   │   ├── AdminUsersModal.tsx# Benutzerverwaltung für Admins
│   │   │   └── AuthModal.tsx      # Login, Registrierung & Authentik SSO Button
│   │   ├── context/
│   │   │   └── AuthContext.tsx    # Globaler Auth-Zustand, Login/Logout, Auto-Session
│   │   ├── services/
│   │   │   └── api.ts             # Typisierter API-Client mit Fetch/Credentials
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript-Definitionen für Items, Standorte, User
│   │   ├── App.tsx                # Haupt-Layout mit Tab-State & Modal-Management
│   │   ├── main.tsx               # React 19 Root
│   │   └── index.css              # Tailwind CSS Direktiven
│   ├── package.json               # React 19, Tailwind CSS, Lucide-React, Vite
│   ├── vite.config.ts             # Dev-Server mit Proxy auf Backend (:8000)
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── tsconfig.json
│
├── Dockerfile                     # Multi-Stage: Stage 1 Node Builder -> Stage 2 Python Uvicorn Runtime
├── docker-compose.yml             # Postgres 16 + Antiquitäten-App Container
├── docker-compose.portainer.yml   # Homelab Portainer Stack Konfiguration
├── start.ps1                      # Windows PowerShell Launcher (Backend + Vite Frontend)
└── .env.example
```

---

## 3. Datenbank-Design & SQLAlchemy 1:1 Mapping

Um bestehende Produktivdaten im PostgreSQL-Container (`antik_app`) ohne Migration oder Datenverlust weiterzuverwenden, spiegelt `backend/app/models.py` exakt die Tabellen und Spalten von Prisma:

```python
# Auszug aus models.py
class User(Base):
    __tablename__ = "User"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=True)
    passwordHash = Column(String, nullable=False)
    role = Column(String, default="MEMBER")  # "ADMIN", "MEMBER"
    authProvider = Column(String, default="credentials")
    createdAt = Column(DateTime, default=datetime.utcnow)

class Location(Base):
    __tablename__ = "Location"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    parentId = Column(String, ForeignKey("Location.id", ondelete="SET NULL"), nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)

class Item(Base):
    __tablename__ = "Item"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    inventoryNumber = Column(String, unique=True, nullable=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    era = Column(String, nullable=True)
    origin = Column(String, nullable=True)
    material = Column(String, nullable=True)
    dimensions = Column(String, nullable=True)
    condition = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    context = Column(Text, nullable=True)
    author = Column(String, nullable=True)
    publisher = Column(String, nullable=True)
    publicationYear = Column(String, nullable=True)
    edition = Column(String, nullable=True)
    language = Column(String, nullable=True)
    weight = Column(String, nullable=True)
    ebayTitle = Column(String, nullable=True)
    ebayCategory = Column(String, nullable=True)
    ebayCondition = Column(String, nullable=True)
    ebayConditionNote = Column(String, nullable=True)
    startPrice = Column(Float, nullable=True)
    buyItNowPrice = Column(Float, nullable=True)
    acquisitionDate = Column(DateTime, nullable=True)
    acquisitionNote = Column(String, nullable=True)
    searchText = Column(Text, default="")
    locationId = Column(String, ForeignKey("Location.id", ondelete="SET NULL"), nullable=True)
    createdById = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

Ebenso werden `"Photo"`, `"Appraisal"` und `"Sale"` mit identischen Fremdschlüsseln und Cascade-Löschungen gemappt.

---

## 4. Backend-Services & Endpunkte

### 4.1 Authentifizierung & Authentik SSO
- **JWT & Passwörter:** `bcrypt` zur Passwortprüfung, signierte JWTs mit Konfigurationsparametern für Secret und Gültigkeitsdauer.
- **Cookie & Header:** Token wird bevorzugt im `HttpOnly` Cookie (`access_token`) transportiert; Fallback auf `Authorization: Bearer <token>` für programmatischen Zugriff.
- **Authentik OIDC:** 
  - Standardisierter Authorization-Code Flow gegen `${AUTHENTIK_ISSUER}`.
  - Automatisches Zuordnen von Benutzern per E-Mail; neue Authentik-Benutzer erhalten `MEMBER`-Rechte (erster registrierter Benutzer oder per Konfiguration: `ADMIN`).

### 4.2 Gemini KI-Multimodal-Analyse
- Python Service `gemini_service.py` nutzt `google-genai`.
- Bilder werden mittels `Pillow` auf maximal 1600px resizet und auf WebP/JPEG komprimiert.
- Der Prompt entspricht exakt den bestehenden Regeln (deutsche Begrifflichkeiten für Epoche, Kategorie und Zustand, Original-Titel für Bücher, eBay-Felder und realistische Wertschätzungen).
- Ausgabe erfolgt garantiert typensicher über Pydantic Structured Outputs.

### 4.3 CRUD-Routen
- Vollständige Endpunkte für `/api/items`, `/api/locations`, `/api/photos`, `/api/appraisals`, `/api/sales`, `/api/users`.

---

## 5. Frontend SPA Design & Benutzerinteraktion

- **Fitcast-Look & Feel:** Elegantes, aufgeräumtes Design mit dunkler/heller Farbpalette, optimiert für Antiquitäten und Sammlungsstücke.
- **Tabs im Header:**
  - *Katalog:* Schnellsuche, Filter nach Kategorie/Epoche/Zustand/Standort, Grid mit Vorschaukarten.
  - *Standorte:* Hierarchische Baumansicht aller Lagerorte mit Zähler für gelagerte Objekte.
  - *Benutzer:* Rollenverwaltung für Administratoren.
- **Modals statt Page-Reloads:**
  - *ItemDetailModal:* Großformatige Bilder, vollständige Attribute, Buch-/eBay-Sektionen, Schätzungs- & Verkaufshistorie.
  - *ItemFormModal:* Foto-Upload mit Drag-and-Drop, prominenter „Mit KI analysieren“-Button, Ladeanimation mit Status-Feedback, direkt editierbare Vorbelegung aller Felder.
  - *AuthModal:* Wechsel zwischen Login und Registrierung, direkter Authentik-SSO Button.

---

## 6. Dockerfile & Bereitstellung

Das Root-`Dockerfile` folgt dem erprobten Multi-Stage-Muster:
1. `FROM node:22-alpine AS frontend-builder`: Installiert Dependencies und baut das Vite-Bundle nach `frontend/dist`.
2. `FROM python:3.11-slim AS runtime`:
   - Installiert `requirements.txt`.
   - Kopiert `backend/app`.
   - Kopiert `frontend/dist` nach `/app/static`.
   - Startet `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

---

## 7. Verifikationsplan

1. **Backend Tests:**
   - Ausführen der pytest-Suite in `backend/` (`pytest tests/ -v`).
   - Prüfung von User-Registrierung, Login, Items-Erstellung und Standort-Hierarchie.
2. **Frontend Build & Typisierung:**
   - Ausführen von `npm run build` im `frontend/`-Ordner (`tsc -b && vite build`).
3. **Lokaler Start:**
   - Starten via `start.ps1` und Prüfung im Browser (`http://localhost:3000`).
   - Test des Gemini-Bildscans mit einem Testfoto.
   - Speichern eines Testobjekts und Verifizieren in der Datenbank.
