from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base
import enum


class TicketStatus(str, enum.Enum):
    not_completed = "not_completed"  # Не завершён
    completed = "completed"  # Завершён (после отправки ответа)


class TicketPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TicketSource(str, enum.Enum):
    manual = "manual"
    email = "email"
    import_ = "import"


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), nullable=True, index=True)
    sender_email = Column(String(255), nullable=False, index=True)
    sender_name = Column(String(255), nullable=True)
    subject = Column(String(500), nullable=False, index=True)
    body = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="not_completed", index=True)
    priority = Column(String(50), nullable=False, default="medium", index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)
    source = Column(String(50), nullable=False, default="manual", index=True)
    received_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    client_token = Column(String(64), nullable=True, index=True)
    ai_category = Column(String(100), nullable=True, index=True)
    ai_reply = Column(Text, nullable=True)
    reply_sent = Column(Integer, nullable=False, default=0)
    sent_reply = Column(Text, nullable=True)
    reply_sent_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)  # Время завершения для автоудаления

    # ЭРИС: извлечённые данные из писем (AI parsing)
    sender_full_name = Column(String(255), nullable=True)  # ФИО отправителя
    object_name = Column(String(500), nullable=True)  # Название предприятия/объекта
    sender_phone = Column(String(50), nullable=True)  # Контактный телефон
    serial_numbers = Column(Text, nullable=True)  # Заводские номера приборов (JSON)
    device_type = Column(String(255), nullable=True)  # Модель или тип устройства
    sentiment = Column(String(20), nullable=True, index=True)  # positive/neutral/negative
    issue_summary = Column(Text, nullable=True)  # Краткое описание проблемы
    request_category = Column(String(100), nullable=True, index=True)  # Классификация запроса

    # Требуется оператор (вмешательство специалиста)
    operator_required = Column(Boolean, nullable=False, default=False)
    operator_reason = Column(Text, nullable=True)

    # Устройство: desktop/mobile + краткий user-agent (только при создании с фронта)
    device_info = Column(Text, nullable=True)

    # Telegram: acil bildirim bir kez gönderildi mi (spam önleme)
    telegram_notified_at = Column(DateTime(timezone=True), nullable=True)

    # Eklerden çıkarılan metin (AI input için birleşik)
    attachments_text = Column(Text, nullable=True)
    # AI analiz durumu: pending | done | failed (takılı kalmayı önlemek için)
    ai_status = Column(String(20), nullable=False, default="pending", index=True)
    ai_error = Column(Text, nullable=True)  # failed ise kısa hata mesajı

    category = relationship("Category", back_populates="tickets")
    messages = relationship("Message", back_populates="ticket", cascade="all, delete-orphan")
    ai_analyses = relationship("AiAnalysis", back_populates="ticket", cascade="all, delete-orphan")
    attachments = relationship("TicketAttachment", back_populates="ticket", cascade="all, delete-orphan")
