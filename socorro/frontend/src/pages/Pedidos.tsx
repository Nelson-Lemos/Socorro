import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, ClipboardList, Search, X, MessageCircle, Wrench } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { pedidosApi } from '../api'
import type { PedidoOut } from '../api'
import { useAuth } from '../context/AuthContext'
import { categoriaInfo, pontuarCorrespondencia } from '../constants'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { SkeletonList } from '../components/LoadingSkeleton'
import { readSavedLocation, formatDist, haversineKm } from '../utils/geo'

export default function Pedidos() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState<'cliente' | 'prestador' | 'disponiveis'>('cliente')
  const [pedidos, setPedidos] = useState<PedidoOut[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const isProviderUser = !!user?.area_atuacao || user?.tipo_conta === 'empresa'

  useEffect(() => {
    pedidosApi
      .listar({})
      .then(setPedidos)
      .catch(() => setPedidos([]))
      .finally(() => setLoading(false))
  }, [])

  const comoCliente = pedidos.filter((p) => p.criado_por_id === user?.id)
  const comoPrestador = pedidos.filter((p) => p.prestador_id === user?.id)
  const disponiveis = pedidos
    .filter((p) => p.criado_por_id !== user?.id && ['aberto', 'procurando'].includes(p.status))
    .sort((a, b) => {
      const prior = (p: PedidoOut) => (p.urgencia === 'urgente' ? 0 : p.urgencia === 'moderada' ? 1 : 2)
      return prior(a) - prior(b)
    })

  const aplicarFiltro = (lista: PedidoOut[]) => {
    const termo = filtro.trim()
    if (!termo) return lista
    return lista
      .map((p) => ({
        p,
        s: Math.max(
          pontuarCorrespondencia(p.titulo, termo),
          pontuarCorrespondencia(p.categoria, termo),
          pontuarCorrespondencia(p.localizacao || '', termo),
          p.prestador_nome ? pontuarCorrespondencia(p.prestador_nome, termo) : 0,
        ),
      }))
      .filter((r) => r.s >= 0.62)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.p)
  }

  const listaAtual = useMemo(() => {
    const base = tab === 'cliente' ? comoCliente : tab === 'prestador' ? comoPrestador : disponiveis
    return aplicarFiltro(base)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, pedidos, filtro, user?.id])

  const renderPedido = (p: PedidoOut) => {
    const cat = categoriaInfo(p.categoria)
    const Icon = cat.icon
    const saved = readSavedLocation()
    const dist =
      p.latitude != null && p.longitude != null && saved
        ? formatDist(haversineKm(saved, { lat: p.latitude, lon: p.longitude }))
        : null
    const envolvido = p.criado_por_id === user?.id || p.prestador_id === user?.id
    return (
      <div
        key={p.id}
        className="flex items-center gap-3 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4 hover:shadow-md transition-all"
      >
        <button onClick={() => nav(`/pedido/${p.id}`)} className="flex-1 min-w-0 text-left flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cat.color}1A` }}>
            <Icon size={22} style={{ color: cat.color }} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-surface-900 dark:text-white truncate">{p.titulo}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-surface-500">
              <span className="flex items-center gap-1"><MapPin size={11} className="text-surface-400" /> {(p.localizacao || '').split('|')[0].trim().slice(0, 28)}{(p.localizacao || '').length > 28 ? '…' : ''}</span>
              {dist && <span>{dist}</span>}
              {p.prestador_nome && <span>{p.prestador_nome}</span>}
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={p.status} />
          {envolvido && !['cancelado'].includes(p.status) && (
            <button
              onClick={() => nav(`/chat/${p.id}`)}
              className="p-2 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
              aria-label="Abrir conversa"
              title="Abrir conversa"
            >
              <MessageCircle size={16} />
            </button>
          )}
        </div>
      </div>
    )
  }

  const tabs: { id: typeof tab; label: string; count: number }[] = [
    { id: 'cliente', label: 'Como cliente', count: comoCliente.length },
    ...(isProviderUser
      ? [
          { id: 'prestador' as const, label: 'Como prestador', count: comoPrestador.length },
          { id: 'disponiveis' as const, label: 'Disponíveis', count: disponiveis.length },
        ]
      : []),
  ]

  const vazio =
    tab === 'cliente'
      ? { title: 'Ainda não pediu ajuda', desc: 'Quando solicitar um serviço, o pedido aparece aqui.', action: 'Pedir ajuda' }
      : tab === 'prestador'
        ? { title: 'Ainda não prestou serviços', desc: 'Os pedidos que aceitar aparecem aqui.', action: null }
        : { title: 'Nenhum pedido disponível', desc: 'Novos pedidos aparecem aqui assim que alguém precisar.', action: null }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-surface-900 dark:text-white">Pedidos</h1>
            <p className="text-sm text-surface-500 mt-0.5">
              {isProviderUser ? 'Acompanhe os seus serviços e oportunidades' : 'Acompanhe os seus pedidos de ajuda'}
            </p>
          </div>
        </div>

        {/* Filtro instantâneo */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Filtrar por título, área ou local..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          {filtro && (
            <button onClick={() => setFiltro('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400" aria-label="Limpar">
              <X size={17} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-1 gap-1 overflow-x-auto scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 whitespace-nowrap py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? 'bg-surface-100 dark:bg-surface-800 text-brand-600' : 'text-surface-500'}`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonList count={5} />
        ) : listaAtual.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-surface-900 border border-dashed border-surface-300 dark:border-surface-700 p-8">
            <EmptyState
              icon={tab === 'prestador' ? <Wrench size={28} /> : <ClipboardList size={28} />}
              title={filtro ? 'Sem resultados' : vazio.title}
              description={filtro ? `Nada corresponde a "${filtro}".` : vazio.desc}
              action={
                vazio.action ? (
                  <button
                    onClick={() => nav('/pedir-socorro')}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold"
                  >
                    {vazio.action}
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="space-y-3">{listaAtual.map(renderPedido)}</div>
        )}
      </div>
    </DashboardLayout>
  )
}
