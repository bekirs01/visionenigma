from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False, index=True)
    direction = Column(String(20), nullable=False)  # inbound, outbound
    channel = Column(String(20), nullable=False)  # email, manual, system
    raw_text = Column(Text, nullable=True)
    parsed_text = Column(Text, nullable=False)
    subject = Column(String(500), nullable=True)
    sender_email = Column(String(255), nullable=True)
    recipient_email = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    ticket = relationship("Ticket", back_populates="messages")
