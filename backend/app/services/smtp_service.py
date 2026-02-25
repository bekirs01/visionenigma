"""Отправка email через SMTP. Ключи из env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM."""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple, Optional
from app.config import get_settings


def send_email(to: str, subject: str, body_plain: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Отправляет письмо. Возвращает (success, message_id_or_none, error_message).
    """
    s = get_settings()
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
            with smtplib.SMTP_SSL(s.smtp_host, port) as server:
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
