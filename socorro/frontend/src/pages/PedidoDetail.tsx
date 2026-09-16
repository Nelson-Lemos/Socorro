import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Clock, AlertTriangle, User, Star,
  MessageCircle, CheckCircle, XCircle, Camera, Loader2,
} from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

const URGENCIA: Record<string, { label: string; cls: string; icon: typeof AlertTriangle }> = {
  urgente: { label: 'Urgente', cls: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400', icon: AlertTriangle },
  moderada: { label: 'Moderada', cls: 'bg-warning-light text-warning dark:bg-warning/20 dark:text-yellow-400', icon: Clock },
  baixa: { label: 'Baixa', cls: 'bg-success-light text-success dark:bg-success/20 dark:text-emerald-400', icon: Clock },
}

const STATUS: Record<string, { label: string; cls: string }> = {
  aberto: { label: 'Aberto', cls: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' },
  em_andamento: { label: 'Em Andamento', cls: 'bg-warning-light text-warning dark:bg-warning/20 dark:text-yellow-400' },
  concluido: { label: 'Concluído', cls: 'bg-success-light text-success dark:bg-success/20 dark:text-emerald-400' },
  cancelado: { label: 'Cancelado', cls: 'bg-error-light text-error dark:bg-error/20 dark:text-red-400' },
}

export default function PedidoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pedido, setPedido] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get(`/pedidos/${id}`)
      .then(res => setPedido(res.data))
      .catch(() => setError('Pedido não encontrado'))
      .finally(() => setLoading(false))
  }, [id])

  const doAction = async (url: string, errFallback: string) => {
    if (!id) return
    setActionLoading(true)
    try {
      const res = await api.post(url)
      setPedido(res.data)
    } catch (e: any) {
      setError(e.response?.data?.detail || errFallback)
    }
    setActionLoading(false)
  }

  const urg = URGENCIA[pedido?.urgencia] || URGENCIA.baixa
  const stat = STATUS[pedido?.status] || STATUS.aberto
  const UrgIcon = urg.icon
  const isOwner = user?.id === pedido?.criado_por_id
  const isPrestador = user?.id === pedido?.prestador_id

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">S!</span>
          </div>
          <div className="w-6 h-6 border-2.5 border-surface-200 dark:border-surface-700 border-t-brand-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-4">A carregar pedido...</p>
        </div>
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-surface-500 dark:text-surface-400 mb-4">Pedido não encontrado</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors">
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-200 dark:border-surface-800">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <ArrowLeft size={22} className="text-surface-600 dark:text-surface-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-surface-900 dark:text-white truncate">{pedido.titulo}</h1>
            <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{pedido.categoria}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stat.cls}`}>{stat.label}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-error-light dark:bg-error/20 text-error dark:text-red-400 rounded-xl px-4 py-3 text-sm font-medium">
            <AlertTriangle size={16} />
            {error}
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex flex-wrap gap-2.5">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${urg.cls}`}>
            <UrgIcon size={13} /> {urg.label}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700">
            <MapPin size={13} /> {pedido.localizacao || 'Sem localização'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700">
            <Clock size={13} /> {new Date(pedido.criado_em).toLocaleDateString('pt-AO')}
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.35 }} className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800 shadow-sm">
          <h3 className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-2">Descrição</h3>
          <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed whitespace-pre-wrap">{pedido.descricao}</p>
        </motion.div>

        {pedido.fotos && pedido.fotos.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35 }} className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800 shadow-sm">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-3">
              <Camera size={14} /> Fotos ({pedido.fotos.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {pedido.fotos.map((foto: string, i: number) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-surface-200 dark:bg-surface-800">
                  <img src={foto} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.35 }} className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800 shadow-sm">
            <p className="text-[10px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-3">Pediu Ajuda</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
                <span className="text-brand-600 dark:text-brand-400 font-bold text-sm">
                  {pedido.criador_nome?.charAt(0) || <User size={16} />}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{pedido.criador_nome || 'Anónimo'}</p>
                {pedido.criador_avaliacao_media != null && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star size={11} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">{pedido.criador_avaliacao_media.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800 shadow-sm">
            <p className="text-[10px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-3">Prestador</p>
            {pedido.prestador_nome ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
                  <span className="text-surface-600 dark:text-surface-300 font-bold text-sm">
                    {pedido.prestador_nome?.charAt(0) || <User size={16} />}
                  </span>
                </div>
                <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{pedido.prestador_nome}</p>
              </div>
            ) : (
              <p className="text-xs text-surface-500 dark:text-surface-400">Aguardando prestador...</p>
            )}
          </div>
        </motion.div>

        {(pedido.valor || pedido.valor_acordado) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35 }} className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800 shadow-sm flex justify-between items-center">
            <span className="text-sm text-surface-500 dark:text-surface-400">Valor</span>
            <span className="text-xl font-bold text-brand-600 dark:text-brand-400">
              {pedido.valor_acordado
                ? `${pedido.valor_acordado.toLocaleString('pt-AO')} Kz`
                : pedido.valor
                  ? `${pedido.valor.toLocaleString('pt-AO')} Kz`
                  : ''}
            </span>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.35 }} className="flex flex-wrap gap-3 pb-8">
          {pedido.status === 'aberto' && !isOwner && (
            <button
              onClick={() => doAction(`/pedidos/${id}/aceitar`, 'Erro ao aceitar pedido')}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-bold rounded-xl shadow-lg shadow-brand-600/25 transition-all duration-200"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {actionLoading ? 'A aceitar...' : 'Aceitar Pedido'}
            </button>
          )}

          {pedido.status === 'em_andamento' && (isOwner || isPrestador) && (
            <button
              onClick={() => doAction(`/pedidos/${id}/concluir`, 'Erro ao concluir pedido')}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-success hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-success/25 transition-all duration-200"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {actionLoading ? 'A concluir...' : 'Marcar Concluído'}
            </button>
          )}

          {pedido.status !== 'concluido' && pedido.status !== 'cancelado' && isOwner && (
            <button
              onClick={() => {
                if (confirm('Tem certeza que deseja cancelar?')) doAction(`/pedidos/${id}/cancelar`, 'Erro ao cancelar pedido')
              }}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-transparent text-error dark:text-red-400 border-2 border-error/30 dark:border-red-400/30 hover:bg-error-light dark:hover:bg-error/10 font-semibold rounded-xl transition-all duration-200"
            >
              <XCircle size={18} /> Cancelar
            </button>
          )}

          {(isOwner || isPrestador) && pedido.status !== 'cancelado' && (
            <button
              onClick={() => navigate(`/chat/${pedido.id}`)}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-transparent text-brand-600 dark:text-brand-400 border-2 border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 font-semibold rounded-xl transition-all duration-200"
            >
              <MessageCircle size={18} /> Chat
            </button>
          )}
        </motion.div>
      </div>
    </div>
  )
}
