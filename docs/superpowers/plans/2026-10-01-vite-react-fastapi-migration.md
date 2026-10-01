# Antiquitäten-App (Vite/React + FastAPI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vollständiger Umbau der Antiquitäten-App von Next.js auf die Fitcast-Architektur (Python FastAPI Backend + Vite/React 19 Frontend + Multi-Stage Dockerfile + 1:1 PostgreSQL Prisma-Schema-Kompatibilität).

**Architecture:** Monorepo mit getrenntem `backend/` (FastAPI, SQLAlchemy, google-genai, JWT/Authentik) und `frontend/` (Vite, React 19, TypeScript, Tailwind CSS, Lucide). Beide Komponenten werden in der Produktion über ein Multi-Stage Dockerfile in einem einzigen schlanken Container gebündelt; für die lokale Windows-Entwicklung steht ein `start.ps1` Launcher bereit.

**Tech Stack:** Python 3.11+, FastAPI, SQLAlchemy, PostgreSQL/psycopg2, SQLite (Fallback), google-genai, Pillow, React 19, Vite 6, TypeScript, Tailwind CSS, Lucide-React.

**Spec:** `docs/superpowers/specs/2026-10-01-vite-react-fastapi-migration-design.md`

## Global Constraints

- Python Backend liegt unter `backend/`, React Frontend unter `frontend/`.
- Datenbank-Tabellen und -Spalten müssen exakt 1:1 zu den Prisma-PostgreSQL-Definitionen passen (`"User"`, `"Location"`, `"Item"`, `"Photo"`, `"Appraisal"`, `"Sale"`, camelCase Spalten wie `passwordHash`, `inventoryNumber`).
- Alle ID-Felder sind UUID v4 Strings.
- Gemini Multimodal Vision verwendet `gemini-2.5-flash` mit strukturiertem Pydantic-Schema und denselben deutschen Prompt-Vorgaben wie das bisherige System.
- Frontend arbeitet als Tab- & Modal-SPA (Navbar mit Katalog, Standorte, Admin + Modals für Objekt-Detail, Erfassung mit KI-Scan, Auth).

---

### Task 1: Backend Scaffolding & Configuration

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Test: `backend/tests/test_config.py`

**Interfaces:**
- Produces: `settings` (Pydantic Settings aus `backend.app.config`), `engine`, `SessionLocal`, `Base`, `get_db` (aus `backend.app.database`).

- [ ] **Step 1: Write requirements.txt**

```text
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
pydantic>=2.10.0
pydantic-settings>=2.6.0
sqlalchemy>=2.0.36
psycopg2-binary>=2.9.10
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.17
httpx>=0.28.0
google-genai>=0.1.1
pillow>=11.0.0
pytest>=8.3.0
```

- [ ] **Step 2: Write test for configuration and database engine**

```python
# backend/tests/test_config.py
import pytest
from app.config import settings
from app.database import engine, Base

def test_settings_load():
    assert settings.DATABASE_URL is not None
    assert settings.GEMINI_MODEL == "gemini-2.5-flash"
    assert settings.COOKIE_NAME == "access_token"

def test_database_engine_connect():
    with engine.connect() as conn:
        assert conn is not None
```

- [ ] **Step 3: Implement config.py and database.py**

```python
# backend/app/config.py
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    SECRET_KEY: str = "antik-secret-key-change-in-production-2026"
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/antik.db"
    
    # Gemini AI
    GOOGLE_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # Authentik OIDC SSO
    AUTHENTIK_CLIENT_ID: str = ""
    AUTHENTIK_CLIENT_SECRET: str = ""
    AUTHENTIK_ISSUER: str = ""
    
    # Paths & Cookies
    UPLOADS_DIR: Path = BASE_DIR / "uploads"
    STATIC_DIR: Path = BASE_DIR / "static"
    COOKIE_NAME: str = "access_token"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    class Config:
        env_file = [str(BASE_DIR.parent / ".env"), str(BASE_DIR.parent / ".env.local")]
        extra = "ignore"

settings = Settings()
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
```

```python
# backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}

engine = create_engine(db_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

- [ ] **Step 4: Create venv and run test to verify**

Run in PowerShell:
```powershell
python -m venv backend/venv
.\backend\venv\Scripts\pip.exe install -r backend/requirements.txt
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\pytest.exe backend/tests/test_config.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/app/ backend/tests/
git commit -m "feat(backend): setup config, database engine and dependencies"
```

---

### Task 2: SQLAlchemy Models (1:1 Prisma PostgreSQL Mapping)

**Files:**
- Create: `backend/app/models.py`
- Test: `backend/tests/test_models.py`

**Interfaces:**
- Produces: `User`, `Location`, `Item`, `Photo`, `Appraisal`, `Sale` (SQLAlchemy ORM models in `backend.app.models`).

- [ ] **Step 1: Write test for models mapping and relations**

```python
# backend/tests/test_models.py
import uuid
from app.database import Base, engine, SessionLocal
from app.models import User, Location, Item, Photo, Appraisal, Sale

