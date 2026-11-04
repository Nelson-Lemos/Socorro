import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Building2, Mail, Lock, Phone, MapPin,
  AlertCircle, Loader2, CheckCircle2, ChevronRight, ChevronLeft,
  FileText, Briefcase, Navigation, Globe, Share2, MessageCircle,
  Clock, ShieldCheck, UserCheck, Check, Store, BadgeCheck, Sparkles,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { TODAS_CATEGORIAS } from '../constants'
import ImageUploader from '../components/ImageUploader'
import logoUrl from '../assets/logo.jpeg'

const TIPOS_ENTIDADE = [
  { id: 'empresa', label: 'Empresa', desc: 'Sociedade comercial' },
  { id: 'eni', label: 'ENI', desc: 'Empresário Individual' },
  { id: 'oficina', label: 'Oficina', desc: 'Oficina / taller' },
  { id: 'prestador', label: 'Prestador', desc: 'Serviço independente' },
]

interface EmpresaForm {
  nome: string; email: string; telefone: string; password: string; confirmPassword: string;
  accountType: 'cidadao' | 'empresa'
  localizacao: string; raio_atuacao: number
  // Empresa — perfil comercial
  nome_comercial: string; nif: string; tipo_entidade: string; logo: string; foto_capa: string
  descricao: string; website: string; redes_sociais: string
  telefone_whatsapp: string
  // Localização desagregada
  provincia: string; municipio: string; bairro: string; endereco: string; ponto_referencia: string
  // Serviços e área de atendimento
  categorias_servico: string; atende_estabelecimento: boolean; atende_domicilio: boolean
  areas_atendidas: string; atendimento_24h: boolean
  // Verificação / representante
  representante_nome: string; representante_cargo: string; representante_telefone: string
  aceita_termos: boolean
}

const initialForm: EmpresaForm = {
  nome: '', email: '', telefone: '', password: '', confirmPassword: '',
  accountType: 'cidadao', localizacao: '', raio_atuacao: 10,
  nome_comercial: '', nif: '', tipo_entidade: 'empresa', logo: '', foto_capa: '',
  descricao: '', website: '', redes_sociais: '', telefone_whatsapp: '',
  provincia: '', municipio: '', bairro: '', endereco: '', ponto_referencia: '',
  categorias_servico: '', atende_estabelecimento: false, atende_domicilio: true,
  areas_atendidas: '', atendimento_24h: false,
  representante_nome: '', representante_cargo: '', representante_telefone: '',
  aceita_termos: false,
}

/* ──────── campos locais ──────── */
function Field({
  label, error, hint, optional, children,
}: { label: string; error?: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#374151', marginBottom: 7 }}>
        {label}
        {optional && <span style={{ fontWeight: 500, color: '#9CA3AF', fontSize: 12, marginLeft: 6 }}>opcional</span>}
      </label>
      {children}
      {error ? (
        <motion.p
          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#DC2626', marginTop: 6, fontWeight: 600 }}
        >
          <AlertCircle size={13} /> {error}
        </motion.p>
      ) : hint ? (
        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 5 }}>{hint}</p>
      ) : null}
    </div>
  )
}

function pwStrength(pw: string) {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const cfg = [
    { w: '8%', c: '#E5E7EB', t: '' },
    { w: '25%', c: '#EF4444', t: 'Muito fraca' },
    { w: '50%', c: '#F59E0B', t: 'Razoável' },
    { w: '75%', c: '#0EA5E9', t: 'Boa' },
    { w: '90%', c: '#10B981', t: 'Forte' },
    { w: '100%', c: '#059669', t: 'Excelente' },
  ][Math.min(score, 5)]
  if (!pw) return { ...cfg, t: '' }
  return cfg
}

