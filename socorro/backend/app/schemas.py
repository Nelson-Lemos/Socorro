from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# --- Auth Schemas ---
class UserCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=255)
    email: str
    telefone: Optional[str] = None
    password: str = Field(..., min_length=6)
    tipo_conta: str  # cidadao | empresa
    localizacao: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # Cidadao
    idade: Optional[int] = None
    genero: Optional[str] = None
    competencias: Optional[str] = None
    # Empresa
    nif: Optional[str] = None
    area_atuacao: Optional[str] = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: UUID
    nome: str
    email: str
    telefone: Optional[str] = None
    tipo_conta: str
    localizacao: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    idade: Optional[int] = None
    genero: Optional[str] = None
    competencias: Optional[str] = None
    nif: Optional[str] = None
    area_atuacao: Optional[str] = None
    foto_perfil: Optional[str] = None
    descricao: Optional[str] = None
    disponibilidade: Optional[str] = None
    raio_atuacao: int = 10
    verificado: bool = False
    email_verificado: bool = False
    telefone_verificado: bool = False
    criado_em: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    localizacao: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    idade: Optional[int] = None
    genero: Optional[str] = None
    competencias: Optional[str] = None
    nif: Optional[str] = None
    area_atuacao: Optional[str] = None
    foto_perfil: Optional[str] = None
    descricao: Optional[str] = None
    disponibilidade: Optional[str] = None
    raio_atuacao: Optional[int] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class OTPRequest(BaseModel):
    telefone: str


class OTPVerify(BaseModel):
    telefone: str
    codigo: str


class EmailVerify(BaseModel):
    token: str


class PasswordResetRequest(BaseModel):
    email: str


class PasswordReset(BaseModel):
    token: str
    nova_password: str = Field(..., min_length=6)


# --- Pedido Schemas ---
class PedidoCreate(BaseModel):
    titulo: str = Field(..., min_length=5, max_length=200)
    categoria: str
    descricao: str = Field(..., min_length=10)
    localizacao: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    urgencia: str  # urgente | moderada | planeada
    fotos: Optional[List[str]] = None


class PedidoUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    localizacao: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    urgencia: Optional[str] = None
    status: Optional[str] = None
    prestador_id: Optional[str] = None
    valor_acordado: Optional[float] = None


class PedidoOut(BaseModel):
    id: UUID
    titulo: str
    categoria: str
    descricao: str
    localizacao: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    urgencia: str
    status: str
    fotos: Optional[List[str]] = None
    criado_por_id: UUID
    prestador_id: Optional[UUID] = None
    valor: Optional[float] = None
    valor_acordado: Optional[float] = None
    criado_em: datetime
    aceito_em: Optional[datetime] = None
    concluido_em: Optional[datetime] = None
    criador_nome: Optional[str] = None
    criador_foto: Optional[str] = None
    criador_avaliacao_media: Optional[float] = None
    prestador_nome: Optional[str] = None
    prestador_foto: Optional[str] = None

    class Config:
        from_attributes = True


# --- Mensagem Schemas ---
class MensagemCreate(BaseModel):
    conteudo: str
    tipo: str = "texto"


class MensagemOut(BaseModel):
    id: UUID
    pedido_id: UUID
    remetente_id: UUID
    conteudo: str
    tipo: str
    lida: bool
    criado_em: datetime
    remetente_nome: Optional[str] = None

    class Config:
        from_attributes = True


# --- Pagamento Schemas ---
class PagamentoCreate(BaseModel):
    metodo: str  # multicaixa_express, unitel_money, afrimoney, transferencia
    valor: float


class PagamentoOut(BaseModel):
    id: UUID
    pedido_id: UUID
    metodo: str
    valor_total: float
    taxa_plataforma: float
    valor_prestador: float
    rup: Optional[str] = None
    status: str
    criado_em: datetime
    pago_em: Optional[datetime] = None
    libertado_em: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Avaliacao Schemas ---
class AvaliacaoCreate(BaseModel):
    estrelas: int = Field(..., ge=1, le=5)
    comentario: Optional[str] = None


class AvaliacaoOut(BaseModel):
    id: UUID
    pedido_id: UUID
    avaliador_id: UUID
    avaliado_id: UUID
    estrelas: int
    comentario: Optional[str] = None
    criado_em: datetime
    avaliador_nome: Optional[str] = None

    class Config:
        from_attributes = True


# --- Documento Schemas ---
class DocumentoOut(BaseModel):
    id: UUID
    tipo: str
    nome_ficheiro: str
    status: str
    motivo_rejeicao: Optional[str] = None
    criado_em: datetime

    class Config:
        from_attributes = True
