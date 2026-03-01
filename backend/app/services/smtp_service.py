"""Отправка email через SMTP. Ключи из env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM."""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple, Optional
import httpx
from app.config import get_settings


def send_email(to: str, subject: str, body_plain: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Отправляет письмо. Возвращает (success, message_id_or_none, error_message).
    """
    s = get_settings()
    # Prefer HTTP email provider on platforms where SMTP is blocked (e.g., Railway)
    if (getattr(s, "resend_api_key", "") or "").strip():
        from_addr = (getattr(s, "resend_from", "") or s.smtp_from or s.smtp_user or "").strip()
        if not from_addr:
            return False, None, "Не указан адрес отправителя (RESEND_FROM или SMTP_FROM/SMTP_USER)."
        try:
            resp = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {s.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": from_addr,
                    "to": [to],
                    "subject": subject,
                    "text": body_plain,
                },
                timeout=30.0,
            )
            if 200 <= resp.status_code < 300:
                try:
                    data = resp.json()
                    return True, data.get("id"), None
                except Exception:
                    return True, None, None
            # normalize error text
            err_text = ""
            try:
                j = resp.json()
                err_text = j.get("message") or j.get("error") or ""
            except Exception:
                err_text = (resp.text or "").strip()
            err_text = err_text[:300] if err_text else ""
            return False, None, f"Resend: HTTP {resp.status_code} {err_text}".strip()
        except Exception as e:
            return False, None, str(e)
    if not (s.smtp_host and s.smtp_host.strip()):
        return False, None, "SMTP не настроен: укажите SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM в переменных окружения."
    from_addr = (s.smtp_from or s.smtp_user or "").strip()
    if not from_addr:
        return False, None, "Не указан адрес отправителя (SMTP_FROM или SMTP_USER)."
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to
    msg.attach(MIMEText(body_plain, "plain", "utf-8"))
    try:
        port = s.smtp_port or 587
        if port == 465:
            # SSL соединение
            with smtplib.SMTP_SSL(s.smtp_host, port, timeout=30) as server:
                if s.smtp_user and s.smtp_pass:
                    server.login(s.smtp_user, s.smtp_pass)
                server.sendmail(from_addr, [to], msg.as_string())
        else:
            # STARTTLS соединение (порт 587)
            with smtplib.SMTP(s.smtp_host, port, timeout=30) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                if s.smtp_user and s.smtp_pass:
                    server.login(s.smtp_user, s.smtp_pass)
                server.sendmail(from_addr, [to], msg.as_string())
        msg_id = msg.get("Message-ID")
        return True, msg_id, None
    except Exception as e:
        return False, None, str(e)
