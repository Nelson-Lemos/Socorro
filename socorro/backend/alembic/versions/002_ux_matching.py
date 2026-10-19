"""ux matching and geolocation fields

Revision ID: 002_ux_matching
Revises: 001_initial
Create Date: 2026-09-18
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_ux_matching"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("status_atendimento", sa.String(20), nullable=True, server_default="online"),
    )
    op.add_column(
        "users",
        sa.Column("especialidades", sa.Text, nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("anos_experiencia", sa.Integer, nullable=True),
    )
    op.add_column(
        "pedidos",
        sa.Column("referencia", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pedidos", "referencia")
    op.drop_column("users", "anos_experiencia")
    op.drop_column("users", "especialidades")
    op.drop_column("users", "status_atendimento")