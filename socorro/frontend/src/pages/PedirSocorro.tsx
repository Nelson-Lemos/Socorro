import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Search, Camera, X, MapPin, Navigation, Loader2, Star, Send, ExternalLink,
} from 'lucide-react'
import LeafletMap from '../components/LeafletMap'
import Avatar from '../components/Avatar'
import { pedidosApi, profissionaisApi } from '../api'
import type { PedidoOut, ProfissionalOut } from '../api'
import {
  CATEGORIAS_PRINCIPAIS, OUTRAS_CATEGORIAS, TODAS_CATEGORIAS, categoriaInfo, STATUS_ATENDIMENTO,
  pontuarCorrespondencia,
} from '../constants'
import { getCurrentPosition, saveLocation, readSavedLocation, LUANDA, type Coords, formatDist } from '../utils/geo'
import toast from 'react-hot-toast'

const SUB_SERVICOS: Record<string, string[]> = {
  Electricidade: ['Falta de energia', 'Reparação eléctrica', 'Instalação eléctrica', 'Curto-circuito', 'Iluminação', 'Outro'],
  Canalização: ['Cano a fugir', 'Torneira avariada', 'Sanita entupida', 'Instalação', 'Outro'],
  Climatização: ['Ar-condicionado avariado', 'Sem refrigeração', 'Instalação', 'Manutenção', 'Outro'],
  Mecânica: ['Avaria na via', 'Revisão', 'Bateria', 'Pneu', 'Outro'],
}
const OUTROS_SERVICOS = ['Reparação', 'Instalação', 'Manutenção', 'Emergência', 'Outro']

const QUANDO = [
  { id: 'urgente', label: 'Agora', desc: 'Preciso de ajuda imediata' },
  { id: 'moderada', label: 'Ainda hoje', desc: 'Posso esperar algumas horas' },
  { id: 'planeada', label: 'Agendar', desc: 'Escolho um dia conveniente' },
]

const PENDING_KEY = 'socorro_pedir_pending'
const stepVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -60 : 60, opacity: 0 }),
}

interface PendingForm {
  step: number
  categoria: string
  servico: string
  descricao: string
  urgencia: string
  referencia: string
  coords: Coords | null
  mapCenter: Coords | null
}

