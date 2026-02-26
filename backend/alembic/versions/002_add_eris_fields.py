"""Add ERIS case fields: parsed data from emails

Revision ID: 002
Revises: 001
Create Date: 2026-02-25

Поля для кейса ЭРИС (газоанализаторы):
- sender_full_name: ФИО отправителя (извлечённое AI)
- object_name: Название предприятия/объекта
- sender_phone: Контактный телефон
- serial_numbers: Заводские номера приборов (JSON массив)
- device_type: Модель или тип устройства
- sentiment: Эмоциональный окрас (positive/neutral/negative)
- issue_summary: Краткое описание проблемы
- request_category: Классификация запроса
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Добавляем поля для извлечённых данных из писем
    op.add_column("tickets", sa.Column("sender_full_name", sa.String(255), nullable=True))
    op.add_column("tickets", sa.Column("object_name", sa.String(500), nullable=True))
    op.add_column("tickets", sa.Column("sender_phone", sa.String(50), nullable=True))
    op.add_column("tickets", sa.Column("serial_numbers", sa.Text(), nullable=True))  # JSON array
    op.add_column("tickets", sa.Column("device_type", sa.String(255), nullable=True))
    op.add_column("tickets", sa.Column("sentiment", sa.String(20), nullable=True))  # positive/neutral/negative
    op.add_column("tickets", sa.Column("issue_summary", sa.Text(), nullable=True))
    op.add_column("tickets", sa.Column("request_category", sa.String(100), nullable=True))

    # Добавляем также поле client_token если его нет (для совместимости)
    # op.add_column("tickets", sa.Column("client_token", sa.String(64), nullable=True))
    # op.create_index("ix_tickets_client_token", "tickets", ["client_token"])

    # Индексы для часто используемых полей
    op.create_index("ix_tickets_sentiment", "tickets", ["sentiment"])
    op.create_index("ix_tickets_request_category", "tickets", ["request_category"])
    op.create_index("ix_tickets_device_type", "tickets", ["device_type"])


def downgrade() -> None:
    op.drop_index("ix_tickets_device_type", table_name="tickets")
    op.drop_index("ix_tickets_request_category", table_name="tickets")
    op.drop_index("ix_tickets_sentiment", table_name="tickets")

    op.drop_column("tickets", "request_category")
    op.drop_column("tickets", "issue_summary")
    op.drop_column("tickets", "sentiment")
    op.drop_column("tickets", "device_type")
    op.drop_column("tickets", "serial_numbers")
    op.drop_column("tickets", "sender_phone")
    op.drop_column("tickets", "object_name")
    op.drop_column("tickets", "sender_full_name")
