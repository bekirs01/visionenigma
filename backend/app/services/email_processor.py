"""
Сервис обработки входящих писем.
Объединяет IMAP fetch + создание тикета + AI анализ.
"""
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.services.email_adapters import ImapEmailFetcher, RawEmailMessage
from app.services.ai_agent import AIAgent
from app.models import Ticket
from app.config import get_settings
import json


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
                        "error": str(e)
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

        # 2. Создаём тикет
        ticket = Ticket(
            external_id=msg.message_id,
            sender_email=msg.sender_email,
            sender_name=msg.sender_name,
            subject=msg.subject,
            body=msg.body,
            status="new",
            priority="medium",
            source="email",
            received_at=msg.received_at or datetime.now(timezone.utc)
        )
        self.db.add(ticket)
        self.db.commit()
        self.db.refresh(ticket)

        print(f"[EmailProcessor] Создан тикет #{ticket.id} из письма {msg.message_id}")

        # 3. AI анализ (если настроен OpenAI)
        if self.settings.openai_api_key:
            try:
                agent = AIAgent(self.db)
                result = agent.process_ticket(ticket)
                agent.update_ticket_with_result(ticket, result)
                self.db.commit()
                print(f"[EmailProcessor] AI анализ тикета #{ticket.id} завершён")
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
    """Удобная функция для вызова из роутера или планировщика."""
    processor = EmailProcessor(db)
    return processor.process_new_emails()
