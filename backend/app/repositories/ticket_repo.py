from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models import Ticket


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
            q = q.filter(Ticket.status == status)
        if category_id is not None:
            q = q.filter(Ticket.category_id == category_id)
        return q.order_by(Ticket.created_at.desc()).offset(offset).limit(limit).all()
