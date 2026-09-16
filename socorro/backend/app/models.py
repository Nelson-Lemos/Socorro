import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, Enum, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class TipoConta(str, enum.Enum):
    CIDADAO = "cidadao"
    EMPRESA = "empresa"


class Genero(str, enum.Enum):
    MASCULINO = "masculino"
    FEMININO = "feminino"
    OUTRO = "outro"


class StatusPedido(str, enum.Enum):
    ABERTO = "aberto"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"


class Urgencia(str, enum.Enum):
    URGENTE = "urgente"
    MODERADA = "moderada"
    PLANEADA = "planeada"


class StatusPagamento(str, enum.Enum):
    PENDENTE = "pendente"
    RETIDO = "retido"
    LIBERTADO = "libertado"
    REEMBOLSADO = "reembolsado"


class StatusVerificacao(str, enum.Enum):
    PENDENTE = "pendente"
    APROVADO = "aprovado"
    REJEITADO = "rejeitado"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    telefone = Column(String(20), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)
    tipo_conta = Column(String(20), nullable=False, default=TipoConta.CIDADAO)
    localizacao = Column(String(500), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Cidadao fields
    idade = Column(Integer, nullable=True)
    genero = Column(String(20), nullable=True)
    competencias = Column(Text, nullable=True)

    # Empresa fields
    nif = Column(String(20), nullable=True)
    area_atuacao = Column(String(100), nullable=True)

    # Profile
    foto_perfil = Column(String(500), nullable=True)
    descricao = Column(Text, nullable=True)
    disponibilidade = Column(String(100), nullable=True)
    raio_atuacao = Column(Integer, default=10)

    # Verification
    verificado = Column(Boolean, default=False)
    email_verificado = Column(Boolean, default=False)
    telefone_verificado = Column(Boolean, default=False)

    # Status
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    documentos = relationship("Documento", back_populates="user", cascade="all, delete-orphan")
    pedidos_criados = relationship("Pedido", back_populates="criador", foreign_keys="Pedido.criado_por_id")
    pedidos_aceitos = relationship("Pedido", back_populates="prestador", foreign_keys="Pedido.prestador_id")
    avaliacoes_recebidas = relationship("Avaliacao", back_populates="avaliado", foreign_keys="Avaliacao.avaliado_id")
    avaliacoes_feitas = relationship("Avaliacao", back_populates="avaliador", foreign_keys="Avaliacao.avaliador_id")


class Documento(Base):
    __tablename__ = "documentos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    tipo = Column(String(50), nullable=False)  # bi_frente, bi_verso, alvara, certidao, nif, selfie, comprovativo_residencia, etc.
    nome_ficheiro = Column(String(255), nullable=False)
    caminho = Column(String(500), nullable=False)
    status = Column(String(20), default=StatusVerificacao.PENDENTE)
    verificado_por = Column(UUID(as_uuid=True), nullable=True)
    verificado_em = Column(DateTime, nullable=True)
    motivo_rejeicao = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="documentos")


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titulo = Column(String(200), nullable=False)
    categoria = Column(String(100), nullable=False)
    descricao = Column(Text, nullable=False)
    localizacao = Column(String(500), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    urgencia = Column(String(20), nullable=False, default=Urgencia.MODERADA)
    status = Column(String(20), nullable=False, default=StatusPedido.ABERTO)
    fotos = Column(JSON, nullable=True)  # Lista de URLs de fotos

    # Relations
    criado_por_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    prestador_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Valor
    valor = Column(Float, nullable=True)
    valor_acordado = Column(Float, nullable=True)

    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    aceito_em = Column(DateTime, nullable=True)
    concluido_em = Column(DateTime, nullable=True)

    # Relationships
    criador = relationship("User", back_populates="pedidos_criados", foreign_keys=[criado_por_id])
    prestador = relationship("User", back_populates="pedidos_aceitos", foreign_keys=[prestador_id])
    mensagens = relationship("Mensagem", back_populates="pedido", cascade="all, delete-orphan")
    pagamento = relationship("Pagamento", back_populates="pedido", uselist=False, cascade="all, delete-orphan")
    avaliacao = relationship("Avaliacao", back_populates="pedido", uselist=False, cascade="all, delete-orphan")


class Mensagem(Base):
    __tablename__ = "mensagens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pedido_id = Column(UUID(as_uuid=True), ForeignKey("pedidos.id"), nullable=False)
    remetente_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    conteudo = Column(Text, nullable=False)
    tipo = Column(String(20), default="texto")  # texto, foto, documento
    lida = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)

    pedido = relationship("Pedido", back_populates="mensagens")
    remetente = relationship("User")


class Pagamento(Base):
    __tablename__ = "pagamentos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pedido_id = Column(UUID(as_uuid=True), ForeignKey("pedidos.id"), nullable=False, unique=True)
    metodo = Column(String(50), nullable=False)  # multicaixa_express, unitel_money, afrimoney, transferencia
    valor_total = Column(Float, nullable=False)
    taxa_plataforma = Column(Float, nullable=False)  # 25%
    valor_prestador = Column(Float, nullable=False)
    rup = Column(String(100), nullable=True)  # Referencia unica de pagamento
    status = Column(String(20), default=StatusPagamento.PENDENTE)
    transacao_externa_id = Column(String(200), nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    pago_em = Column(DateTime, nullable=True)
    libertado_em = Column(DateTime, nullable=True)

    pedido = relationship("Pedido", back_populates="pagamento")


class Avaliacao(Base):
    __tablename__ = "avaliacoes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pedido_id = Column(UUID(as_uuid=True), ForeignKey("pedidos.id"), nullable=False, unique=True)
    avaliador_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    avaliado_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    estrelas = Column(Integer, nullable=False)  # 1-5
    comentario = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)

    pedido = relationship("Pedido", back_populates="avaliacao")
    avaliador = relationship("User", back_populates="avaliacoes_feitas", foreign_keys=[avaliador_id])
    avaliado = relationship("User", back_populates="avaliacoes_recebidas", foreign_keys=[avaliado_id])
