from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List
import json


class TicketBase(BaseModel):
    sender_email: str
    sender_name: Optional[str] = None
    subject: str
    body: str
    status: str = "not_completed"  # Статус по умолчанию: "Не завершён"
    priority: str = "medium"
    category_id: Optional[int] = None
    source: str = "manual"


class TicketCreate(TicketBase):
    client_token: Optional[str] = None
    # ЭРИС: дополнительные поля для формы
    sender_full_name: Optional[str] = None
    sender_phone: Optional[str] = None
    object_name: Optional[str] = None


class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    category_id: Optional[int] = None
    subject: Optional[str] = None
    body: Optional[str] = None


class TicketRead(TicketBase):
    id: int
    external_id: Optional[str] = None
    client_token: Optional[str] = None
    received_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    ai_category: Optional[str] = None
    ai_reply: Optional[str] = None
    reply_sent: bool = False
    sent_reply: Optional[str] = None
    reply_sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None  # Время завершения (для автоудаления)

    # ЭРИС: извлечённые данные из писем
    sender_full_name: Optional[str] = None
    object_name: Optional[str] = None
    sender_phone: Optional[str] = None
    serial_numbers: Optional[List[str]] = None  # Список заводских номеров
    device_type: Optional[str] = None
    sentiment: Optional[str] = None  # positive / neutral / negative
    issue_summary: Optional[str] = None
    request_category: Optional[str] = None

    class Config:
        from_attributes = True

    @field_validator("reply_sent", mode="before")
    @classmethod
    def coerce_reply_sent(cls, v: object) -> bool:
        if isinstance(v, bool):
            return v
        if v in (1, "1", True):
            return True
        return False

    @field_validator("serial_numbers", mode="before")
    @classmethod
    def parse_serial_numbers(cls, v: object) -> Optional[List[str]]:
        if v is None:
            return None
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
            # Если это строка через запятую
            return [s.strip() for s in v.split(",") if s.strip()]
        return None


class TicketListQuery(BaseModel):
    search: Optional[str] = None
    status: Optional[str] = None
    category_id: Optional[int] = None
    limit: int = 50
    offset: int = 0
