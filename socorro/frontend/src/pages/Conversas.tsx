import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, Search, X, Loader2, RefreshCw } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import Avatar from '../components/Avatar'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { chatApi } from '../api'
import type { ConversaOut } from '../api'
import { normalizarTexto, pontuarCorrespondencia } from '../constants'

const tempoRelativo = (iso: string) => {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const dias = Math.floor(h / 24)
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias} dias`
  return d.toLocaleDateString('pt-AO', { day: '2-digit', month: 'short' })
}

export default function Conversas() {
  const nav = useNavigate()
  const [conversas, setConversas] = useState<ConversaOut[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('')

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      const dados = await chatApi.listarConversas()
      setConversas(dados)
    } catch {
      setErro('Não foi possível carregar as conversas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const filtradas = useMemo(() => {
    const termo = filtro.trim()
    if (!termo) return conversas
    return conversas
      .map((c) => ({
        c,
        score: Math.max(
          pontuarCorrespondencia(c.outro_nome, termo),
          pontuarCorrespondencia(c.titulo, termo),
          c.ultima_mensagem ? pontuarCorrespondencia(c.ultima_mensagem, termo) : 0,
        ),
      }))
      .filter((r) => r.score >= 0.6 || normalizarTexto(r.c.titulo).includes(normalizarTexto(termo)))
      .sort((a, b) => b.score - a.score)
      .map((r) => r.c)
  }, [conversas, filtro])

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-surface-900 dark:text-white tracking-tight">Mensagens</h1>
            <p className="text-sm text-surface-500 mt-0.5">Conversas com clientes e profissionais</p>
          </div>
          <button
            onClick={carregar}
            className="p-2.5 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-500 hover:text-brand-600 transition-colors"
            aria-label="Atualizar"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Filtro instantâneo */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por pessoa, pedido ou mensagem..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          {filtro && (
            <button onClick={() => setFiltro('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400" aria-label="Limpar">
              <X size={17} />
            </button>
          )}
        </div>

        {loading && conversas.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : erro ? (
          <EmptyState icon={<MessageCircle size={26} />} title="Erro" description={erro} />
        ) : filtradas.length === 0 ? (
          <EmptyState
            icon={<MessageCircle size={26} />}
            title={filtro ? 'Sem resultados' : 'Sem conversas ainda'}
            description={filtro ? `Nada corresponde a "${filtro}".` : 'Quando aceitar um pedido ou tiver um prestador, a conversa aparece aqui.'}
          />
        ) : (
          <div className="space-y-2">
            {filtradas.map((c, i) => (
              <motion.button
                key={c.pedido_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                onClick={() => nav(`/chat/${c.pedido_id}`)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors text-left"
              >
                <Avatar src={c.outro_foto} nome={c.outro_nome} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-surface-900 dark:text-white truncate">{c.outro_nome}</p>
                    <span className="text-[11px] text-surface-400 shrink-0">{tempoRelativo(c.ultima_em)}</span>
                  </div>
                  <p className="text-xs text-surface-500 truncate mt-0.5">{c.titulo}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-surface-600 dark:text-surface-300 truncate flex-1">
                      {c.ultima_mensagem
                        ? `${c.ultima_de_mim ? 'Você: ' : ''}${c.ultima_mensagem}`
                        : 'Sem mensagens — inicie a conversa'}
                    </p>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
