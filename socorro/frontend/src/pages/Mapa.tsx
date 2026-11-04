import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, RefreshCw, Navigation, X, Star, MapPin, ChevronRight } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import LeafletMap from '../components/LeafletMap'
import Avatar from '../components/Avatar'
import { profissionaisApi } from '../api'
import type { ProfissionalOut } from '../api'
import { categoriaInfo, STATUS_ATENDIMENTO } from '../constants'
import { getCurrentPosition, saveLocation, readSavedLocation, LUANDA, type Coords, formatDist } from '../utils/geo'

function ProRow({ pro, onSelect }: { pro: ProfissionalOut; onSelect: (p: ProfissionalOut) => void }) {
  const cat = categoriaInfo(pro.area_atuacao)
  const Icon = cat.icon
  const atd = STATUS_ATENDIMENTO[pro.status_atendimento || 'offline'] || STATUS_ATENDIMENTO.offline
  return (
    <button
      onClick={() => onSelect(pro)}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
    >
      <Avatar src={pro.foto_perfil} nome={pro.nome} size={42} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{pro.nome}</p>
        <p className="text-xs text-surface-500 mt-0.5 flex items-center gap-1">
          <Icon size={13} className="text-surface-400 shrink-0" />
          <span className="capitalize truncate">{pro.area_atuacao || 'Profissional'}</span>
          <span className="text-surface-300">·</span>
          {formatDist(pro.dist_km)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-1 justify-end">
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
}

export default function Mapa() {
  const nav = useNavigate()
  const [resultados, setResultados] = useState<ProfissionalOut[]>([])
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState<Coords | null>(readSavedLocation())
  const [mapCenter, setMapCenter] = useState<Coords>(coords || LUANDA)
  const [centerKey, setCenterKey] = useState(0)
  const [selected, setSelected] = useState<ProfissionalOut | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [moving, setMoving] = useState(false)
  const moved = useRef(false)

  const buscar = async (c: Coords) => {
    setLoading(true)
    try {
      const dados = await profissionaisApi.pesquisar({
        lat: c.lat,
        lon: c.lon,
        raio: 10,
        limit: 80,
      })
      setResultados(dados)
    } catch {
      setResultados([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    buscar(coords || LUANDA)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGetLocation = async () => {
    setLoading(true)
    try {
      const c = await getCurrentPosition()
      setCoords(c)
      saveLocation(c)
      setMapCenter(c)
      setCenterKey((k) => k + 1)
      await buscar(c)
    } catch {
      setCoords(LUANDA)
      setMapCenter(LUANDA)
      setCenterKey((k) => k + 1)
      await buscar(LUANDA)
    } finally {
      setLoading(false)
    }
  }

  const focusPro = (p: ProfissionalOut) => {
    setSelected(p)
    if (p.latitude != null && p.longitude != null) {
      setMapCenter({ lat: p.latitude, lon: p.longitude })
      setCenterKey((k) => k + 1)
    }
  }

  const markers = useMemo(
    () =>
      resultados
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
        })),
    [resultados, selected],
  )

  const handleMoveEnd = (c: Coords) => {
    setMapCenter(c)
    moved.current = true
    setMoving(true)
  }

  const handleSearchHere = () => {
    setCenterKey((k) => k + 1)
    buscar(mapCenter)
    moved.current = false
    setMoving(false)
  }

  return (
    <DashboardLayout>
      <div className="relative h-[calc(100dvh-9rem)] lg:h-screen w-full overflow-hidden">
        <LeafletMap
          center={mapCenter}
          height="100%"
          markers={markers}
          onMarkerClick={(id) => {
            const p = resultados.find((r) => r.id === id)
            if (p) focusPro(p)
          }}
          onMoveEnd={handleMoveEnd}
          centerKey={centerKey}
        />

        {/* Loading */}
        {loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-surface-900/85 text-white text-xs px-3.5 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <Loader2 size={14} className="animate-spin" /> A procurar profissionais...
          </div>
        )}

        {/* Pesquisar nesta área */}
        {moving && !loading && (
          <button
            onClick={handleSearchHere}
            className="absolute bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-surface-900 shadow-lg text-sm font-semibold text-surface-800 dark:text-white"
          >
            <RefreshCw size={16} /> Pesquisar nesta área
          </button>
        )}

        {/* Empty state */}
        {!loading && resultados.length === 0 && !moving && (
          <div className="absolute inset-x-0 bottom-24 lg:bottom-8 flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto bg-white dark:bg-surface-900 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-800 px-5 py-4 max-w-sm w-full text-center">
              <p className="text-sm font-semibold text-surface-900 dark:text-white">Nenhum profissional encontrado</p>
              <p className="text-xs text-surface-500 mt-1">
                Tente aumentar a área de pesquisa ou escolher outra categoria.
              </p>
              <button
                onClick={handleSearchHere}
                className="mt-3 w-full py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-sm font-semibold text-surface-700 dark:text-surface-200"
              >
                Pesquisar novamente
              </button>
            </div>
          </div>
        )}

        {/* Minha posição */}
        <button
          onClick={handleGetLocation}
          className="absolute right-4 bottom-20 lg:bottom-6 z-[1000] w-11 h-11 rounded-full bg-white dark:bg-surface-900 shadow-lg flex items-center justify-center text-brand-600 dark:text-brand-400"
          title="Minha posição"
        >
          {loading ? <Loader2 size={19} className="animate-spin" /> : <Navigation size={19} />}
        </button>

        {/* Desktop: painel de lista */}
        <aside className="hidden lg:flex absolute inset-y-4 left-4 w-80 z-[1000] flex-col bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-800 flex items-center justify-between">
            <p className="text-sm font-bold text-surface-900 dark:text-white">
              {resultados.length} profissionais perto de si
            </p>
            {loading && <Loader2 size={14} className="animate-spin text-surface-400" />}
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-800">
            {resultados.length === 0 && !loading ? (
              <p className="px-4 py-6 text-sm text-surface-500">Ainda não existem profissionais nesta área.</p>
            ) : (
              resultados.map((p) => <ProRow key={p.id} pro={p} onSelect={focusPro} />)
            )}
          </div>
        </aside>

        {/* Mobile: pill para abrir a lista */}
        <button
          onClick={() => setListOpen((v) => !v)}
          className={`lg:hidden absolute left-1/2 z-[1000] -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-900/90 text-white text-sm font-semibold shadow-lg transition-all ${
            moving || loading ? 'bottom-20' : 'bottom-6'
          }`}
        >
          {listOpen ? <X size={16} /> : <ChevronRight size={16} className="rotate-90" />}
          {resultados.length} profissionais perto de si
        </button>

        {/* Mobile: bottom sheet da lista */}
        <AnimatePresence>
          {listOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 z-[1500] bg-black/20"
                onClick={() => setListOpen(false)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                className="lg:hidden fixed bottom-0 inset-x-0 z-[1500] bg-white dark:bg-surface-900 rounded-t-2xl flex flex-col max-h-[55vh] shadow-2xl"
              >
                <div className="pt-2.5 pb-1 flex justify-center">
                  <span className="w-9 h-1 rounded-full bg-surface-300 dark:bg-surface-700" />
                </div>
                <div className="px-5 pb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-surface-900 dark:text-white">
                    {resultados.length} profissionais perto de si
                  </p>
                  <button onClick={() => setListOpen(false)} className="text-surface-400 p-1">
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-surface-100 dark:divide-surface-800 pb-10">
                  {resultados.length === 0 && !loading ? (
                    <p className="px-5 py-6 text-sm text-surface-500">Ainda não existem profissionais nesta área.</p>
                  ) : (
                    resultados.map((p) => (
                      <ProRow
                        key={p.id}
                        pro={p}
                        onSelect={(pro) => {
                          focusPro(pro)
                          setListOpen(false)
                        }}
                      />
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Detalhe do profissional selecionado */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ y: 120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 120, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed bottom-0 inset-x-0 z-[1600] px-3 pb-3 lg:bottom-4 lg:px-0"
            >
              <div className="bg-white dark:bg-surface-900 lg:rounded-2xl rounded-t-2xl border border-surface-200 dark:border-surface-800 shadow-2xl lg:max-w-md lg:mx-auto">
                <div className="pt-2.5 pb-1 flex justify-center lg:hidden">
                  <span className="w-9 h-1 rounded-full bg-surface-300 dark:bg-surface-700" />
                </div>
                <div className="px-5 py-3 flex items-start gap-3">
                  <Avatar src={selected.foto_perfil} nome={selected.nome} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-surface-900 dark:text-white truncate">{selected.nome}</p>
                      <span className="flex items-center gap-1 text-[11px] font-semibold shrink-0" style={{ color: STATUS_ATENDIMENTO[selected.status_atendimento || 'offline'].dot }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_ATENDIMENTO[selected.status_atendimento || 'offline'].dot }} />
                        {STATUS_ATENDIMENTO[selected.status_atendimento || 'offline'].label}
                      </span>
                    </div>
                    <p className="text-sm text-surface-500 capitalize">{selected.area_atuacao || 'Profissional'}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-surface-600 dark:text-surface-300">
                      <span className="flex items-center gap-1">
                        <Star size={12} className="text-amber-500" style={{ fill: '#F59E0B' }} />
                        <b>{selected.avaliacao_media ? selected.avaliacao_media.toFixed(1) : '—'}</b>
                        <span className="text-surface-400">({selected.total_avaliacoes})</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={12} color="#DC2626" /> {formatDist(selected.dist_km)}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-surface-400 p-1 -mt-1">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex gap-2.5 px-5 pb-5">
                  <button
                    onClick={() => nav(`/profissional/${selected.id}`)}
                    className="flex-1 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-sm font-semibold"
                  >
                    Ver perfil
                  </button>
                  <button
                    onClick={() =>
                      nav(`/pedir-socorro?profissional=${selected.id}&categoria=${encodeURIComponent(selected.area_atuacao || '')}`)
                    }
                    disabled={selected.status_atendimento !== 'online'}
                    className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold flex items-center justify-center disabled:opacity-40"
                  >
                    Solicitar serviço
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  )
}