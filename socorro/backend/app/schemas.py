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
    # Empresa (identidade comercial)
    nif: Optional[str] = None
    area_atuacao: Optional[str] = None
    especialidades: Optional[str] = None
    anos_experiencia: Optional[int] = Field(None, ge=0)
    descricao: Optional[str] = None
    disponibilidade: Optional[str] = None
    raio_atuacao: Optional[int] = Field(None, ge=1, le=100)
    nome_comercial: Optional[str] = None       # Nome comercial (se diferente do nome legal)
    tipo_entidade: Optional[str] = None       # empresa | eni | oficina | prestador
    logo: Optional[str] = None                # URL do logotipo
    foto_capa: Optional[str] = None           # URL da fotografia/capa (opcional)

    # Contactos
    telefone_whatsapp: Optional[str] = None
    website: Optional[str] = None
    redes_sociais: Optional[str] = None       # JSON: {"facebook": "...", "instagram": "..."}

    # Localização desagregada
    provincia: Optional[str] = None
    municipio: Optional[str] = None
    bairro: Optional[str] = None
    endereco: Optional[str] = None
    ponto_referencia: Optional[str] = None

    # Serviços e área de atendimento
    categorias_servico: Optional[str] = None  # lista separada por vírgula
    atende_estabelecimento: Optional[bool] = False
    atende_domicilio: Optional[bool] = False
    areas_atendidas: Optional[str] = None     # lista separada por vírgula
    horario_atendimento: Optional[dict] = None   # {"segunda": {"abre": "08:00", "fecha": "18:00"}, ...} / {"24h": true}
    atendimento_24h: Optional[bool] = False

    # Verificação / representante
    representante_nome: Optional[str] = None
    representante_cargo: Optional[str] = None
    representante_telefone: Optional[str] = None
    certidao_comercial_url: Optional[str] = None
    doc_representante_url: Optional[str] = None
    licenca_url: Optional[str] = None
    status_verificacao: Optional[str] = None


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
    especialidades: Optional[str] = None
    anos_experiencia: Optional[int] = None
    status_atendimento: str = "online"
    foto_perfil: Optional[str] = None
    descricao: Optional[str] = None
    disponibilidade: Optional[str] = None
    raio_atuacao: int = 10
    verificado: bool = False
    telefone_verificado: bool = False
    criado_em: datetime

    # Empresa — identidade comercial
    nome_comercial: Optional[str] = None
    tipo_entidade: Optional[str] = None
    logo: Optional[str] = None
    foto_capa: Optional[str] = None
    # Contactos
    telefone_whatsapp: Optional[str] = None
    website: Optional[str] = None
    redes_sociais: Optional[str] = None
    # Localização desagregada
    provincia: Optional[str] = None
    municipio: Optional[str] = None
    bairro: Optional[str] = None
    endereco: Optional[str] = None
    ponto_referencia: Optional[str] = None
    # Serviços
    categorias_servico: Optional[str] = None
    atende_estabelecimento: Optional[bool] = False
    atende_domicilio: Optional[bool] = False
    areas_atendidas: Optional[str] = None
    atendimento_24h: Optional[bool] = False
    # Verificação
    representante_nome: Optional[str] = None
    representante_cargo: Optional[str] = None
    representante_telefone: Optional[str] = None
    status_verificacao: Optional[str] = None

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
    especialidades: Optional[str] = None
    anos_experiencia: Optional[int] = None
    status_atendimento: Optional[str] = None
    foto_perfil: Optional[str] = None
    descricao: Optional[str] = None
    disponibilidade: Optional[str] = None
    raio_atuacao: Optional[int] = None

    # Empresa — identidade comercial
    nome_comercial: Optional[str] = None
    tipo_entidade: Optional[str] = None
    logo: Optional[str] = None
    foto_capa: Optional[str] = None
    # Contactos
    telefone_whatsapp: Optional[str] = None
    website: Optional[str] = None
    redes_sociais: Optional[str] = None
    # Localização desagregada
    provincia: Optional[str] = None
    municipio: Optional[str] = None
    bairro: Optional[str] = None
    endereco: Optional[str] = None
    ponto_referencia: Optional[str] = None
    # Serviços e área de atendimento
    categorias_servico: Optional[str] = None
    atende_estabelecimento: Optional[bool] = None
    atende_domicilio: Optional[bool] = None
    areas_atendidas: Optional[str] = None
    atendimento_24h: Optional[bool] = None
    # Verificação / representante
    representante_nome: Optional[str] = None
    representante_cargo: Optional[str] = None
    representante_telefone: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


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
    referencia: Optional[str] = None
    prestador_id: Optional[str] = None
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
    referencia: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    urgencia: str
    status: str
    fotos: Optional[List[str]] = None
    criado_por_id: UUID
    prestador_id: Optional[UUID] = None
    valor: Optional[float] = None
    valor_acordado: Optional[float] = None
    orcamento_status: str = "nao_enviado"
    orcamento_itens: Optional[List[dict]] = None
    orcamento_nota: Optional[str] = None
    orcamento_enviado_em: Optional[datetime] = None
    orcamento_aprovado_em: Optional[datetime] = None
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


# --- Orçamento Schemas ---
class OrcamentoItemCreate(BaseModel):
    descricao: str = Field(..., min_length=1, max_length=200)
    valor: float = Field(..., gt=0)


class OrcamentoCreate(BaseModel):
    itens: Optional[List[OrcamentoItemCreate]] = None
    total: float = Field(..., gt=0)
    nota: Optional[str] = None


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


# --- Profissional Schemas ---
class EstadoAtendimentoUpdate(BaseModel):
    estado: str  # online | offline | ocupado


class ProfissionalOut(BaseModel):
    id: UUID
    nome: str
    tipo_conta: str
    foto_perfil: Optional[str] = None
    descricao: Optional[str] = None
    area_atuacao: Optional[str] = None
    competencias: Optional[str] = None
    especialidades: Optional[str] = None
    anos_experiencia: Optional[int] = None
    localizacao: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    raio_atuacao: Optional[int] = 10
    verificado: bool = False
    status_atendimento: Optional[str] = "online"
    dist_km: Optional[float] = None
    avaliacao_media: Optional[float] = None
    total_avaliacoes: int = 0
    match_score: Optional[float] = None
    # Empresa — identidade comercial
    nome_comercial: Optional[str] = None
    logo: Optional[str] = None
    foto_capa: Optional[str] = None
    categorias_servico: Optional[str] = None
    areas_atendidas: Optional[str] = None
    atendimento_estabelecimento: Optional[bool] = None
    atendimento_domicilio: Optional[bool] = None
    atendimento_24h: Optional[bool] = None
    telefone_whatsapp: Optional[str] = None
    website: Optional[str] = None
    provincia: Optional[str] = None
    municipio: Optional[str] = None
    bairro: Optional[str] = None
    endereco: Optional[str] = None
    representante_nome: Optional[str] = None
    representante_cargo: Optional[str] = None
    representante_telefone: Optional[str] = None

    class Config:
        from_attributes = True


# --- Tracking Schema ---
class PedidoStatusUpdate(BaseModel):
    status: str  # procurando | a_caminho | chegou | em_andamento | concluido | cancelado


class PrestadorPosicao(BaseModel):
    id: UUID
    nome: str
    foto_perfil: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    atualizado_em: Optional[datetime] = None


class TrackingOut(BaseModel):
    pedido: PedidoOut
    status: str
    prestador: Optional[PrestadorPosicao] = None
    distancia_km: Optional[float] = None
    eta_min: Optional[int] = None
