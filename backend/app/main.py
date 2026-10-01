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
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Healthcheck
@app.get("/api/health")
def healthcheck():
    return {"status": "ok"}

# Mount uploaded files directory
app.mount("/uploads", StaticFiles(directory=str(settings.UPLOADS_DIR), check_dir=False), name="uploads")
app.mount("/api/uploads", StaticFiles(directory=str(settings.UPLOADS_DIR), check_dir=False), name="api_uploads")

# Include API routers
app.include_router(auth.router)
app.include_router(items.router)
app.include_router(locations.router)
app.include_router(appraisals.router)
app.include_router(sales.router)
app.include_router(users.router)

# SPA Fallback and Static Serving
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    """Serve static frontend files or SPA index.html fallback with path traversal protection."""
    if full_path.startswith("api/") or full_path.startswith("uploads/"):
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    if settings.STATIC_DIR.exists() and settings.STATIC_DIR.is_dir():
        try:
            static_root = settings.STATIC_DIR.resolve()
            target = (settings.STATIC_DIR / full_path).resolve()
            if target.is_file() and target.is_relative_to(static_root):
                return FileResponse(target)
        except (ValueError, RuntimeError):
            pass

        index_file = settings.STATIC_DIR / "index.html"
        if index_file.exists():
            return FileResponse(index_file)

    return JSONResponse({"detail": "Not Found"}, status_code=404)


