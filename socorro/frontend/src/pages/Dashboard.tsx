import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, MapPin, Star, Map as MapIcon, Loader2, Navigation, Search } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { profissionaisApi } from '../api'
import type { ProfissionalOut } from '../api'
import { CATEGORIAS_PRINCIPAIS, STATUS_ATENDIMENTO } from '../constants'
import { getCurrentPosition, saveLocation, readSavedLocation, type Coords, LUANDA, formatDist } from '../utils/geo'
import Avatar from '../components/Avatar'
import { SkeletonList } from '../components/LoadingSkeleton'

export default function Dashboard() {
  const { user } = useAuth()
  const nav = useNavigate()

  const [pros, setPros] = useState<ProfissionalOut[]>([])
  const [prosLoading, setProsLoading] = useState(true)
  const [coords, setCoords] = useState<Coords | null>(readSavedLocation())
  const [gettingLocation, setGettingLocation] = useState(false)
  const [busca, setBusca] = useState('')

  const submitBusca = (e: React.FormEvent) => {
    e.preventDefault()
    nav(busca.trim() ? `/procurar?q=${encodeURIComponent(busca.trim())}` : '/procurar')
  }

  const isProvider = user?.tipo_conta === 'empresa' || !!user?.area_atuacao
  const isOnline = (user?.status_atendimento || 'offline') === 'online'

  useEffect(() => {
    const loc = coords || LUANDA
    profissionaisApi
      .pesquisar({ lat: loc.lat, lon: loc.lon, raio: 15, limit: 5 })
      .then(setPros)
      .catch(() => setPros([]))
      .finally(() => setProsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const localLabel =
    (user?.localizacao || '').split('|')[0].split('(')[0].trim() ||
    (coords ? `${coords.lat.toFixed(3)}, ${coords.lon.toFixed(3)}` : 'Usar a minha localização')

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 lg:px-8 space-y-8">
        {/* Header */}
        <div>
          <p className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white">Precisa de ajuda?</p>
          <p className="text-sm text-surface-500 mt-1">Encontre um profissional perto de si.</p>
        </div>

        {/* Estado do prestador (apenas empresas/provider) */}
        {isProvider && (
          <button
            onClick={() => nav('/perfil')}
            className="w-full flex items-center gap-2.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-4 py-3 text-left text-sm transition-colors"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: isOnline ? '#10B981' : '#9CA3AF' }}
            />
            <span className="flex-1 text-surface-700 dark:text-surface-200 font-medium">
              {isOnline ? 'Disponível para atender' : 'Offline'}
              <span className="block text-xs text-surface-500 font-normal">Toque para gerir o seu estado</span>
            </span>
            <ChevronRight size={18} className="text-surface-400" />
          </button>
        )}

        {/* Pesquisa por nome ou serviço */}
        <form onSubmit={submitBusca} className="relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Procurar por nome ou serviço (ex.: Eletricista, Ngola Motors...)"
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-900 dark:text-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            Procurar
          </button>
        </form>

        {/* CTA principal */}
        <button
          onClick={() => nav('/procurar')}
          className="w-full rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 text-surface-700 dark:text-surface-200 text-[15px] font-semibold py-3.5 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800"
        >
          Ver todos os profissionais
        </button>

        {/* Serviços */}
        <section>
          <h2 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wide">Serviços</h2>
          <div className="mt-3 divide-y divide-surface-100 dark:divide-surface-800 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
            {CATEGORIAS_PRINCIPAIS.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.id}
                  onClick={() => nav(`/procurar?categoria=${encodeURIComponent(cat.label)}`)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  <span className="w-9 h-9 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-surface-600 dark:text-surface-300" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-surface-900 dark:text-white">{cat.label}</span>
                    {cat.desc && <span className="block text-xs text-surface-500 truncate">{cat.desc}</span>}
                  </span>
                  <ChevronRight size={18} className="text-surface-300 shrink-0" />
                </button>
              )
            })}
          </div>
        </section>

        {/* Profissionais perto de si */}
        <section>
          <h2 className="text-sm font-bold text-surface-900 dark:text-white uppercase tracking-wide mb-3">
            Profissionais perto de si
          </h2>

          <button
            onClick={handleLocate}
            disabled={gettingLocation}
            className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-brand-600 transition-colors mb-3"
          >
            {gettingLocation ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} color="#DC2626" />}
            <span className="truncate">{localLabel}</span>
            {!coords && !user?.localizacao && <Navigation size={12} />}
          </button>

          {prosLoading ? (
            <SkeletonList count={3} />
          ) : pros.length === 0 ? (
            <p className="text-sm text-surface-500 bg-surface-100 dark:bg-surface-900 border border-dashed border-surface-300 dark:border-surface-700 rounded-xl px-4 py-6 text-center">
              Ainda não existem profissionais nesta área.
            </p>
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-800 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
              {pros.map((pro) => {
                const atd = STATUS_ATENDIMENTO[pro.status_atendimento || 'offline'] || STATUS_ATENDIMENTO.offline
                return (
                  <button
                    key={pro.id}
                    onClick={() => nav(`/profissional/${pro.id}?lat=${coords?.lat ?? ''}&lon=${coords?.lon ?? ''}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                  >
                    <Avatar src={pro.foto_perfil} nome={pro.nome} size={44} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{pro.nome}</p>
                      <p className="text-xs text-surface-500 truncate capitalize mt-0.5">
                        {pro.area_atuacao || 'Profissional'} · {formatDist(pro.dist_km)}
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
              })}
            </div>
          )}

          <button
            onClick={() => nav('/mapa')}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-brand-600 text-brand-600 dark:text-brand-400 font-semibold py-3 text-sm transition-colors hover:bg-brand-50 dark:hover:bg-brand-900/20"
          >
            <MapIcon size={16} /> Ver no mapa
          </button>
        </section>
      </div>
    </DashboardLayout>
  )
}