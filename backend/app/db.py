from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import get_database_url

_db_url = get_database_url()
# Supabase (ve bazı bulut Postgres) SSL ister
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