def test_models_creation_and_relations():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = User(
            id=str(uuid.uuid4()),
            email="test@antik.de",
            name="Test User",
            passwordHash="hash123",
            role="ADMIN"
        )
        db.add(user)
        
        loc = Location(id=str(uuid.uuid4()), name="Wohnzimmer")
        db.add(loc)
        
        item = Item(
            id=str(uuid.uuid4()),
            inventoryNumber="ANT-001",
            name="Alte Standuhr",
            category="Uhren",
            locationId=loc.id,
            createdById=user.id
        )
        db.add(item)
        
        photo = Photo(id=str(uuid.uuid4()), itemId=item.id, path="/uploads/photo1.jpg", isPrimary=True)
        appraisal = Appraisal(id=str(uuid.uuid4()), itemId=item.id, value=450.0)
        sale = Sale(id=str(uuid.uuid4()), itemId=item.id, platform="eBay", amount=500.0)
        
        db.add_all([photo, appraisal, sale])
        db.commit()
        
        fetched = db.query(Item).filter_by(inventoryNumber="ANT-001").first()
        assert fetched is not None
        assert fetched.name == "Alte Standuhr"
        assert len(fetched.photos) == 1
        assert len(fetched.appraisals) == 1
        assert len(fetched.sales) == 1
        assert fetched.location.name == "Wohnzimmer"
        assert fetched.createdBy.name == "Test User"
    finally:
        db.close()
```

- [ ] **Step 2: Implement models.py**

```python
# backend/app/models.py
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "User"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)
    passwordHash = Column(String, nullable=False)
    role = Column(String, default="MEMBER")  # "ADMIN", "MEMBER"
    authProvider = Column(String, default="credentials")
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    items = relationship("Item", back_populates="createdBy", foreign_keys="Item.createdById")

