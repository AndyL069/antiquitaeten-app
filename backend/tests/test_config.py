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
