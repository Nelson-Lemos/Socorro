import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, Star, Clock } from 'lucide-react'
import type { ProfissionalOut } from '../api'
import { categoriaInfo, STATUS_ATENDIMENTO } from '../constants'
import { formatDist, readSavedLocation } from '../utils/geo'
import Avatar from './Avatar'

export default function ProfessionalCard({
  pro,
  onRequest,
}: {
  pro: ProfissionalOut
  onRequest?: (pro: ProfissionalOut) => void
}) {
  const nav = useNavigate()
  const cat = categoriaInfo(pro.area_atuacao)
  const Icon = cat.icon
  const atd = STATUS_ATENDIMENTO[pro.status_atendimento || 'offline'] || STATUS_ATENDIMENTO.offline
  const saved = readSavedLocation()

  return (
    <div
      onClick={() => nav(`/profissional/${pro.id}?lat=${saved?.lat ?? ''}&lon=${saved?.lon ?? ''}`)}
      className="cursor-pointer bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <Avatar src={pro.foto_perfil} nome={pro.nome} size={52} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-surface-900 dark:text-white truncate">{pro.nome}</p>
          </div>
          <p className="text-sm text-surface-500 flex items-center gap-1">
            <Icon size={14} color={cat.color} />
            <span className="capitalize">{pro.area_atuacao || 'Profissional'}</span>
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
          style={{ background: atd.bg, color: atd.text }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 7, background: atd.dot }} />
          {atd.label}
        </span>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
        <div className="flex items-center gap-4 text-sm text-surface-600 dark:text-surface-300">
          <span className="flex items-center gap-1">
            <Star size={14} className="text-amber-500" style={{ fill: '#F59E0B' }} />
            <b>{pro.avaliacao_media ? pro.avaliacao_media.toFixed(1) : '—'}</b>
            <span className="text-surface-400">({pro.total_avaliacoes})</span>
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={14} color="#DC2626" /> {formatDist(pro.dist_km)}
          </span>
          {pro.anos_experiencia ? (
            <span className="flex items-center gap-1">
              <Clock size={14} /> {pro.anos_experiencia} anos
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={(e) => { e.stopPropagation(); nav(`/profissional/${pro.id}`) }}
          className="flex-1 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-200 text-sm font-semibold"
        >
          Ver perfil
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (onRequest) onRequest(pro)
            else nav(`/pedir-socorro?profissional=${pro.id}&categoria=${encodeURIComponent(pro.area_atuacao || '')}`)
          }}
          disabled={(pro.status_atendimento || 'offline') !== 'online'}
          className="flex-1 py-2 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
          style={{ background: (pro.status_atendimento || 'offline') === 'online' ? '#DC2626' : '#9CA3AF' }}
        >
          <Navigation size={14} /> Solicitar
        </button>
      </div>
    </div>
  )
}