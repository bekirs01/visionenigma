"""Add UNIQUE constraint on tickets.external_id for email dedup (Message-ID).

Revision ID: 005
Revises: 004
Create Date: 2026-02-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name
    if dialect == "postgresql":
        # Partial unique index: only non-null external_id must be unique (dedup emails).
        op.create_index(
            "ix_tickets_external_id_unique",
            "tickets",
            ["external_id"],
            unique=True,
            postgresql_where=sa.text("external_id IS NOT NULL"),
        )
    elif dialect == "sqlite":
        # SQLite: simple unique index (multiple NULLs allowed by SQLite semantics).
        op.create_index(
            "ix_tickets_external_id_unique",
            "tickets",
            ["external_id"],
            unique=True,
        )


def downgrade() -> None:
    op.drop_index("ix_tickets_external_id_unique", table_name="tickets")
