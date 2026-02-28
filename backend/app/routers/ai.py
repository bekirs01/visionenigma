"""
AI: анализ тикета (OpenAI) и отправка ответа по SMTP. Только для админа.
Адаптировано для кейса ЭРИС (газоанализаторы).
"""
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Ticket
from app.auth import require_admin_dep
from app.services.openai_service import analyze_eris_email, analyze_with_openai
from app.services.smtp_service import send_email
from app.services.ai_agent import AIAgent
from app.services.kb_search import get_kb_context
from app.services.telegram_service import maybe_send_telegram_alert
from app.config import get_settings

router = APIRouter(prefix="/api/ai", tags=["ai"])


class SendReplyBody(BaseModel):
    reply_text: str


class AnalyzeResponse(BaseModel):
    """Ответ анализа для ЭРИС"""
    ai_category: str
    ai_reply: str
    request_category: Optional[str] = None
    sentiment: Optional[str] = None
    sender_full_name: Optional[str] = None
    object_name: Optional[str] = None
    sender_phone: Optional[str] = None
    serial_numbers: Optional[List[str]] = None
    device_type: Optional[str] = None
    issue_summary: Optional[str] = None


@router.post("/analyze/{ticket_id}", response_model=AnalyzeResponse)
def ai_analyze(
    ticket_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep),
):
    """
    Анализ обращения через AI-агент ЭРИС.
    Извлекает: ФИО, организацию, телефон, серийные номера, тип прибора,
    тональность, категорию запроса, суть проблемы и генерирует ответ.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    # Используем AI-агент
    agent = AIAgent(db)
    result = agent.process_ticket(ticket)

    # Обновляем тикет
    agent.update_ticket_with_result(ticket, result)

    db.commit()
    db.refresh(ticket)

    # Telegram: negatif veya Требуется оператор ise tek seferlik bildirim (akışı kesmeyen)
    try:
        maybe_send_telegram_alert(db, ticket)
    except Exception as e:
        logging.getLogger(__name__).warning("Telegram bildirimi atlama: %s", str(e)[:200])

    return AnalyzeResponse(
        ai_category=ticket.ai_category or "other",
        ai_reply=result.reply,
        request_category=result.request_category,
        sentiment=result.sentiment,
        sender_full_name=result.sender_full_name,
        object_name=result.object_name,
        sender_phone=result.sender_phone,
        serial_numbers=result.serial_numbers,
        device_type=result.device_type,
        issue_summary=result.issue_summary,
    )


@router.post("/send-reply/{ticket_id}")
def ai_send_reply(
    ticket_id: int,
    body: SendReplyBody,
    request: Request,
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep),
):
    """Отправляет ответ на email отправителя через SMTP; при успехе помечает reply_sent и reply_sent_at."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Обращение не найдено")

    to = (ticket.sender_email or "").strip()
    if not to:
        raise HTTPException(status_code=400, detail="У обращения нет email отправителя")

    reply_text = (body.reply_text or "").strip()
    if not reply_text:
        raise HTTPException(status_code=400, detail="Текст ответа пустой")

    # Форматируем ответ с подписью ЭРИС
    formatted_reply = _format_eris_reply(reply_text, ticket.id)

    ok, msg_id, err = send_email(to, f"Re: {ticket.subject}", formatted_reply)
    if not ok:
        print(f"[SMTP ERROR] Ticket #{ticket_id}, To: {to}, Error: {err}")
        raise HTTPException(status_code=503, detail=err or "Не удалось отправить письмо")

    ticket.sent_reply = reply_text
    ticket.reply_sent = 1
    ticket.reply_sent_at = datetime.now(timezone.utc)
    ticket.status = "completed"  # Статус "Завершён"
    ticket.completed_at = datetime.now(timezone.utc)  # Время завершения для автоудаления

    db.commit()
    db.refresh(ticket)

    return {
        "ok": True,
        "message": "Ответ отправлен. Тикет перемещён в архив.",
        "reply_sent_at": ticket.reply_sent_at.isoformat()
    }


def _get_kb_context(db: Session, subject: str, body: str) -> str:
    """Получает релевантные статьи из базы знаний для контекста."""
    try:
        from app.models import KbArticle

        # Простой поиск по ключевым словам
        search_terms = (subject + " " + body).lower()
        keywords = ["калибровка", "поверка", "ошибка", "датчик", "газоанализатор",
                    "паспорт", "сертификат", "гарантия", "ремонт", "замена"]

        relevant_keywords = [kw for kw in keywords if kw in search_terms]

        if not relevant_keywords:
            return ""

        # Ищем статьи по ключевым словам
        articles = db.query(KbArticle).filter(
            KbArticle.content.isnot(None)
        ).limit(5).all()

        if not articles:
            return ""

        # Фильтруем релевантные
        relevant_articles = []
        for article in articles:
            content_lower = (article.content or "").lower()
            title_lower = (article.title or "").lower()
            for kw in relevant_keywords:
                if kw in content_lower or kw in title_lower:
                    relevant_articles.append(article)
                    break

        if not relevant_articles:
            return ""

        # Формируем контекст
        context_parts = []
        for article in relevant_articles[:3]:
            context_parts.append(f"### {article.title}\n{article.content[:500]}...")

        return "\n\n".join(context_parts)

    except Exception as e:
        print(f"[KB] Ошибка получения контекста: {e}")
        return ""


def _format_eris_reply(reply_text: str, ticket_id: int) -> str:
    """Форматирует ответ с подписью компании ЭРИС."""
    signature = """

---
С уважением,
Служба технической поддержки ЭРИС

Телефон: 8 (800) 555-35-35
Email: support@eris.ru
Сайт: www.eris.ru

Это письмо сформировано автоматически. Пожалуйста, не отвечайте на него напрямую.
Для продолжения диалога используйте форму обратной связи на сайте.
"""
    return reply_text + signature
