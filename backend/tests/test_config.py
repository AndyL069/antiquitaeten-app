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

def test_sanitize_database_url_prisma_params():
    from app.database import sanitize_database_url
    
    # Test Prisma postgres URL with schema and pool params
    url = "postgres://antik:secret123@db:5432/antik_app?schema=public&connection_limit=5&pool_timeout=10&sslmode=prefer"
    clean_url, connect_args = sanitize_database_url(url)
    assert clean_url == "postgresql://antik:secret123@db:5432/antik_app?sslmode=prefer"
    assert connect_args == {"options": "-csearch_path=public"}

def test_sanitize_database_url_sqlite():
    from app.database import sanitize_database_url
    url = "sqlite:///./test.db"
    clean_url, connect_args = sanitize_database_url(url)
    assert clean_url == "sqlite:///./test.db"
    assert connect_args == {"check_same_thread": False}

@pytest.mark.anyio
async def test_dual_port_forwarder_lifecycle():
    from app.main import _start_port_forwarder
    server = await _start_port_forwarder(19876, 19877)
    if server:
        server.close()
        await server.wait_closed()


