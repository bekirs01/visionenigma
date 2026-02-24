"""
AI: анализ тикета (OpenAI) и отправка ответа по SMTP. Только для админа.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Ticket
from app.auth import require_admin_dep
from app.services.openai_service import analyze_with_openai
from app.services.smtp_service import send_email

router = APIRouter(prefix="/api/ai", tags=["ai"])


class SendReplyBody(BaseModel):
    reply_text: str


@router.post("/analyze/{ticket_id}")
def ai_analyze(
    ticket_id: int,
    request: Request,
    db: Session = Depends(get_db),
    _admin: bool = Depends(require_admin_dep),
):
    """Анализ обращения через OpenAI; сохраняет ai_category и ai_reply в БД."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Обращение не найдено")
    category, reply = analyze_with_openai(ticket.subject, ticket.body)
    ticket.ai_category = category
    ticket.ai_reply = reply
    db.commit()
    db.refresh(ticket)
    return {"ai_category": category, "ai_reply": reply}


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
    ok, msg_id, err = send_email(to, f"Re: {ticket.subject}", reply_text)
    if not ok:
        raise HTTPException(status_code=503, detail=err or "Не удалось отправить письмо")
    ticket.sent_reply = reply_text
    ticket.reply_sent = 1
    ticket.reply_sent_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)
    return {"ok": True, "message": "Ответ отправлен", "reply_sent_at": ticket.reply_sent_at.isoformat()}
