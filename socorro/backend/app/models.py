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
    PROCURANDO = "procurando"
    A_CAMINHO = "a_caminho"
    CHEGOU = "chegou"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDO = "concluido"
    CANCELADO = "cancelado"


class StatusAtendimento(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    OCUPADO = "ocupado"


class Urgencia(str, enum.Enum):
    URGENTE = "urgente"
    MODERADA = "moderada"
    PLANEADA = "planeada"


class StatusPagamento(str, enum.Enum):
    PENDENTE = "pendente"
    RETIDO = "retido"
    LIBERTADO = "libertado"
    REEMBOLSADO = "reembolsado"


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
    nome_comercial = Column(String(255), nullable=True)   # Nome comercial (se diferente do nome legal)
    tipo_entidade = Column(String(50), nullable=True)     # empresa | eni | oficina | prestador
    logo = Column(String(500), nullable=True)             # URL do logotipo
    foto_capa = Column(String(500), nullable=True)        # URL da fotografia/capa (opcional)

    # Contactos
    telefone_whatsapp = Column(String(20), nullable=True)
    website = Column(String(255), nullable=True)
    redes_sociais = Column(Text, nullable=True)           # JSON string: {"facebook": "...", "instagram": "..."}

    # Localização desagregada
    provincia = Column(String(100), nullable=True)
    municipio = Column(String(100), nullable=True)
    bairro = Column(String(100), nullable=True)
    endereco = Column(String(255), nullable=True)
    ponto_referencia = Column(String(255), nullable=True)

    # Serviços e área de atendimento
    categorias_servico = Column(Text, nullable=True)      # lista separada por vírgula (categorias/serviços)
    atende_estabelecimento = Column(Boolean, default=False)  # atende no estabelecimento?
    atende_domicilio = Column(Boolean, default=False)     # atende ao domicílio?
    areas_atendidas = Column(Text, nullable=True)         # lista separada por vírgula (municípios/bairros)
    horario_atendimento = Column(JSON, nullable=True)     # {"segunda": {"abre": "08:00", "fecha": "18:00"}, ...} / {"24h": true}
    atendimento_24h = Column(Boolean, default=False)

    # Verificação / representante
    representante_nome = Column(String(255), nullable=True)
    representante_cargo = Column(String(100), nullable=True)
    representante_telefone = Column(String(20), nullable=True)
    certidao_comercial_url = Column(String(500), nullable=True)   # documento de verificação
    doc_representante_url = Column(String(500), nullable=True)    # documento de identificação do representante
    licenca_url = Column(String(500), nullable=True)              # licença (quando aplicável)
    status_verificacao = Column(String(20), default="nao_submetida")  # nao_submetida | em_analise | verificada | rejeitada

    # Profile
    foto_perfil = Column(String(500), nullable=True)
    descricao = Column(Text, nullable=True)
    disponibilidade = Column(String(100), nullable=True)
    raio_atuacao = Column(Integer, default=10)
    especialidades = Column(Text, nullable=True)
    anos_experiencia = Column(Integer, nullable=True)
    status_atendimento = Column(String(20), nullable=True, default=StatusAtendimento.ONLINE)

    # Verification
    verificado = Column(Boolean, default=False)
    email_verificado = Column(Boolean, default=False)
    telefone_verificado = Column(Boolean, default=False)
    doc_comercial_url = Column(String(500), nullable=True)   # certidão comercial / documento de registro

    # Status
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    pedidos_criados = relationship("Pedido", back_populates="criador", foreign_keys="Pedido.criado_por_id")
    pedidos_aceitos = relationship("Pedido", back_populates="prestador", foreign_keys="Pedido.prestador_id")
    avaliacoes_recebidas = relationship("Avaliacao", back_populates="avaliado", foreign_keys="Avaliacao.avaliado_id")
    avaliacoes_feitas = relationship("Avaliacao", back_populates="avaliador", foreign_keys="Avaliacao.avaliador_id")


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titulo = Column(String(200), nullable=False)
    categoria = Column(String(100), nullable=False)
    descricao = Column(Text, nullable=False)
    localizacao = Column(String(500), nullable=False)
    referencia = Column(String(255), nullable=True)
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

    # Orçamento (diagnóstico -> orçamento -> aprovação)
    orcamento_itens = Column(JSON, nullable=True)  # [{"descricao": "...", "valor": 15000}]
    orcamento_status = Column(String(20), nullable=False, default="nao_enviado")  # nao_enviado | enviado | aprovado | rejeitado
    orcamento_nota = Column(Text, nullable=True)
    orcamento_enviado_em = Column(DateTime, nullable=True)
    orcamento_aprovado_em = Column(DateTime, nullable=True)

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
