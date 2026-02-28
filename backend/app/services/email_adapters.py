"""
Email integration: interfaces and implementations.
- EmailFetcher: fetch new messages (IMAP).
- EmailSender: send reply (SMTP).
"""
import imaplib
import email
import ssl
from email.header import decode_header
from email.utils import parseaddr, parsedate_to_datetime
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
import re


# Фильтры для пропуска системных/спам писем
BLOCKED_SENDERS = [
    "noreply@",
    "no-reply@",
    "mailer-daemon@",
    "postmaster@",
    "donotreply@",
    "notifications@",
    "alert@",
    "alerts@",
    "security@google",
    "accounts.google.com",
    "googlemail.com",
    "facebookmail.com",
    "twitter.com",
    "linkedin.com",
    "newsletter@",
    "marketing@",
    "promo@",
    "spam@",
    "bounce@",
    "daemon@",
]

BLOCKED_SUBJECTS = [
    "security alert",
    "password reset",
    "verify your email",
    "confirm your email",
    "sign-in attempt",
    "suspicious activity",
    "unsubscribe",
    "newsletter",
    "подтверждение почты",
    "подтвердите email",
    "сброс пароля",
    "оповещение безопасности",
    "подозрительная активность",
]


def is_email_filtered(sender_email: str, subject: str) -> bool:
    """Проверяет, нужно ли пропустить это письмо (системное/спам)."""
    sender_lower = (sender_email or "").lower()
    subject_lower = (subject or "").lower()

    # Проверка отправителя
    for blocked in BLOCKED_SENDERS:
        if blocked in sender_lower:
            return True

    # Проверка темы
    for blocked in BLOCKED_SUBJECTS:
        if blocked in subject_lower:
            return True

    return False


@dataclass
class RawEmailMessage:
    """Сырое email сообщение из IMAP."""
    message_id: str
    subject: str
    body: str
    sender_email: str
    sender_name: Optional[str]
    received_at: Optional[datetime]
    uid: Optional[str] = None  # UID для пометки как прочитанное


class EmailFetcher(ABC):
    @abstractmethod
    def fetch_new_messages(self) -> List[RawEmailMessage]:
        pass


class EmailSender(ABC):
    @abstractmethod
    def send_reply(self, to_email: str, subject: str, body: str, in_reply_to: Optional[str] = None) -> bool:
        pass


class MockEmailFetcher(EmailFetcher):
    """Returns empty list. For MVP no real fetch."""

    def fetch_new_messages(self) -> List[RawEmailMessage]:
        return []


class MockEmailSender(EmailSender):
    """Logs only. Does not send real email."""

    def send_reply(self, to_email: str, subject: str, body: str, in_reply_to: Optional[str] = None) -> bool:
        print(f"[MockEmailSender] Would send to {to_email}: {subject}")
        return True


