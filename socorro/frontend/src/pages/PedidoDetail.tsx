import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, MapPin, Clock, AlertTriangle, User,
  MessageCircle, CheckCircle, XCircle, Camera, Loader2, Navigation, Search, Wrench, FileCheck,
} from 'lucide-react'
import { pedidosApi, pagamentosApi } from '../api'
import type { PedidoOut, TrackingOut, PagamentoOut } from '../api'
import { useAuth } from '../context/AuthContext'
import { categoriaInfo, STATUS_PEDIDO, TAXA_PLATAFORMA_PERCENT } from '../constants'
import LeafletMap from '../components/LeafletMap'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { SkeletonList } from '../components/LoadingSkeleton'
import { readSavedLocation, LUANDA, type Coords } from '../utils/geo'

const PASSOS = [
  { key: 'procurando', label: 'A procurar', icon: Search },
  { key: 'a_caminho', label: 'A caminho', icon: Navigation },
  { key: 'chegou', label: 'Chegou', icon: MapPin },
  { key: 'em_andamento', label: 'Em serviço', icon: Wrench },
  { key: 'concluido', label: 'Concluído', icon: CheckCircle },
]

const URGENCIA_META: Record<string, { label: string; color: string; bg: string }> = {
  urgente: { label: 'Urgente', color: '#DC2626', bg: '#FEE2E2' },
  moderada: { label: 'Moderada', color: '#D97706', bg: '#FEF3C7' },
  planeada: { label: 'Planeada', color: '#2563EB', bg: '#DBEAFE' },
}

const ORC_META: Record<string, { label: string; color: string; bg: string }> = {
  enviado: { label: 'A aguardar aprovação', color: '#D97706', bg: '#FEF3C7' },
  aprovado: { label: 'Aprovado', color: '#059669', bg: '#D1FAE5' },
  rejeitado: { label: 'Rejeitado', color: '#DC2626', bg: '#FEE2E2' },
}

const METODOS_PAGAMENTO = [
  { value: 'multicaixa_express', label: 'Multicaixa Express' },
  { value: 'unitel_money', label: 'Unitel Money' },
  { value: 'afrimoney', label: 'Afrimoney' },
  { value: 'transferencia', label: 'Transferência bancária' },
]

