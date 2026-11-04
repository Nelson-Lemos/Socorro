import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronLeft, LogOut, Navigation, MapPin, Zap, Check, Loader2,
  Camera, Building2, Store, Globe, MessageCircle, ShieldCheck, Pencil, X, Lock,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import Avatar from '../components/Avatar'
import ImageUploader from '../components/ImageUploader'
import { useAuth } from '../context/AuthContext'
import { profissionaisApi, authApi } from '../api'
import { STATUS_ATENDIMENTO, TODAS_CATEGORIAS } from '../constants'
import { getCurrentPosition, saveLocation, readSavedLocation } from '../utils/geo'
import toast from 'react-hot-toast'

export default function PerfilConta() {
  const { user, logout, updateUser } = useAuth()
  const nav = useNavigate()
  const fotoRef = useRef<HTMLInputElement>(null)

  const [estado, setEstado] = useState(user?.status_atendimento || 'online')
  const [updatingEstado, setUpdatingEstado] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)

  const [editing, setEditing] = useState(false)
  const [descricao, setDescricao] = useState(user?.descricao || '')
  const [anos, setAnos] = useState<number | ''>(user?.anos_experiencia || '')
  const [especialidades, setEspecialidades] = useState<string>(user?.especialidades || '')
  const [nome, setNome] = useState(user?.nome || '')
  const [nomeComercial, setNomeComercial] = useState(user?.nome_comercial || '')
  const [telefone, setTelefone] = useState(user?.telefone || '')
  const [whatsapp, setWhatsapp] = useState(user?.telefone_whatsapp || '')
  const [website, setWebsite] = useState(user?.website || '')
  const [logo, setLogo] = useState(user?.logo || '')
  const [fotoCapa, setFotoCapa] = useState(user?.foto_capa || '')
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)

  const isEmpresa = user?.tipo_conta === 'empresa'
  const isProvider = isEmpresa || !!user?.area_atuacao
  const saudePerfil = perfilCompletude(user, { descricao, anos, especialidades, logo, fotoCapa })

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
    setEspecialidades(lista.includes(e) ? lista.filter((x) => x !== e).join(',') : [...lista, e].join(','))
  }

  async function handleFotoPerfil(file?: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem válida'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('A imagem não pode exceder 10 MB'); return }
    setUploadingFoto(true)
    try {
      const { url } = await authApi.uploadFotoPerfil(file)
      await updateUser({ foto_perfil: url })
      toast.success('Fotografia atualizada')
    } catch {
      toast.error('Não foi possível enviar a fotografia')
    } finally {
      setUploadingFoto(false)
    }
  }

  const salvarPerfil = async () => {
    setSalvandoPerfil(true)
    try {
      await updateUser({
        nome,
        descricao,
        anos_experiencia: anos === '' ? 0 : Number(anos),
        especialidades,
        ...(isEmpresa ? {
          nome_comercial: nomeComercial,
          telefone_whatsapp: whatsapp,
          website,
          logo,
          foto_capa: fotoCapa,
        } : {
          telefone,
        }),
      })
      setEditing(false)
      toast.success('Perfil atualizado com sucesso')
    } catch {
      toast.error('Não foi possível salvar')
    } finally {
      setSalvandoPerfil(false)
    }
  }

  function cancelarEdicao() {
    setEditing(false)
    setDescricao(user?.descricao || '')
    setAnos(user?.anos_experiencia || '')
    setEspecialidades(user?.especialidades || '')
    setNome(user?.nome || '')
    setNomeComercial(user?.nome_comercial || '')
    setTelefone(user?.telefone || '')
    setWhatsapp(user?.telefone_whatsapp || '')
    setWebsite(user?.website || '')
    setLogo(user?.logo || '')
    setFotoCapa(user?.foto_capa || '')
  }

  const coords = readSavedLocation()
  const imagemCapa = isEmpresa ? user?.foto_capa : null

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Barra superior */}
        <div className="flex items-center justify-between">
          <button onClick={() => nav(-1)} className="p-2 -ml-2 text-surface-600 dark:text-surface-300">
            <ChevronLeft size={22} />
          </button>
          <span className="text-sm font-bold text-surface-500 uppercase tracking-wide">O meu perfil</span>
          <button onClick={() => { logout(); nav('/') }} className="p-2 -mr-2 text-error" title="Sair">
            <LogOut size={20} />
          </button>
        </div>

        {/* Cartão de identidade */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          className="card-vivo overflow-hidden !p-0">
          {/* Capa */}
          <div className="relative h-32 sm:h-40" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626 55%,#F97316)' }}>
            {imagemCapa && <img src={imagemCapa} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
            {isProvider && (
              <span className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.92)', color: STATUS_ATENDIMENTO[estado]?.text || '#4B5563' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: STATUS_ATENDIMENTO[estado]?.dot || '#9CA3AF' }} />
                {STATUS_ATENDIMENTO[estado]?.label || 'Offline'}
              </span>
            )}
          </div>

          <div className="px-5 pb-5">
            <div className="flex items-end justify-between -mt-11">
              <button onClick={() => fotoRef.current?.click()} className="relative group" title="Alterar fotografia">
                <div className="ring-4 ring-white dark:ring-surface-900 rounded-full overflow-hidden">
                  {isEmpresa && user?.logo
                    ? <img src={user.logo} alt={user?.nome} className="w-[84px] h-[84px] object-cover rounded-full" />
                    : <Avatar src={user?.foto_perfil} nome={user?.nome} size={84} />}
                </div>
                <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg">
                  {uploadingFoto ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                </span>
                <input ref={fotoRef} type="file" accept="image/*" hidden
                  onChange={(e) => { handleFotoPerfil(e.target.files?.[0]); e.target.value = '' }} />
              </button>

              <button onClick={() => (editing ? cancelarEdicao() : setEditing(true))}
                className={editing ? 'btn-ghost' : 'btn-vivo'}
                style={{ padding: '9px 16px', fontSize: 13.5 }}>
                {editing ? <><X size={15} /> Cancelar</> : <><Pencil size={15} /> Editar perfil</>}
              </button>
            </div>

            <div className="mt-3">
              <h1 className="text-xl font-extrabold text-surface-900 dark:text-white flex items-center gap-2 flex-wrap">
                {user?.nome_comercial || user?.nome}
                {user?.verificado && <ShieldCheck size={18} className="text-emerald-500" />}
              </h1>
              <p className="text-sm text-surface-500 mt-0.5">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {isEmpresa ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-700">
                    {user?.tipo_entidade ? user.tipo_entidade.toUpperCase() : 'Empresa'}
                  </span>
                ) : user?.area_atuacao ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">
                    {user.area_atuacao}
                  </span>
                ) : null}
                {user?.verificado ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Verificado</span>
                ) : (user?.status_verificacao === 'em_analise' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Verificação em análise</span>
                ) : null)}
              </div>
            </div>

            {/* Completude do perfil */}
            {isProvider && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="text-surface-500 uppercase tracking-wide">Perfil completo</span>
                  <span style={{ color: saudePerfil >= 80 ? '#059669' : '#DC2626' }}>{saudePerfil}%</span>
                </div>
                <div className="step-track">
                  <div className="step-fill" style={{ width: `${saudePerfil}%`, background: saudePerfil >= 80 ? 'linear-gradient(90deg,#10B981,#14B8A6)' : undefined }} />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Disponibilidade */}
        {isProvider && (
          <div className="card-vivo p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-surface-900 dark:text-white flex items-center gap-1.5">
                  <Zap size={16} className="text-brand-600" /> Disponibilidade
                </p>
                <p className="text-xs text-surface-500 mt-0.5">Quando disponível, aparece na busca e no mapa</p>
              </div>
              {updatingEstado && <Loader2 size={18} className="animate-spin text-surface-400" />}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(STATUS_ATENDIMENTO) as Array<keyof typeof STATUS_ATENDIMENTO>).map((k) => {
                const cfg = STATUS_ATENDIMENTO[k]
                const active = estado === k
                return (
                  <button key={k} onClick={() => changeEstado(k as 'online' | 'offline' | 'ocupado')} disabled={updatingEstado}
                    className="py-2.5 rounded-xl text-sm font-bold border transition-all disabled:opacity-50"
                    style={{ background: active ? cfg.bg : 'transparent', borderColor: active ? 'transparent' : '#E5E7EB', color: active ? cfg.text : '#6B7280' }}>
                    {active && <Check size={13} className="inline mr-1" />}{cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Formulário de edição */}
        {editing ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-vivo p-5 space-y-4">
            <p className="font-bold text-surface-900 dark:text-white">Editar informações</p>

            <label className="block">
              <span className="text-xs font-bold text-surface-500 uppercase tracking-wide">Nome</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500" />
            </label>

            {isEmpresa && (
              <label className="block">
                <span className="text-xs font-bold text-surface-500 uppercase tracking-wide">Nome comercial</span>
                <input value={nomeComercial} onChange={(e) => setNomeComercial(e.target.value)} placeholder="Nome que aparece publicamente"
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500" />
              </label>
            )}

            <label className="block">
              <span className="text-xs font-bold text-surface-500 uppercase tracking-wide">Descrição</span>
              <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} maxLength={600}
                placeholder="Descreva os serviços que oferece..."
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold text-surface-500 uppercase tracking-wide">Anos de experiência</span>
                <input type="number" min={0} value={anos} onChange={(e) => setAnos(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Ex: 5"
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500" />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-surface-500 uppercase tracking-wide">
                  {isEmpresa ? 'WhatsApp' : 'Telefone'}
                </span>
                {isEmpresa ? (
                  <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+244 9XX XXX XXX"
                    className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500" />
                ) : (
                  <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="+244 9XX XXX XXX"
                    className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500" />
                )}
              </label>
            </div>

            {isEmpresa && (
              <>
                <label className="block">
                  <span className="text-xs font-bold text-surface-500 uppercase tracking-wide">Website</span>
                  <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://minhaempresa.ao"
                    className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800 text-sm text-surface-900 dark:text-white outline-none focus:border-brand-500" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-bold text-surface-500 uppercase tracking-wide">Logotipo</span>
                    <div className="mt-1"><ImageUploader value={logo} onChange={setLogo} label="Logotipo" aspect="square" rounded={14} iconSize={20} /></div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-surface-500 uppercase tracking-wide">Foto de capa</span>
                    <div className="mt-1"><ImageUploader value={fotoCapa} onChange={setFotoCapa} label="Capa" aspect="square" rounded={14} iconSize={20} /></div>
                  </div>
                </div>
              </>
            )}

            <div>
              <span className="text-xs font-bold text-surface-500 uppercase tracking-wide">Especialidades</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {TODAS_CATEGORIAS.map((cat) => {
                  const on = especialidades.split(',').map((x) => x.trim()).includes(cat.label)
                  return (
                    <button key={cat.id} onClick={() => toggleEspecialidade(cat.label)} className={`chip ${on ? 'chip-on' : ''}`}>
                      {cat.label}{on && <Check size={13} />}
                    </button>
                  )
                })}
              </div>
            </div>

            <button onClick={salvarPerfil} disabled={salvandoPerfil} className="btn-vivo w-full" style={{ padding: '13px 24px', fontSize: 14.5 }}>
              {salvandoPerfil && <Loader2 size={16} className="animate-spin" />} Guardar alterações
            </button>
          </motion.div>
        ) : (
          <>
            {/* Resumo do perfil público */}
            {isProvider && (
              <div className="card-vivo p-5 space-y-4">
                <p className="font-bold text-surface-900 dark:text-white">Sobre o seu serviço</p>
                <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed">
                  {user?.descricao || <span className="text-surface-400 italic">Sem descrição. Toque em “Editar perfil” para adicionar.</span>}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <InfoTile Icon={Zap} label="Experiência" value={user?.anos_experiencia ? `${user.anos_experiencia} anos` : '—'} />
                  <InfoTile Icon={isEmpresa ? MessageCircle : Globe} label={isEmpresa ? 'WhatsApp' : 'Website'} value={(isEmpresa ? user?.telefone_whatsapp : user?.website) || '—'} />
                </div>
                {user?.especialidades ? (
                  <div className="flex flex-wrap gap-2">
                    {user.especialidades.split(',').filter(Boolean).map((e) => (
                      <span key={e} className="px-3 py-1.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">{e.trim()}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {/* Bloco empresa */}
            {isEmpresa && (
              <div className="card-vivo p-5 space-y-3">
                <p className="font-bold text-surface-900 dark:text-white flex items-center gap-2"><Building2 size={16} className="text-brand-600" /> Dados da empresa</p>
                <InfoTile Icon={Store} label="Tipo de entidade" value={user?.tipo_entidade || '—'} />
                <InfoTile Icon={MapPin} label="Endereço" value={[user?.endereco, user?.bairro, user?.municipio, user?.provincia].filter(Boolean).join(', ') || '—'} />
                <InfoTile Icon={Globe} label="Website" value={user?.website || '—'} />
                {user?.categorias_servico ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {user.categorias_servico.split(',').filter(Boolean).map((c) => (
                      <span key={c} className="px-3 py-1.5 rounded-full text-xs font-bold bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300">{c.trim()}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}

        {/* Localização */}
        <div className="card-vivo p-5 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl grad-brand-soft flex items-center justify-center shrink-0">
            <MapPin size={18} className="text-brand-600" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-surface-900 dark:text-white">Minha localização</p>
            <p className="text-xs text-surface-500 truncate">
              {user?.localizacao || (coords ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : 'Não definida')}
            </p>
          </div>
          <button onClick={handleGetLocation} disabled={gettingLocation} className="btn-vivo" style={{ padding: '9px 14px', fontSize: 12.5 }}>
            {gettingLocation ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />} Atualizar
          </button>
        </div>

        {/* Segurança */}
        <div className="card-vivo p-5 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl grad-brand-soft flex items-center justify-center shrink-0">
            <Lock size={18} className="text-brand-600" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-surface-900 dark:text-white">Segurança</p>
            <p className="text-xs text-surface-500">Altere a sua palavra-passe periodicamente</p>
          </div>
          <button onClick={() => nav('/esqueci-password')} className="btn-ghost" style={{ padding: '9px 14px', fontSize: 12.5 }}>
            Alterar
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

function InfoTile({ Icon, label, value }: { Icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface-50 dark:bg-surface-800/60 px-3.5 py-2.5 min-w-0">
      <Icon size={15} className="text-brand-600 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-surface-800 dark:text-surface-200 truncate">{value}</p>
      </div>
    </div>
  )
}

function perfilCompletude(user: any, extra: { descricao: string; anos: number | ''; especialidades: string; logo: string; fotoCapa: string }) {
  const checks = [
    !!user?.nome,
    !!user?.telefone,
    !!user?.localizacao,
    !!extra.descricao,
    extra.anos !== '' && Number(extra.anos) > 0,
    !!extra.especialidades,
    !!user?.foto_perfil || !!extra.logo,
  ]
  if (user?.tipo_conta === 'empresa') {
    checks.push(!!user?.nif, !!user?.endereco || !!user?.bairro, !!user?.telefone_whatsapp)
  }
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100)
  return Math.min(100, pct)
}
