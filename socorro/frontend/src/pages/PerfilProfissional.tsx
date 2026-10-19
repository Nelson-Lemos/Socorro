import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Star, MapPin, Clock, ChevronLeft, Navigation, ShieldCheck,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import Avatar from '../components/Avatar'
import StarRating from '../components/StarRating'
import { profissionaisApi } from '../api'
import type { ProfissionalOut, AvaliacaoProfissional } from '../api'
import { categoriaInfo, STATUS_ATENDIMENTO } from '../constants'
import { readSavedLocation, formatDist } from '../utils/geo'
import { SkeletonList } from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'

export default function PerfilProfissional() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [pro, setPro] = useState<ProfissionalOut | null>(null)
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoProfissional[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'sobre' | 'avaliacoes'>('sobre')

  useEffect(() => {
    if (!id) return
    const saved = readSavedLocation()
    const lat = params.get('lat') ? Number(params.get('lat')) : saved?.lat
    const lon = params.get('lon') ? Number(params.get('lon')) : saved?.lon
    profissionaisApi
      .obter(id, lat, lon)
      .then(setPro)
      .catch(() => setPro(null))
      .finally(() => setLoading(false))
    profissionaisApi.avaliacoes(id).then(setAvaliacoes).catch(() => setAvaliacoes([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <SkeletonList count={5} />
        </div>
      </DashboardLayout>
    )
  }

  if (!pro) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
          <EmptyState
            icon={<ShieldCheck size={28} />}
            title="Profissional não encontrado"
            description="Este profissional pode ter desativado a conta."
            action={
              <button onClick={() => nav(-1)} className="mt-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold">
                Voltar
              </button>
            }
          />
        </div>
      </DashboardLayout>
    )
  }

  const cat = categoriaInfo(pro.area_atuacao)
  const Icon = cat.icon
  const atd = STATUS_ATENDIMENTO[pro.status_atendimento || 'offline'] || STATUS_ATENDIMENTO.offline
  const especialidades = pro.especialidades ? pro.especialidades.split(',').map((s) => s.trim()).filter(Boolean) : []

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between">
          <button onClick={() => nav(-1)} className="p-2 -ml-2 text-surface-600 dark:text-surface-300">
            <ChevronLeft size={22} />
          </button>
          <span className="text-sm font-semibold text-surface-500">Perfil do profissional</span>
          <span className="w-8" />
        </div>

        {/* Header card */}
        <div className={`mt-4 rounded-2xl p-5 border bg-white dark:bg-surface-900 dark:border-surface-800 border-surface-200`}>
          <div className="flex items-start gap-4">
            <Avatar src={pro.foto_perfil} nome={pro.nome} size={72} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold text-surface-900 dark:text-white truncate">{pro.nome}</h1>
              </div>
              <p className="text-sm text-surface-500 flex items-center gap-1 capitalize">
                <Icon size={15} className="text-surface-400" /> {pro.area_atuacao}
              </p>
              <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: atd.bg, color: atd.text }}>
                <span style={{ width: 7, height: 7, borderRadius: 7, background: atd.dot }} />
                {atd.label}
              </span>
            </div>
            <div className="text-center">
              <StarRating value={pro.avaliacao_media} count={pro.total_avaliacoes} size={16} />
              <p className="text-[11px] text-surface-400 mt-1">
                {pro.tipo_conta === 'empresa' ? 'Empresa' : 'Profissional independente'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 text-xs text-surface-600 dark:text-surface-300">
            <span className="flex items-center gap-1"><MapPin size={13} color="#DC2626" /> {formatDist(pro.dist_km)} de si</span>
            {pro.anos_experiencia ? (
              <span className="flex items-center gap-1"><Clock size={13} /> {pro.anos_experiencia} anos</span>
            ) : null}
          </div>

          <button
            onClick={() => nav(`/pedir-socorro?profissional=${pro.id}&categoria=${encodeURIComponent(pro.area_atuacao || '')}`)}
            disabled={pro.status_atendimento !== 'online'}
            className="mt-4 w-full py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:bg-surface-300 disabled:dark:bg-surface-700 bg-brand-600 hover:bg-brand-700 transition-colors"
          >
            <Navigation size={18} /> Solicitar serviço
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mt-5 border-b border-surface-200 dark:border-surface-800">
          {(['sobre', 'avaliacoes'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold capitalize ${tab === t ? 'text-brand-600 border-b-2 border-brand-600' : 'text-surface-500'}`}
            >
              {t === 'avaliacoes' ? `Avaliações (${avaliacoes.length})` : 'Sobre'}
            </button>
          ))}
        </div>

        {tab === 'sobre' ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5">
              <h2 className="font-bold text-surface-900 dark:text-white mb-2">Descrição</h2>
              <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
                {pro.descricao || 'Este profissional ainda não adicionou uma descrição.'}
              </p>
            </div>

            {especialidades.length > 0 && (
              <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5">
                <h2 className="font-bold text-surface-900 dark:text-white mb-3">Especialidades</h2>
                <div className="flex flex-wrap gap-2">
                  {especialidades.map((e) => (
                    <span key={e} className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {avaliacoes.length === 0 ? (
              <EmptyState icon={<Star size={24} />} title="Sem avaliações ainda" description="Quando o profissional concluir pedidos, as avaliações aparecerão aqui." />
            ) : (
              avaliacoes.map((a) => (
                <div key={a.id} className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center shrink-0">
                      <span className="font-bold text-sm text-surface-600 dark:text-surface-300">{a.avaliador_nome?.charAt(0) || 'A'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-surface-900 dark:text-white truncate">{a.avaliador_nome || 'Utilizador'}</p>
                      <StarRating value={a.estrelas} size={13} />
                    </div>
                    <span className="text-[11px] text-surface-400">
                      {a.criado_em ? new Date(a.criado_em).toLocaleDateString('pt-PT') : ''}
                    </span>
                  </div>
                  {a.comentario && (
                    <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">{a.comentario}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
