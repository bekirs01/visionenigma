from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from pathlib import Path
from dotenv import load_dotenv

# Путь к .env относительно этого файла (app/config.py -> backend/.env)
ENV_FILE_PATH = Path(__file__).parent.parent / ".env"

# Явно загружаем .env файл
if ENV_FILE_PATH.exists():
    load_dotenv(ENV_FILE_PATH, override=True)
    print(f"[Config] Загружен .env из {ENV_FILE_PATH}")


def _database_url() -> str:
    # Yerel geliştirme: Supabase erişilemezse USE_SQLITE=1 ile SQLite kullanın
    if os.getenv("USE_SQLITE", "").strip() == "1":
        return "sqlite:///./support_mvp.db"
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
    return "sqlite:///./support_mvp.db"


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

    class Config:
        env_file = str(ENV_FILE_PATH)
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_database_url() -> str:
    if os.getenv("USE_SQLITE", "").strip() == "1":
        return "sqlite:///./support_mvp.db"
    s = get_settings()
    return s.database_url or _database_url()
