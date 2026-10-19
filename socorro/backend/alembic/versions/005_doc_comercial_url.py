"""add doc_comercial_url to users

Revision ID: 005_doc_comercial_url
Revises: 004_empresa_registro
Create Date: 2026-09-20
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "005_doc_comercial_url"
down_revision: Union[str, None] = "004_empresa_registro"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("doc_comercial_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "doc_comercial_url")