"""Добавляет колонки operator_required и operator_reason для отметки «Требуется оператор»

Revision ID: 004
Revises: 003
Create Date: 2026-02-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(conn, table: str, column: str) -> bool:
    r = conn.execute(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ),
        {"t": table, "c": column},
    )
    return r.scalar() is not None


def upgrade() -> None:
    conn = op.get_bind()
    if not _column_exists(conn, "tickets", "operator_required"):
        op.add_column("tickets", sa.Column("operator_required", sa.Boolean(), nullable=False, server_default=sa.false()))
    if not _column_exists(conn, "tickets", "operator_reason"):
        op.add_column("tickets", sa.Column("operator_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    if _column_exists(conn, "tickets", "operator_reason"):
        op.drop_column("tickets", "operator_reason")
    if _column_exists(conn, "tickets", "operator_required"):
        op.drop_column("tickets", "operator_required")
