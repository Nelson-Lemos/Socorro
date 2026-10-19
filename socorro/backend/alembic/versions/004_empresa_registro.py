"""empresa registration profile fields

Revision ID: 004_empresa_registro
Revises: 003_orcamento
Create Date: 2026-09-20
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004_empresa_registro"
down_revision: Union[str, None] = "003_orcamento"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Conta / identidade da empresa
    op.add_column("users", sa.Column("nome_comercial", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("tipo_entidade", sa.String(50), nullable=True))
    op.add_column("users", sa.Column("logo", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("foto_capa", sa.String(500), nullable=True))

    # Contactos
    op.add_column("users", sa.Column("telefone_whatsapp", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("website", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("redes_sociais", sa.Text, nullable=True))

    # Localização desagregada
    op.add_column("users", sa.Column("provincia", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("municipio", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("bairro", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("endereco", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("ponto_referencia", sa.String(255), nullable=True))

    # Serviços e área de atendimento
    op.add_column("users", sa.Column("categorias_servico", sa.Text, nullable=True))
    op.add_column("users", sa.Column("atende_estabelecimento", sa.Boolean, server_default="false"))
    op.add_column("users", sa.Column("atende_domicilio", sa.Boolean, server_default="false"))
    op.add_column("users", sa.Column("areas_atendidas", sa.Text, nullable=True))
    op.add_column("users", sa.Column("horario_atendimento", sa.JSON, nullable=True))
    op.add_column("users", sa.Column("atendimento_24h", sa.Boolean, server_default="false"))

    # Verificação / representante
    op.add_column("users", sa.Column("representante_nome", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("representante_cargo", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("representante_telefone", sa.String(20), nullable=True))
    op.add_column("users", sa.Column("certidao_comercial_url", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("doc_representante_url", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("licenca_url", sa.String(500), nullable=True))
    op.add_column("users", sa.Column("status_verificacao", sa.String(20), server_default="nao_submetida"))


def downgrade() -> None:
    for col in [
        "status_verificacao",
        "licenca_url",
        "doc_representante_url",
        "certidao_comercial_url",
        "representante_telefone",
        "representante_cargo",
        "representante_nome",
        "atendimento_24h",
        "horario_atendimento",
        "areas_atendidas",
        "atende_domicilio",
        "atende_estabelecimento",
        "categorias_servico",
        "ponto_referencia",
        "endereco",
        "bairro",
        "municipio",
        "provincia",
        "redes_sociais",
        "website",
        "telefone_whatsapp",
        "foto_capa",
        "logo",
        "tipo_entidade",
        "nome_comercial",
    ]:
        op.drop_column("users", col)
