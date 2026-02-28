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
from app.services.telegram_service import maybe_send_telegram_alert
from app.services.attachment_storage import save_attachment
from app.services.attachment_extract import extract_text_from_attachment
from app.models import Ticket, TicketAttachment
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

        # 2.5. Обработка вложений: сохранение, запись в БД, извлечение текста для AI
        attachments_summary_parts = []
        extracted_text_parts = []
        if getattr(msg, "attachments", None) and msg.attachments:
            for att in msg.attachments:
                try:
                    storage_path = save_attachment(ticket.id, att.filename, att.data)
                    size_bytes = len(att.data)
                    self.db.add(TicketAttachment(
                        ticket_id=ticket.id,
                        filename=att.filename,
                        mime_type=att.mime_type,
                        size_bytes=size_bytes,
                        storage_path=storage_path,
                    ))
                    attachments_summary_parts.append(f"{att.filename} ({att.mime_type}, {size_bytes} bytes)")
                    success, text_or_note = extract_text_from_attachment(att.filename, att.mime_type, att.data)
                    if success and (text_or_note or "").strip():
                        extracted_text_parts.append(f"[{att.filename}]:\n{text_or_note.strip()}")
                    elif not success and text_or_note:
                        extracted_text_parts.append(f"[{att.filename}]: {text_or_note}")
                except Exception as e:
                    print(f"[EmailProcessor] Ошибка обработки вложения {getattr(att, 'filename', '?')}: {e}")
                    attachments_summary_parts.append(f"{getattr(att, 'filename', 'attachment')} (ошибка сохранения)")
            self.db.commit()
        attachments_summary = "; ".join(attachments_summary_parts) if attachments_summary_parts else ""
        attachments_extracted_text = "\n\n---\n\n".join(extracted_text_parts) if extracted_text_parts else ""

        # Ticket'a ek metnini ve ai_status kaydet (background'da AI çalışacak)
        ticket.attachments_text = attachments_extracted_text if attachments_extracted_text else None
        ticket.ai_status = "pending"
        ticket.ai_error = None
        try:
            self.db.commit()
            self.db.refresh(ticket)
        except Exception:
            self.db.rollback()

        # 3. AI analizi request thread'inde değil background'da çalıştır (takılmayı önlemek için)
        if self.settings.openai_api_key:
            threading.Thread(target=_run_process_ticket_ai, args=(ticket.id,), daemon=True).start()
            print(f"[EmailProcessor] Тикет #{ticket.id}: AI анализ запущен в фоне")
        else:
            ticket.ai_status = "done"
            try:
                self.db.commit()
            except Exception:
                self.db.rollback()

        return {
            "status": "ok",
            "message_id": msg.message_id,
            "ticket_id": ticket.id,
            "subject": msg.subject,
            "sender": msg.sender_email
        }


def _run_process_ticket_ai(ticket_id: int) -> None:
    """
    Background'da çalışır: ticket için AI analizi yapar, ai_status=done/failed yazar.
    Takılma olmaması için request thread dışında çalışır; hata olursa ai_status=failed + ai_error.
    """
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return
        if getattr(ticket, "ai_status", None) != "pending":
            return
        # attachments_summary: DB'deki eklerden oluştur
        atts = db.query(TicketAttachment).filter(TicketAttachment.ticket_id == ticket_id).all()
        attachments_summary = "; ".join(
            f"{a.filename} ({a.mime_type}, {a.size_bytes or 0} bytes)" for a in atts
        )
        attachments_extracted_text = (ticket.attachments_text or "").strip()
        agent = AIAgent(db)
        result = agent.process_ticket(
            ticket,
            attachments_summary=attachments_summary,
            attachments_extracted_text=attachments_extracted_text,
        )
        agent.update_ticket_with_result(ticket, result)
        ticket.ai_status = "done"
        ticket.ai_error = None
        db.commit()
        print(f"[EmailProcessor] Тикет #{ticket_id}: AI анализ завершён (ai_status=done)")
        try:
            maybe_send_telegram_alert(db, ticket)
        except Exception as tg_err:
            print(f"[EmailProcessor] Telegram skip: {tg_err}")
    except Exception as e:
        err_msg = str(e)[:500]
        print(f"[EmailProcessor] Тикет #{ticket_id}: AI анализ ошибка — {err_msg}")
        try:
            ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
            if ticket:
                ticket.ai_status = "failed"
                ticket.ai_error = err_msg
                db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()
    return


def fetch_and_process_emails(db: Session) -> List[dict]:
    """Удобная функция для вызова из роутера или планировщика. Mutex: только один sync одновременно."""
    with _sync_lock:
        processor = EmailProcessor(db)
        return processor.process_new_emails()
