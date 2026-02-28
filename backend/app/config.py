from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from pathlib import Path
from dotenv import load_dotenv

# Repo root .env (backend/app/config.py -> backend -> root)
_ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_ENV = _ROOT_DIR / ".env"
# Backend .env (opsiyonel, override için)
_BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE_PATH = _BACKEND_DIR / ".env"

# Önce root .env, sonra backend/.env (varsa override)
if ROOT_ENV.exists():
    load_dotenv(ROOT_ENV, override=False)
if ENV_FILE_PATH.exists():
    load_dotenv(ENV_FILE_PATH, override=True)


def _database_url() -> str:
    # Абсолютный путь к SQLite в папке backend
    _sqlite_path = _BACKEND_DIR / "support_mvp.db"
    sqlite_url = f"sqlite:///{_sqlite_path}"

    # Yerel geliştirme: Supabase erişilemezse USE_SQLITE=1 ile SQLite kullanın
    if os.getenv("USE_SQLITE", "").strip() == "1":
        return sqlite_url
    if os.getenv("DATABASE_URL"):
        return os.getenv("DATABASE_URL", "")
    # PostgreSQL from env (Docker / production)
    if os.getenv("POSTGRES_HOST") or os.getenv("POSTGRES_USER") or os.getenv("POSTGRES_DB"):
        user = os.getenv("POSTGRES_USER", "postgres")
        password = os.getenv("POSTGRES_PASSWORD", "postgres")
        host = os.getenv("POSTGRES_HOST", "localhost")
        port = os.getenv("POSTGRES_PORT", "5432")
        db = os.getenv("POSTGRES_DB", "support_mvp")
        return f"postgresql://{user}:{password}@{host}:{port}/{db}"
    # SQLite: Docker ve PostgreSQL yoksa (sadece Python + Node ile çalıştırma)
    return sqlite_url


class Settings(BaseSettings):
    app_env: str = "development"
    backend_port: int = 8000
    database_url: str = ""
    email_mode: str = "mock"
    ai_provider: str = "mock"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    admin_access_code: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_pass: str = ""
    smtp_from: str = ""
    imap_host: str = ""
    imap_port: int = 993
    imap_user: str = ""
    imap_pass: str = ""
    cron_secret: str = ""
    email_sync_interval_seconds: int = 60

    class Config:
        env_file = str(ROOT_ENV) if ROOT_ENV.exists() else str(ENV_FILE_PATH)
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_database_url() -> str:
    _sqlite_path = _BACKEND_DIR / "support_mvp.db"
    sqlite_url = f"sqlite:///{_sqlite_path}"

    if os.getenv("USE_SQLITE", "").strip() == "1":
        return sqlite_url
    s = get_settings()
    return s.database_url or _database_url()
