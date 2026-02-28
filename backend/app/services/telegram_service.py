"""
Telegram acil bildirim: negatif/urgent ticket'larda tek seferlik mesaj.
Token/chat_id sadece env'den; log'larda asla yazılmaz.
"""
import logging
import time
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# Telegram API rate limit (429) için tek retry
RETRY_DELAY_SEC = 1.8


def _should_notify_telegram(sentiment: Optional[str], priority: Optional[str]) -> bool:
    """Negatif tonality veya yüksek öncelik => bildirim gerekir."""
    if not sentiment and not priority:
        return False
    if (sentiment or "").lower() == "negative":
        return True
    p = (priority or "").lower()
    if p in ("high", "critical", "urgent", "acil"):
        return True
    return False


def should_send_telegram_alert(
    sentiment: Optional[str],
    priority: Optional[str],
    telegram_notified_at: Optional[object],
) -> bool:
    """
    Telegram bildirimi gönderilmeli mi?
    Koşul: (negatif VEYA acil) VE daha önce bildirim atılmamış.
    """
    if telegram_notified_at is not None:
        return False
    return _should_notify_telegram(sentiment, priority)


def send_telegram_alert(
    *,
    ticket_id: int,
    link: str,
    from_email: Optional[str] = None,
    subject: Optional[str] = None,
    summary: Optional[str] = None,
    tonality: Optional[str] = None,
    priority: Optional[str] = None,
) -> bool:
    """
    Telegram'a acil destek mesajı gönderir.
    Hata durumunda ticket akışını kesmez; sadece loglar. 429'da bir kez retry.
    Returns:
        True gönderim başarılı, False değil (ayarlar kapalı, hata, vb.).
    """
    settings = get_settings()
    if not getattr(settings, "telegram_enabled", True):
        return False
    token = (getattr(settings, "telegram_bot_token", None) or "").strip()
    chat_id = (getattr(settings, "telegram_chat_id", None) or "").strip()
    if not token or not chat_id:
        logger.debug("Telegram bildirimi atlanıyor: TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID yok.")
        return False

    tonality_label = (tonality or "").lower()
    if tonality_label == "negative":
        tonality_display = "Негативная"
    elif tonality_label == "positive":
        tonality_display = "Позитивная"
    else:
        tonality_display = tonality or "—"

    priority_display = (priority or "—").strip() or "—"
    lines = [
        "🚨 <b>Acil Destek Talebi</b>",
        "",
        f"<b>Ticket ID:</b> {ticket_id}",
        f"<b>Link:</b> {link}",
        f"<b>E-posta:</b> {from_email or '—'}",
        f"<b>Konu:</b> {(subject or '—')[:200]}",
        f"<b>Özet:</b> {(summary or '—')[:300]}",
        f"<b>Tonality:</b> {tonality_display}",
        f"<b>Öncelik:</b> {priority_display}",
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
