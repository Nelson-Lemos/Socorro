import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Search, SlidersHorizontal, Map as MapIcon, List, Building2, User, Loader2, RefreshCw, AlertCircle, X, Sparkles,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import ProfessionalCard from '../components/ProfessionalCard'
import LeafletMap from '../components/LeafletMap'
import { profissionaisApi } from '../api'
import type { ProfissionalOut } from '../api'
import { TODAS_CATEGORIAS, categoriasCorrespondentes, pontuarCorrespondencia, normalizarTexto } from '../constants'
import { getCurrentPosition, readSavedLocation, type Coords, LUANDA } from '../utils/geo'
import EmptyState from '../components/EmptyState'
import { SkeletonList } from '../components/LoadingSkeleton'

const DISTANCIAS = [
  { label: 'Até 1 km', value: 1 },
  { label: 'Até 5 km', value: 5 },
  { label: 'Até 10 km', value: 10 },
  { label: 'Qualquer', value: null },
]

export default function Procurar() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [q, setQ] = useState(params.get('q') || '')
  const [categoria, setCategoria] = useState(params.get('categoria') || '')
  const [tipo, setTipo] = useState<'profissional' | 'empresa' | ''>('')
  const [distancia, setDistancia] = useState<number | null>(null)
  const [soDisponivel, setSoDisponivel] = useState(true)
  const [view, setView] = useState<'lista' | 'mapa'>('lista')

  const [resultados, setResultados] = useState<ProfissionalOut[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [coords, setCoords] = useState<Coords | null>(readSavedLocation())
  const [gettingLocation, setGettingLocation] = useState(false)
  const [mapCenter, setMapCenter] = useState<Coords>(coords || LUANDA)
  const [centerKey, setCenterKey] = useState(0)
  const [debounce, setDebounce] = useState<ReturnType<typeof setTimeout> | null>(null)
  const mapSearched = useRef(false)
  const firstLoad = useRef(true)

  const buscar = async (opts?: { c?: Coords; rec?: number | null }) => {
    setLoading(true)
    setError('')
    try {
      const c = opts?.c || coords
      const dados = await profissionaisApi.pesquisar({
        q: q || undefined,
        categoria: categoria || undefined,
        tipo: tipo || undefined,
        disponivel: soDisponivel || undefined,
        raio: distancia ?? undefined,
        lat: c?.lat,
        lon: c?.lon,
        limit: 60,
      })
      setResultados(dados)
      if (opts?.rec !== undefined) setCenterKey((k) => k + 1)
      mapSearched.current = true
    } catch {
      setError('Não foi possível carregar os profissionais.')
    } finally {
      setLoading(false)
    }
  }

  const reload = () => {
    if (debounce) clearTimeout(debounce)
    setDebounce(setTimeout(() => buscar(), firstLoad.current ? 0 : 280))
    firstLoad.current = false
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categoria, tipo, distancia, soDisponivel])

  useEffect(() => {
    return () => { if (debounce) clearTimeout(debounce) }
  }, [debounce])

  const handleGetLocation = async () => {
    setGettingLocation(true)
    try {
      const c = await getCurrentPosition()
      setCoords(c)
      setMapCenter(c)
      setCenterKey((k) => k + 1)
      await buscar({ c })
    } catch {
      setError('Não foi possível obter a localização. Ative o GPS.')
    } finally {
      setGettingLocation(false)
    }
  }

  /* ── Ranking difuso instantâneo (resposta imediata, sem esperar a rede) ── */
  const ordenados = useMemo(() => {
    const termo = q.trim()
    if (!termo) return resultados
    const cats = categoriasCorrespondentes(termo, 0.78)
    const catLabels = cats.map((c) => normalizarTexto(c.label))
    const chave = (p: ProfissionalOut) => {
      const campos = [p.nome, p.nome_comercial, p.area_atuacao, p.categorias_servico, p.especialidades, p.competencias, p.bairro, p.municipio, p.localizacao]
      let s = 0
      for (const campo of campos) {
        if (!campo) continue
        s = Math.max(s, pontuarCorrespondencia(campo, termo))
      }
      // Áreas/categorias próximas contam como "relacionado"
      const areaNorm = normalizarTexto(p.area_atuacao || '')
      if (catLabels.some((l) => l && areaNorm.includes(l))) s = Math.max(s, 0.6)
      if ((p.status_atendimento || 'offline') === 'online') s += 0.06
      if (p.verificado) s += 0.03
      return s
    }
    return [...resultados].sort((a, b) => chave(b) - chave(a))
  }, [resultados, q])

  /* ── Sugestões de área/categoria para o termo ── */
  const sugestoes = useMemo(() => {
    const termo = q.trim()
    if (termo.length < 2) return []
    return categoriasCorrespondentes(termo, 0.8).slice(0, 4)
  }, [q])

  const markers = useMemo(
    () =>
      resultados
        .filter((p) => p.latitude != null && p.longitude != null)
        .map((p) => {
          return {
            id: p.id,
            lat: p.latitude!,
            lon: p.longitude!,
            color: p.status_atendimento === 'online' ? '#10B981' : p.status_atendimento === 'ocupado' ? '#F59E0B' : '#9CA3AF',
            available: p.status_atendimento,
            nome: p.nome,
          }
        }),
    [resultados],
  )

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Search input — sempre visível no topo */}
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-1 pb-3 bg-surface-50/90 dark:bg-surface-950/90 backdrop-blur-xl">
          <div className="relative">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Procurar por nome ou serviço (ex.: Eletricista, Ngola Motors...)"
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
            {q ? (
              <button onClick={() => setQ('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400" aria-label="Limpar">
                <X size={18} />
              </button>
            ) : (
              loading && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 animate-spin" />
            )}
          </div>

          {/* Sugestões de áreas relacionadas — aparecem logo, instantâneas */}
          {sugestoes.length > 0 && (
            <div className="flex items-center gap-2 mt-2.5 overflow-x-auto scrollbar-none">
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-surface-400 shrink-0">
                <Sparkles size={12} /> Perto deste termo
              </span>
              {sugestoes.map((c) => {
                const active = categoria === c.label
                return (
                  <button
                    key={c.id}
                    onClick={() => { setCategoria(active ? '' : c.label); setQ('') }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${active ? 'bg-brand-600 text-white' : 'bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-surface-600 dark:text-surface-300'}`}
                  >
                    {c.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Location + view toggle */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleGetLocation}
            disabled={gettingLocation}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 text-sm font-semibold text-surface-700 dark:text-surface-200"
          >
            {gettingLocation ? <Loader2 size={16} className="animate-spin" /> : <SlidersHorizontal size={16} />}
            {coords ? 'Usar posição atual' : 'Obter localização'}
          </button>
          <div className="flex rounded-xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-1">
            <button
              onClick={() => setView('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${view === 'lista' ? 'bg-surface-100 dark:bg-surface-800 text-brand-600' : 'text-surface-500'}`}
            >
              <List size={16} /> Lista
            </button>
            <button
              onClick={() => setView('mapa')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${view === 'mapa' ? 'bg-surface-100 dark:bg-surface-800 text-brand-600' : 'text-surface-500'}`}
            >
              <MapIcon size={16} /> Mapa
            </button>
          </div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCategoria('')}
            className={`px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${!categoria ? 'bg-brand-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'}`}
          >
            Todos
          </button>
          {TODAS_CATEGORIAS.map((cat) => {
            const active = categoria === cat.label
            return (
              <button
                key={cat.id}
                onClick={() => setCategoria(active ? '' : cat.label)}
                className={`px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${active ? 'bg-brand-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'}`}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={distancia ?? ''}
            onChange={(e) => setDistancia(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 outline-none font-medium"
          >
            {DISTANCIAS.map((d) => (
              <option key={d.label} value={d.value ?? ''}>
                {d.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSoDisponivel(!soDisponivel)}
            className={`px-3 py-2 rounded-full font-medium ${soDisponivel ? 'bg-success-light text-success' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'}`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-success mr-1.5 align-middle" />
            Disponíveis agora
          </button>
          {tipo === 'profissional' ? (
            <button onClick={() => setTipo('')} className="px-3 py-2 rounded-full bg-brand-600 text-white font-medium">
              <User size={12} className="inline mr-1" />Profissionais
            </button>
          ) : (
            <button
              onClick={() => setTipo('profissional')}
              className="px-3 py-2 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 font-medium"
            >
              <User size={12} className="inline mr-1" /> Profissionais
            </button>
          )}
          {tipo === 'empresa' ? (
            <button onClick={() => setTipo('')} className="px-3 py-2 rounded-full bg-brand-600 text-white font-medium">
              <Building2 size={12} className="inline mr-1" />Empresas
            </button>
          ) : (
            <button
              onClick={() => setTipo('empresa')}
              className="px-3 py-2 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300 font-medium"
            >
              <Building2 size={12} className="inline mr-1" /> Empresas
            </button>
          )}
        </div>

        {/* Map view */}
        {view === 'mapa' && (
          <div className="h-[420px] rounded-2xl overflow-hidden border border-surface-200 dark:border-surface-800 relative">
            <LeafletMap
              center={mapCenter}
              height="420px"
              markers={markers}
              onMarkerClick={(id) => nav(`/profissional/${id}`)}
              onMoveEnd={(c) => { setMapCenter(c); mapSearched.current = false }}
              centerKey={centerKey}
            />
            {!mapSearched.current && (
              <button
                onClick={() => { buscar({ c: mapCenter, rec: 1 }); }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-surface-900 shadow-lg text-sm font-semibold text-surface-800 dark:text-white"
              >
                <RefreshCw size={16} /> Pesquisar nesta área
              </button>
            )}
          </div>
        )}

        {/* Results */}
        <div className="space-y-3">
          {loading && resultados.length === 0 ? (
            <SkeletonList count={5} />
          ) : error ? (
            <EmptyState icon={<AlertCircle size={26} />} title="Erro" description={error} />
          ) : resultados.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-surface-900 rounded-2xl border border-dashed border-surface-300 dark:border-surface-700">
              <p className="font-semibold text-surface-800 dark:text-white">Nenhum profissional encontrado</p>
              <p className="text-sm text-surface-500 mt-1">
                {soDisponivel ? 'Experimente desativar o filtro "Disponíveis agora"' : 'Tente outro termo de pesquisa'}
              </p>
              {sugestoes.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {sugestoes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setQ(''); setCategoria(c.label) }}
                      className="px-3 py-1.5 rounded-full bg-surface-100 dark:bg-surface-800 text-xs font-semibold text-surface-700 dark:text-surface-200"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-surface-500">
                <b className="text-surface-800 dark:text-white">{ordenados.length}</b> {ordenados.length === 1 ? 'resultado' : 'resultados'}
                {q.trim() && <span className="text-surface-400"> · ordenados por semelhança com "{q.trim()}"</span>}
                {coords ? <> · perto de si</> : ''}
              </p>
              {ordenados.map((p) => (
                <ProfessionalCard key={p.id} pro={p} />
              ))}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