const STEPS_CIDADAO = ['Conta', 'Dados']
const STEPS_EMPRESA = ['Conta', 'Dados', 'Comerciais', 'Localização', 'Imagens', 'Verificação']

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<EmpresaForm>(initialForm)

  const steps = form.accountType === 'empresa' ? STEPS_EMPRESA : STEPS_CIDADAO
  const isEmpresa = form.accountType === 'empresa'
  const pw = pwStrength(form.password)
  const cats = form.categorias_servico ? form.categorias_servico.split(',').map((x) => x.trim()).filter(Boolean) : []

  function update<K extends keyof EmpresaForm>(key: K, value: EmpresaForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFieldErrors((prev) => { if (!prev[key as string]) return prev; const n = { ...prev }; delete n[key as string]; return n })
  }
  function toggleCat(label: string) {
    const on = cats.includes(label)
    const next = on ? cats.filter((c) => c !== label) : [...cats, label]
    update('categorias_servico', next.join(','))
  }
  function next() { if (currentStep < steps.length - 1) { setDirection(1); setCurrentStep((s) => s + 1); setError('') } }
  function prev() { if (currentStep > 0) { setDirection(-1); setCurrentStep((s) => s - 1); setError('') } }

  function fail(msg: string, field?: string) {
    setError(msg)
    setFieldErrors(field ? { [field]: msg } : {})
    return false
  }

  function fetchGps() {
    if (!navigator.geolocation) { setError('Geolocalização não suportada.'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => update('localizacao', `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`),
      () => setError('Não foi possível obter a localização.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function validateStep(): boolean {
    setFieldErrors({})
    setError('')
    switch (currentStep) {
      case 0:
        if (!form.accountType) return fail('Selecione um tipo de conta.')
        return true
      case 1: {
        if (!form.nome.trim()) return fail('Nome é obrigatório.', 'nome')
        if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return fail('Introduza um email válido.', 'email')
        if (!form.telefone.trim()) return fail('Telefone é obrigatório.', 'telefone')
        if (form.password.length < 6) return fail('A palavra-passe deve ter pelo menos 6 caracteres.', 'password')
        if (form.password !== form.confirmPassword) return fail('As palavras-passe não coincidem.', 'confirmPassword')
        if (!isEmpresa && !form.aceita_termos) return fail('É necessário aceitar os Termos e a Política de Privacidade.')
        return true
      }
      case 2:
        if (cats.length === 0) return fail('Selecione pelo menos um serviço que oferece.', 'categorias_servico')
        return true
      case 3:
        if (!form.endereco.trim() && !form.bairro.trim()) return fail('Indique o endereço ou bairro (obrigatório).', 'endereco')
        return true
      case 4:
        if (!form.telefone_whatsapp.trim()) return fail('Telefone WhatsApp é obrigatório.', 'telefone_whatsapp')
        if (!form.logo.trim()) return fail('Carregue o logotipo/foto da empresa (obrigatório).', 'logo')
        return true
      case 5:
        if (!form.aceita_termos) return fail('É necessário aceitar os Termos e a Política de Privacidade.')
        return true
      default:
        return true
    }
  }

  async function handleSubmit() {
    setError(''); setLoading(true)
    try {
      await register({
        nome: form.nome, email: form.email, telefone: form.telefone,
        password: form.password, tipo_conta: form.accountType,
        localizacao: form.localizacao, raio_atuacao: form.raio_atuacao,
        // Empresa — identidade comercial
        nome_comercial: form.nome_comercial, nif: form.nif,
        tipo_entidade: form.tipo_entidade, logo: form.logo, foto_capa: form.foto_capa,
        descricao: form.descricao, website: form.website,
        redes_sociais: form.redes_sociais, telefone_whatsapp: form.telefone_whatsapp,
        // Localização desagregada
        provincia: form.provincia, municipio: form.municipio, bairro: form.bairro,
        endereco: form.endereco, ponto_referencia: form.ponto_referencia,
        // Serviços e área de atendimento
        categorias_servico: form.categorias_servico,
        area_atuacao: cats[0] || form.categorias_servico,
        atende_estabelecimento: form.atende_estabelecimento,
        atende_domicilio: form.atende_domicilio,
        areas_atendidas: form.areas_atendidas, atendimento_24h: form.atendimento_24h,
        // Verificação / representante
        representante_nome: form.representante_nome,
        representante_cargo: form.representante_cargo,
        representante_telefone: form.representante_telefone,
      })
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao registar. Tente novamente.')
    } finally { setLoading(false) }
  }

  const progress = (currentStep / (steps.length - 1)) * 100

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', padding: '36px 16px', position: 'relative', overflow: 'hidden' }}>
      {/* blobs vivos de fundo */}
      <div className="blob" style={{ width: 340, height: 340, background: '#FCA5A5', top: -90, left: -80 }} />
      <div className="blob" style={{ width: 300, height: 300, background: '#FDBA74', bottom: -100, right: -70, animationDelay: '1.6s' }} />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: '100%', maxWidth: 680, position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <img src={logoUrl} alt="Socorro!" style={{ height: 62, width: 62, margin: '0 auto 14px', borderRadius: 18, boxShadow: '0 12px 28px rgba(220,38,38,0.30)' }} />
          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em' }}>
            <span className="text-grad">Criar Conta</span>
          </h1>
          <p style={{ color: '#6B7280', marginTop: 4, fontSize: 15 }}>
            {isEmpresa ? 'Registe a sua empresa e comece a receber pedidos.' : 'Junte-se à comunidade Socorro!'}
          </p>
        </div>

        {/* Stepper */}
        <div style={{ marginBottom: 22, padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Passo {currentStep + 1} <span style={{ color: '#9CA3AF', fontWeight: 600 }}>/ {steps.length}</span>
            </span>
            <span className="hidden sm:block" style={{ fontSize: 12.5, fontWeight: 700, color: '#6B7280' }}>{steps[currentStep]}</span>
          </div>
          <div className="step-track">
            <div className="step-fill" style={{ width: `${Math.max(progress, 4)}%` }} />
          </div>
          <div className="hidden sm:flex" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 14 }}>
            {steps.map((label, i) => {
              const done = i < currentStep
              const active = i === currentStep
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 15,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12.5, fontWeight: 800, color: '#FFF',
                      background: done ? 'linear-gradient(135deg,#10B981,#14B8A6)' : active ? 'linear-gradient(135deg,#EF4444,#F97316)' : '#E5E7EB',
                      boxShadow: active ? '0 6px 16px -6px rgba(220,38,38,0.7)' : 'none',
                      transition: 'all 0.3s ease',
                    }}>
                      {done ? <CheckCircle2 size={15} /> : i + 1}
                    </div>
                    <span style={{ fontSize: 10.5, marginTop: 5, fontWeight: 600, whiteSpace: 'nowrap', color: active ? '#DC2626' : '#9CA3AF' }}>
                      {label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ height: 2.5, width: 26, margin: '0 4px 16px', borderRadius: 2, background: done ? '#10B981' : '#E5E7EB', transition: 'background 0.3s ease' }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Card */}
        <div className="card-vivo" style={{ padding: '30px 26px', borderRadius: 24 }}>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '12px 16px', marginBottom: 22, fontSize: 14, color: '#B91C1C', fontWeight: 600 }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={`${form.accountType}-${currentStep}`} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.28, ease: 'easeInOut' }}>

              {/* ═══ STEP 0 — Tipo de conta ═══ */}
              {currentStep === 0 && (
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Tipo de Conta</h2>
                  <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 22 }}>Escolha se pretende registar como cidadão ou empresa.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                    {([
                      { type: 'cidadao' as const, Icon: User, title: 'Cidadão', desc: 'Procuro serviços profissionais', tag: 'Grátis', grad: 'grad-brand', tint: '#FEF2F2' },
                      { type: 'empresa' as const, Icon: Building2, title: 'Empresa', desc: 'Ofereço serviços profissionais', tag: 'Receber pedidos', grad: 'grad-indigo', tint: '#EEF2FF' },
                    ]).map(({ type, Icon, title, desc, tag, grad, tint }) => {
                      const on = form.accountType === type
                      return (
                        <motion.button key={type} type="button" onClick={() => update('accountType', type)}
                          whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} animate={on ? { scale: 1.02 } : { scale: 1 }}
                          style={{
                            position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
                            borderRadius: 20, padding: '30px 20px', cursor: 'pointer', textAlign: 'center',
                            border: `2px solid ${on ? (type === 'empresa' ? '#6366F1' : '#DC2626') : '#E5E7EB'}`,
                            background: on ? tint : '#FFFFFF',
                            boxShadow: on ? `0 14px 30px -14px ${type === 'empresa' ? 'rgba(99,102,241,0.6)' : 'rgba(220,38,38,0.6)'}` : '0 1px 3px rgba(0,0,0,0.05)',
                            transition: 'border-color 0.2s ease, background 0.2s ease',
                          }}>
                          <span style={{ position: 'absolute', top: 10, right: 12, fontSize: 10.5, fontWeight: 800, padding: '4px 9px', borderRadius: 999, background: on ? '#FFF' : '#F3F4F6', color: on ? (type === 'empresa' ? '#4338CA' : '#B91C1C') : '#6B7280' }}>
                            {tag}
                          </span>
                          {on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', top: 10, left: 12, color: type === 'empresa' ? '#6366F1' : '#DC2626' }}><BadgeCheck size={18} /></motion.span>}
                          <span className={grad} style={{ width: 60, height: 60, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 22px -10px rgba(0,0,0,0.5)' }}>
                            <Icon size={28} color="#FFF" />
                          </span>
                          <span>
                            <span style={{ display: 'block', fontWeight: 800, color: '#111827', fontSize: 16.5 }}>{title}</span>
                            <span style={{ display: 'block', fontSize: 12.5, color: '#6B7280', marginTop: 4 }}>{desc}</span>
                          </span>
                        </motion.button>
                      )
                    })}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, padding: '12px 14px', borderRadius: 14, background: 'linear-gradient(135deg,#FFF7ED,#FEF2F2)', border: '1px solid #FED7AA', fontSize: 12.5, color: '#9A3412', fontWeight: 600 }}>
                    <Sparkles size={16} style={{ flexShrink: 0 }} />
                    Pode alterar o tipo de conta mais tarde nas configurações do perfil.
                  </div>
                </div>
              )}

              {/* ═══ STEP 1 — Dados da conta ═══ */}
              {currentStep === 1 && (
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Dados Pessoais</h2>
                  <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 22 }}>Informações de contacto e palavra-passe.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 14px' }}>
                    <Field label="Nome Completo" error={fieldErrors.nome}>
                      <div className="input-group">
                        <User size={17} className="input-group-icon" />
                        <input type="text" value={form.nome} onChange={(e) => update('nome', e.target.value)} placeholder="João Silva" className="auth-input" autoComplete="name" />
                      </div>
                    </Field>

                    <Field label="Email" error={fieldErrors.email}>
                      <div className="input-group">
                        <Mail size={17} className="input-group-icon" />
                        <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="joao@exemplo.co.ao" className="auth-input" autoComplete="email" />
                      </div>
                    </Field>

                    <Field label="Telefone" error={fieldErrors.telefone} hint="Formato angolano: 9XX XXX XXX">
                      <div className="input-group">
                        <Phone size={17} className="input-group-icon" />
                        <input type="tel" value={form.telefone} onChange={(e) => update('telefone', e.target.value)} placeholder="+244 9XX XXX XXX" className="auth-input" autoComplete="tel" />
                      </div>
                    </Field>

                    <Field label="Localização" error={fieldErrors.localizacao}>
                      <div className="input-group">
                        <MapPin size={17} className="input-group-icon" />
                        <input type="text" value={form.localizacao} onChange={(e) => update('localizacao', e.target.value)} placeholder="Rua, Bairro, Cidade" className="auth-input" />
                        <button type="button" onClick={fetchGps} className="input-group-toggle" title="Usar GPS"><Navigation size={17} /></button>
                      </div>
                    </Field>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 14px' }}>
                    <Field label="Palavra-passe" error={fieldErrors.password}>
                      <div className="input-group">
                        <Lock size={17} className="input-group-icon" />
                        <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Mínimo 6 caracteres" className="auth-input" autoComplete="new-password" />
                      </div>
                      {form.password && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                          <div className="pw-bar"><span style={{ width: pw.w, background: pw.c }} /></div>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: pw.c === '#E5E7EB' ? '#9CA3AF' : pw.c, whiteSpace: 'nowrap' }}>{pw.t}</span>
                        </div>
                      )}
                    </Field>

                    <Field label="Confirmar Palavra-passe" error={fieldErrors.confirmPassword}>
                      <div className="input-group">
                        <Lock size={17} className="input-group-icon" />
                        <input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="Repita a palavra-passe" className="auth-input" autoComplete="new-password" />
                      </div>
                      {form.confirmPassword && form.confirmPassword === form.password && (
                        <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#059669', marginTop: 7, fontWeight: 700 }}>
                          <Check size={13} /> As palavras-passe coincidem
                        </p>
                      )}
                    </Field>
                  </div>

                  {!isEmpresa && <TermsBox checked={form.aceita_termos} onChange={(v) => update('aceita_termos', v)} />}
                </div>
              )}

              {/* ═══ STEP 2 — Empresa: Dados Comerciais ═══ */}
              {currentStep === 2 && isEmpresa && (
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Dados Comerciais</h2>
                  <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 22 }}>Identidade legal e comercial da sua empresa.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 14px' }}>
                    <Field label="Nome Comercial" hint="Se diferente do nome legal.">
                      <div className="input-group">
                        <Store size={17} className="input-group-icon" />
                        <input type="text" value={form.nome_comercial} onChange={(e) => update('nome_comercial', e.target.value)} placeholder="Ex.: Mecânica Kianda" className="auth-input" />
                      </div>
                    </Field>

                    <Field label="NIF" hint="Número de Identificação Fiscal (9 dígitos).">
                      <div className="input-group">
                        <FileText size={17} className="input-group-icon" />
                        <input type="text" inputMode="numeric" value={form.nif} onChange={(e) => update('nif', e.target.value.replace(/\D/g, '').slice(0, 15))} placeholder="541XXXXXXX" className="auth-input" />
                      </div>
                    </Field>
                  </div>

                  <Field label="Tipo de Entidade">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                      {TIPOS_ENTIDADE.map((t) => {
                        const on = form.tipo_entidade === t.id
                        return (
                          <button key={t.id} type="button" onClick={() => update('tipo_entidade', t.id)}
                            style={{
                              padding: '12px 10px', borderRadius: 14, cursor: 'pointer', textAlign: 'center',
                              border: `1.8px solid ${on ? '#6366F1' : '#E5E7EB'}`,
                              background: on ? '#EEF2FF' : '#FFFFFF',
                              color: on ? '#4338CA' : '#4B5563',
                              transition: 'all 0.18s ease',
                            }}>
                            <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800 }}>{t.label}</span>
                            <span style={{ display: 'block', fontSize: 11, opacity: 0.75, marginTop: 2 }}>{t.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                  </Field>

                  <Field label="Descrição" hint={`${form.descricao.length}/600 caracteres`} optional>
                    <textarea value={form.descricao} maxLength={600} onChange={(e) => update('descricao', e.target.value)} rows={3}
                      placeholder="Descreva a sua atividade, experiência e o que o diferencia..."
                      className="auth-input" style={{ resize: 'vertical', minHeight: 84 }} />
                  </Field>

                  <Field label="Serviços que oferece" error={fieldErrors.categorias_servico} hint="Pode selecionar vários — os primeiros aparecem em destaque.">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {TODAS_CATEGORIAS.map((cat) => {
                        const on = cats.includes(cat.label)
                        const Icon = cat.icon
                        return (
                          <button key={cat.id} type="button" onClick={() => toggleCat(cat.label)}
                            className={`chip ${on ? 'chip-on' : ''}`}>
                            <Icon size={14} /> {cat.label}
                            {on && <Check size={13} />}
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                </div>
              )}

              {/* ═══ STEP 3 — Empresa: Localização e Serviços ═══ */}
              {currentStep === 3 && isEmpresa && (
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Localização e Serviços</h2>
                  <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 22 }}>Diga onde está e que áreas atende.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 14px' }}>
                    <Field label="Província">
                      <input type="text" value={form.provincia} onChange={(e) => update('provincia', e.target.value)} placeholder="Luanda" className="auth-input" />
                    </Field>
                    <Field label="Município">
                      <input type="text" value={form.municipio} onChange={(e) => update('municipio', e.target.value)} placeholder="Talatona" className="auth-input" />
                    </Field>
                    <Field label="Bairro">
                      <input type="text" value={form.bairro} onChange={(e) => update('bairro', e.target.value)} placeholder="Benfica" className="auth-input" />
                    </Field>
                    <Field label="Ponto de Referência" optional>
                      <input type="text" value={form.ponto_referencia} onChange={(e) => update('ponto_referencia', e.target.value)} placeholder="Perto do mercado central" className="auth-input" />
                    </Field>
                  </div>

                  <Field label="Endereço" error={fieldErrors.endereco}>
                    <div className="input-group">
                      <MapPin size={17} className="input-group-icon" />
                      <input type="text" value={form.endereco} onChange={(e) => update('endereco', e.target.value)} placeholder="Rua, Nº, Porta" className="auth-input" />
                    </div>
                  </Field>

                  <Field label="Áreas Atendidas" hint="Municípios ou bairros separados por vírgula." optional>
                    <input type="text" value={form.areas_atendidas} onChange={(e) => update('areas_atendidas', e.target.value)} placeholder="Talatona, Benfica, Kilamba" className="auth-input" />
                  </Field>

                  <Field label="Modalidades de atendimento">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                      <ToggleCard on={form.atende_estabelecimento} onClick={() => update('atende_estabelecimento', !form.atende_estabelecimento)}
                        Icon={Store} label="No estabelecimento" onColor="#6366F1" onBg="#EEF2FF" />
                      <ToggleCard on={form.atende_domicilio} onClick={() => update('atende_domicilio', !form.atende_domicilio)}
                        Icon={MapPin} label="Ao domicílio" onColor="#047857" onBg="#ECFDF5" />
                      <ToggleCard on={form.atendimento_24h} onClick={() => update('atendimento_24h', !form.atendimento_24h)}
                        Icon={Clock} label="Atendimento 24h" onColor="#B45309" onBg="#FFFBEB" />
                    </div>
                  </Field>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label style={{ fontSize: 13.5, fontWeight: 700, color: '#374151' }}>Raio de Atuação</label>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#DC2626', background: '#FEF2F2', padding: '3px 10px', borderRadius: 999 }}>{form.raio_atuacao} km</span>
                    </div>
                    <input type="range" min={1} max={100} value={form.raio_atuacao} onChange={(e) => update('raio_atuacao', Number(e.target.value))} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                      <span>1 km</span><span>100 km</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP 4 — Empresa: Imagens e Contactos ═══ */}
              {currentStep === 4 && isEmpresa && (
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Imagens e Contactos</h2>
                  <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 22 }}>Mostre a identidade da sua empresa e facilite o contacto.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 6 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#374151', marginBottom: 7 }}>
                        Logotipo <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <ImageUploader
                        value={form.logo}
                        onChange={(url) => update('logo', url)}
                        label="Carregar logotipo"
                        hint="JPG, PNG ou WEBP · máx. 10 MB"
                        aspect="square"
                      />
                      {fieldErrors.logo && (
                        <p style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#DC2626', marginTop: 6, fontWeight: 600 }}>
                          <AlertCircle size={13} /> {fieldErrors.logo}
                        </p>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#374151', marginBottom: 7 }}>
                        Fotografia de Capa <span style={{ fontWeight: 500, color: '#9CA3AF', fontSize: 12 }}>opcional</span>
                      </label>
                      <ImageUploader
                        value={form.foto_capa}
                        onChange={(url) => update('foto_capa', url)}
                        label="Carregar imagem de capa"
                        hint="Aparece no topo do seu perfil público"
                        aspect="square"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 14px' }}>
                    <Field label="Telefone WhatsApp" error={fieldErrors.telefone_whatsapp} hint="É por aqui que os clientes falam consigo.">
                      <div className="input-group">
                        <MessageCircle size={17} className="input-group-icon" />
                        <input type="tel" value={form.telefone_whatsapp} onChange={(e) => update('telefone_whatsapp', e.target.value)} placeholder="+244 9XX XXX XXX" className="auth-input" />
                      </div>
                    </Field>

                    <Field label="Website" optional>
                      <div className="input-group">
                        <Globe size={17} className="input-group-icon" />
                        <input type="url" value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://minhaempresa.ao" className="auth-input" />
                      </div>
                    </Field>
                  </div>

                  <Field label="Redes Sociais" optional hint='Ex.: {"facebook": "…", "instagram": "…"}'>
                    <div className="input-group">
                      <Share2 size={17} className="input-group-icon" />
                      <input type="text" value={form.redes_sociais} onChange={(e) => update('redes_sociais', e.target.value)} placeholder='{"facebook": "minhaempresa", "instagram": "minhaempresa"}' className="auth-input" />
                    </div>
                  </Field>
                </div>
              )}

              {/* ═══ STEP 5 — Empresa: Verificação ═══ */}
              {currentStep === 5 && isEmpresa && (
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Verificação</h2>
                  <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 22 }}>Dados do representante para verificação da empresa.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 14px' }}>
                    <Field label="Nome do Representante">
                      <div className="input-group">
                        <UserCheck size={17} className="input-group-icon" />
                        <input type="text" value={form.representante_nome} onChange={(e) => update('representante_nome', e.target.value)} placeholder="Nome completo" className="auth-input" />
                      </div>
                    </Field>

                    <Field label="Cargo">
                      <div className="input-group">
                        <Briefcase size={17} className="input-group-icon" />
                        <input type="text" value={form.representante_cargo} onChange={(e) => update('representante_cargo', e.target.value)} placeholder="Gerente / Representante Legal" className="auth-input" />
                      </div>
                    </Field>
                  </div>

                  <Field label="Telefone do Representante">
                    <div className="input-group">
                      <Phone size={17} className="input-group-icon" />
                      <input type="tel" value={form.representante_telefone} onChange={(e) => update('representante_telefone', e.target.value)} placeholder="+244 9XX XXX XXX" className="auth-input" />
                    </div>
                  </Field>

                  <div style={{
                    background: 'linear-gradient(135deg,#F0FDF4,#ECFDF5)', border: '1px solid #BBF7D0', borderRadius: 14,
                    padding: '14px 16px', fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontWeight: 600,
                  }}>
                    <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                    Os seus dados serão analisados pela equipa de verificação (certidão comercial, documentos do representante e licença) após o registo.
                  </div>

                  <TermsBox checked={form.aceita_termos} onChange={(v) => update('aceita_termos', v)} />
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Navegação */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, paddingTop: 20, borderTop: '1px solid #F3F4F6' }}>
            {currentStep > 0 ? (
              <button type="button" onClick={prev} className="btn-ghost" style={{ padding: '11px 18px', fontSize: 14 }}>
                <ChevronLeft size={16} /> Voltar
              </button>
            ) : <div />}

            {currentStep < steps.length - 1 ? (
              <button type="button" onClick={() => { if (validateStep()) next() }} className="btn-vivo" style={{ padding: '12px 26px', fontSize: 14.5 }}>
                Próximo <ChevronRight size={16} />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading || !form.aceita_termos}
                className="btn-vivo"
                style={{
                  padding: '12px 26px', fontSize: 14.5,
                  backgroundImage: form.aceita_termos ? 'linear-gradient(135deg,#10B981,#14B8A6)' : undefined,
                  boxShadow: form.aceita_termos ? '0 6px 18px -6px rgba(16,185,129,0.6)' : undefined,
                }}>
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> A registar…</>
                  : <><CheckCircle2 size={16} /> Concluir Registo</>}
              </button>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7280', marginTop: 22 }}>
          Já tem uma conta? <Link to="/login" className="auth-link">Entrar</Link>
        </p>
      </motion.div>
    </div>
  )
}

