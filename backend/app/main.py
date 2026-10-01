# backend/app/main.py
import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.database import Base, engine
from app.routes import auth, items, locations, appraisals, sales, users

logger = logging.getLogger("uvicorn.error")

async def _start_port_forwarder(from_port: int, to_port: int):
    """Forward TCP traffic from an alternate port to the active server port."""
    async def forward_stream(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        try:
            remote_reader, remote_writer = await asyncio.open_connection("127.0.0.1", to_port)
        except Exception:
            writer.close()
            await writer.wait_closed()
            return

        async def pipe(r: asyncio.StreamReader, w: asyncio.StreamWriter):
            try:
                while True:
                    data = await r.read(65536)
                    if not data:
                        break
                    w.write(data)
                    await w.drain()
            except Exception:
                pass
            finally:
                try:
                    w.close()
                    await w.wait_closed()
                except Exception:
                    pass

        await asyncio.gather(pipe(reader, remote_writer), pipe(remote_reader, writer))

    try:
        server = await asyncio.start_server(forward_stream, "0.0.0.0", from_port)
        logger.info(f"Dual-port forwarder listening on 0.0.0.0:{from_port} -> 127.0.0.1:{to_port}")
        return server
    except Exception as e:
        logger.debug(f"Dual-port forwarder {from_port} -> {to_port} skipped: {e}")
        return None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created with retry mechanism
    retries = 5
    for attempt in range(1, retries + 1):
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database schema verified/created successfully.")
            break
        except Exception as e:
            logger.warning(f"Database connection attempt {attempt}/{retries} failed: {e}")
            if attempt == retries:
                logger.error(f"Could not connect to database after {retries} retries: {e}")
                # Don't hard-crash process so container remains up for logs/healthcheck
            else:
                await asyncio.sleep(2)

    settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    # Start optional dual-port forwarder (supporting both 3000 and 8000)
    forwarder_server = None
    try:
        port_env = int(os.environ.get("PORT", "3000"))
        alt_port = 8000 if port_env == 3000 else (3000 if port_env == 8000 else None)
        if alt_port:
            forwarder_server = await _start_port_forwarder(alt_port, port_env)
    except Exception as e:
        logger.debug(f"Could not start dual-port forwarder: {e}")

    yield

    if forwarder_server:
        forwarder_server.close()
        try:
            await forwarder_server.wait_closed()
        except Exception:
            pass


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


