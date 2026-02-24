"""
AI analyze + send-reply endpoint'leri (OpenAI veya mock).
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import Ticket
from app.services.openai_service import analyze_with_openai

router = APIRouter(prefix="/api/ai", tags=["ai"])


class SendReplyBody(BaseModel):
    reply_text: str


@router.post("/analyze/{ticket_id}")
def ai_analyze(ticket_id: int, db: Session = Depends(get_db)):
    """Ticket'ı OpenAI ile analiz et; ai_category ve ai_reply alanlarını güncelle."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    category, reply = analyze_with_openai(ticket.subject, ticket.body)
    ticket.ai_category = category
    ticket.ai_reply = reply
    db.commit()
    db.refresh(ticket)
    return {"ai_category": category, "ai_reply": reply}


@router.post("/send-reply/{ticket_id}")
def ai_send_reply(ticket_id: int, body: SendReplyBody, db: Session = Depends(get_db)):
    """Önerilen cevabı gönderildi olarak işaretle; sent_reply kaydet."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.sent_reply = body.reply_text
    ticket.reply_sent = 1
    db.commit()
    db.refresh(ticket)
    return {"ok": True, "message": "Reply marked as sent"}
