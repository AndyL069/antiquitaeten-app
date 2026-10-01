# backend/app/main.py
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.database import Base, engine
from app.routes import auth, items, locations, appraisals, sales, users

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created
    Base.metadata.create_all(bind=engine)
    settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    yield

app = FastAPI(
    title="Antiquitäten-App API",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Healthcheck
@app.get("/api/health")
def healthcheck():
    return {"status": "ok"}

# Mount uploaded files directory
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOADS_DIR)), name="uploads")
app.mount("/api/uploads", StaticFiles(directory=str(settings.UPLOADS_DIR)), name="api_uploads")

# Include API routers
app.include_router(auth.router)
app.include_router(items.router)
app.include_router(locations.router)
app.include_router(appraisals.router)
app.include_router(sales.router)
app.include_router(users.router)

# Mount frontend production SPA if static directory exists
if settings.STATIC_DIR.exists() and settings.STATIC_DIR.is_dir():
    assets_dir = settings.STATIC_DIR / "assets"
    if assets_dir.exists() and assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    index_file = settings.STATIC_DIR / "index.html"

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        target = settings.STATIC_DIR / full_path
        if target.exists() and target.is_file():
            return FileResponse(target)
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse({"detail": "Not Found"}, status_code=404)
