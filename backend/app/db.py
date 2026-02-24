from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import get_database_url

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
    except Exception:
        sqlite_url = "sqlite:///./support_mvp.db"
        engine = create_engine(sqlite_url, pool_pre_ping=True, connect_args={})
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        Base.metadata.create_all(bind=engine)
    ensure_ticket_ai_columns()


def ensure_ticket_ai_columns():
    """Mevcut tickets tablosuna ai/reply sütunları yoksa ekle (SQLite)."""
    try:
        with engine.connect() as conn:
            if "sqlite" not in str(engine.url):
                return
            r = conn.execute(text("PRAGMA table_info(tickets)"))
            cols = [row[1] for row in r]
            need_commit = False
            if "ai_category" not in cols:
                conn.execute(text("ALTER TABLE tickets ADD COLUMN ai_category VARCHAR(100)"))
                need_commit = True
            if "ai_reply" not in cols:
                conn.execute(text("ALTER TABLE tickets ADD COLUMN ai_reply TEXT"))
                need_commit = True
            if "reply_sent" not in cols:
                conn.execute(text("ALTER TABLE tickets ADD COLUMN reply_sent INTEGER NOT NULL DEFAULT 0"))
                need_commit = True
            if "sent_reply" not in cols:
                conn.execute(text("ALTER TABLE tickets ADD COLUMN sent_reply TEXT"))
                need_commit = True
            if need_commit:
                conn.commit()
    except Exception:
        pass
