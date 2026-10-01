from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

def sanitize_database_url(url: str) -> tuple[str, dict]:
    """
    Sanitize database URL for SQLAlchemy / psycopg2 compatibility.
    - Converts postgres:// to postgresql://
    - Removes Prisma-specific query parameters (?schema=..., connection_limit=..., pool_timeout=..., pgbouncer=...)
    - Configures search_path in connect_args if schema parameter was present
    - Adds check_same_thread: False for SQLite
    """
    clean_url = url
    if clean_url.startswith("postgres://"):
        clean_url = clean_url.replace("postgres://", "postgresql://", 1)

    connect_args: dict = {}
    if clean_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    elif clean_url.startswith("postgresql"):
        parsed = urlparse(clean_url)
        if parsed.query:
            qs = parse_qs(parsed.query)
            schema = qs.pop("schema", None)
            if schema:
                connect_args["options"] = f"-csearch_path={schema[0]}"
            qs.pop("connection_limit", None)
            qs.pop("pool_timeout", None)
            qs.pop("pgbouncer", None)

            new_query = urlencode(qs, doseq=True)
            clean_url = urlunparse((
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                new_query,
                parsed.fragment
            ))

    return clean_url, connect_args

db_url, connect_args = sanitize_database_url(settings.DATABASE_URL)

engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
