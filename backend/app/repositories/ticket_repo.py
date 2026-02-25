from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models import Ticket


# Маппинг новых статусов на legacy статусы для обратной совместимости
STATUS_MAPPING = {
    "not_completed": ["not_completed", "new", "in_progress"],
    "completed": ["completed", "answered", "closed"],
}


class TicketRepository:
    @staticmethod
    def get_list(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        category_id: Optional[int] = None,
        client_token: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Ticket]:
        q = db.query(Ticket)
        if client_token is not None:
            q = q.filter(Ticket.client_token == client_token)
        if search:
            term = f"%{search}%"
            q = q.filter(
                or_(
                    Ticket.subject.ilike(term),
                    Ticket.sender_email.ilike(term),
                    Ticket.body.ilike(term),
                )
            )
        if status:
            # Используем маппинг для фильтрации по группе статусов
            statuses = STATUS_MAPPING.get(status, [status])
            q = q.filter(Ticket.status.in_(statuses))
        if category_id is not None:
            q = q.filter(Ticket.category_id == category_id)
        return q.order_by(Ticket.created_at.desc()).offset(offset).limit(limit).all()
