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
  password: string
  idade?: number
  genero?: string
  competencias?: string
  nif?: string
  area_atuacao?: string
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
  foto_perfil?: string
  descricao?: string
  disponibilidade?: string
  raio_atuacao?: number
  verificado: boolean
  email_verificado: boolean
  telefone_verificado: boolean
  criado_em: string
}

export interface PedidoCreate {
  titulo: string
  categoria: string
  descricao: string
  localizacao: string
  latitude?: number
  longitude?: number
  urgencia: string
}

export interface PedidoOut {
  id: string
  titulo: string
  categoria: string
  descricao: string
  localizacao: string
  latitude?: number
  longitude?: number
  urgencia: string
  status: string
  fotos?: string[]
  criado_por_id: string
  prestador_id?: string
  valor?: number
  valor_acordado?: number
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

export interface DocumentoOut {
  id: string
  tipo: string
  nome_ficheiro: string
  status: string
  motivo_rejeicao?: string
  criado_em: string
}

export interface StatusVerificacao {
  tipo_conta: string
  documentos_requeridos: string[]
  documentos_enviados: string[]
  documentos_faltantes: string[]
  documentos_pendentes: string[]
  documentos_aprovados: string[]
  todos_enviados: boolean
  todos_aprovados: boolean
  verificavel: boolean
}

export function getWebSocketUrl(pedidoId: string): string {
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
  return `${protocol}//${host}/chat/${pedidoId}/ws`
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
  // OTP
  enviarOTP: async (telefone: string) => {
    const res = await api.post('/auth/enviar-otp', { telefone })
    return res.data
  },
  verificarOTP: async (telefone: string, codigo: string) => {
    const res = await api.post('/auth/verificar-otp', { telefone, codigo })
    return res.data
  },
  // Email
  enviarEmailVerificacao: async () => {
    const res = await api.post('/auth/enviar-email-verificacao')
    return res.data
  },
  verificarEmail: async (token: string) => {
    const res = await api.post('/auth/verificar-email', { token })
    return res.data
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

export const documentosApi = {
  listar: async () => {
    const res = await api.get('/documentos')
    return res.data as DocumentoOut[]
  },
  statusVerificacao: async () => {
    const res = await api.get('/documentos/status-verificacao')
    return res.data as StatusVerificacao
  },
  upload: async (tipo: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post(`/documentos/${tipo}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data as DocumentoOut
  },
  eliminar: async (id: string) => {
    await api.delete(`/documentos/${id}`)
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
