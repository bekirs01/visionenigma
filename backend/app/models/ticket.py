from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base
import enum


class TicketStatus(str, enum.Enum):
    new = "new"
    in_progress = "in_progress"
    answered = "answered"
    closed = "closed"


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
    status = Column(String(50), nullable=False, default="new", index=True)
    priority = Column(String(50), nullable=False, default="medium", index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True, index=True)
    source = Column(String(50), nullable=False, default="manual", index=True)
    received_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="tickets")
    messages = relationship("Message", back_populates="ticket", cascade="all, delete-orphan")
    ai_analyses = relationship("AiAnalysis", back_populates="ticket", cascade="all, delete-orphan")
