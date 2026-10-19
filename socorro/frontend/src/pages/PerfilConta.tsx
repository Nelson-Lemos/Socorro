import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, LogOut, Navigation, MapPin, Zap, Check, Loader2,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import Avatar from '../components/Avatar'
import { useAuth } from '../context/AuthContext'
import { profissionaisApi } from '../api'
import { STATUS_ATENDIMENTO, TODAS_CATEGORIAS } from '../constants'
import { getCurrentPosition, saveLocation, readSavedLocation } from '../utils/geo'
import toast from 'react-hot-toast'

export default function PerfilConta() {
  const { user, logout, updateUser } = useAuth()
  const nav = useNavigate()

  const [estado, setEstado] = useState(user?.status_atendimento || 'online')
  const [updatingEstado, setUpdatingEstado] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)

  const [descricao, setDescricao] = useState(user?.descricao || '')
  const [anos, setAnos] = useState<number | ''>(user?.anos_experiencia || '')
  const [especialidades, setEspecialidades] = useState<string>(user?.especialidades || '')
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)

  const isProvider = user?.tipo_conta === 'empresa' || !!user?.area_atuacao

  const changeEstado = async (novo: 'online' | 'offline' | 'ocupado') => {
    if (novo === estado) return
    setUpdatingEstado(true)
    try {
      await profissionaisApi.atualizarEstado(novo)
      setEstado(novo)
      await updateUser({ status_atendimento: novo })
      toast.success('Estado atualizado')
    } catch {
      toast.error('Não foi possível atualizar o estado')
    } finally {
      setUpdatingEstado(false)
    }
  }

  const handleGetLocation = async () => {
    setGettingLocation(true)
    try {
      const c = await getCurrentPosition()
      saveLocation(c)
      await updateUser({ latitude: c.lat, longitude: c.lon, localizacao: `Luanda (${c.lat.toFixed(4)}, ${c.lon.toFixed(4)})` })
      toast.success('Localização atualizada')
    } catch {
      toast.error('Não foi possível obter a localização')
    } finally {
      setGettingLocation(false)
    }
  }

  const toggleEspecialidade = (e: string) => {
    const lista = especialidades ? especialidades.split(',').map((x) => x.trim()).filter(Boolean) : []
    setEspecialidades(
      lista.includes(e) ? lista.filter((x) => x !== e).join(',') : [...lista, e].join(','),
    )
  }

  const salvarPerfil = async () => {
    setSalvandoPerfil(true)
    try {
      await updateUser({
        descricao,
        anos_experiencia: anos === '' ? 0 : Number(anos),
        especialidades,
      })
      toast.success('Perfil salvo')
    } catch {
      toast.error('Não foi possível salvar')
    } finally {
      setSalvandoPerfil(false)
    }
  }

  const coords = readSavedLocation()

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => nav(-1)} className="p-2 -ml-2 text-surface-600 dark:text-surface-300">
            <ChevronLeft size={22} />
          </button>
          <span className="text-sm font-semibold text-surface-500">O meu perfil</span>
          <button
            onClick={() => { logout(); nav('/') }}
            className="p-2 -mr-2 text-error"
            title="Sair"
          >
            <LogOut size={20} />
          </button>
        </div>

        {/* Avatar header */}
        <div className="flex flex-col items-center pt-4">
          <Avatar src={user?.foto_perfil} nome={user?.nome} size={84} />
          <h1 className="mt-3 text-xl font-bold text-surface-900 dark:text-white">{user?.nome}</h1>
          <p className="text-sm text-surface-500">{user?.email}</p>
          {user?.tipo_conta === 'empresa' ? (
            <span className="mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-100 text-brand-700">Empresa</span>
          ) : (
            <span className="mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-surface-100 dark:bg-surface-800 text-surface-500 capitalize">
              {user?.area_atuacao || 'Profissional'}
            </span>
          )}
        </div>

        {isProvider && (
          <>
            {/* Availability */}
            <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-bold text-surface-900 dark:text-white flex items-center gap-1.5">
                    <Zap size={16} className="text-brand-600" /> Disponibilidade
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">Quando está disponível, aparece na busca e no mapa</p>
                </div>
                {updatingEstado && <Loader2 size={18} className="animate-spin text-surface-400" />}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(STATUS_ATENDIMENTO) as Array<keyof typeof STATUS_ATENDIMENTO>).map((k) => {
                  const cfg = STATUS_ATENDIMENTO[k]
                  const active = estado === k
                  return (
                    <button
                      key={k}
                      onClick={() => changeEstado(k as 'online' | 'offline' | 'ocupado')}
                      disabled={updatingEstado}
                      className="py-2.5 rounded-xl text-sm font-semibold border transition-all disabled:opacity-50"
                      style={{
                        background: active ? cfg.bg : 'transparent',
                        borderColor: active ? 'transparent' : '#E5E7EB',
                        color: active ? cfg.text : '#6B7280',
                      }}
                    >
                      {active && <Check size={13} className="inline mr-1" />}
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Profile editing */}
            <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 space-y-4">
              <p className="font-bold text-surface-900 dark:text-white">Sobre o seu serviço</p>
              <label className="block">
                <span className="text-xs font-semibold text-surface-500">Descrição</span>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  placeholder="Descreva os serviços que oferece..."
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-surface-500">Anos de experiência</span>
                <input
                  type="number"
                  min={0}
                  value={anos}
                  onChange={(e) => setAnos(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ex: 5"
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500"
                />
              </label>
              <div>
                <span className="text-xs font-semibold text-surface-500">Especialidades</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {TODAS_CATEGORIAS.slice(0, 8).map((cat) => {
                    const on = especialidades.split(',').map((x) => x.trim()).includes(cat.label)
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleEspecialidade(cat.label)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${on ? 'bg-brand-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300'}`}
                      >
                        {cat.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button
                onClick={salvarPerfil}
                disabled={salvandoPerfil}
                className="w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {salvandoPerfil && <Loader2 size={16} className="animate-spin" />} Salvar alterações
              </button>
            </div>
          </>
        )}

        {/* Location */}
        <div className="rounded-2xl bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 p-5 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
            <MapPin size={18} className="text-brand-600" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-surface-900 dark:text-white">Minha localização</p>
            <p className="text-xs text-surface-500 truncate">
              {user?.localizacao || (coords ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : 'Não definida')}
            </p>
          </div>
          <button
            onClick={handleGetLocation}
            disabled={gettingLocation}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white disabled:opacity-50 flex items-center gap-1.5"
          >
            {gettingLocation ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
            Atualizar
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}