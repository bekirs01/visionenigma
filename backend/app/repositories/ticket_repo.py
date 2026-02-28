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


def _is_answered_filter():
    """Тикет считается «cevaplanmış»: status=completed veya reply_sent=1 veya reply_sent_at dolu."""
    return or_(
        Ticket.status == "completed",
        Ticket.reply_sent == 1,
        Ticket.reply_sent_at.isnot(None),
    )


def _apply_filters(
    q,
    *,
    client_token: Optional[str] = None,
    sender_email: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    category_id: Optional[int] = None,
    request_category: Optional[str] = None,
    view: Optional[str] = None,
):
    if client_token is not None:
        q = q.filter(Ticket.client_token == client_token)
    if sender_email is not None and sender_email.strip():
        q = q.filter(Ticket.sender_email.ilike(sender_email.strip()))
    if search:
        term = f"%{search}%"
        q = q.filter(or_(Ticket.subject.ilike(term), Ticket.sender_email.ilike(term), Ticket.body.ilike(term)))
    if status:
        statuses = STATUS_MAPPING.get(status, [status])
        q = q.filter(Ticket.status.in_(statuses))
    if category_id is not None:
        q = q.filter(Ticket.category_id == category_id)
    if request_category:
        req_cat = request_category.strip() if request_category.strip() in ALLOWED_CATEGORIES else "другое"
        q = q.filter(Ticket.request_category == req_cat)
    if view == "answered":
        q = q.filter(_is_answered_filter())
    elif view == "open":
        q = q.filter(~_is_answered_filter())
    return q


class TicketRepository:
    @staticmethod
    def get_count(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        category_id: Optional[int] = None,
        request_category: Optional[str] = None,
        client_token: Optional[str] = None,
        sender_email: Optional[str] = None,
        view: Optional[str] = None,
    ) -> int:
        q = db.query(Ticket)
        q = _apply_filters(q, client_token=client_token, sender_email=sender_email, search=search, status=status, category_id=category_id, request_category=request_category, view=view)
        return q.count()

    @staticmethod
    def get_list(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        category_id: Optional[int] = None,
        request_category: Optional[str] = None,
        client_token: Optional[str] = None,
        sender_email: Optional[str] = None,
        view: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Ticket]:
        q = db.query(Ticket)
        q = _apply_filters(q, client_token=client_token, sender_email=sender_email, search=search, status=status, category_id=category_id, request_category=request_category, view=view)
        if view == "answered":
            q = q.order_by(Ticket.reply_sent_at.desc(), Ticket.completed_at.desc(), Ticket.created_at.desc())
        else:
            q = q.order_by(Ticket.created_at.desc())
        return q.offset(offset).limit(limit).all()
