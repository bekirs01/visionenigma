"""
Сервис автоматической очистки завершённых тикетов.
Удаляет тикеты со статусом "completed" через 5 минут после завершения.
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import Ticket

# Время жизни завершённого тикета (в минутах)
COMPLETED_TICKET_LIFETIME_MINUTES = 5


def cleanup_completed_tickets_sync():
    """
    Синхронная версия: удаляет тикеты со статусом 'completed',
    у которых completed_at старше 5 минут.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        cutoff_time = now - timedelta(minutes=COMPLETED_TICKET_LIFETIME_MINUTES)

        # Находим все завершённые тикеты
        all_completed = db.query(Ticket).filter(
            Ticket.status == "completed"
        ).all()

        # Определяем какие удалить
        tickets_to_delete = []
        for ticket in all_completed:
            if ticket.completed_at:
                completed_at = ticket.completed_at
                if completed_at.tzinfo is None:
                    completed_at = completed_at.replace(tzinfo=timezone.utc)
                if completed_at < cutoff_time:
                    tickets_to_delete.append(ticket)

        if tickets_to_delete:
            deleted_ids = [t.id for t in tickets_to_delete]
            for ticket in tickets_to_delete:
                db.delete(ticket)
            db.commit()
            print(f"[Cleanup] Удалено {len(deleted_ids)} завершённых тикетов: {deleted_ids}", flush=True)
        elif all_completed:
            # Есть завершённые, но ещё не прошло 5 минут
            for t in all_completed:
                if t.completed_at:
                    completed_at = t.completed_at
                    if completed_at.tzinfo is None:
                        completed_at = completed_at.replace(tzinfo=timezone.utc)
                    remaining = (completed_at + timedelta(minutes=COMPLETED_TICKET_LIFETIME_MINUTES) - now).total_seconds()
                    if remaining > 0:
                        print(f"[Cleanup] Тикет #{t.id}: удаление через {int(remaining)}с", flush=True)

    except Exception as e:
        print(f"[Cleanup] Ошибка: {e}", flush=True)
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()
