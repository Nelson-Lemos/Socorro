"""orcamento (quote) workflow fields

Revision ID: 003_orcamento
Revises: 002_ux_matching
Create Date: 2026-09-19
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "003_orcamento"
down_revision: Union[str, None] = "002_ux_matching"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "pedidos",
        sa.Column("orcamento_itens", sa.JSON, nullable=True),
    )
    op.add_column(
        "pedidos",
        sa.Column("orcamento_status", sa.String(20), nullable=False, server_default="nao_enviado"),
    )
    op.add_column(
        "pedidos",
        sa.Column("orcamento_nota", sa.Text, nullable=True),
    )
    op.add_column(
        "pedidos",
        sa.Column("orcamento_enviado_em", sa.DateTime, nullable=True),
    )
    op.add_column(
        "pedidos",
        sa.Column("orcamento_aprovado_em", sa.DateTime, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pedidos", "orcamento_aprovado_em")
    op.drop_column("pedidos", "orcamento_enviado_em")
    op.drop_column("pedidos", "orcamento_nota")
    op.drop_column("pedidos", "orcamento_status")
    op.drop_column("pedidos", "orcamento_itens")