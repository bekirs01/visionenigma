"""
Сервис автоматической очистки завершённых тикетов.
Удаляет тикеты со статусом "completed" через 5 минут после завершения.
"""
import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import Ticket

# Время жизни завершённого тикета (в минутах)
COMPLETED_TICKET_LIFETIME_MINUTES = 5

# Интервал проверки (в секундах)
CLEANUP_INTERVAL_SECONDS = 60


async def cleanup_completed_tickets():
    """
    Удаляет тикеты со статусом 'completed', у которых completed_at старше 5 минут.
    """
    db: Session = SessionLocal()
    try:
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=COMPLETED_TICKET_LIFETIME_MINUTES)

        # Находим тикеты для удаления
        tickets_to_delete = db.query(Ticket).filter(
            Ticket.status == "completed",
            Ticket.completed_at.isnot(None),
            Ticket.completed_at < cutoff_time
        ).all()

        if tickets_to_delete:
            deleted_ids = [t.id for t in tickets_to_delete]
            for ticket in tickets_to_delete:
                db.delete(ticket)
            db.commit()
            print(f"[Cleanup] Удалено {len(deleted_ids)} завершённых тикетов: {deleted_ids}")

    except Exception as e:
        print(f"[Cleanup] Ошибка очистки тикетов: {e}")
        db.rollback()
    finally:
        db.close()


async def start_cleanup_scheduler():
    """
    Запускает периодическую задачу очистки тикетов.
    """
    print(f"[Cleanup] Запуск планировщика очистки (интервал: {CLEANUP_INTERVAL_SECONDS}с, TTL: {COMPLETED_TICKET_LIFETIME_MINUTES}мин)")
    while True:
        await cleanup_completed_tickets()
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