/* ──────── auxiliares locais ──────── */
function TermsBox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 18, padding: '14px 16px', borderRadius: 14, background: checked ? '#F0FDF4' : '#F9FAFB', border: `1.5px solid ${checked ? '#BBF7D0' : '#E5E7EB'}`, transition: 'all 0.2s ease' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 2, width: 18, height: 18, accentColor: '#059669' }} />
      <span style={{ fontSize: 13.5, color: '#4B5563', lineHeight: 1.55 }}>
        Aceito os <a href="/termos" style={{ color: '#DC2626', fontWeight: 700 }} target="_blank" rel="noreferrer">Termos de Uso</a> e a{' '}
        <a href="/privacidade" style={{ color: '#DC2626', fontWeight: 700 }} target="_blank" rel="noreferrer">Política de Privacidade</a>
      </span>
    </label>
  )
}

function ToggleCard({
  on, onClick, Icon, label, onColor, onBg,
}: { on: boolean; onClick: () => void; Icon: any; label: string; onColor: string; onBg: string }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px', borderRadius: 14, cursor: 'pointer',
        border: `1.8px solid ${on ? onColor : '#E5E7EB'}`,
        background: on ? onBg : '#FFFFFF',
        color: on ? onColor : '#6B7280',
        fontSize: 13.5, fontWeight: 700, textAlign: 'left', transition: 'all 0.18s ease',
      }}>
      <span style={{
        width: 20, height: 20, borderRadius: 7, flexShrink: 0,
        background: on ? onColor : '#FFFFFF', border: on ? 'none' : '1.8px solid #D1D5DB',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF',
      }}>
        {on && <Check size={13} strokeWidth={3} />}
      </span>
      <Icon size={16} style={{ flexShrink: 0 }} />
      {label}
    </button>
  )
}