export default function PedirSocorro() {
  const nav = useNavigate()
  const [params] = useSearchParams()

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [categoria, setCategoria] = useState(params.get('categoria') || '')
  const [servico, setServico] = useState('')
  const [descricao, setDescricao] = useState('')
  const [urgencia, setUrgencia] = useState('')
  const [referencia, setReferencia] = useState('')

  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreview, setPhotoPreview] = useState<string[]>([])

  const [coords, setCoords] = useState<Coords | null>(readSavedLocation())
  const [mapCenter, setMapCenter] = useState<Coords>(coords || LUANDA)
  const [centerKey, setCenterKey] = useState(0)

  const [sub, setSub] = useState<'local' | 'results'>('local')
  const [pesquisando, setPesquisando] = useState(false)
  const [resultados, setResultados] = useState<ProfissionalOut[]>([])
  const [selected, setSelected] = useState<ProfissionalOut | null>(null)
  const [creating, setCreating] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [showAllServices, setShowAllServices] = useState(false)
  const [busca, setBusca] = useState('')

  const profissionalId = params.get('profissional')
  const [directPro, setDirectPro] = useState<ProfissionalOut | null>(null)

  // Preencher a partir de ?profissional=
  useEffect(() => {
    if (profissionalId) {
      profissionaisApi
        .obter(profissionalId)
        .then((pro) => {
          setDirectPro(pro)
          if (!categoria && pro.area_atuacao) {
            setCategoria(pro.area_atuacao)
            setStep(1)
          }
        })
        .catch(() => null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persistir progresso (ex.: ao abrir o perfil de um profissional e voltar)
  useEffect(() => {
    try {
      const pending: PendingForm = { step, categoria, servico, descricao, urgencia, referencia, coords, mapCenter }
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending))
    } catch {
      /* ignore */
    }
  }, [step, categoria, servico, descricao, urgencia, referencia, coords, mapCenter])

  // Restaurar progresso guardado
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY)
      if (!raw) return
      const p = JSON.parse(raw) as PendingForm
      if (typeof p.step === 'number' && p.step > 0 && typeof p.categoria === 'string') {
        setStep(p.step)
        setCategoria(p.categoria || '')
        setServico(p.servico || '')
        setDescricao(p.descricao || '')
        setUrgencia(p.urgencia || '')
        setReferencia(p.referencia || '')
        if (p.coords) setCoords(p.coords)
        if (p.mapCenter) setMapCenter(p.mapCenter)
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalSteps = 5

  const goBack = () => {
    if (step === 4 && sub === 'results') {
      setSub('local')
      setSelected(null)
      setResultados([])
      return
    }
    if (step > 0) {
      setDirection(-1)
      setStep((s) => s - 1)
    } else {
      nav(-1)
    }
  }

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newPhotos = Array.from(files).slice(0, 3 - photos.length)
    setPhotos((prev) => [...prev, ...newPhotos])
    newPhotos.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => setPhotoPreview((prev) => [...prev, ev.target?.result as string])
      reader.readAsDataURL(file)
    })
  }
  const handlePhotoRemove = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreview((prev) => prev.filter((_, i) => i !== index))
  }

  const handleGetLocation = async () => {
    setGettingLocation(true)
    try {
      const c = await getCurrentPosition()
      setCoords(c)
      saveLocation(c)
      setMapCenter(c)
      setCenterKey((k) => k + 1)
    } catch {
      toast.error('Não foi possível obter a localização')
    } finally {
      setGettingLocation(false)
    }
  }

  const buildTitulo = () => {
    const base = servico || 'Serviço'
    return base.length >= 5 ? base : `${categoria} · ${base}`
  }

  const criarPedido = async (prestadorId?: string) => {
    setCreating(true)
    try {
      const c = coords || mapCenter
      const res: PedidoOut = await pedidosApi.criar({
        titulo: buildTitulo(),
        categoria,
        descricao,
        localizacao: `${referencia || 'Luanda'} | ${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}`,
        latitude: c.lat,
        longitude: c.lon,
        urgencia,
        referencia,
        prestador_id: prestadorId,
      })
      for (const f of photos) {
        await pedidosApi.uploadFoto(res.id, f).catch(() => null)
      }
      sessionStorage.removeItem(PENDING_KEY)
      nav(`/pedido/${res.id}`)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Erro ao criar o pedido')
      setCreating(false)
    }
  }

  const startSearch = async () => {
    setPesquisando(true)
    setSelected(null)
    setResultados([])
    setSub('results')
    const c = coords || mapCenter
    if (directPro) {
      setResultados([directPro])
      setPesquisando(false)
      return
    }
    try {
      const dados = await profissionaisApi.pesquisar({
        categoria: categoria || undefined,
        lat: c.lat,
        lon: c.lon,
        raio: 25,
        limit: 60,
      })
      setResultados(dados)
    } catch {
      setResultados([])
    } finally {
      setPesquisando(false)
    }
  }

  const markers = resultados
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: p.id,
      lat: p.latitude!,
      lon: p.longitude!,
      color:
        p.status_atendimento === 'online'
          ? '#10B981'
          : p.status_atendimento === 'ocupado'
            ? '#F59E0B'
            : '#9CA3AF',
      available: p.status_atendimento,
      nome: p.nome,
      active: selected?.id === p.id,
    }))

  const cat = categoriaInfo(categoria)
  const CatIcon = cat.icon
  const servicosDaCategoria = SUB_SERVICOS[categoria] || OUTROS_SERVICOS
  const catBusca = busca.trim()
  const resultadosBusca = catBusca
    ? TODAS_CATEGORIAS
        .map((c) => ({
          cat: c,
          score: Math.max(
            pontuarCorrespondencia(c.label, catBusca),
            ...c.keywords.map((k) => pontuarCorrespondencia(k, catBusca)),
          ),
        }))
        .filter((r) => r.score >= 0.7)
        .sort((a, b) => b.score - a.score)
        .map((r) => r.cat)
    : []

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-[1200] bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-200 dark:border-surface-800">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3.5">
          <button onClick={goBack} className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
            <ChevronLeft size={20} className="text-surface-600 dark:text-surface-300" />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-base font-bold text-surface-900 dark:text-surface-50">Pedir ajuda</h1>
            <span className="text-xs font-medium text-surface-400">Passo {Math.min(step + 1, totalSteps)} de {totalSteps}</span>
          </div>
          <div className="w-10" />
        </div>
        <div className="h-1 bg-surface-100 dark:bg-surface-800">
          <motion.div
            className="h-full bg-brand-600"
            animate={{ width: `${((Math.min(step, 4) + 1) / totalSteps) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.26 }}
            className={step === 4 ? 'flex-1 flex flex-col' : 'px-4 py-6'}
          >
            {/* ───── Passo 0 — O que precisa? ───── */}
            {step === 0 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">O que precisa de resolver?</h2>
                  <p className="text-sm text-surface-500 mt-1">Escolha um serviço ou procure por palavra-chave.</p>
                </div>

                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Procurar serviço"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-sm text-surface-900 dark:text-surface-50 placeholder-surface-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>

                {catBusca ? (
                  <div className="divide-y divide-surface-100 dark:divide-surface-800 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
                    {resultadosBusca.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-surface-500">Nenhum serviço encontrado para "{busca}".</p>
                    ) : (
                      resultadosBusca.map((c) => {
                        const Icon = c.icon
                        return (
                          <button
                            key={c.id}
                            onClick={() => { setCategoria(c.label); setSelected(null); setDirection(1); setStep(1) }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-50 dark:hover:bg-surface-800"
                          >
                            <span className="w-9 h-9 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                              <Icon size={18} className="text-surface-600 dark:text-surface-300" />
                            </span>
                            <span className="text-sm font-semibold text-surface-900 dark:text-white">{c.label}</span>
                          </button>
                        )
                      })
                    )}
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-xs font-bold text-surface-400 uppercase tracking-wide mb-3">Serviços principais</p>
                      <div className="grid grid-cols-2 gap-3">
                        {CATEGORIAS_PRINCIPAIS.map((c) => {
                          const Icon = c.icon
                          return (
                            <button
                              key={c.id}
                              onClick={() => { setCategoria(c.label); setDirection(1); setStep(1) }}
                              className="flex flex-col items-start gap-3 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-4 text-left hover:border-surface-300 dark:hover:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                            >
                              <span className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                                <Icon size={20} className="text-surface-600 dark:text-surface-300" />
                              </span>
                              <span className="text-sm font-semibold text-surface-900 dark:text-white">{c.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {showAllServices ? (
                      <div>
                        <p className="text-xs font-bold text-surface-400 uppercase tracking-wide mb-3">Outros serviços</p>
                        <div className="divide-y divide-surface-100 dark:divide-surface-800 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
                          {OUTRAS_CATEGORIAS.map((c) => {
                            const Icon = c.icon
                            return (
                              <button
                                key={c.id}
                                onClick={() => { setCategoria(c.label); setDirection(1); setStep(1) }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800"
                              >
                                <span className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                                  <Icon size={16} className="text-surface-600 dark:text-surface-300" />
                                </span>
                                <span className="text-sm font-medium text-surface-800 dark:text-surface-200">{c.label}</span>
                              </button>
                            )
                          })}
                        </div>
                        <button onClick={() => setShowAllServices(false)} className="mt-3 text-sm font-semibold text-brand-600">
                          Mostrar menos
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setShowAllServices(true)} className="text-sm font-semibold text-brand-600 flex items-center gap-1">
                        Ver todos os serviços <ChevronLeft size={14} className="rotate-180" />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ───── Passo 1 — Tipo de ajuda ───── */}
            {step === 1 && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                    <CatIcon size={20} className="text-surface-600 dark:text-surface-300" />
                  </span>
                  <div>
                    <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">{categoria}</h2>
                    <p className="text-sm text-surface-500">Que tipo de ajuda precisa?</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {servicosDaCategoria.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setServico(s); setDirection(1); setStep(2) }}
                      className="w-full flex items-center justify-between rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-4 py-3.5 text-left hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/40 dark:hover:bg-brand-900/10 transition-colors"
                    >
                      <span className="text-sm font-medium text-surface-800 dark:text-surface-200">{s}</span>
                      <ChevronLeft size={16} className="text-surface-300 rotate-180" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ───── Passo 2 — Descrever o problema ───── */}
            {step === 2 && (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-xs font-semibold text-surface-400 uppercase tracking-wide">
                    {categoria} · {servico}
                  </p>
                  <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50 mt-1">Conte-nos o que aconteceu.</h2>
                </div>

                <div className="flex flex-col gap-1.5">
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    maxLength={500}
                    rows={4}
                    placeholder="Ex.: A energia da minha casa foi abaixo e o quadro não liga..."
                    className="w-full px-4 py-3.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl text-sm text-surface-900 dark:text-surface-50 placeholder-surface-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none"
                  />
                  <p className={`text-xs ${descricao.trim().length >= 10 ? 'text-success' : 'text-surface-400'}`}>
                    {descricao.trim().length}/10 caracteres mínimos
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                    Adicionar foto <span className="text-surface-400 font-normal">(opcional)</span>
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    <AnimatePresence mode="popLayout">
                      {photoPreview.map((src, i) => (
                        <motion.div
                          key={src}
                          initial={{ scale: 0.85, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.85, opacity: 0 }}
                          className="relative aspect-square rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700"
                        >
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => handlePhotoRemove(i)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                          >
                            <X size={12} className="text-white" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {photos.length < 3 && (
                      <label className="aspect-square rounded-xl border border-dashed border-surface-300 dark:border-surface-700 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-surface-400 transition-colors">
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoAdd} />
                        <Camera size={18} className="text-surface-400" />
                        <span className="text-[10px] font-medium text-surface-400">Adicionar</span>
                      </label>
                    )}
                  </div>
                </div>

                <button
                  disabled={descricao.trim().length < 10}
                  onClick={() => { setDirection(1); setStep(3) }}
                  className={`w-full py-3.5 rounded-xl text-[15px] font-semibold transition-all ${
                    descricao.trim().length >= 10
                      ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.99]'
                      : 'bg-surface-200 dark:bg-surface-800 text-surface-400 cursor-not-allowed'
                  }`}
                >
                  Continuar
                </button>
              </div>
            )}

            {/* ───── Passo 3 — Quando precisa? ───── */}
            {step === 3 && (
              <div className="flex flex-col gap-5">
                <div>
                  <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">Quando precisa de ajuda?</h2>
                  <p className="text-sm text-surface-500 mt-1">Isto ajuda os profissionais a priorizar.</p>
                </div>

                <div className="flex flex-col gap-2">
                  {QUANDO.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => { setUrgencia(q.id); setDirection(1); setStep(4) }}
                      className="w-full flex items-center justify-between rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-4 py-4 text-left hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                    >
                      <span>
                        <span className="block text-[15px] font-semibold text-surface-900 dark:text-white">{q.label}</span>
                        <span className="block text-xs text-surface-500 mt-0.5">{q.desc}</span>
                      </span>
                      <ChevronLeft size={18} className="text-surface-300 rotate-180 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ───── Passo 4 — Onde? · Procurar ───── */}
            {step === 4 && (
              sub === 'local' ? (
                <div className="px-4 py-6 flex flex-col gap-5">
                  <div>
                    <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">Onde precisa de ajuda?</h2>
                    <p className="text-sm text-surface-500 mt-1">Arraste o mapa para ajustar o ponto. A localização exata só é partilhada com o profissional aceite.</p>
                  </div>

                  <div className="h-64 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-800 relative">
                    <LeafletMap
                      center={mapCenter}
                      height="100%"
                      centerKey={centerKey}
                      markers={[]}
                      pickup={mapCenter}
                      onMoveEnd={(c) => setMapCenter(c)}
                      onPick={(c) => setMapCenter(c)}
                    />
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={gettingLocation}
                      className="absolute top-3 right-3 z-[1001] w-10 h-10 rounded-full bg-white dark:bg-surface-900 shadow-md flex items-center justify-center"
                    >
                      {gettingLocation ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} className="text-brand-600" />}
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-surface-700 dark:text-surface-300">Referência / detalhes do local</label>
                    <input
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      placeholder='Ex.: "Portão azul, 2º andar, perto do mercado"'
                      className="w-full px-4 py-3 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl text-sm text-surface-900 dark:text-surface-50 placeholder-surface-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                    <p className="px-4 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-sm text-surface-600 dark:text-surface-300 font-mono">
                      {mapCenter.lat.toFixed(4)}, {mapCenter.lon.toFixed(4)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-100 dark:bg-surface-800 text-xs text-surface-500">
                    <MapPin size={14} className="shrink-0 text-brand-600" />
                    {categoria}{servico ? ` · ${servico}` : ''} · {QUANDO.find((q) => q.id === urgencia)?.label || ''}
                  </div>

                  <button
                    onClick={startSearch}
                    className="w-full py-3.5 rounded-xl bg-brand-600 text-white text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-brand-700 active:scale-[0.99] transition-all"
                  >
                    Procurar profissional
                  </button>
                </div>
              ) : (
                /* Resultados — mapa como protagonista */
                <div className="flex-1 flex flex-col lg:flex-row">
                  <div className="relative h-[42vh] lg:h-full lg:flex-1">
                    <LeafletMap
                      center={mapCenter}
                      height="100%"
                      markers={markers}
                      onMarkerClick={(id) => {
                        const p = resultados.find((r) => r.id === id)
                        if (p) setSelected(p)
                      }}
                    />
                    {pesquisando && (
                      <div className="absolute inset-0 z-[1000] bg-surface-50/90 dark:bg-surface-950/90 flex flex-col items-center justify-center gap-3">
                        <Loader2 size={22} className="animate-spin text-brand-600" />
                        <p className="text-sm font-medium text-surface-700 dark:text-surface-200">A procurar profissionais perto de si...</p>
                      </div>
                    )}
                    {!pesquisando && (
                      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-surface-900/85 text-white text-xs px-3.5 py-2 rounded-full shadow-lg">
                        {resultados.length} profissionais encontrados
                      </div>
                    )}
                  </div>

                  <div className="flex-1 lg:w-[400px] lg:flex-none lg:border-l border-surface-200 dark:border-surface-800 flex flex-col">
                    {selected ? (
                      /* Detalhe do profissional escolhido */
                      <div className="flex-1 overflow-y-auto p-4">
                        <div className="flex items-start gap-3">
                          <Avatar src={selected.foto_perfil} nome={selected.nome} size={52} />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-surface-900 dark:text-white truncate">{selected.nome}</p>
                            <p className="text-sm text-surface-500 capitalize">{selected.area_atuacao || 'Profissional'}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-surface-600 dark:text-surface-300">
                              <span className="flex items-center gap-1">
                                <Star size={12} className="text-amber-500" style={{ fill: '#F59E0B' }} />
                                <b>{selected.avaliacao_media ? selected.avaliacao_media.toFixed(1) : '—'}</b>
                                <span className="text-surface-400">({selected.total_avaliacoes})</span>
                              </span>
                              <span className="flex items-center gap-1"><MapPin size={12} color="#DC2626" /> {formatDist(selected.dist_km)}</span>
                            </div>
                          </div>
                          <button onClick={() => setSelected(null)} className="text-surface-400 p-1 -mt-1">
                            <X size={18} />
                          </button>
                        </div>

                        {selected.descricao && (
                          <p className="mt-3 text-sm text-surface-600 dark:text-surface-300 line-clamp-3">{selected.descricao}</p>
                        )}

                        <div className="flex gap-2.5 mt-4">
                          <button
                            onClick={() => nav(`/profissional/${selected.id}`)}
                            className="flex-1 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-sm font-semibold"
                          >
                            Ver perfil
                          </button>
                          <button
                            onClick={() => criarPedido(selected.id)}
                            disabled={creating}
                            className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {creating ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Solicitar serviço
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Lista de profissionais */
                      <div className="flex-1 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-800">
                        {pesquisando ? null : resultados.length === 0 ? (
                          <p className="px-4 py-8 text-sm text-surface-500 leading-relaxed">
                            Nenhum profissional encontrado agora nesta área.
                            Pode publicar o pedido na mesma — os profissionais disponíveis serão notificados.
                          </p>
                        ) : (
                          resultados.map((p) => {
                            const pc = categoriaInfo(p.area_atuacao)
                            const Icon = pc.icon
                            const atd = STATUS_ATENDIMENTO[p.status_atendimento || 'offline'] || STATUS_ATENDIMENTO.offline
                            return (
                              <button
                                key={p.id}
                                onClick={() => setSelected(p)}
                                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                              >
                                <Avatar src={p.foto_perfil} nome={p.nome} size={44} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{p.nome}</p>
                                  <p className="text-xs text-surface-500 mt-0.5 flex items-center gap-1">
                                    <Icon size={12} className="text-surface-400 shrink-0" />
                                    <span className="capitalize truncate">{p.area_atuacao || 'Profissional'}</span>
                                    <span className="text-surface-300">·</span>
                                    {formatDist(p.dist_km)}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-1 justify-end">
                                    <Star size={11} className="text-amber-500" style={{ fill: '#F59E0B' }} />
                                    {p.avaliacao_media ? p.avaliacao_media.toFixed(1) : '—'}
                                  </p>
                                  <p className="flex items-center gap-1 text-[11px] mt-0.5 justify-end text-surface-500">
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: atd.dot }} />
                                    {atd.label}
                                  </p>
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>
                    )}

                    <div className="p-4 border-t border-surface-200 dark:border-surface-800">
                      <button
                        onClick={() => criarPedido(undefined)}
                        disabled={creating}
                        className="w-full py-3.5 rounded-xl bg-white dark:bg-surface-900 border border-brand-600 text-brand-600 dark:text-brand-400 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {creating ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
                        Procurar o profissional mais próximo
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}