"""
Сервис обработки входящих писем.
Объединяет IMAP fetch + создание тикета + AI анализ.
"""
import threading
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from sqlalchemy.exc import IntegrityError

# Один sync за раз (endpoint + background thread)
_sync_lock = threading.Lock()

from app.services.email_adapters import ImapEmailFetcher, RawEmailMessage
from app.services.ai_agent import AIAgent
from app.services.telegram_service import should_send_telegram_alert, send_telegram_alert
from app.models import Ticket
from app.config import get_settings


class EmailProcessor:
    """
    Обработчик входящих писем для техподдержки ЭРИС.

    Пайплайн:
    1. Получение новых писем через IMAP
    2. Создание тикета для каждого письма
    3. AI анализ письма (извлечение данных, категоризация, ответ)
    4. Обновление тикета результатами анализа
    """

    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()

    def process_new_emails(self) -> List[dict]:
        """
        Обрабатывает все новые письма из почтового ящика.

        Returns:
            Список результатов обработки [{ticket_id, status, message}]
        """
        results = []

        # Проверяем настройки IMAP
        if not all([
            self.settings.imap_host,
            self.settings.imap_user,
            self.settings.imap_pass
        ]):
            return [{"status": "error", "message": "IMAP не настроен. Укажите IMAP_HOST, IMAP_USER, IMAP_PASS в .env"}]

        try:
            # Получаем новые письма
            fetcher = ImapEmailFetcher(
                host=self.settings.imap_host,
                port=self.settings.imap_port or 993,
                user=self.settings.imap_user,
                password=self.settings.imap_pass
            )
            messages = fetcher.fetch_new_messages()

            if not messages:
                return [{"status": "ok", "message": "Новых писем нет"}]

            # Обрабатываем каждое письмо
            for msg in messages:
                try:
                    result = self._process_single_email(msg)
                    results.append(result)
                except Exception as e:
                    results.append({
                        "status": "error",
                        "message_id": msg.message_id,
                        "error": str(e)[:200],
                    })

        except Exception as e:
            return [{"status": "error", "message": f"Ошибка IMAP: {str(e)}"}]

        return results

    def _process_single_email(self, msg: RawEmailMessage) -> dict:
        """
        Обрабатывает одно письмо.

        Args:
            msg: RawEmailMessage из IMAP

        Returns:
            Результат обработки
        """
        # 1. Проверяем, не обрабатывали ли это письмо ранее
        existing = self.db.query(Ticket).filter(
            Ticket.external_id == msg.message_id
        ).first()

        if existing:
            return {
                "status": "skip",
                "message_id": msg.message_id,
                "ticket_id": existing.id,
                "message": "Письмо уже обработано"
            }

        # 2. Создаём тикет (reply_sent=0 чтобы гарантированно попадал в inbox / view=open)
        ticket = Ticket(
            external_id=msg.message_id,
            sender_email=msg.sender_email,
            sender_name=msg.sender_name,
            subject=msg.subject,
            body=msg.body,
            status="not_completed",
            priority="medium",
            source="email",
            reply_sent=0,
            reply_sent_at=None,
            received_at=msg.received_at or datetime.now(timezone.utc),
        )
        self.db.add(ticket)
        try:
            self.db.commit()
            self.db.refresh(ticket)
        except IntegrityError:
            self.db.rollback()
            existing = self.db.query(Ticket).filter(Ticket.external_id == msg.message_id).first()
            return {
                "status": "skip",
                "ticket_id": existing.id if existing else None,
                "message": "Письмо уже обработано (дубликат)",
            }

        print(f"[EmailProcessor] Создан тикет #{ticket.id} (source=email)")

        # 3. AI анализ (если настроен OpenAI)
        if self.settings.openai_api_key:
            try:
                agent = AIAgent(self.db)
                result = agent.process_ticket(ticket)
                agent.update_ticket_with_result(ticket, result)
                self.db.commit()
                self.db.refresh(ticket)
                print(f"[EmailProcessor] AI анализ тикета #{ticket.id} завершён")
                # Telegram: negatif/acil ise tek seferlik bildirim
                try:
                    if should_send_telegram_alert(
                        ticket.sentiment, ticket.priority, getattr(ticket, "telegram_notified_at", None)
                    ):
                        base_url = (getattr(self.settings, "telegram_app_url", None) or "").rstrip("/") or "http://localhost:3000"
                        link = f"{base_url}/tickets/{ticket.id}"
                        if send_telegram_alert(
                            ticket_id=ticket.id,
                            link=link,
                            from_email=ticket.sender_email,
                            subject=ticket.subject,
                            summary=ticket.issue_summary,
                            tonality=ticket.sentiment,
                            priority=ticket.priority,
                        ):
                            ticket.telegram_notified_at = datetime.now(timezone.utc)
                            self.db.commit()
                except Exception as tg_err:
                    print(f"[EmailProcessor] Telegram bildirimi atlama: {tg_err}")
            except Exception as e:
                print(f"[EmailProcessor] Ошибка AI анализа: {e}")
                # Продолжаем без AI анализа

        return {
            "status": "ok",
            "message_id": msg.message_id,
            "ticket_id": ticket.id,
            "subject": msg.subject,
            "sender": msg.sender_email
        }


def fetch_and_process_emails(db: Session) -> List[dict]:
    """Удобная функция для вызова из роутера или планировщика. Mutex: только один sync одновременно."""
    with _sync_lock:
        processor = EmailProcessor(db)
        return processor.process_new_emails()