class ImapEmailFetcher(EmailFetcher):
    """
    IMAP email fetcher для получения новых писем.

    Поддерживает:
    - SSL соединение (порт 993) с правильным SSL контекстом
    - Получение непрочитанных писем
    - Фильтрация системных/спам писем
    - Парсинг темы, тела, отправителя
    - Пометка писем как прочитанных
    """

    def __init__(self, host: str, port: int, user: str, password: str, folder: str = "INBOX"):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.folder = folder

    def fetch_new_messages(self) -> List[RawEmailMessage]:
        """
        Получает все непрочитанные письма из папки.
        Автоматически фильтрует системные/спам письма.

        Returns:
            Список RawEmailMessage (только реальные письма от клиентов)
        """
        messages = []
        filtered_count = 0
        mail = None

        try:
            # Создаём SSL контекст
            context = ssl.create_default_context()

            # Пробуем подключиться
            try:
                mail = imaplib.IMAP4_SSL(self.host, self.port, ssl_context=context)
            except (ssl.SSLError, OSError):
                # Пробуем без строгой проверки SSL
                context = ssl.create_default_context()
                context.check_hostname = False
                context.verify_mode = ssl.CERT_NONE
                mail = imaplib.IMAP4_SSL(self.host, self.port, ssl_context=context)

            mail.login(self.user, self.password)
            mail.select(self.folder)

            # Ищем непрочитанные письма
            status, msg_ids = mail.search(None, "UNSEEN")

            if status != "OK" or not msg_ids[0]:
                mail.logout()
                return []

            # Получаем каждое письмо
            for num in msg_ids[0].split():
                try:
                    status, data = mail.fetch(num, "(RFC822)")
                    if status != "OK":
                        continue

                    raw_email = data[0][1]
                    msg = email.message_from_bytes(raw_email)

                    # Парсим заголовки
                    subject = self._decode_header(msg["Subject"])
                    sender_name, sender_email = self._parse_sender(msg["From"])
                    message_id = msg["Message-ID"] or f"msg-{num.decode()}"

                    # ФИЛЬТРАЦИЯ: пропускаем системные/спам письма (логируем без PII)
                    if is_email_filtered(sender_email, subject):
                        print("[IMAP] Пропущено (фильтр): отправитель/тема в блок-листе")
                        mail.store(num, "+FLAGS", "\\Seen")
                        filtered_count += 1
                        continue

                    # Парсим дату
                    received_at = None
                    if msg["Date"]:
                        try:
                            received_at = parsedate_to_datetime(msg["Date"])
                        except:
                            pass

                    # Парсим тело письма
                    body = self._get_body(msg)

                    messages.append(RawEmailMessage(
                        message_id=message_id,
                        subject=subject,
                        body=body,
                        sender_email=sender_email,
                        sender_name=sender_name,
                        received_at=received_at,
                        uid=num.decode()
                    ))

                    # Помечаем как прочитанное
                    mail.store(num, "+FLAGS", "\\Seen")

                except Exception as e:
                    print(f"[IMAP] Ошибка обработки письма {num}: {e}")
                    continue

            mail.logout()

        except Exception as e:
            print(f"[IMAP] Ошибка подключения: {e}")
            raise

        print(f"[IMAP] Получено {len(messages)} новых писем (отфильтровано: {filtered_count})")
        return messages

    def _decode_header(self, header: Optional[str]) -> str:
        """Декодирует заголовок письма (может быть в разных кодировках)."""
        if not header:
            return ""

        decoded_parts = []
        for part, encoding in decode_header(header):
            if isinstance(part, bytes):
                decoded_parts.append(part.decode(encoding or "utf-8", errors="replace"))
            else:
                decoded_parts.append(part)

        return " ".join(decoded_parts)

    def _parse_sender(self, from_header: Optional[str]) -> Tuple[Optional[str], str]:
        """Парсит заголовок From: извлекает имя и email."""
        if not from_header:
            return None, ""

        decoded_from = self._decode_header(from_header)
        name, email_addr = parseaddr(decoded_from)

        return name if name else None, email_addr

    def _get_body(self, msg: email.message.Message) -> str:
        """Извлекает текстовое тело письма."""
        body = ""

        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition"))

                # Пропускаем вложения
                if "attachment" in content_disposition:
                    continue

                if content_type == "text/plain":
                    try:
                        payload = part.get_payload(decode=True)
                        charset = part.get_content_charset() or "utf-8"
                        body = payload.decode(charset, errors="replace")
                        break  # Берём первую текстовую часть
                    except:
                        pass

                elif content_type == "text/html" and not body:
                    try:
                        payload = part.get_payload(decode=True)
                        charset = part.get_content_charset() or "utf-8"
                        html_body = payload.decode(charset, errors="replace")
                        # Простая очистка HTML
                        body = self._strip_html(html_body)
                    except:
                        pass
        else:
            try:
                payload = msg.get_payload(decode=True)
                charset = msg.get_content_charset() or "utf-8"
                body = payload.decode(charset, errors="replace")

                if msg.get_content_type() == "text/html":
                    body = self._strip_html(body)
            except:
                body = str(msg.get_payload())

        return body.strip()

    def _strip_html(self, html: str) -> str:
        """Простая очистка HTML тегов."""
        # Убираем script и style
        html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
        # Заменяем br и p на переносы
        html = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
        html = re.sub(r"</p>", "\n\n", html, flags=re.IGNORECASE)
        # Убираем все остальные теги
        html = re.sub(r"<[^>]+>", "", html)
        # Декодируем HTML entities
        html = html.replace("&nbsp;", " ")
        html = html.replace("&lt;", "<")
        html = html.replace("&gt;", ">")
        html = html.replace("&amp;", "&")
        html = html.replace("&quot;", '"')
        # Убираем лишние пробелы и переносы
        html = re.sub(r"\n{3,}", "\n\n", html)
        html = re.sub(r" +", " ", html)
        return html.strip()


class SmtpEmailSender(EmailSender):
    """Stub. Используйте smtp_service.py для отправки."""

    def __init__(self, host: str, port: int, user: str, password: str):
        self.host = host
        self.port = port
        self.user = user
        self.password = password

    def send_reply(self, to_email: str, subject: str, body: str, in_reply_to: Optional[str] = None) -> bool:
        # Используем smtp_service для отправки
        from app.services.smtp_service import send_email
        ok, _, _ = send_email(to_email, subject, body)
        return ok
