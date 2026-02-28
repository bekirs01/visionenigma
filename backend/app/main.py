import threading
import time
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db import engine, Base, ensure_db_fallback, SessionLocal
from app import models  # noqa: F401 - tablolar Base.metadata'ya kayıt olsun
from app.routers import health, categories, tickets, seed, email_stub, ai, admin_auth, analytics, cron
from app.services.email_processor import fetch_and_process_emails
from app.config import get_settings

# Флаг для остановки фоновых потоков
_shutdown = False

# Интервал проверки почты (секунды) — макс. 10–30 с задержка
EMAIL_CHECK_INTERVAL = 30


def email_fetch_thread_func():
    """Фоновый поток для проверки входящей почты."""
    settings = get_settings()

    # Проверяем, настроен ли IMAP
    if not all([settings.imap_host, settings.imap_user, settings.imap_pass]):
        print("[Email Thread] IMAP не настроен, поток не запущен", flush=True)
        return

    print(f"[Email Thread] Запуск потока проверки почты (интервал: {EMAIL_CHECK_INTERVAL}с)", flush=True)

    # Ждём немного перед первой проверкой
    time.sleep(5)

    # Счётчик последовательных ошибок (чтобы не спамить логи)
    consecutive_errors = 0
    last_error_msg = ""

    while not _shutdown:
        try:
            # Создаём новую сессию БД для каждой итерации
            db = SessionLocal()
            try:
                results = fetch_and_process_emails(db)
                consecutive_errors = 0  # Сбрасываем счётчик при успехе

                for r in results:
                    if r.get("status") == "ok" and r.get("ticket_id"):
                        print(f"[Email Thread] Создан тикет #{r['ticket_id']}", flush=True)
                    elif r.get("status") == "error":
                        err_msg = r.get('message') or r.get('error', '')
                        # Логируем только если это новая ошибка или первая в серии
                        if consecutive_errors == 0 or err_msg != last_error_msg:
                            print(f"[Email Thread] Ошибка IMAP: {err_msg}", flush=True)
                            last_error_msg = err_msg
                        consecutive_errors += 1
            finally:
                db.close()
        except Exception as e:
            err_str = str(e)
            # Логируем только первую ошибку и каждую 10-ю
            if consecutive_errors == 0 or consecutive_errors % 10 == 0:
                print(f"[Email Thread] Ошибка ({consecutive_errors + 1}): {err_str}", flush=True)
            consecutive_errors += 1
            last_error_msg = err_str

        time.sleep(EMAIL_CHECK_INTERVAL)

    print("[Email Thread] Поток остановлен", flush=True)


app = FastAPI(title="Support MVP API", version="0.1.0")

import os
_cors_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:3004",
    "http://localhost:3005",
    "http://localhost:3006",
    "http://localhost:3007",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
    "http://127.0.0.1:3004",
    "http://127.0.0.1:3005",
    "http://frontend:3000",
    # Railway production
    "https://valiant-harmony-production-4dfa.up.railway.app",
    "https://visionenigma-production-f911.up.railway.app",
]
# Add custom CORS origins from env
if os.getenv("CORS_ORIGINS"):
    _cors_origins.extend(os.getenv("CORS_ORIGINS").split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

# Вложения тикетов: uploads/tickets/{id}/...
_uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")

app.include_router(health.router)
app.include_router(admin_auth.router)
app.include_router(categories.router)
app.include_router(tickets.router)
app.include_router(seed.router)
app.include_router(email_stub.router)
app.include_router(ai.router)
app.include_router(analytics.router)
app.include_router(cron.router)


@app.on_event("startup")
def startup():
    ensure_db_fallback()

    # Запускаем фоновый поток проверки почты
    email_thread = threading.Thread(target=email_fetch_thread_func, daemon=True)
    email_thread.start()

    print("[Main] Сервер запущен, фоновый поток email активен")
