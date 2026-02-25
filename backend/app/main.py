import threading
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import engine, Base, ensure_db_fallback
from app import models  # noqa: F401 - tablolar Base.metadata'ya kayıt olsun
from app.routers import health, categories, tickets, seed, email_stub, ai, admin_auth
from app.services.ticket_cleanup import cleanup_completed_tickets_sync

# Флаг для остановки фоновых потоков
_shutdown = False


def cleanup_thread_func():
    """Фоновый поток для очистки завершённых тикетов."""
    print("[Cleanup Thread] Запуск потока очистки (интервал: 60с, TTL: 5мин)", flush=True)
    while not _shutdown:
        try:
            cleanup_completed_tickets_sync()
        except Exception as e:
            print(f"[Cleanup Thread] Ошибка: {e}", flush=True)
        time.sleep(60)
    print("[Cleanup Thread] Поток остановлен", flush=True)


app = FastAPI(title="Support MVP API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3004",
        "http://127.0.0.1:3005",
        "http://frontend:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(health.router)
app.include_router(admin_auth.router)
app.include_router(categories.router)
app.include_router(tickets.router)
app.include_router(seed.router)
app.include_router(email_stub.router)
app.include_router(ai.router)


@app.on_event("startup")
def startup():
    ensure_db_fallback()
    # Запускаем фоновый поток очистки
    cleanup_thread = threading.Thread(target=cleanup_thread_func, daemon=True)
    cleanup_thread.start()
    print("[Main] Сервер запущен, фоновый поток очистки активен")
