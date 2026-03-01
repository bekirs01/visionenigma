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
    ensure_ticket_attachments_table()


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
                ("attachments_text", "ALTER TABLE tickets ADD COLUMN attachments_text TEXT" if is_sqlite else "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attachments_text TEXT"),
                ("ai_status", "ALTER TABLE tickets ADD COLUMN ai_status VARCHAR(20) NOT NULL DEFAULT 'pending'" if is_sqlite else "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_status VARCHAR(20) NOT NULL DEFAULT 'pending'"),
                ("ai_error", "ALTER TABLE tickets ADD COLUMN ai_error TEXT" if is_sqlite else "ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ai_error TEXT"),
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
            # Eski tiкетler: ai_reply doluysa ai_status=done yap (sonsuza kadar pending kalmasın)
            try:
                conn.execute(text("UPDATE tickets SET ai_status = 'done' WHERE ai_reply IS NOT NULL AND (ai_status IS NULL OR ai_status = 'pending')"))
                conn.commit()
            except Exception:
                pass
    except Exception:
        pass


def _table_exists(conn, table_name: str, is_sqlite: bool) -> bool:
    if is_sqlite:
        r = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name=:n"), {"n": table_name})
    else:
        r = conn.execute(text(
            "SELECT 1 FROM information_schema.tables WHERE table_name = :n"
        ), {"n": table_name})
    return r.fetchone() is not None


def ensure_ticket_attachments_table():
    """Создаёт таблицу ticket_attachments при отсутствии или исправляет схему."""
    try:
        with engine.connect() as conn:
            is_sqlite = "sqlite" in str(engine.url)
            if _table_exists(conn, "ticket_attachments", is_sqlite):
                if not is_sqlite:
                    _fix_attachments_id_serial(conn)
                return
            if is_sqlite:
                conn.execute(text("""
                    CREATE TABLE ticket_attachments (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                        filename VARCHAR(512) NOT NULL,
                        mime_type VARCHAR(128) NOT NULL,
                        size_bytes INTEGER,
                        storage_path VARCHAR(1024) NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """))
            else:
                conn.execute(text("""
                    CREATE TABLE ticket_attachments (
                        id SERIAL PRIMARY KEY,
                        ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                        filename VARCHAR(512) NOT NULL,
                        mime_type VARCHAR(128) NOT NULL,
                        size_bytes BIGINT,
                        storage_path VARCHAR(1024) NOT NULL,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                    )
                """))
            conn.commit()
    except Exception as e:
        print(f"[DB] ensure_ticket_attachments_table: {e}", flush=True)


def _fix_attachments_id_serial(conn):
    """If ticket_attachments.id has no default (not auto-increment), fix it."""
    try:
        r = conn.execute(text(
            "SELECT column_default FROM information_schema.columns "
            "WHERE table_name = 'ticket_attachments' AND column_name = 'id'"
        ))
        row = r.fetchone()
        if row and row[0] and "nextval" in str(row[0]):
            return
        print("[DB] Fixing ticket_attachments.id: adding SERIAL sequence...", flush=True)
        conn.execute(text("CREATE SEQUENCE IF NOT EXISTS ticket_attachments_id_seq"))
        conn.execute(text(
            "ALTER TABLE ticket_attachments "
            "ALTER COLUMN id SET DEFAULT nextval('ticket_attachments_id_seq')"
        ))
        conn.execute(text(
            "ALTER TABLE ticket_attachments ALTER COLUMN id TYPE INTEGER USING id::integer"
        ))
        conn.execute(text(
            "SELECT setval('ticket_attachments_id_seq', COALESCE((SELECT MAX(id) FROM ticket_attachments), 0))"
        ))
        conn.execute(text(
            "ALTER SEQUENCE ticket_attachments_id_seq OWNED BY ticket_attachments.id"
        ))
        conn.commit()
        print("[DB] ticket_attachments.id fixed: auto-increment enabled", flush=True)
    except Exception as e:
        print(f"[DB] _fix_attachments_id_serial: {e}", flush=True)
