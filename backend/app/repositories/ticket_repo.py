from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models import Ticket
from app.services.openai_service import ALLOWED_CATEGORIES


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
        request_category: Optional[str] = None,
        client_token: Optional[str] = None,
        sender_email: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Ticket]:
        q = db.query(Ticket)
        if client_token is not None:
            q = q.filter(Ticket.client_token == client_token)
        if sender_email is not None and sender_email.strip():
            q = q.filter(Ticket.sender_email.ilike(sender_email.strip()))
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
        if request_category:
            req_cat = request_category.strip() if request_category.strip() in ALLOWED_CATEGORIES else "другое"
            q = q.filter(Ticket.request_category == req_cat)
        return q.order_by(Ticket.created_at.desc()).offset(offset).limit(limit).all()
