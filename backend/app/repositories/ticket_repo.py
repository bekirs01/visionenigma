from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, case, func
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
    def get_request_categories(
        db: Session,
        *,
        search: Optional[str] = None,
        status: Optional[str] = None,
        category_id: Optional[int] = None,
        view: Optional[str] = None,
    ) -> List[str]:
        """
        Distinct request_category values for the current filtered list.
        Normalizes null/empty/unknown values to 'другое' to match backend filtering logic.
        """
        q = db.query(Ticket)
        q = _apply_filters(
            q,
            search=search,
            status=status,
            category_id=category_id,
            request_category=None,
            client_token=None,
            sender_email=None,
            view=view,
        )

        trimmed = func.trim(Ticket.request_category)
        normalized = case(
            (Ticket.request_category.is_(None), "другое"),
            (func.length(trimmed) == 0, "другое"),
            (trimmed.in_(ALLOWED_CATEGORIES), trimmed),
            else_="другое",
        ).label("request_category")

        rows = q.with_entities(normalized).distinct().order_by(normalized.asc()).all()
        return [r[0] for r in rows if r and r[0]]

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
        sort: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Ticket]:
        q = db.query(Ticket)
        q = _apply_filters(q, client_token=client_token, sender_email=sender_email, search=search, status=status, category_id=category_id, request_category=request_category, view=view)
        sort_val = (sort or "").strip()

        # Priority sort is used for "open" view in admin panel.
        # Keep "answered" archive ordering stable unless explicitly needed.
        if sort_val == "priority" and view != "answered":
            priority_group = case(
                (Ticket.operator_required.is_(True), 0),
                (Ticket.sentiment == "negative", 1),
                else_=2,
            )
            q = q.order_by(priority_group.asc(), Ticket.created_at.desc())
        elif view == "answered":
            q = q.order_by(Ticket.reply_sent_at.desc(), Ticket.completed_at.desc(), Ticket.created_at.desc())
        else:
            if sort_val in ("created_at_asc", "created_asc"):
                q = q.order_by(Ticket.created_at.asc())
            else:
                # default: newest first
                q = q.order_by(Ticket.created_at.desc())
        return q.offset(offset).limit(limit).all()
