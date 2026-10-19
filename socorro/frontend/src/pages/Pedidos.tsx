import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, ClipboardList } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { pedidosApi } from '../api'
import type { PedidoOut } from '../api'
import { useAuth } from '../context/AuthContext'
import { categoriaInfo } from '../constants'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { SkeletonList } from '../components/LoadingSkeleton'
import { readSavedLocation, formatDist, haversineKm } from '../utils/geo'

export default function Pedidos() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState<'meus' | 'disponiveis'>('meus')
  const [pedidos, setPedidos] = useState<PedidoOut[]>([])
  const [loading, setLoading] = useState(true)
  const isProviderUser = !!user?.area_atuacao || user?.tipo_conta === 'empresa'

  useEffect(() => {
    pedidosApi
      .listar({})
      .then(setPedidos)
      .catch(() => setPedidos([]))
      .finally(() => setLoading(false))
  }, [])

  const meus = pedidos.filter((p) => p.criado_por_id === user?.id || p.prestador_id === user?.id)
  const disponiveis = pedidos
    .filter((p) => p.criado_por_id !== user?.id && ['aberto', 'procurando'].includes(p.status))
    .sort((a, b) => {
      const prior = (p: PedidoOut) => (p.urgencia === 'urgente' ? 0 : p.urgencia === 'moderada' ? 1 : 2)
      return prior(a) - prior(b)
    })

  const renderPedido = (p: PedidoOut) => {
    const cat = categoriaInfo(p.categoria)
    const Icon = cat.icon
    const saved = readSavedLocation()
    const dist =
      p.latitude != null && p.longitude != null && saved
        ? formatDist(haversineKm(saved, { lat: p.latitude, lon: p.longitude }))
        : null
    return (
      <button
        key={p.id}
        onClick={() => nav(`/pedido/${p.id}`)}
        className="w-full flex items-center gap-3 rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4 text-left hover:shadow-md transition-all"
      >
        <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-surface-100 dark:bg-surface-800">
          <Icon size={22} className="text-surface-500 dark:text-surface-400" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-surface-900 dark:text-white truncate">{p.titulo}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-surface-500">
            <span className="flex items-center gap-1"><MapPin size={11} className="text-surface-400" /> {p.localizacao.split('|')[0].trim().slice(0, 28)}{p.localizacao.length > 28 ? '…' : ''}</span>
            {dist && <span>{dist}</span>}
            {p.prestador_nome && (
              <span>{p.prestador_nome}</span>
            )}
          </div>
        </div>
        <StatusBadge status={p.status} />
      </button>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-surface-900 dark:text-white">Pedidos</h1>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-1 gap-1">
          <button
            onClick={() => setTab('meus')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${tab === 'meus' ? 'bg-surface-100 dark:bg-surface-800 text-brand-600' : 'text-surface-500'}`}
          >
            Meus ({meus.length})
          </button>
          {isProviderUser && (
            <button
              onClick={() => setTab('disponiveis')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${tab === 'disponiveis' ? 'bg-surface-100 dark:bg-surface-800 text-brand-600' : 'text-surface-500'}`}
            >
              Disponíveis ({disponiveis.length})
            </button>
          )}
        </div>

        {loading ? (
          <SkeletonList count={5} />
        ) : tab === 'meus' ? (
          meus.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-surface-900 border border-dashed border-surface-300 dark:border-surface-700 p-8">
              <EmptyState
                icon={<ClipboardList size={28} />}
                title="Ainda não tem pedidos"
                description="Quando solicitar ajuda, os seus pedidos aparecem aqui."
                action={
                  <button
                    onClick={() => nav('/pedir-socorro')}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold"
                  >
                    Pedir ajuda
                  </button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">{meus.map(renderPedido)}</div>
          )
        ) : disponiveis.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-surface-900 border border-dashed border-surface-300 dark:border-surface-700 p-8">
            <EmptyState
              icon={<ClipboardList size={28} />}
              title="Nenhum pedido disponível"
              description="Novos pedidos aparecem aqui assim que alguém precisar de ajuda."
            />
          </div>
        ) : (
          <div className="space-y-3">{disponiveis.map(renderPedido)}</div>
        )}
      </div>
    </DashboardLayout>
  )
}
