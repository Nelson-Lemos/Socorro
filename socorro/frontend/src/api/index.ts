import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('socorro_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('socorro_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface UserCreate {
  nome: string
  email: string
  telefone?: string
  tipo_conta: string
  localizacao?: string
  latitude?: number
  longitude?: number
  password: string
  idade?: number
  genero?: string
  competencias?: string
  nif?: string
  area_atuacao?: string
  especialidades?: string
  anos_experiencia?: number
  descricao?: string
  disponibilidade?: string
  raio_atuacao?: number
  /* Empresa — perfil comercial (3 passos) */
  nome_comercial?: string
  tipo_entidade?: string      // empresa | eni | oficina | prestador
  logo?: string
  foto_capa?: string
  telefone_whatsapp?: string
  website?: string
  redes_sociais?: string
  provincia?: string
  municipio?: string
  bairro?: string
  endereco?: string
  ponto_referencia?: string
  categorias_servico?: string
  atende_estabelecimento?: boolean
  atende_domicilio?: boolean
  areas_atendidas?: string
  horario_atendimento?: string
  atendimento_24h?: boolean
  representante_nome?: string
  representante_cargo?: string
  representante_telefone?: string
  certidao_comercial_url?: string
  doc_representante_url?: string
  licenca_url?: string
  status_verificacao?: string
}

export interface UserOut {
  id: string
  nome: string
  email: string
  telefone?: string
  tipo_conta: string
  localizacao?: string
  latitude?: number
  longitude?: number
  idade?: number
  genero?: string
  competencias?: string
  nif?: string
  area_atuacao?: string
  especialidades?: string
  anos_experiencia?: number
  status_atendimento?: string
  foto_perfil?: string
  descricao?: string
  disponibilidade?: string
  raio_atuacao?: number
  verificado: boolean
  telefone_verificado: boolean
  criado_em: string
  /* Empresa — identidade comercial */
  nome_comercial?: string
  tipo_entidade?: string
  logo?: string
  foto_capa?: string
  telefone_whatsapp?: string
  website?: string
  redes_sociais?: string
  provincia?: string
  municipio?: string
  bairro?: string
  endereco?: string
  ponto_referencia?: string
  categorias_servico?: string
  atende_estabelecimento?: boolean
  atende_domicilio?: boolean
  areas_atendidas?: string
  atendimento_24h?: boolean
  representante_nome?: string
  representante_cargo?: string
  representante_telefone?: string
  status_verificacao?: string
}

export interface PedidoCreate {
  titulo: string
  categoria: string
  descricao: string
  localizacao: string
  latitude?: number
  longitude?: number
  referencia?: string
  prestador_id?: string
  urgencia: string
}

export interface OrcamentoItemOut {
  descricao: string
  valor: number
}

export interface PedidoOut {
  id: string
  titulo: string
  categoria: string
  descricao: string
  localizacao: string
  referencia?: string
  latitude?: number
  longitude?: number
  urgencia: string
  status: string
  fotos?: string[]
  criado_por_id: string
  prestador_id?: string
  valor?: number
  valor_acordado?: number
  orcamento_status?: string
  orcamento_itens?: OrcamentoItemOut[] | null
  orcamento_nota?: string
  orcamento_enviado_em?: string
  orcamento_aprovado_em?: string
  criado_em: string
  aceito_em?: string
  concluido_em?: string
  criador_nome?: string
  criador_foto?: string
  criador_avaliacao_media?: number
  prestador_nome?: string
  prestador_foto?: string
}

export interface MensagemOut {
  id: string
  pedido_id: string
  remetente_id: string
  conteudo: string
  tipo: string
  lida: boolean
  criado_em: string
  remetente_nome?: string
}

export interface ConversaOut {
  pedido_id: string
  titulo: string
  categoria: string
  status: string
  outro_id: string | null
  outro_nome: string
  outro_foto: string | null
  ultima_mensagem: string | null
  ultima_em: string
  ultima_de_mim: boolean
  total_mensagens: number
}

export interface EventoHistorico {
  tipo: string
  pedido_id: string
  titulo: string
  categoria: string
  papel: 'cliente' | 'prestador'
  em: string
  detalhe: string
}

export interface HistoricoOut {
  resumo: {
    total_pedidos: number
    criados: number
    prestados: number
    concluidos: number
    ativos: number
    cancelados: number
    gasto_total: number
    ganho_total: number
  }
  pedidos: PedidoOut[]
  eventos: EventoHistorico[]
}

export interface PagamentoOut {
  id: string
  pedido_id: string
  metodo: string
  valor_total: number
  taxa_plataforma: number
  valor_prestador: number
  rup?: string
  status: string
  criado_em: string
  pago_em?: string
  libertado_em?: string
}

export interface AvaliacaoOut {
  id: string
  pedido_id: string
  avaliador_id: string
  avaliado_id: string
  estrelas: number
  comentario?: string
  criado_em: string
  avaliador_nome?: string
}

export interface ProfissionalOut {
  id: string
  nome: string
  tipo_conta: string
  foto_perfil?: string
  descricao?: string
  area_atuacao?: string
  competencias?: string
  especialidades?: string
  anos_experiencia?: number
  localizacao?: string
  latitude?: number
  longitude?: number
  raio_atuacao?: number
  verificado: boolean
  status_atendimento?: string
  dist_km?: number
  avaliacao_media?: number
  total_avaliacoes: number
  // Empresa — identidade comercial
  nome_comercial?: string
  logo?: string
  foto_capa?: string
  categorias_servico?: string
  areas_atendidas?: string
  atendimento_estabelecimento?: boolean
  atendimento_domicilio?: boolean
  atendimento_24h?: boolean
  telefone_whatsapp?: string
  website?: string
  provincia?: string
  municipio?: string
  bairro?: string
  representante_nome?: string
  representante_cargo?: string
  representante_telefone?: string
}

export interface AvaliacaoProfissional {
  id: string
  estrelas: number
  comentario?: string
  criado_em?: string
  avaliador_nome?: string
}

export interface PotencialPrestador {
  id: string
  nome: string
  foto_perfil?: string
  latitude?: number
  longitude?: number
  atualizado_em?: string
}

export interface TrackingOut {
  pedido: PedidoOut
  status: string
  prestador?: PotencialPrestador | null
  distancia_km?: number
  eta_min?: number
}

function getWSSBase(): string {
  const apiBase = (import.meta.env.VITE_API_URL || '').trim()
  let host: string
  if (apiBase.startsWith('http')) {
    host = apiBase.replace(/^https?:\/\//, '').split('/')[0]
  } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    host = window.location.host
  } else {
    host = 'back-socorro.onrender.com'
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${host}`
}

export function getWebSocketUrl(pedidoId: string): string {
  return `${getWSSBase()}/chat/${pedidoId}/ws`
}

export function getCallWebSocketUrl(pedidoId: string): string {
  return `${getWSSBase()}/chat/${pedidoId}/call/ws`
}

export const authApi = {
  register: async (data: UserCreate) => {
    const res = await api.post('/auth/register', data)
    return res.data
  },
  login: async (email: string, password: string) => {
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    const res = await api.post('/auth/login', form)
    return res.data
  },
  me: async () => {
    const res = await api.get('/auth/me')
    return res.data as UserOut
  },
  updateMe: async (data: Partial<UserOut>) => {
    const res = await api.put('/auth/me', data)
    return res.data as UserOut
  },
  // Password
  esqueciPassword: async (email: string) => {
    const res = await api.post('/auth/esqueci-password', { email })
    return res.data
  },
  redefinirPassword: async (token: string, nova_password: string) => {
    const res = await api.post('/auth/redefinir-password', { token, nova_password })
    return res.data
  },
  alterarPassword: async (current_password: string, nova_password: string) => {
    const res = await api.post('/auth/alterar-password', null, {
      params: { current_password, nova_password },
    })
    return res.data
  },
  uploadFotoPerfil: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post('/auth/foto-perfil', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { url: string; user: UserOut }
  },
}

export const uploadsApi = {
  /** Upload sem sessão — usado no registo (logótipo / capa) */
  imagem: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post('/upload/imagem', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as { url: string }
  },
}

export const pedidosApi = {
  listar: async (params?: { urgencia?: string; categoria?: string; status?: string }) => {
    const res = await api.get('/pedidos', { params })
    return res.data as PedidoOut[]
  },
  criar: async (data: PedidoCreate) => {
    const res = await api.post('/pedidos', data)
    return res.data as PedidoOut
  },
  obter: async (id: string) => {
    const res = await api.get(`/pedidos/${id}`)
    return res.data as PedidoOut
  },
  atualizar: async (id: string, data: Partial<PedidoOut>) => {
    const res = await api.put(`/pedidos/${id}`, data)
    return res.data as PedidoOut
  },
  atualizarStatus: async (id: string, status: string) => {
    const res = await api.patch(`/pedidos/${id}/status`, { status })
    return res.data as PedidoOut
  },
  tracking: async (id: string) => {
    const res = await api.get(`/pedidos/${id}/tracking`)
    return res.data as TrackingOut
  },
  uploadFoto: async (id: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post(`/pedidos/${id}/fotos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },
  eliminar: async (id: string) => {
    await api.delete(`/pedidos/${id}`)
  },
  matching: async () => {
    const res = await api.get('/pedidos/matching')
    return res.data as PedidoOut[]
  },
  aceitar: async (id: string) => {
    const res = await api.post(`/pedidos/${id}/aceitar`)
    return res.data as PedidoOut
  },
  concluir: async (id: string) => {
    const res = await api.post(`/pedidos/${id}/concluir`)
    return res.data as PedidoOut
  },
  cancelar: async (id: string) => {
    const res = await api.post(`/pedidos/${id}/cancelar`)
    return res.data as PedidoOut
  },
  enviarOrcamento: async (
    id: string,
    data: { total: number; itens?: { descricao: string; valor: number }[]; nota?: string }
  ) => {
    const res = await api.post(`/pedidos/${id}/orcamento`, data)
    return res.data as PedidoOut
  },
  aprovarOrcamento: async (id: string) => {
    const res = await api.post(`/pedidos/${id}/orcamento/aprovar`)
    return res.data as PedidoOut
  },
  rejeitarOrcamento: async (id: string) => {
    const res = await api.post(`/pedidos/${id}/orcamento/rejeitar`)
    return res.data as PedidoOut
  },
  historico: async () => {
    const res = await api.get('/pedidos/historico')
    return res.data as HistoricoOut
  },
}

export const profissionaisApi = {
  pesquisar: async (params?: {
    q?: string
    categoria?: string
    tipo?: string
    disponivel?: boolean
    min_avaliacao?: number
    lat?: number
    lon?: number
    raio?: number
    limit?: number
  }) => {
    const res = await api.get('/profissionais', { params })
    return res.data as ProfissionalOut[]
  },
  obter: async (id: string, lat?: number, lon?: number) => {
    const res = await api.get(`/profissionais/${id}`, { params: { lat, lon } })
    return res.data as ProfissionalOut
  },
  avaliacoes: async (id: string, limit = 10) => {
    const res = await api.get(`/profissionais/${id}/avaliacoes`, { params: { limit } })
    return res.data as AvaliacaoProfissional[]
  },
  atualizarEstado: async (estado: 'online' | 'offline' | 'ocupado') => {
    const res = await api.post('/profissionais/estado', { estado })
    return res.data as ProfissionalOut
  },
}

export const chatApi = {
  listarMensagens: async (pedidoId: string, skip = 0, limit = 50) => {
    const res = await api.get(`/chat/${pedidoId}/mensagens`, { params: { skip, limit } })
    return res.data as MensagemOut[]
  },
  enviarMensagem: async (pedidoId: string, conteudo: string, tipo = 'texto') => {
    const res = await api.post(`/chat/${pedidoId}/mensagens`, { conteudo, tipo })
    return res.data as MensagemOut
  },
  listarConversas: async () => {
    const res = await api.get('/chat/conversas')
    return res.data as ConversaOut[]
  },
}

export const pagamentosApi = {
  criar: async (pedidoId: string, metodo: string, valor: number) => {
    const res = await api.post(`/pagamentos/${pedidoId}`, { metodo, valor })
    return res.data as PagamentoOut
  },
  obter: async (pedidoId: string) => {
    const res = await api.get(`/pagamentos/${pedidoId}`)
    return res.data as PagamentoOut
  },
  confirmar: async (pedidoId: string) => {
    const res = await api.post(`/pagamentos/${pedidoId}/confirmar-pagamento`)
    return res.data as PagamentoOut
  },
  libertar: async (pedidoId: string) => {
    const res = await api.post(`/pagamentos/${pedidoId}/libertar`)
    return res.data as PagamentoOut
  },
}

export const avaliacoesApi = {
  listar: async (userId: string) => {
    const res = await api.get(`/avaliacoes/${userId}`)
    return res.data as AvaliacaoOut[]
  },
  criar: async (pedidoId: string, estrelas: number, comentario?: string) => {
    const res = await api.post(`/avaliacoes/${pedidoId}`, { estrelas, comentario })
    return res.data as AvaliacaoOut
  },
}

export { api }
export default api
