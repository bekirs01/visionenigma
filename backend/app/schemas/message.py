from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class MessageCreate(BaseModel):
    ticket_id: int
    direction: str
    channel: str
    parsed_text: str
    raw_text: Optional[str] = None
    subject: Optional[str] = None
    sender_email: Optional[str] = None
    recipient_email: Optional[str] = None


class MessageRead(BaseModel):
    id: int
    ticket_id: int
    direction: str
    channel: str
    parsed_text: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
