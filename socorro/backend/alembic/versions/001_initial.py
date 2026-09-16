"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-07-24
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("nome", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("telefone", sa.String(20), unique=True, nullable=True, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("tipo_conta", sa.String(20), nullable=False, server_default="cidadao"),
        sa.Column("localizacao", sa.String(500), nullable=True),
        sa.Column("latitude", sa.Float, nullable=True),
        sa.Column("longitude", sa.Float, nullable=True),
        sa.Column("idade", sa.Integer, nullable=True),
        sa.Column("genero", sa.String(20), nullable=True),
        sa.Column("competencias", sa.Text, nullable=True),
        sa.Column("nif", sa.String(20), nullable=True),
        sa.Column("area_atuacao", sa.String(100), nullable=True),
        sa.Column("foto_perfil", sa.String(500), nullable=True),
        sa.Column("descricao", sa.Text, nullable=True),
        sa.Column("disponibilidade", sa.String(100), nullable=True),
        sa.Column("raio_atuacao", sa.Integer, server_default="10"),
        sa.Column("verificado", sa.Boolean, server_default="false"),
        sa.Column("email_verificado", sa.Boolean, server_default="false"),
        sa.Column("telefone_verificado", sa.Boolean, server_default="false"),
        sa.Column("ativo", sa.Boolean, server_default="true"),
        sa.Column("criado_em", sa.DateTime, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "documentos",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("tipo", sa.String(50), nullable=False),
        sa.Column("nome_ficheiro", sa.String(255), nullable=False),
        sa.Column("caminho", sa.String(500), nullable=False),
        sa.Column("status", sa.String(20), server_default="pendente"),
        sa.Column("verificado_por", UUID(as_uuid=True), nullable=True),
        sa.Column("verificado_em", sa.DateTime, nullable=True),
        sa.Column("motivo_rejeicao", sa.Text, nullable=True),
        sa.Column("criado_em", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "pedidos",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("titulo", sa.String(200), nullable=False),
        sa.Column("categoria", sa.String(100), nullable=False),
        sa.Column("descricao", sa.Text, nullable=False),
        sa.Column("localizacao", sa.String(500), nullable=False),
        sa.Column("latitude", sa.Float, nullable=True),
        sa.Column("longitude", sa.Float, nullable=True),
        sa.Column("urgencia", sa.String(20), nullable=False, server_default="moderada"),
        sa.Column("status", sa.String(20), nullable=False, server_default="aberto"),
        sa.Column("fotos", sa.JSON, nullable=True),
        sa.Column("criado_por_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("prestador_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("valor", sa.Float, nullable=True),
        sa.Column("valor_acordado", sa.Float, nullable=True),
        sa.Column("criado_em", sa.DateTime, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime, server_default=sa.func.now()),
        sa.Column("aceito_em", sa.DateTime, nullable=True),
        sa.Column("concluido_em", sa.DateTime, nullable=True),
    )

    op.create_table(
        "mensagens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("pedido_id", UUID(as_uuid=True), sa.ForeignKey("pedidos.id"), nullable=False),
        sa.Column("remetente_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("conteudo", sa.Text, nullable=False),
        sa.Column("tipo", sa.String(20), server_default="texto"),
        sa.Column("lida", sa.Boolean, server_default="false"),
        sa.Column("criado_em", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "pagamentos",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("pedido_id", UUID(as_uuid=True), sa.ForeignKey("pedidos.id"), nullable=False, unique=True),
        sa.Column("metodo", sa.String(50), nullable=False),
        sa.Column("valor_total", sa.Float, nullable=False),
        sa.Column("taxa_plataforma", sa.Float, nullable=False),
        sa.Column("valor_prestador", sa.Float, nullable=False),
        sa.Column("rup", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), server_default="pendente"),
        sa.Column("transacao_externa_id", sa.String(200), nullable=True),
        sa.Column("criado_em", sa.DateTime, server_default=sa.func.now()),
        sa.Column("pago_em", sa.DateTime, nullable=True),
        sa.Column("libertado_em", sa.DateTime, nullable=True),
    )

    op.create_table(
        "avaliacoes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("pedido_id", UUID(as_uuid=True), sa.ForeignKey("pedidos.id"), nullable=False, unique=True),
        sa.Column("avaliador_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("avaliado_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("estrelas", sa.Integer, nullable=False),
        sa.Column("comentario", sa.Text, nullable=True),
        sa.Column("criado_em", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("avaliacoes")
    op.drop_table("pagamentos")
    op.drop_table("mensagens")
    op.drop_table("pedidos")
    op.drop_table("documentos")
    op.drop_table("users")
