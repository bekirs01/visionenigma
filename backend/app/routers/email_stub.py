"""
Email endpoints: получение и обработка входящих писем.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.config import get_settings
from app.db import get_db
from app.auth import require_admin_dep

router = APIRouter(prefix="/api/email", tags=["email"])


@router.post("/import-mock")
def import_mock():
    """Placeholder: in future, import from IMAP or file. For MVP returns instruction."""
    return {"message": "Use POST /api/tickets to create tickets manually or POST /api/email/fetch to fetch from IMAP."}


@router.post("/fetch")
def fetch_emails(
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep),
):
    """
    Получает новые письма из IMAP и создаёт тикеты.

    Требует настройки IMAP_HOST, IMAP_USER, IMAP_PASS в .env.
    Для каждого нового письма:
    1. Создаётся тикет
    2. Запускается AI анализ (если настроен OpenAI)
    3. Извлекаются данные клиента, категория, генерируется ответ
    """
    settings = get_settings()

    # Проверяем настройки
    if not settings.imap_host or not settings.imap_user:
        raise HTTPException(
            status_code=400,
            detail="IMAP не настроен. Укажите IMAP_HOST, IMAP_USER, IMAP_PASS в .env"
        )

    try:
        from app.services.email_processor import fetch_and_process_emails
        results = fetch_and_process_emails(db)
        return {
            "status": "ok",
            "processed": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обработки почты: {str(e)}")


@router.get("/status")
def email_status():
    """Проверяет статус настроек email интеграции."""
    settings = get_settings()

    return {
        "imap": {
            "configured": bool(settings.imap_host and settings.imap_user),
            "host": settings.imap_host or "не настроен",
            "port": settings.imap_port,
            "user": settings.imap_user[:3] + "***" if settings.imap_user else "не настроен"
        },
        "smtp": {
            "configured": bool(settings.smtp_host and settings.smtp_user),
            "host": settings.smtp_host or "не настроен",
            "port": settings.smtp_port,
            "user": settings.smtp_user[:3] + "***" if settings.smtp_user else "не настроен"
        },
        "ai": {
            "configured": bool(settings.openai_api_key),
            "provider": "openai" if settings.openai_api_key else "не настроен",
            "model": settings.openai_model
        }
    }


@router.post("/send")
def send_email_endpoint():
    """Future: send reply via SMTP. Use /api/ai/send-reply/{ticket_id} instead."""
    raise HTTPException(
        status_code=400,
        detail="Используйте POST /api/ai/send-reply/{ticket_id} для отправки ответов"
    )