export default function PedidoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [pedido, setPedido] = useState<PedidoOut | null>(null)
  const [tracking, setTracking] = useState<TrackingOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const [orcamentoItens, setOrcamentoItens] = useState([{ descricao: '', valor: 0 }])
  const [orcamentoNota, setOrcamentoNota] = useState('')
  const [metodo, setMetodo] = useState('multicaixa_express')
  const [pagamento, setPagamento] = useState<PagamentoOut | null>(null)

  const isOwner = user?.id === pedido?.criado_por_id
  const isPrestador = user?.id === pedido?.prestador_id
  const isProviderUser = !!user?.area_atuacao || user?.tipo_conta === 'empresa'

  const load = useCallback(async () => {
    if (!id) return
    try {
      const p = await pedidosApi.obter(id)
      setPedido(p)
      if (p.prestador_id && ['a_caminho', 'chegou', 'em_andamento'].includes(p.status)) {
        try {
          const t = await pedidosApi.tracking(id)
          setTracking(t)
        } catch {
          setTracking(null)
        }
      } else {
        setTracking(null)
      }
    } catch {
      setError('Pedido não encontrado')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!pedido?.prestador_id || !['a_caminho', 'chegou'].includes(pedido.status)) return
    const t = setInterval(() => {
      if (id) pedidosApi.tracking(id).then(setTracking).catch(() => null)
    }, 15000)
    return () => clearInterval(t)
  }, [pedido?.prestador_id, pedido?.status, id])

  const doStatus = async (status: string, msg: string) => {
    if (!id) return
    setActionLoading(true)
    setError('')
    try {
      const p = await pedidosApi.atualizarStatus(id, status)
      setPedido(p)
      if (p.prestador_id && ['a_caminho', 'chegou', 'em_andamento'].includes(p.status)) {
        pedidosApi.tracking(id).then(setTracking).catch(() => null)
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || msg)
    } finally {
      setActionLoading(false)
    }
  }

  const doAceitar = async () => {
    if (!id) return
    setActionLoading(true)
    setError('')
    try {
      const p = await pedidosApi.aceitar(id)
      setPedido(p)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erro ao aceitar pedido')
    } finally {
      setActionLoading(false)
    }
  }

  const doConcluir = async () => {
    if (!id) return
    setActionLoading(true)
    setError('')
    try {
      const p = await pedidosApi.concluir(id)
      setPedido(p)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erro ao concluir')
    } finally {
      setActionLoading(false)
    }
  }

  const doCancelar = async () => {
    if (!id || !confirm('Tem a certeza que deseja cancelar este pedido?')) return
    setActionLoading(true)
    setError('')
    try {
      const p = await pedidosApi.cancelar(id)
      setPedido(p)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erro ao cancelar')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    const participante = user?.id && (user.id === pedido?.criado_por_id || user.id === pedido?.prestador_id)
    if (!id || !participante || pedido?.orcamento_status !== 'aprovado') {
      setPagamento(null)
      return
    }
    pagamentosApi.obter(id).then(setPagamento).catch(() => setPagamento(null))
  }, [id, pedido?.orcamento_status, pedido?.status, pedido?.criado_por_id, pedido?.prestador_id, user?.id])

  const mudarItem = (i: number, campo: 'descricao' | 'valor', valor: string) => {
    setOrcamentoItens((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, [campo]: campo === 'valor' ? Number(valor) || 0 : valor } : it))
    )
  }

  const totalItens = orcamentoItens.reduce((s, it) => s + (Number(it.valor) || 0), 0)

  const doEnviarOrcamento = async () => {
    if (!id) return
    if (totalItens <= 0) {
      setError('O total do orçamento deve ser superior a zero')
      return
    }
    setActionLoading(true)
    setError('')
    try {
      const p = await pedidosApi.enviarOrcamento(id, {
        total: totalItens,
        itens: orcamentoItens.filter((it) => it.descricao.trim()),
        nota: orcamentoNota.trim() || undefined,
      })
      setPedido(p)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erro ao enviar orçamento')
    } finally {
      setActionLoading(false)
    }
  }

  const doReagirOrcamento = async (ac: 'aprovar' | 'rejeitar') => {
    if (!id) return
    setActionLoading(true)
    setError('')
    try {
      const p = ac === 'aprovar' ? await pedidosApi.aprovarOrcamento(id) : await pedidosApi.rejeitarOrcamento(id)
      setPedido(p)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erro ao responder ao orçamento')
    } finally {
      setActionLoading(false)
    }
  }

  const doGerarPagamento = async () => {
    if (!id) return
    const valor = pedido?.valor_acordado || pedido?.valor
    if (!valor) return
    setActionLoading(true)
    setError('')
    try {
      const pg = await pagamentosApi.criar(id, metodo, valor)
      setPagamento(pg)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erro ao gerar pagamento')
    } finally {
      setActionLoading(false)
    }
  }

  const doConfirmarPagamento = async () => {
    if (!id) return
    setActionLoading(true)
    setError('')
    try {
      const pg = await pagamentosApi.confirmar(id)
      setPagamento(pg)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erro ao confirmar pagamento')
    } finally {
      setActionLoading(false)
    }
  }

  const doLibertar = async () => {
    if (!id) return
    setActionLoading(true)
    setError('')
    try {
      const pg = await pagamentosApi.libertar(id)
      setPagamento(pg)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erro ao libertar pagamento')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="max-w-2xl mx-auto px-4 pt-6"><SkeletonList count={6} /></div>
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-4">
        <EmptyState
          icon={<AlertTriangle size={28} />}
          title="Pedido não encontrado"
          description={error}
          action={
            <button onClick={() => navigate('/pedidos')} className="mt-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold">
              Ver meus pedidos
            </button>
          }
        />
      </div>
    )
  }

  const cat = categoriaInfo(pedido.categoria)
  const CatIcon = cat.icon
  const urg = URGENCIA_META[pedido.urgencia] || URGENCIA_META.moderada
  const ordem = STATUS_PEDIDO[pedido.status]?.order ?? 1
  const currentIdx = Math.max(0, ordem - 2 > -1 ? Math.min(ordem - 2, PASSOS.length - 1) : 0)
  const cancelado = pedido.status === 'cancelado'
  const concluido = pedido.status === 'concluido'
  const orcStatus = pedido.orcamento_status || 'nao_enviado'
  const orcMeta = ORC_META[orcStatus]
  const jaEnviado = ['enviado', 'aprovado', 'rejeitado'].includes(orcStatus)

  const pedidoLoc: Coords | null =
    pedido.latitude != null && pedido.longitude != null ? { lat: pedido.latitude, lon: pedido.longitude } : null
  const prestadorLoc: Coords | null =
    tracking?.prestador?.latitude != null && tracking?.prestador?.longitude != null
      ? { lat: tracking.prestador.latitude, lon: tracking.prestador.longitude }
      : null
  const saved = readSavedLocation()
  const mapCenter: Coords = prestadorLoc || pedidoLoc || saved || LUANDA

  const valorOrcamento = pedido.valor_acordado || pedido.valor || 0
  const comissao = pagamento ? pagamento.taxa_plataforma : Math.round(valorOrcamento * (TAXA_PLATAFORMA_PERCENT / 100))
  const valorPrestador = pagamento ? pagamento.valor_prestador : Math.max(valorOrcamento - comissao, 0)
  const kz = (v: number) => `${v.toLocaleString('pt-AO')} Kz`

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-200 dark:border-surface-800">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <ArrowLeft size={22} className="text-surface-600 dark:text-surface-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-surface-900 dark:text-white truncate">{pedido.titulo}</h1>
            <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{pedido.categoria}</p>
          </div>
          <StatusBadge status={pedido.status} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5 pb-24 lg:pb-8">
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-error-light text-error rounded-xl px-4 py-3 text-sm font-medium">
            <AlertTriangle size={16} /> {error}
          </motion.div>
        )}

        {/* Info chips */}
        <div className="flex flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: urg.bg, color: urg.color }}>
            <AlertTriangle size={13} /> {urg.label}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
            <CatIcon size={13} color={cat.color} /> <span className="capitalize">{pedido.categoria}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400">
            <Clock size={13} /> {new Date(pedido.criado_em).toLocaleDateString('pt-AO')} {new Date(pedido.criado_em).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {pedido.referencia && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300">
              #{pedido.referencia}
            </span>
          )}
        </div>

        {/* Timeline */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800">
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-4">Estado do pedido</h3>
          {cancelado ? (
            <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-error-light text-error text-sm font-semibold">
              <XCircle size={18} /> Este pedido foi cancelado.
            </div>
          ) : (
            <div className="flex items-center">
              {PASSOS.map((passo, i) => {
                const Ic = passo.icon
                const active = i < currentIdx
                const current = i === currentIdx
                return (
                  <div key={passo.key} className="flex-1 flex flex-col items-center">
                    <div className="flex items-center w-full">
                      <div className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : active || current ? 'bg-brand-600' : 'bg-surface-200 dark:bg-surface-700'}`} />
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center border-2 shrink-0"
                        style={{
                          borderColor: active || current ? '#DC2626' : '#E5E7EB',
                          background: active || current ? '#DC2626' : 'transparent',
                          color: active || current ? '#fff' : '#9CA3AF',
                        }}
                      >
                        {active ? <CheckCircle size={16} /> : <Ic size={15} />}
                      </div>
                      <div className={`h-0.5 flex-1 ${i === PASSOS.length - 1 ? 'opacity-0' : active || current ? 'bg-brand-600' : 'bg-surface-200 dark:bg-surface-700'}`} />
                    </div>
                    <span className={`mt-1.5 text-[10px] font-semibold text-center ${current ? 'text-brand-600' : active ? 'text-surface-700 dark:text-surface-200' : 'text-surface-400'}`}>
                      {passo.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Tracking map */}
        {(tracking || pedidoLoc) && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl overflow-hidden border border-surface-200 dark:border-surface-800">
            <div className="h-56 relative">
              <LeafletMap
                center={mapCenter}
                height="224px"
                markers={
                  prestadorLoc
                    ? [{ id: 'prestador', lat: prestadorLoc.lat, lon: prestadorLoc.lon, color: '#DC2626', available: 'online', nome: tracking?.prestador?.nome }]
                    : []
                }
                route={prestadorLoc && pedidoLoc ? [prestadorLoc, pedidoLoc] : undefined}
              />
              {!prestadorLoc && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1001] bg-surface-900/80 text-white text-xs px-3 py-1.5 rounded-full whitespace-nowrap">
                  Local do atendimento
                </div>
              )}
            </div>
            {prestadorLoc && (
              <div className="p-4 flex items-center justify-between gap-3 border-t border-surface-100 dark:border-surface-800">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                    <Navigation size={16} className="text-brand-600" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{tracking?.prestador?.nome}</p>
                    {tracking?.distancia_km != null && (
                      <p className="text-xs text-surface-500">
                        a {tracking.distancia_km} km de si
                        {tracking.eta_min != null && <> · ~{tracking.eta_min} min</>}
                      </p>
                    )}
                  </div>
                </div>
                {tracking?.eta_min != null && (
                  <span className="text-2xl font-extrabold text-brand-600">{tracking.eta_min}<span className="text-xs font-semibold text-surface-400"> min</span></span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Problem description */}
        <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800">
          <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Descrição do problema</h3>
          <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed whitespace-pre-wrap">{pedido.descricao}</p>
        </div>

        {pedido.fotos && pedido.fotos.length > 0 && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
              <Camera size={14} /> Fotos ({pedido.fotos.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {pedido.fotos.map((foto: string, i: number) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-surface-200 dark:bg-surface-800">
                  <img src={foto} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* People */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800">
            <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-3">Pediu ajuda</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                {pedido.criador_foto ? (
                  <img src={pedido.criador_foto} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <span className="text-brand-600 font-bold text-sm">{pedido.criador_nome?.charAt(0) || <User size={16} />}</span>
                )}
              </div>
              <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{pedido.criador_nome || 'Anónimo'}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-200 dark:border-surface-800">
            <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-3">Profissional</p>
            {pedido.prestador_nome ? (
              <div className="flex items-center gap-3">
                {pedido.prestador_id && pedido.prestador_foto ? (
                  <img src={pedido.prestador_foto} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center">
                    <span className="text-surface-600 dark:text-surface-300 font-bold text-sm">{pedido.prestador_nome?.charAt(0)}</span>
                  </div>
                )}
                {isOwner && pedido.prestador_id ? (
                  <button onClick={() => navigate(`/profissional/${pedido.prestador_id}`)} className="text-sm font-semibold text-surface-900 dark:text-white truncate hover:text-brand-600">
                    {pedido.prestador_nome}
                  </button>
                ) : (
                  <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{pedido.prestador_nome}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-surface-500">A procurar profissional...</p>
            )}
          </div>
        </div>

        {/* Acordo de serviço — resumo claro do contrato entre cliente e profissional */}
        {pedido.prestador_nome && !cancelado && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-xl grad-brand flex items-center justify-center text-white shrink-0">
                <FileCheck size={16} />
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-surface-900 dark:text-white">Acordo de serviço</h3>
                <p className="text-[11px] text-surface-500">Condições combinadas entre as duas partes</p>
              </div>
              <StatusBadge status={pedido.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Cliente</p>
                <p className="font-semibold text-surface-900 dark:text-white truncate mt-0.5">{pedido.criador_nome || 'Anónimo'}</p>
              </div>
              <div className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Prestador</p>
                <p className="font-semibold text-surface-900 dark:text-white truncate mt-0.5">{pedido.prestador_nome}</p>
              </div>
              <div className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Serviço</p>
                <p className="font-semibold text-surface-900 dark:text-white truncate mt-0.5 capitalize">{pedido.categoria}</p>
              </div>
              <div className="rounded-xl bg-surface-50 dark:bg-surface-800 p-3">
                <p className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Valor acordado</p>
                <p className="font-bold text-brand-600 mt-0.5">
                  {valorOrcamento > 0 ? kz(valorOrcamento) : 'A definir'}
                </p>
              </div>
            </div>
            {valorOrcamento > 0 && (
              <div className="mt-3 space-y-1 text-xs text-surface-500">
                <div className="flex items-center justify-between">
                  <span>Comissão da plataforma ({TAXA_PLATAFORMA_PERCENT}%)</span>
                  <span className="font-semibold text-surface-700 dark:text-surface-300">{kz(comissao)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Valor para o prestador</span>
                  <span className="font-semibold text-surface-700 dark:text-surface-300">{kz(valorPrestador)}</span>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => navigate(`/chat/${pedido.id}`)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-bold hover:bg-brand-700 transition-colors"
              >
                <MessageCircle size={15} /> Combinar no chat
              </button>
              {pedido.prestador_id && (
                <button
                  onClick={() => navigate(`/profissional/${pedido.prestador_id}`)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-semibold text-surface-700 dark:text-surface-200"
                >
                  Ver perfil
                </button>
              )}
            </div>
          </div>
        )}

        {/* Orçamento e pagamento */}
        {(orcStatus !== 'nao_enviado' || (isPrestador && ['chegou', 'em_andamento'].includes(pedido.status))) && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Orçamento</h3>
              {orcMeta && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: orcMeta.bg, color: orcMeta.color }}>
                  {orcMeta.label}
                </span>
              )}
            </div>

            {/* Prestador: formulário de orçamento (reenviar se rejeitado) */}
            {isPrestador && ['chegou', 'em_andamento'].includes(pedido.status) && !['enviado', 'aprovado'].includes(orcStatus) && (
              <div className="space-y-3">
                {orcamentoItens.map((it, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <input
                      value={it.descricao}
                      onChange={(e) => mudarItem(i, 'descricao', e.target.value)}
                      placeholder="Descrição (ex.: mão de obra)"
                      className="flex-1 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm"
                    />
                    <input
                      value={it.valor || ''}
                      onChange={(e) => mudarItem(i, 'valor', e.target.value)}
                      placeholder="Kz"
                      inputMode="numeric"
                      className="w-28 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm"
                    />
                    {orcamentoItens.length > 1 && (
                      <button
                        onClick={() => setOrcamentoItens((prev) => prev.filter((_, idx) => idx !== i))}
                        className="p-2 rounded-xl hover:bg-error-light text-error"
                        aria-label="Remover item"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setOrcamentoItens((prev) => [...prev, { descricao: '', valor: 0 }])}
                  className="text-xs font-semibold text-brand-600"
                >
                  + Adicionar item
                </button>
                <textarea
                  value={orcamentoNota}
                  onChange={(e) => setOrcamentoNota(e.target.value)}
                  placeholder="Nota (garantia, condições, prazo...)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm resize-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-sm text-surface-500">Total</span>
                  <span className="text-2xl font-extrabold text-brand-600">{totalItens.toLocaleString('pt-AO')} Kz</span>
                </div>
                <button
                  onClick={doEnviarOrcamento}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Wrench size={18} />} Enviar orçamento ao cliente
                </button>
              </div>
            )}

            {/* Resumo do orçamento enviado */}
            {jaEnviado && (
              <div className="space-y-3">
                {pedido.orcamento_itens && pedido.orcamento_itens.length > 0 && (
                  <div className="divide-y divide-surface-100 dark:divide-surface-800">
                    {pedido.orcamento_itens.map((it, i) => (
                      <div key={i} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-surface-700 dark:text-surface-300">{it.descricao}</span>
                        <span className="font-semibold text-surface-900 dark:text-white">{it.valor.toLocaleString('pt-AO')} Kz</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-surface-100 dark:border-surface-800">
                  <span className="text-sm text-surface-500">Total</span>
                  <span className="text-2xl font-extrabold text-brand-600">
                    {(pedido.valor_acordado || pedido.valor || 0).toLocaleString('pt-AO')} Kz
                  </span>
                </div>
                {pedido.orcamento_nota && (
                  <p className="text-xs text-surface-500 bg-surface-50 dark:bg-surface-800 rounded-xl px-3 py-2">
                    {pedido.orcamento_nota}
                  </p>
                )}

                {orcStatus === 'enviado' && isOwner && !concluido && !cancelado && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => doReagirOrcamento('aprovar')}
                      disabled={actionLoading}
                      className="py-3 rounded-xl bg-success text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Aprovar
                    </button>
                    <button
                      onClick={() => doReagirOrcamento('rejeitar')}
                      disabled={actionLoading}
                      className="py-3 rounded-xl bg-transparent text-error border-2 border-error/30 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      Rejeitar
                    </button>
                  </div>
                )}

                {orcStatus === 'enviado' && isPrestador && (
                  <p className="text-xs text-surface-500">A aguardar aprovação do cliente.</p>
                )}

                {orcStatus === 'aprovado' && isPrestador && (
                  <div className="space-y-2 rounded-xl border border-surface-200 dark:border-surface-800 p-3">
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">A receber</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-surface-500">Valor acordado</span>
                      <span className="font-semibold text-surface-900 dark:text-white">{kz(valorOrcamento)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-surface-500">Comissão da plataforma ({TAXA_PLATAFORMA_PERCENT}%)</span>
                      <span className="font-semibold text-error">- {kz(comissao)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-surface-100 dark:border-surface-800">
                      <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">Recebes</span>
                      <span className="text-xl font-extrabold text-success">{kz(valorPrestador)}</span>
                    </div>
                    <p className="text-[11px] text-surface-400">
                      {pagamento
                        ? 'Valor dentro da plataforma até ser libertado após a conclusão.'
                        : 'Valor estimado após a comissão; o detalhe exato é gerado no pagamento.'}
                    </p>
                  </div>
                )}

                {orcStatus === 'aprovado' && isOwner && (
                  <div className="space-y-3 pt-2 border-t border-surface-100 dark:border-surface-800">
                    {!pagamento && (
                      <>
                        <div className="rounded-xl border border-surface-200 dark:border-surface-800 divide-y divide-surface-100 dark:divide-surface-800">
                          <div className="flex items-center justify-between py-2 text-sm">
                            <span className="text-surface-500">Valor do serviço</span>
                            <span className="font-semibold text-surface-900 dark:text-white">{kz(valorOrcamento)}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 text-sm">
                            <span className="text-surface-500">Comissão da plataforma ({TAXA_PLATAFORMA_PERCENT}%)</span>
                            <span className="font-semibold text-error">- {kz(comissao)}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 text-sm">
                            <span className="text-surface-500">O profissional recebe</span>
                            <span className="font-bold text-success">{kz(valorPrestador)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {METODOS_PAGAMENTO.map((m) => (
                            <button
                              key={m.value}
                              onClick={() => setMetodo(m.value)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                metodo === m.value
                                  ? 'bg-brand-600 text-white border-brand-600'
                                  : 'bg-surface-50 text-surface-600 border-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:border-surface-700'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={doGerarPagamento}
                          disabled={actionLoading}
                          className="w-full py-3 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Pagar agora
                        </button>
                      </>
                    )}

                    {pagamento && pagamento.status === 'pendente' && (
                      <div className="space-y-3">
                        <p className="text-sm text-surface-500">
                          Use o código abaixo no <span className="font-semibold text-surface-900 dark:text-white">{pagamento.metodo === 'multicaixa_express' ? 'Multicaixa Express' : pagamento.metodo}</span> para pagar{' '}
                          <span className="font-bold text-surface-900 dark:text-white">{pagamento.valor_total.toLocaleString('pt-AO')} Kz</span>.
                        </p>
                        <div className="bg-surface-900 text-white rounded-xl px-4 py-3 text-center">
                          <p className="text-[10px] uppercase tracking-widest text-surface-400">Referência de pagamento</p>
                          <p className="text-lg font-extrabold tracking-wider">{pagamento.rup}</p>
                        </div>
                        <button
                          onClick={doConfirmarPagamento}
                          disabled={actionLoading}
                          className="w-full py-3 rounded-xl bg-success text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Já efetuei o pagamento
                        </button>
                      </div>
                    )}

                    {pagamento && (pagamento.status === 'retido' || pagamento.status === 'libertado') && (
                      <p className="text-sm font-semibold text-success flex items-center gap-2">
                        <CheckCircle size={16} /> Pagamento confirmado — retido na plataforma até a conclusão.
                      </p>
                    )}
                  </div>
                )}

                {orcStatus === 'rejeitado' && isOwner && !concluido && !cancelado && (
                  <p className="text-xs text-surface-500">Rejeitou este orçamento. O profissional pode enviar uma nova proposta.</p>
                )}
              </div>
            )}

            {/* Libertar pagamento após conclusão */}
            {pagamento && pagamento.status === 'retido' && concluido && (isOwner || isPrestador) && (
              <button
                onClick={doLibertar}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-success text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Libertar pagamento ao prestador
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {/* Owner cancels */}
          {isOwner && !concluido && !cancelado && (
            <button
              onClick={doCancelar}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-transparent text-error border-2 border-error/30 rounded-xl font-semibold disabled:opacity-50"
            >
              <XCircle size={18} /> Cancelar pedido
            </button>
          )}

          {/* Provider assigned: progress */}
          {isPrestador && pedido.status === 'procurando' && (
            <button
              onClick={() => doStatus('a_caminho', 'Erro ao aceitar')}
              disabled={actionLoading}
              className="flex-1 py-3.5 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Aceitar e ir para o local
            </button>
          )}
          {isPrestador && pedido.status === 'a_caminho' && (
            <button
              onClick={() => doStatus('chegou', 'Erro ao atualizar')}
              disabled={actionLoading}
              className="flex-1 py-3.5 rounded-xl bg-warning text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />} Cheguei ao local
            </button>
          )}
          {isPrestador && pedido.status === 'chegou' && (
            <button
              onClick={() => doStatus('em_andamento', 'Erro ao iniciar')}
              disabled={actionLoading}
              className="flex-1 py-3.5 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Wrench size={18} />} Iniciar serviço
            </button>
          )}
          {(isPrestador && pedido.status === 'em_andamento') || (isOwner && pedido.status === 'em_andamento') ? (
            <button
              onClick={doConcluir}
              disabled={actionLoading}
              className="flex-1 py-3.5 rounded-xl bg-success text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Concluir serviço
            </button>
          ) : null}

          {/* Browsing provider accepts */}
          {!isOwner && !isPrestador && isProviderUser && !concluido && !cancelado && ['aberto', 'procurando'].includes(pedido.status) && (
            <button
              onClick={doAceitar}
              disabled={actionLoading}
              className="flex-1 py-3.5 rounded-xl bg-brand-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Aceitar pedido
            </button>
          )}

          {/* Chat — comunicação direta sempre em destaque */}
          {(isOwner || isPrestador) && !cancelado && (
            <button
              onClick={() => navigate(`/chat/${pedido.id}`)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-bold shadow-md shadow-brand-600/25 hover:bg-brand-700 transition-colors"
            >
              <MessageCircle size={18} /> Abrir conversa
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