class Location(Base):
    __tablename__ = "Location"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    parentId = Column(String, ForeignKey("Location.id", ondelete="SET NULL"), nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    parent = relationship("Location", remote_side=[id], back_populates="children")
    children = relationship("Location", back_populates="parent")
    items = relationship("Item", back_populates="location")

class Item(Base):
    __tablename__ = "Item"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    inventoryNumber = Column(String, unique=True, nullable=True, index=True)
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
    locationId = Column(String, ForeignKey("Location.id", ondelete="SET NULL"), nullable=True, index=True)
    createdById = Column(String, ForeignKey("User.id", ondelete="SET NULL"), nullable=True, index=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    location = relationship("Location", back_populates="items")
    createdBy = relationship("User", back_populates="items")
    photos = relationship("Photo", back_populates="item", cascade="all, delete-orphan")
    appraisals = relationship("Appraisal", back_populates="item", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="item", cascade="all, delete-orphan")

class Photo(Base):
    __tablename__ = "Photo"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    itemId = Column(String, ForeignKey("Item.id", ondelete="CASCADE"), nullable=False, index=True)
    path = Column(String, nullable=False)
    caption = Column(String, nullable=True)
    isPrimary = Column(Boolean, default=False)
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    item = relationship("Item", back_populates="photos")

class Appraisal(Base):
    __tablename__ = "Appraisal"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    itemId = Column(String, ForeignKey("Item.id", ondelete="CASCADE"), nullable=False, index=True)
    value = Column(Float, nullable=False)
    currency = Column(String, default="EUR")
    appraisalDate = Column(DateTime, nullable=True)
    appraiser = Column(String, nullable=True)
    note = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    item = relationship("Item", back_populates="appraisals")

class Sale(Base):
    __tablename__ = "Sale"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    itemId = Column(String, ForeignKey("Item.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="EUR")
    soldAt = Column(DateTime, nullable=True)
    note = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow)
    
    item = relationship("Item", back_populates="sales")
```

- [ ] **Step 3: Run test to verify**

Run:
```powershell
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\pytest.exe backend/tests/test_models.py -v
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/models.py backend/tests/test_models.py
git commit -m "feat(backend): add SQLAlchemy models with 1:1 Prisma compatibility"
```

---

### Task 3: Schemas, Auth Services & Auth Routes

**Files:**
- Create: `backend/app/schemas.py`
- Create: `backend/app/services/auth_service.py`
- Create: `backend/app/services/authentik_service.py`
- Create: `backend/app/routes/auth.py`
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Produces: `get_current_user`, `require_admin`, `auth.router` (FastAPI router under `/api/auth`).

- [ ] **Step 1: Write test for user registration, login, and token decoding**

```python
# backend/tests/test_auth.py
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.database import Base, engine, get_db
from app.routes import auth

app = FastAPI()
app.include_router(auth.router)
Base.metadata.create_all(bind=engine)
client = TestClient(app)

def test_register_and_login_flow():
    email = "admin@antik.de"
    # Register
    res = client.post("/api/auth/register", json={
        "email": email,
        "name": "Admin Antik",
        "password": "geheimespasswort123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == email
    assert data["role"] in ["ADMIN", "MEMBER"]
    
    # Login
    login_res = client.post("/api/auth/login", json={
        "email": email,
        "password": "geheimespasswort123"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.cookies
    
    # Me endpoint with cookie
    me_res = client.get("/api/auth/me", cookies=login_res.cookies)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email
```

- [ ] **Step 2: Implement schemas.py**

Defines Pydantic models for User, Item, Photo, Appraisal, Sale, Location, and Auth payloads.

- [ ] **Step 3: Implement auth_service.py, authentik_service.py, and routes/auth.py**

- `auth_service.py`: Password hashing with bcrypt, JWT creation and verification.
- `authentik_service.py`: OIDC discovery and code exchange logic matching Fitcast.
- `routes/auth.py`: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/providers`, `/api/auth/authentik/login`, `/api/auth/authentik/callback`. First registered user automatically receives role `ADMIN`.

- [ ] **Step 4: Run test to verify**

Run:
```powershell
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\pytest.exe backend/tests/test_auth.py -v
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas.py backend/app/services/ backend/app/routes/auth.py backend/tests/test_auth.py
git commit -m "feat(backend): add auth service, authentik SSO and auth routes"
```

---

### Task 4: Gemini Multimodal Vision Service

**Files:**
- Create: `backend/app/services/gemini_service.py`
- Test: `backend/tests/test_gemini_service.py`

**Interfaces:**
- Produces: `extract_item_details_from_images(images: list[tuple[bytes, str]]) -> ItemDetailsAnalysis`

- [ ] **Step 1: Write test for Gemini Service fallback and schema parsing**

```python
# backend/tests/test_gemini_service.py
from app.services.gemini_service import ItemDetailsAnalysis, parse_gemini_response

def test_parse_gemini_response():
    sample_json = {
        "name": "Biedermeier Kommode",
        "category": "Möbel",
        "era": "Biedermeier",
        "origin": "Süddeutschland",
        "material": "Kirschbaum furniert",
        "dimensions": "H 90 cm, B 110 cm",
        "condition": "Gut",
        "description": "Dreischübige Kommode mit Messingbeschlägen.",
        "context": "Typisches Möbelstück der Biedermeierzeit um 1830.",
        "startPrice": 250.0,
        "buyItNowPrice": 650.0,
        "estimatedValue": 600.0,
        "valueNote": "Kirschbaumholz, guter Erhaltungszustand"
    }
    result = parse_gemini_response(sample_json)
    assert isinstance(result, ItemDetailsAnalysis)
    assert result.name == "Biedermeier Kommode"
    assert result.estimatedValue == 600.0
```

- [ ] **Step 2: Implement gemini_service.py**

Uses `google-genai` Python SDK with `Pillow` image resizing (max dimension 1600px, quality 85) to avoid network bottlenecks. Incorporates full German rules for categorization, era, book details, and eBay auction metadata.

- [ ] **Step 3: Run test to verify**

Run:
```powershell
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\pytest.exe backend/tests/test_gemini_service.py -v
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/gemini_service.py backend/tests/test_gemini_service.py
git commit -m "feat(backend): implement multimodal gemini vision analysis service"
```

---

### Task 5: Backend Routes & Main Application

**Files:**
- Create: `backend/app/routes/items.py`
- Create: `backend/app/routes/locations.py`
- Create: `backend/app/routes/appraisals.py`
- Create: `backend/app/routes/sales.py`
- Create: `backend/app/routes/users.py`
- Create: `backend/app/main.py`
- Test: `backend/tests/test_items_routes.py`

**Interfaces:**
- Produces: Complete FastAPI app with CORS, static `/uploads` serving, SPA mounting, and `/api/*` endpoints.

- [ ] **Step 1: Write integration tests for Items and Locations CRUD**

```python
# backend/tests/test_items_routes.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_items_and_locations_flow():
    # 1. Login or create user
    reg = client.post("/api/auth/register", json={
        "email": "tester@antik.de", "name": "Tester", "password": "pass"
    })
    cookies = reg.cookies
    
    # 2. Create location
    loc_res = client.post("/api/locations", json={"name": "Vitrine A", "description": "Obere Ebene"}, cookies=cookies)
    assert loc_res.status_code == 200
    loc_id = loc_res.json()["id"]
    
    # 3. Create item
    item_res = client.post("/api/items", json={
        "name": "Meissener Porzellanfigur",
        "category": "Porzellan & Keramik",
        "locationId": loc_id,
        "startPrice": 50.0
    }, cookies=cookies)
    assert item_res.status_code == 200
    item_id = item_res.json()["id"]
    
    # 4. Fetch items list with search
    list_res = client.get("/api/items?q=Meissen", cookies=cookies)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1
```

- [ ] **Step 2: Implement route handlers and main.py**

- `locations.py`: Hierarchical tree structure, parent/child management, item count calculation.
- `items.py`: CRUD, photo uploads with file-saving into `UPLOADS_DIR`, `/analyze` endpoint accepting files and returning parsed item details.
- `appraisals.py` & `sales.py`: Add and delete appraisals and sales for an item.
- `users.py`: List users, change role (`ADMIN`/`MEMBER`), delete user. Protected by `require_admin`.
- `main.py`: Assembles all routers, configures CORS, mounts `/uploads` and production `/app/static`.

- [ ] **Step 3: Run all backend tests**

Run:
```powershell
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\pytest.exe backend/tests/ -v
```
Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add backend/app/routes/ backend/app/main.py backend/tests/
git commit -m "feat(backend): complete all REST API routes and app entrypoint"
```

---

### Task 6: Frontend Scaffolding (Vite + React 19 + TypeScript + Tailwind)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/index.css`

**Interfaces:**
- Produces: Runnable Vite development server with Tailwind CSS styles and React 19 root.

- [ ] **Step 1: Write frontend/package.json and config files**

Matches Fitcast's lightweight and modern frontend stack:
`react: ^19.0.0`, `lucide-react: ^1.16.0`, `tailwindcss: ^3.4.17`, `vite: ^6.2.0`.
`vite.config.ts` proxies `/api` and `/uploads` to `http://127.0.0.1:8000`.

- [ ] **Step 2: Install frontend node_modules**

Run in PowerShell:
```powershell
cd frontend
npm install
cd ..
```

- [ ] **Step 3: Verify build command works on minimal root**

Run in PowerShell:
```powershell
cd frontend
npm run build
cd ..
```
Expected: `dist/index.html` successfully generated.

- [ ] **Step 4: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): scaffold Vite + React 19 + Tailwind CSS structure"
```

---

### Task 7: Frontend Types, API Client & Auth Context

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/context/AuthContext.tsx`

**Interfaces:**
- Produces: TypeScript types (`Item`, `Location`, `Photo`, `User`, `Appraisal`, `Sale`), `api` client (all REST calls with `credentials: "include"`), `useAuth()` hook.

- [ ] **Step 1: Define types in frontend/src/types/index.ts**

Exhaustive TypeScript interfaces matching backend models and schemas (including book attributes and eBay fields).

- [ ] **Step 2: Implement frontend/src/services/api.ts**

Methods: `getItems(params)`, `getItem(id)`, `createItem(data)`, `updateItem(id, data)`, `deleteItem(id)`, `analyzePhotos(files)`, `uploadItemPhoto(id, file, isPrimary)`, `deletePhoto(id)`, `getLocations()`, `createLocation(data)`, `updateLocation(id, data)`, `deleteLocation(id)`, `addAppraisal(itemId, data)`, `addSale(itemId, data)`, `getUsers()`, `updateUserRole(id, role)`, `deleteUser(id)`, `login(email, pass)`, `register(email, name, pass)`, `logout()`, `getMe()`, `getAuthProviders()`.

- [ ] **Step 3: Implement frontend/src/context/AuthContext.tsx**

Manages logged-in user state, `loading`, `login()`, `register()`, `logout()`, and handles OAuth/Authentik error parameters from the URL.

- [ ] **Step 4: Verify typecheck passes**

Run in PowerShell:
```powershell
cd frontend
npx tsc --noEmit
cd ..
```
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types/ frontend/src/services/ frontend/src/context/
git commit -m "feat(frontend): add typescript types, api client and auth context"
```

---

### Task 8: Frontend UI Components & Modals

**Files:**
- Create: `frontend/src/components/Navbar.tsx`
- Create: `frontend/src/components/ItemCard.tsx`
- Create: `frontend/src/components/CatalogView.tsx`
- Create: `frontend/src/components/ItemDetailModal.tsx`
- Create: `frontend/src/components/ItemFormModal.tsx` (mit 1-Klick Gemini Live-Scan)
- Create: `frontend/src/components/LocationsView.tsx`
- Create: `frontend/src/components/AdminUsersModal.tsx`
- Create: `frontend/src/components/AuthModal.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Produces: Complete, responsive Fitcast-style Antiquitäten SPA with fluid tab switching, modal dialogs, search, filter tags, and AI image recognition.

- [ ] **Step 1: Implement Navbar.tsx and AuthModal.tsx**

Elegante Navigation mit Tabs (`Katalog`, `Standorte`, `Benutzer` für Admins), "+ Neues Objekt"-Button und User-Dropdown. AuthModal mit E-Mail/Passwort-Tabs und Authentik SSO Button.

- [ ] **Step 2: Implement ItemCard.tsx and CatalogView.tsx**

Filter-Leiste (Echtzeit-Suchfeld, Dropdown für Kategorien, Zustand, Epoche und Standort), Sortierung und responsive Kartenansicht.

- [ ] **Step 3: Implement ItemFormModal.tsx with Gemini Vision Scan**

Drag & Drop Foto-Upload, Button "Mit KI analysieren (Gemini)" mit Spinner und Statusanzeige. Auto-Vervollständigung sämtlicher Attribute mit manueller Korrekturmöglichkeit vor dem Speichern.

- [ ] **Step 4: Implement ItemDetailModal.tsx and LocationsView.tsx**

Vollständige Anzeige aller Metadaten, Buch- und eBay-Details, Schätzungs- und Verkaufssektionen sowie interaktiver Standortbaum.

- [ ] **Step 5: Assemble App.tsx**

Tab-Wechsel, Modal-Verwaltung und Fehlerbehandlung.

- [ ] **Step 6: Build frontend and verify no errors**

Run in PowerShell:
```powershell
cd frontend
npm run build
cd ..
```
Expected: PASS (`dist/` created without errors).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ frontend/src/App.tsx
git commit -m "feat(frontend): implement Fitcast-style catalog, modals and gemini scan UI"
```

---

### Task 9: Multi-Stage Dockerfile, Docker Compose, Windows Launcher & Next.js Cleanup

**Files:**
- Create: `Dockerfile` (Multi-stage Node builder + Python runtime)
- Modify: `docker-compose.yml` (db: postgres:16, app: port 3003:8000)
- Create: `docker-compose.portainer.yml`
- Create: `start.ps1` (Windows PowerShell Dev-Launcher)
- Create: `start.bat`
- Create: `.env.example`
- Delete: Legacy Next.js files (`src/`, `prisma/`, `components.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`)
- Update: `.gitignore`

**Interfaces:**
- Produces: Production-ready container builds and seamless one-click local launcher for Windows.

- [ ] **Step 1: Create Multi-Stage Dockerfile**

```dockerfile
# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Python Backend & SPA
# ==========================================
FROM python:3.11-slim AS runtime

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    STATIC_DIR=/app/static \
    UPLOADS_DIR=/app/uploads

RUN mkdir -p /app/uploads /app/data /app/static

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY --from=frontend-builder /app/frontend/dist ./static

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Create start.ps1 and start.bat**

Windows PowerShell Launcher der das venv prüft/erstellt, den FastAPI-Server auf Port 8000 startet und den Vite-Dev-Server auf Port 3000 startet.

- [ ] **Step 3: Update docker-compose.yml and docker-compose.portainer.yml**

Passt die Services für PostgreSQL und den neuen Multi-Stage Container auf Port 3003 an.

- [ ] **Step 4: Clean up legacy Next.js files**

Entferne nicht mehr benötigte Next.js-Dateien (`src/`, `prisma/`, `next.config.ts`, `.next`, etc.) und aktualisiere `.gitignore`.

- [ ] **Step 5: Verify tests and frontend build**

Run in PowerShell:
```powershell
$env:PYTHONPATH="backend"
.\backend\venv\Scripts\pytest.exe backend/tests/ -v
cd frontend; npm run build; cd ..
```
Expected: All backend tests pass, frontend builds cleanly.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml docker-compose.portainer.yml start.ps1 start.bat .gitignore
git commit -m "feat(deploy): add multi-stage Dockerfile, compose configs, start.ps1 and clean legacy Next.js files"
```
