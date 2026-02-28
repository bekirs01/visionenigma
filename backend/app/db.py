from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from pathlib import Path
from .config import get_database_url

# Абсолютный путь к SQLite файлу в папке backend
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_SQLITE_PATH = _BACKEND_DIR / "support_mvp.db"

_db_url = get_database_url()
_connect_args = {}
if "supabase.co" in _db_url and "sslmode" not in _db_url:
    _connect_args["sslmode"] = "require"

engine = create_engine(
    _db_url,
    pool_pre_ping=True,
    echo=False,
    connect_args=_connect_args if _connect_args else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_db_fallback():
    """Bağlantı başarısızsa (örn. Supabase erişilemez) SQLite'a geç, tabloları oluştur."""
    global engine, SessionLocal
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"[DB] Подключено к: {_db_url[:50]}...", flush=True)
    except Exception as e:
        print(f"[DB] Ошибка подключения к основной БД: {e}", flush=True)
        sqlite_url = f"sqlite:///{_SQLITE_PATH}"
        print(f"[DB] Переключение на SQLite: {_SQLITE_PATH}", flush=True)
        engine = create_engine(sqlite_url, pool_pre_ping=True, connect_args={"check_same_thread": False})
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
    ensure_ticket_ai_columns()


def _ticket_columns_sqlite(conn):
    r = conn.execute(text("PRAGMA table_info(tickets)"))
    return [row[1] for row in r]


def _ticket_columns_pg(conn):
    r = conn.execute(text(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets'"
    ))
    return [row[0] for row in r]


def ensure_ticket_ai_columns():
    """Добавляет в таблицу tickets отсутствующие колонки (ai_*, reply_*, client_token)."""
    try:
        with engine.connect() as conn:
            is_sqlite = "sqlite" in str(engine.url)
            cols = _ticket_columns_sqlite(conn) if is_sqlite else _ticket_columns_pg(conn)
            need_commit = False
            adds = [
                ("ai_category", "ALTER TABLE tickets ADD COLUMN ai_category VARCHAR(100)" if is_sqlite else "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_category VARCHAR(100)"),
                ("ai_reply", "ALTER TABLE tickets ADD COLUMN ai_reply TEXT" if is_sqlite else "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_reply TEXT"),
                ("reply_sent", "ALTER TABLE tickets ADD COLUMN reply_sent INTEGER NOT NULL DEFAULT 0" if is_sqlite else "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS reply_sent INTEGER NOT NULL DEFAULT 0"),
                ("sent_reply", "ALTER TABLE tickets ADD COLUMN sent_reply TEXT" if is_sqlite else "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sent_reply TEXT"),
                ("client_token", "ALTER TABLE tickets ADD COLUMN client_token VARCHAR(64)" if is_sqlite else "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS client_token VARCHAR(64)"),
                ("reply_sent_at", "ALTER TABLE tickets ADD COLUMN reply_sent_at DATETIME" if is_sqlite else "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS reply_sent_at TIMESTAMP WITH TIME ZONE"),
                ("operator_required", "ALTER TABLE tickets ADD COLUMN operator_required INTEGER NOT NULL DEFAULT 0" if is_sqlite else "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS operator_required BOOLEAN DEFAULT false"),
                ("operator_reason", "ALTER TABLE tickets ADD COLUMN operator_reason TEXT" if is_sqlite else "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS operator_reason TEXT"),
                ("device_info", "ALTER TABLE tickets ADD COLUMN device_info TEXT" if is_sqlite else "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS device_info TEXT"),
            ]
            for col_name, sql in adds:
                if col_name not in cols:
                    try:
                        conn.execute(text(sql))
                        need_commit = True
                    except Exception:
                        if is_sqlite:
                            raise
            if need_commit:
                conn.commit()
    except Exception:
        pass
