from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TicketBase(BaseModel):
    sender_email: str
    sender_name: Optional[str] = None
    subject: str
    body: str
    status: str = "new"
    priority: str = "medium"
    category_id: Optional[int] = None
    source: str = "manual"


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    category_id: Optional[int] = None
    subject: Optional[str] = None
    body: Optional[str] = None


class TicketRead(TicketBase):
    id: int
    external_id: Optional[str] = None
    received_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TicketListQuery(BaseModel):
    search: Optional[str] = None
    status: Optional[str] = None
    category_id: Optional[int] = None
    limit: int = 50
    offset: int = 0
