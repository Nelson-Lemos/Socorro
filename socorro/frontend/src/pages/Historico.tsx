import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  History, Loader2, RefreshCw, ClipboardList, CheckCircle2, Clock, XCircle,
  Wallet, TrendingUp, Search, X, ArrowRight,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { pedidosApi } from '../api'
import type { HistoricoOut } from '../api'
import { categoriaInfo, pontuarCorrespondencia } from '../constants'

const EVENTO_INFO: Record<string, { label: string; color: string }> = {
  pedido_criado: { label: 'Pedido criado', color: '#3B82F6' },
  aceite: { label: 'Aceite', color: '#F59E0B' },
  orcamento: { label: 'Orçamento', color: '#8B5CF6' },
  orcamento_aprovado: { label: 'Orçamento aprovado', color: '#10B981' },
  concluido: { label: 'Concluído', color: '#059669' },
}

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function Historico() {
  const nav = useNavigate()
  const [dados, setDados] = useState<HistoricoOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [filtro, setFiltro] = useState('')
  const [tab, setTab] = useState<'eventos' | 'pedidos'>('eventos')

  const carregar = async () => {
    setLoading(true)
    setErro('')
    try {
      setDados(await pedidosApi.historico())
    } catch {
      setErro('Não foi possível carregar o histórico.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const eventosFiltrados = useMemo(() => {
    if (!dados) return []
    const termo = filtro.trim()
    if (!termo) return dados.eventos
    return dados.eventos.filter((e) =>
      pontuarCorrespondencia(e.titulo, termo) >= 0.65 ||
      pontuarCorrespondencia(e.categoria, termo) >= 0.7 ||
      (e.detalhe && pontuarCorrespondencia(e.detalhe, termo) >= 0.7),
    )
  }, [dados, filtro])

  const pedidosFiltrados = useMemo(() => {
    if (!dados) return []
    const termo = filtro.trim()
    if (!termo) return dados.pedidos
    return dados.pedidos
      .map((p) => ({ p, s: Math.max(pontuarCorrespondencia(p.titulo, termo), pontuarCorrespondencia(p.categoria, termo)) }))
      .filter((r) => r.s >= 0.6)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.p)
  }, [dados, filtro])

  const r = dados?.resumo

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-surface-900 dark:text-white tracking-tight flex items-center gap-2">
              <History size={20} className="text-brand-600" /> Histórico
            </h1>
            <p className="text-sm text-surface-500 mt-0.5">Tudo o que fez na plataforma, num só lugar</p>
          </div>
          <button
            onClick={carregar}
            className="p-2.5 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-500 hover:text-brand-600 transition-colors"
            aria-label="Atualizar"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading && !dados ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : erro ? (
          <EmptyState icon={<History size={26} />} title="Erro" description={erro} />
        ) : (
          <>
            {/* Resumo */}
            {r && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl p-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                  <ClipboardList size={16} className="text-brand-600" />
                  <p className="text-2xl font-black text-surface-900 dark:text-white mt-2">{r.total_pedidos}</p>
                  <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wide">Pedidos totais</p>
                </div>
                <div className="rounded-2xl p-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <p className="text-2xl font-black text-surface-900 dark:text-white mt-2">{r.concluidos}</p>
                  <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wide">Concluídos</p>
                </div>
                <div className="rounded-2xl p-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                  <Clock size={16} className="text-amber-600" />
                  <p className="text-2xl font-black text-surface-900 dark:text-white mt-2">{r.ativos}</p>
                  <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wide">Em curso</p>
                </div>
                <div className="rounded-2xl p-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
                  <XCircle size={16} className="text-surface-400" />
                  <p className="text-2xl font-black text-surface-900 dark:text-white mt-2">{r.cancelados}</p>
                  <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wide">Cancelados</p>
                </div>
              </div>
            )}

            {r && (r.gasto_total > 0 || r.ganho_total > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <Wallet size={18} className="text-red-600" />
                  </span>
                  <div>
                    <p className="text-lg font-black text-surface-900 dark:text-white">{r.gasto_total.toLocaleString('pt-AO')} Kz</p>
                    <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wide">Total gasto</p>
                  </div>
                </div>
                <div className="rounded-2xl p-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <TrendingUp size={18} className="text-emerald-600" />
                  </span>
                  <div>
                    <p className="text-lg font-black text-surface-900 dark:text-white">{r.ganho_total.toLocaleString('pt-AO')} Kz</p>
                    <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wide">Total recebido</p>
                  </div>
                </div>
              </div>
            )}

            {/* Filtro instantâneo */}
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Filtrar histórico por título, área ou detalhe..."
                className="w-full pl-11 pr-10 py-3 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
              {filtro && (
                <button onClick={() => setFiltro('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400" aria-label="Limpar">
                  <X size={17} />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl bg-surface-100 dark:bg-surface-800 p-1">
              <button
                onClick={() => setTab('eventos')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'eventos' ? 'bg-white dark:bg-surface-900 text-brand-600 shadow-sm' : 'text-surface-500'}`}
              >
                Cronologia
              </button>
              <button
                onClick={() => setTab('pedidos')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'pedidos' ? 'bg-white dark:bg-surface-900 text-brand-600 shadow-sm' : 'text-surface-500'}`}
              >
                Pedidos ({dados?.pedidos.length || 0})
              </button>
            </div>

            {tab === 'eventos' ? (
              eventosFiltrados.length === 0 ? (
                <EmptyState icon={<History size={26} />} title="Sem eventos" description={filtro ? `Nada corresponde a "${filtro}".` : 'Ainda não há atividade registada.'} />
              ) : (
                <div className="space-y-0">
                  {eventosFiltrados.map((e, i) => {
                    const info = EVENTO_INFO[e.tipo] || { label: e.tipo, color: '#6B7280' }
                    const cat = categoriaInfo(e.categoria)
                    const Icon = cat.icon
                    return (
                      <motion.button
                        key={`${e.pedido_id}-${e.tipo}-${i}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        onClick={() => nav(`/pedido/${e.pedido_id}`)}
                        className="w-full flex gap-3 text-left group"
                      >
                        <div className="flex flex-col items-center pt-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: info.color }} />
                          {i < eventosFiltrados.length - 1 && <span className="w-px flex-1 bg-surface-200 dark:bg-surface-800 my-1" />}
                        </div>
                        <div className="flex-1 pb-4 flex items-center gap-3">
                          <span className="w-9 h-9 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0" style={{ color: cat.color }}>
                            <Icon size={17} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{e.titulo}</p>
                            <p className="text-xs text-surface-500 truncate">
                              <span className="font-semibold" style={{ color: info.color }}>{info.label}</span> · {e.detalhe}
                            </p>
                            <p className="text-[11px] text-surface-400 mt-0.5">{dataHora(e.em)} · {e.papel === 'prestador' ? 'como prestador' : 'como cliente'}</p>
                          </div>
                          <ArrowRight size={16} className="text-surface-300 group-hover:text-brand-500 transition-colors shrink-0" />
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )
            ) : pedidosFiltrados.length === 0 ? (
              <EmptyState icon={<ClipboardList size={26} />} title="Sem pedidos" description={filtro ? `Nada corresponde a "${filtro}".` : 'Ainda não tem pedidos.'} />
            ) : (
              <div className="space-y-2">
                {pedidosFiltrados.map((p) => {
                  const cat = categoriaInfo(p.categoria)
                  const Icon = cat.icon
                  return (
                    <button
                      key={p.id}
                      onClick={() => nav(`/pedido/${p.id}`)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 hover:border-brand-300 dark:hover:border-brand-700 transition-colors text-left"
                    >
                      <span className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0" style={{ color: cat.color }}>
                        <Icon size={18} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-surface-900 dark:text-white truncate">{p.titulo}</p>
                          <StatusBadge status={p.status} />
                        </div>
                        <p className="text-xs text-surface-500 truncate mt-0.5">
                          {p.categoria} · {new Date(p.criado_em).toLocaleDateString('pt-AO')}
                          {p.prestador_nome ? ` · ${p.prestador_nome}` : ''}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
