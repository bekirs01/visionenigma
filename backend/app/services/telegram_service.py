"""
Telegram acil bildirim: Негативная tonality veya «Требуется оператор» ticket'larda tek seferlik mesaj.
Token/chat_id sadece env'den; log'larda asla yazılmaz.
"""
import logging
import time
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING

import httpx

from app.config import get_settings

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Telegram API rate limit (429) için tek retry (2 sn)
RETRY_DELAY_SEC = 2.0


def _should_notify_telegram(sentiment: Optional[str], operator_required: bool) -> bool:
    """Тональность негативная VEYA Требуется оператор => bildirim gerekir."""
    if (sentiment or "").lower() == "negative":
        return True
    if operator_required:
        return True
    return False


def should_send_telegram_alert(
    sentiment: Optional[str],
    operator_required: bool,
    telegram_notified_at: Optional[object],
) -> bool:
    """
    Telegram bildirimi gönderilmeli mi?
    Koşul: (negatif VEYA operator_required) VE daha önce bildirim atılmamış.
    """
    if telegram_notified_at is not None:
        return False
    return _should_notify_telegram(sentiment, operator_required)


def send_telegram_alert(
    *,
    ticket_id: int,
    link: str,
    from_email: Optional[str] = None,
    from_name: Optional[str] = None,
    subject: Optional[str] = None,
    body_preview: Optional[str] = None,
    summary: Optional[str] = None,
    tonality: Optional[str] = None,
    category: Optional[str] = None,
    operator_required: bool = False,
) -> bool:
    """
    Telegram'a acil destek mesajı gönderir (Rusça format).
    Hata durumunda ticket akışını kesmez; sadece loglar. 429'da bir kez retry (2 sn).
    Returns:
        True gönderim başarılı, False değil (ayarlar kapalı, hata, vb.).
    """
    settings = get_settings()
    if not getattr(settings, "telegram_enabled", True):
        return False
    token = (getattr(settings, "telegram_bot_token", None) or "").strip()
    chat_id = (getattr(settings, "telegram_chat_id", None) or "").strip()
    if not token or not chat_id:
        logger.warning(
            "TELEGRAM_CHAT_ID missing (or TELEGRAM_BOT_TOKEN), skipping Telegram alert."
        )
        return False

    tonality_label = (tonality or "").lower()
    if tonality_label == "negative":
        tonality_display = "Негативная"
    elif tonality_label == "positive":
        tonality_display = "Позитивная"
    else:
        tonality_display = tonality or "—"

    from_display = (from_name or from_email or "—").strip()
    if from_email and from_display == from_email:
        from_display = from_email
    elif from_email:
        from_display = f"{from_name or '—'} ({from_email})"

    body_trunc = (body_preview or "")[:200].strip() if body_preview else "—"
    if body_trunc and body_trunc != "—":
        body_trunc = body_trunc.replace("<", " ").replace(">", " ")

    lines = [
        "🚨 <b>Срочное обращение (нужен оператор)</b>",
        "",
        f"<b>Тикет ID:</b> {ticket_id}",
        f"<b>Ссылка:</b> {link}",
        f"<b>От:</b> {from_display}",
        f"<b>Тональность:</b> {tonality_display}",
        f"<b>Категория:</b> {(category or '—').strip() or '—'}",
        f"<b>Кратко:</b> {(summary or '—').strip()[:400] or '—'}",
        f"<b>Текст:</b> {body_trunc}",
        "",
        "Откройте тикет и ответьте как можно скорее.",
    ]
    text = "\n".join(lines)

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    for attempt in range(2):
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.post(url, json=payload)
            if resp.status_code == 200:
                return True
            if resp.status_code == 429 and attempt == 0:
                time.sleep(RETRY_DELAY_SEC)
                continue
            logger.warning(
                "Telegram gönderimi başarısız: status=%s body=%s",
                resp.status_code,
                (resp.text or "")[:200],
            )
            return False
        except Exception as e:
            logger.warning("Telegram gönderimi hata: %s", str(e)[:200], exc_info=False)
            return False
    return False


def maybe_send_telegram_alert(db: "Session", ticket) -> bool:
    """
    Tek ortak nokta: koşul sağlanıyorsa (negatif veya Требуется оператор), daha önce
    bildirim atılmadıysa ve TELEGRAM_CHAT_ID doluysa Telegram'a mesaj atar; başarıda
    telegram_notified_at set edilir. Hata ticket akışını bozmaz (try/catch dışarıda).
    """
    if not should_send_telegram_alert(
        ticket.sentiment,
        getattr(ticket, "operator_required", False),
        getattr(ticket, "telegram_notified_at", None),
    ):
        return False

    settings = get_settings()
    base_url = (getattr(settings, "telegram_app_url", None) or "").rstrip("/") or "http://localhost:3000"
    link = f"{base_url}/tickets/{ticket.id}"

    category = getattr(ticket, "request_category", None) or getattr(ticket, "ai_category", None)
    category_str = (category or "").strip() or None

    sent = send_telegram_alert(
        ticket_id=ticket.id,
        link=link,
        from_email=getattr(ticket, "sender_email", None),
        from_name=getattr(ticket, "sender_name", None),
        subject=getattr(ticket, "subject", None),
        body_preview=getattr(ticket, "body", None),
        summary=getattr(ticket, "issue_summary", None),
        tonality=getattr(ticket, "sentiment", None),
        category=category_str,
        operator_required=getattr(ticket, "operator_required", False),
    )
    if sent:
        ticket.telegram_notified_at = datetime.now(timezone.utc)
        db.commit()
        return True
    return False
