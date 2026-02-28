"""
Локальное сохранение вложений тикетов.
Путь: uploads/tickets/{ticket_id}/{uuid}-{filename}
"""
import uuid
from pathlib import Path
from typing import Optional

# Корень backend
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = _BACKEND_DIR / "uploads"
ATTACHMENTS_SUBDIR = "tickets"


def get_uploads_base() -> Path:
    return UPLOADS_DIR


def save_attachment(ticket_id: int, filename: str, data: bytes) -> str:
    """
    Сохраняет файл в uploads/tickets/{ticket_id}/{uuid}-{filename}.
    Возвращает относительный storage_path (без ведущего uploads/ для URL: /uploads/...).
    """
    base = UPLOADS_DIR / ATTACHMENTS_SUBDIR / str(ticket_id)
    base.mkdir(parents=True, exist_ok=True)
    safe_name = (filename or "attachment").replace("..", "").strip() or "attachment"
    unique = uuid.uuid4().hex[:12]
    final_name = f"{unique}-{safe_name}"
    path = base / final_name
    path.write_bytes(data)
    # Относительный путь от uploads/ для хранения в БД и формирования URL
    return f"{ATTACHMENTS_SUBDIR}/{ticket_id}/{final_name}"
