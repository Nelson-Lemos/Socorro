import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronRight, MapPin, Star, Map as MapIcon, Loader2, Navigation, Search,
  ClipboardList, CheckCircle2, Clock, Wallet, PlusCircle, TrendingUp,
  Zap, Bell, ArrowUpRight, MessageCircle, History, Handshake, ShieldCheck,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { profissionaisApi, pedidosApi } from '../api'
import type { ProfissionalOut, PedidoOut } from '../api'
import { CATEGORIAS_PRINCIPAIS, STATUS_ATENDIMENTO, STATUS_PEDIDO } from '../constants'
import { getCurrentPosition, saveLocation, readSavedLocation, type Coords, LUANDA, formatDist } from '../utils/geo'
import Avatar from '../components/Avatar'
import { SkeletonList } from '../components/LoadingSkeleton'

const URGENCIA_CFG: Record<string, { label: string; color: string }> = {
  urgente: { label: 'Urgente', color: '#DC2626' },
  moderada: { label: 'Moderada', color: '#F59E0B' },
  planeada: { label: 'Planeada', color: '#3B82F6' },
}

export default function Dashboard() {
  const { user } = useAuth()
  const nav = useNavigate()

  const [pros, setPros] = useState<ProfissionalOut[]>([])
  const [prosLoading, setProsLoading] = useState(true)
  const [pedidos, setPedidos] = useState<PedidoOut[]>([])
  const [pedidosLoading, setPedidosLoading] = useState(true)
  const [coords, setCoords] = useState<Coords | null>(readSavedLocation())
  const [gettingLocation, setGettingLocation] = useState(false)
  const [busca, setBusca] = useState('')
  const [match, setMatch] = useState<PedidoOut[]>([])
  const [matchLoading, setMatchLoading] = useState(false)

  const isProvider = user?.tipo_conta === 'empresa' || !!user?.area_atuacao
  const isOnline = (user?.status_atendimento || 'offline') === 'online'
  const primeiroNome = (user?.nome_comercial || user?.nome || '').split(' ')[0]
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 19 ? 'Boa tarde' : 'Boa noite'

  const submitBusca = (e: React.FormEvent) => {
    e.preventDefault()
    nav(busca.trim() ? `/procurar?q=${encodeURIComponent(busca.trim())}` : '/procurar')
  }

  useEffect(() => {
    const loc = coords || LUANDA
    profissionaisApi
      .pesquisar({ lat: loc.lat, lon: loc.lon, raio: 15, limit: 5 })
      .then(setPros)
      .catch(() => setPros([]))
      .finally(() => setProsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    pedidosApi
      .listar(isProvider ? undefined : {})
      .then((lista) => setPedidos(Array.isArray(lista) ? lista : []))
      .catch(() => setPedidos([]))
      .finally(() => setPedidosLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProvider])

  useEffect(() => {
    if (!isProvider) return
    setMatchLoading(true)
    pedidosApi
      .matching()
      .then((lista) => setMatch(Array.isArray(lista) ? lista.slice(0, 4) : []))
      .catch(() => setMatch([]))
      .finally(() => setMatchLoading(false))
  }, [isProvider])

  const handleLocate = async () => {
    setGettingLocation(true)
    try {
      const c = await getCurrentPosition()
      setCoords(c)
      saveLocation(c)
      const dados = await profissionaisApi.pesquisar({ lat: c.lat, lon: c.lon, raio: 15, limit: 5 })
      setPros(dados)
    } catch {
      /* mantém os resultados atuais */
    } finally {
      setGettingLocation(false)
    }
  }

  // Estatísticas derivadas dos pedidos do utilizador
  const abertos = pedidos.filter((p) => !['concluido', 'cancelado'].includes(p.status)).length
  const emAndamento = pedidos.filter((p) => ['a_caminho', 'chegou', 'em_andamento'].includes(p.status)).length
  const concluidos = pedidos.filter((p) => p.status === 'concluido').length
  const receita = pedidos
    .filter((p) => p.status === 'concluido')
    .reduce((sum, p) => sum + (p.valor_acordado || p.valor || 0), 0)

  const recentes = pedidos
    .slice()
    .sort((a, b) => +new Date(b.criado_em) - +new Date(a.criado_em))
    .slice(0, 4)

  const localLabel =
    (user?.localizacao || '').split('|')[0].split('(')[0].trim() ||
    (coords ? `${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}` : 'Usar a minha localização')

  const stats = isProvider
    ? [
        { label: 'Pedidos ativos', value: abertos, Icon: ClipboardList, grad: 'grad-brand' },
        { label: 'Em andamento', value: emAndamento, Icon: Clock, grad: 'grad-amber' },
        { label: 'Concluídos', value: concluidos, Icon: CheckCircle2, grad: 'grad-emerald' },
        { label: 'Receita (AOA)', value: receita.toLocaleString('pt-AO'), Icon: Wallet, grad: 'grad-sky' },
      ]
    : [
        { label: 'Pedidos ativos', value: abertos, Icon: ClipboardList, grad: 'grad-brand' },
        { label: 'Em andamento', value: emAndamento, Icon: Clock, grad: 'grad-amber' },
        { label: 'Concluídos', value: concluidos, Icon: CheckCircle2, grad: 'grad-emerald' },
        { label: 'Profissionais disponíveis', value: pros.length, Icon: TrendingUp, grad: 'grad-violet' },
      ]

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-7">
        {/* ─── Cabeçalho de boas-vindas ─── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-3xl p-6 sm:p-7 text-white"
          style={{ backgroundImage: 'linear-gradient(135deg,#EF4444 0%,#DC2626 50%,#EA580C 130%)', boxShadow: '0 20px 40px -24px rgba(220,38,38,0.8)' }}
        >
          <div className="blob" style={{ width: 220, height: 220, background: '#FDBA74', top: -80, right: -40, opacity: 0.55 }} />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[13px] font-bold uppercase tracking-wider text-white/75">{saudacao}</p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-0.5 truncate">
                {primeiroNome ? `${primeiroNome}` : 'Olá'}
              </h1>
              <p className="text-sm text-white/85 mt-1.5 max-w-md">
                {isProvider
                  ? 'Gerencie os seus pedidos e mantenha o seu perfil atualizado para receber mais clientes.'
                  : 'Encontre rapidamente um profissional de confiança perto de si.'}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2">
              {isProvider ? (
                <button
                  onClick={() => nav('/perfil')}
                  className="flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/25 px-3.5 py-2 text-sm font-bold hover:bg-white/25 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: isOnline ? '#4ADE80' : '#E5E7EB', boxShadow: isOnline ? '0 0 0 4px rgba(74,222,128,0.3)' : 'none' }} />
                  {isOnline ? 'Disponível' : 'Offline'}
                  <ChevronRight size={15} />
                </button>
              ) : (
                <button onClick={() => nav('/pedir-socorro')} className="flex items-center gap-2 rounded-full bg-white text-brand-700 px-4 py-2.5 text-sm font-extrabold shadow-lg hover:scale-[1.03] transition-transform">
                  <PlusCircle size={16} /> Pedir socorro
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ─── Estatísticas ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map(({ label, value, Icon, grad }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
              className={`stat-card ${grad}`}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon size={17} />
                  </span>
                  <ArrowUpRight size={16} className="opacity-60" />
                </div>
                <p className="mt-3 text-2xl font-black tracking-tight truncate">{value}</p>
                <p className="text-[12px] font-semibold text-white/85 mt-0.5">{label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ─── Ações rápidas ─── */}
        <section>
          <h2 className="text-xs font-black text-surface-500 uppercase tracking-wider mb-3">
            {isProvider ? 'Painel da empresa' : 'Painel do cidadão'}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {isProvider ? (
              <>
                <QuickAction Icon={ClipboardList} label="Pedidos recebidos" desc="Responder a clientes" grad="grad-violet" onClick={() => nav('/pedidos')} />
                <QuickAction Icon={MessageCircle} label="Mensagens" desc="Falar com clientes" grad="grad-sky" onClick={() => nav('/conversas')} />
                <QuickAction Icon={Zap} label="Meu perfil" desc="Editar e verificar" grad="grad-amber" onClick={() => nav('/perfil')} />
                <QuickAction Icon={History} label="Histórico" desc="Tudo o que fez" grad="grad-emerald" onClick={() => nav('/historico')} />
              </>
            ) : (
              <>
                <QuickAction Icon={PlusCircle} label="Pedir socorro" desc="Descreva o problema" grad="grad-brand" onClick={() => nav('/pedir-socorro')} />
                <QuickAction Icon={Search} label="Procurar profissional" desc="Encontre quem precisa" grad="grad-sky" onClick={() => nav('/procurar')} />
                <QuickAction Icon={MessageCircle} label="Mensagens" desc="Conversas ativas" grad="grad-violet" onClick={() => nav('/conversas')} />
                <QuickAction Icon={History} label="Histórico" desc="Pedidos e serviços" grad="grad-emerald" onClick={() => nav('/historico')} />
              </>
            )}
          </div>
        </section>

        {/* ─── Oportunidades (empresa) / Ajuda rápida (cidadão) ─── */}
        {isProvider ? (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black text-surface-500 uppercase tracking-wider flex items-center gap-1.5">
                <Handshake size={13} /> Oportunidades para si
              </h2>
              <button onClick={() => nav('/pedidos')} className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Ver todas <ChevronRight size={14} />
              </button>
            </div>
            {matchLoading ? (
              <SkeletonList count={2} />
            ) : match.length === 0 ? (
              <div className="card-vivo p-5 flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl grad-emerald flex items-center justify-center shrink-0 text-white">
                  <CheckCircle2 size={20} />
                </span>
                <div>
                  <p className="text-sm font-bold text-surface-800 dark:text-surface-200">Sem novos pedidos na sua área</p>
                  <p className="text-xs text-surface-500 mt-0.5">Fique disponível para aparecer primeiro quando surgirem pedidos.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {match.map((p, i) => {
                  const urg = URGENCIA_CFG[p.urgencia] || URGENCIA_CFG.moderada
                  return (
                    <motion.button
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => nav(`/pedido/${p.id}`)}
                      className="card-vivo w-full p-4 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-10 h-10 rounded-xl grad-violet flex items-center justify-center shrink-0 text-white">
                          <Handshake size={18} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-surface-900 dark:text-white truncate">{p.titulo}</p>
                          <p className="text-xs text-surface-500 truncate mt-0.5 flex items-center gap-1">
                            <MapPin size={11} /> {p.localizacao || 'Local não indicado'} · {p.categoria}
                          </p>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${urg.color}1A`, color: urg.color }}>
                          {urg.label}
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="card-vivo p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="w-12 h-12 rounded-2xl grad-brand flex items-center justify-center shrink-0 text-white">
                <ShieldCheck size={22} />
              </span>
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-black text-surface-900 dark:text-white">Precisa de ajuda agora?</p>
                <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">
                  Descreva o problema, escolha a área e encontramos profissionais disponíveis perto de si — com histórico e avaliações.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => nav('/pedir-socorro')} className="btn-vivo" style={{ padding: '10px 18px', fontSize: 13.5 }}>
                  <PlusCircle size={15} /> Pedir socorro
                </button>
                <button onClick={() => nav('/procurar')} className="btn-ghost" style={{ padding: '10px 16px', fontSize: 13.5 }}>
                  <Search size={15} /> Procurar
                </button>
              </div>
            </div>
          </section>
        )}

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* ─── Pedidos recentes ─── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black text-surface-500 uppercase tracking-wider">Pedidos recentes</h2>
                <button onClick={() => nav('/pedidos')} className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  Ver todos <ChevronRight size={14} />
                </button>
              </div>

              {pedidosLoading ? (
                <SkeletonList count={3} />
              ) : recentes.length === 0 ? (
                <div className="card-vivo p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl grad-brand-soft flex items-center justify-center mx-auto mb-3">
                    <ClipboardList size={22} className="text-brand-600" />
                  </div>
                  <p className="text-sm font-bold text-surface-800 dark:text-surface-200">Ainda sem pedidos</p>
                  <p className="text-xs text-surface-500 mt-1">
                    {isProvider ? 'Os novos pedidos da sua área vão aparecer aqui.' : 'Crie o seu primeiro pedido de socorro.'}
                  </p>
                  {!isProvider && (
                    <button onClick={() => nav('/pedir-socorro')} className="btn-vivo mt-4" style={{ padding: '10px 18px', fontSize: 13.5 }}>
                      <PlusCircle size={15} /> Pedir socorro
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentes.map((p, i) => {
                    const st = STATUS_PEDIDO[p.status] || STATUS_PEDIDO.aberto
                    const urg = URGENCIA_CFG[p.urgencia] || URGENCIA_CFG.moderada
                    return (
                      <motion.button
                        key={p.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => nav(`/pedido/${p.id}`)}
                        className="card-vivo w-full p-4 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: st.bg }}>
                            <ClipboardList size={18} style={{ color: st.dot }} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-surface-900 dark:text-white truncate">{p.titulo}</p>
                            <p className="text-xs text-surface-500 truncate mt-0.5 flex items-center gap-1">
                              <MapPin size={11} /> {p.localizacao || 'Local não indicado'}
                            </p>
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.text }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
                              {st.label}
                            </span>
                            <p className="text-[11px] font-bold" style={{ color: urg.color }}>{urg.label}</p>
                          </div>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ─── Serviços ─── */}
            <section>
              <h2 className="text-xs font-black text-surface-500 uppercase tracking-wider mb-3">Serviços populares</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CATEGORIAS_PRINCIPAIS.map((cat, i) => {
                  const Icon = cat.icon
                  return (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ y: -4 }}
                      onClick={() => nav(`/procurar?categoria=${encodeURIComponent(cat.label)}`)}
                      className="card-vivo p-4 text-center"
                    >
                      <span className="w-11 h-11 rounded-2xl mx-auto flex items-center justify-center mb-2.5" style={{ background: `${cat.color}1A` }}>
                        <Icon size={20} style={{ color: cat.color }} />
                      </span>
                      <span className="block text-[13px] font-bold text-surface-900 dark:text-white">{cat.label}</span>
                      {cat.desc && <span className="block text-[11px] text-surface-500 mt-0.5 line-clamp-2">{cat.desc}</span>}
                    </motion.button>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* ─── Pesquisa ─── */}
            <section>
              <h2 className="text-xs font-black text-surface-500 uppercase tracking-wider mb-3">Encontrar profissional</h2>
              <form onSubmit={submitBusca} className="relative">
                <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome ou serviço…"
                  className="w-full pl-11 pr-3 py-3.5 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
                <button type="submit" className="btn-vivo absolute right-2 top-1/2 -translate-y-1/2" style={{ padding: '8px 14px', fontSize: 13 }}>
                  Procurar
                </button>
              </form>
            </section>

            {/* ─── Profissionais perto ─── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black text-surface-500 uppercase tracking-wider">Perto de si</h2>
                <button onClick={handleLocate} disabled={gettingLocation} className="text-[11px] text-surface-500 hover:text-brand-600 font-semibold flex items-center gap-1 max-w-[55%]">
                  {gettingLocation ? <Loader2 size={12} className="animate-spin shrink-0" /> : <MapPin size={12} color="#DC2626" className="shrink-0" />}
                  <span className="truncate">{localLabel}</span>
                  {!coords && !user?.localizacao && <Navigation size={11} className="shrink-0" />}
                </button>
              </div>

              {prosLoading ? (
                <SkeletonList count={3} />
              ) : pros.length === 0 ? (
                <div className="card-vivo p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl grad-brand-soft flex items-center justify-center mx-auto mb-3">
                    <MapPin size={22} className="text-brand-600" />
                  </div>
                  <p className="text-sm font-bold text-surface-800 dark:text-surface-200">Sem profissionais nesta área</p>
                  <p className="text-xs text-surface-500 mt-1">Tente ampliar o raio de pesquisa no mapa.</p>
                  <button onClick={() => nav('/mapa')} className="btn-ghost mt-4" style={{ padding: '9px 16px', fontSize: 13 }}>
                    <MapIcon size={15} /> Abrir mapa
                  </button>
                </div>
              ) : (
                <div className="card-vivo divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden !p-0">
                  {pros.map((pro) => {
                    const atd = STATUS_ATENDIMENTO[pro.status_atendimento || 'offline'] || STATUS_ATENDIMENTO.offline
                    return (
                      <button
                        key={pro.id}
                        onClick={() => nav(`/profissional/${pro.id}?lat=${coords?.lat ?? ''}&lon=${coords?.lon ?? ''}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                      >
                        <Avatar src={pro.logo || pro.foto_perfil} nome={pro.nome_comercial || pro.nome} size={44} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-surface-900 dark:text-white truncate">{pro.nome_comercial || pro.nome}</p>
                          <p className="text-xs text-surface-500 truncate capitalize mt-0.5">
                            {pro.area_atuacao || 'Profissional'} · {formatDist(pro.dist_km)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-surface-800 dark:text-surface-200 flex items-center gap-1 justify-end">
                            <Star size={11} className="text-amber-500" style={{ fill: '#F59E0B' }} />
                            {pro.avaliacao_media ? pro.avaliacao_media.toFixed(1) : '—'}
                          </p>
                          <p className="flex items-center gap-1 text-[11px] mt-0.5 justify-end text-surface-500">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: atd.dot }} />
                            {atd.label}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              <button onClick={() => nav('/mapa')} className="btn-ghost w-full mt-3" style={{ padding: '11px', fontSize: 13.5 }}>
                <MapIcon size={15} /> Ver todos no mapa
              </button>
            </section>

            {/* ─── Dica ─── */}
            <section className="card-vivo p-4 flex gap-3 items-start">
              <span className="w-9 h-9 rounded-xl grad-amber flex items-center justify-center shrink-0 text-white">
                <Bell size={16} />
              </span>
              <div>
                <p className="text-sm font-bold text-surface-900 dark:text-white">Dica Socorro!</p>
                <p className="text-xs text-surface-500 mt-0.5 leading-relaxed">
                  {isProvider
                    ? 'Responda aos pedidos em minutos — profissionais rápidos a responder aparecem primeiro na busca.'
                    : 'Ative a localização para ver profissionais mais perto e reduzir o tempo de chegada.'}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function QuickAction({
  Icon, label, desc, grad, onClick,
}: { Icon: any; label: string; desc: string; grad: string; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="card-vivo p-4 flex items-center gap-3 text-left"
    >
      <span className={`${grad} w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-surface-900 dark:text-white truncate">{label}</span>
        <span className="block text-[11px] text-surface-500 truncate">{desc}</span>
      </span>
    </motion.button>
  )
}
