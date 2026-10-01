from pathlib import Path
from typing import Optional
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    SECRET_KEY: str = "antik-secret-key-change-in-production-2026"
    DATABASE_URL: str = f"sqlite:///{BASE_DIR.as_posix()}/antik.db"
    
    AUTH_SECRET: str = ""
    AUTH_URL: str = ""
    
    # Gemini AI
    GOOGLE_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # Authentik OIDC SSO
    AUTHENTIK_CLIENT_ID: str = ""
    AUTHENTIK_CLIENT_SECRET: str = ""
    AUTHENTIK_ISSUER: str = ""
    AUTHENTIK_REDIRECT_URI: str = ""

    
    # Paths & Cookies
    UPLOADS_DIR: Path = BASE_DIR / "uploads"
    UPLOAD_DIR: Optional[str] = None
    STATIC_DIR: Path = BASE_DIR / "static"
    COOKIE_NAME: str = "access_token"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    @model_validator(mode="after")
    def sync_config(self):
        if self.SECRET_KEY == "antik-secret-key-change-in-production-2026" and self.AUTH_SECRET:
            self.SECRET_KEY = self.AUTH_SECRET
        if self.UPLOAD_DIR:
            p = Path(self.UPLOAD_DIR)
            if p.is_absolute():
                self.UPLOADS_DIR = p
            elif (BASE_DIR.parent / self.UPLOAD_DIR).is_dir():
                self.UPLOADS_DIR = BASE_DIR.parent / self.UPLOAD_DIR
            else:
                self.UPLOADS_DIR = BASE_DIR / self.UPLOAD_DIR
        return self

    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v


    
    model_config = SettingsConfigDict(
        env_file=[str(BASE_DIR.parent / ".env"), str(BASE_DIR.parent / ".env.local")],
        extra="ignore"
    )

settings = Settings()

