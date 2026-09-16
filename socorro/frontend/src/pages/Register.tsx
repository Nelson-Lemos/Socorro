import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Building2, Mail, Lock, Eye, EyeOff, Phone, MapPin,
  AlertCircle, Loader2, ChevronRight, ChevronLeft, Upload,
  FileText, Shield, Briefcase, CheckCircle2, Navigation,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, documentosApi } from '../api'
import { useAuth } from '../context/AuthContext'
import logoUrl from '../assets/logo.jpeg'

const CATEGORIAS_EMPRESA = [
  'Construção Civil', 'Serviços Elétricos', 'Tecnologia', 'Transporte',
  'Saúde', 'Educação', 'Alimentação', 'Segurança', 'Limpeza', 'Outro',
]

const DOC_CIDADAO = [
  { tipo: 'bi_frente', label: 'BI (Frente)', desc: 'Frente do Bilhete de Identidade' },
  { tipo: 'bi_verso', label: 'BI (Verso)', desc: 'Verso do Bilhete de Identidade' },
]

const DOC_EMPRESA = [
  { tipo: 'bi_frente', label: 'BI Representante (Frente)', desc: 'Bilhete do representante legal' },
  { tipo: 'bi_verso', label: 'BI Representante (Verso)', desc: 'Verso do BI do representante' },
  { tipo: 'alvara', label: 'Alvará Comercial', desc: 'Licença de funcionamento' },
  { tipo: 'certidao', label: 'Certidão de Registo', desc: 'Certidão de registo comercial' },
  { tipo: 'nif', label: 'NIF da Empresa', desc: 'Número de identificação fiscal' },
]

const STEPS_CIDADAO = ['Conta', 'Dados', 'Verificação', 'Documentos', 'Perfil']
const STEPS_EMPRESA = ['Conta', 'Dados', 'Verificação', 'Documentos', 'Perfil']

type AccountType = 'cidadao' | 'empresa'

interface Step1 { accountType: AccountType }
interface Step2 {
  nome: string; email: string; telefone: string; localizacao: string;
  password: string; confirmPassword: string; tipo_servico?: string; nif_empresa?: string;
}
interface Step3 { email_code: string; phone_code: string }
interface Step4 { documentos: Record<string, File | null> }
interface Step5 { descricao: string; disponibilidade: string; raio_atuacao: number; aceita_termos: boolean }
type FormData = Step1 & Step2 & Step3 & Step4 & Step5

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
}

/* ──────── shared inline styles ──────── */
const s = {
  label: { display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 } as React.CSSProperties,
  inputRow: { position: 'relative' as const, marginBottom: 20 },
  card: {
    background: '#FFFFFF',
    borderRadius: 24,
    padding: '32px 28px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.03)',
    border: '1px solid rgba(229,231,235,0.6)',
  } as React.CSSProperties,
  stepTitle: { fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4 } as React.CSSProperties,
  stepDesc: { fontSize: 14, color: '#6B7280', marginBottom: 24 } as React.CSSProperties,
}

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<Partial<FormData>>({
    accountType: undefined, nome: '', email: '', telefone: '', localizacao: '',
    password: '', confirmPassword: '', tipo_servico: '', nif_empresa: '',
    email_code: '', phone_code: '', documentos: {},
    descricao: '', disponibilidade: 'integral', raio_atuacao: 10, aceita_termos: false,
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  const steps = form.accountType === 'empresa' ? STEPS_EMPRESA : STEPS_CIDADAO
  const docs = form.accountType === 'empresa' ? DOC_EMPRESA : DOC_CIDADAO
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }
  function next() { if (currentStep < steps.length - 1) { setDirection(1); setCurrentStep((s) => s + 1); setError('') } }
  function prev() { if (currentStep > 0) { setDirection(-1); setCurrentStep((s) => s - 1); setError('') } }

  function fetchGps() {
    if (!navigator.geolocation) { setError('Geolocalização não suportada.'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { update('localizacao', `${pos.coords.latitude}, ${pos.coords.longitude}`); setGpsLoading(false) },
      () => { setError('Não foi possível obter a localização.'); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function validateStep(): boolean {
    switch (currentStep) {
      case 0: if (!form.accountType) { setError('Selecione um tipo de conta.'); return false } return true
      case 1:
        if (!form.nome?.trim()) { setError('Nome completo é obrigatório.'); return false }
        if (!form.email?.trim()) { setError('Email é obrigatório.'); return false }
        if (!form.telefone?.trim()) { setError('Telefone é obrigatório.'); return false }
        if (!form.localizacao?.trim()) { setError('Localização é obrigatória.'); return false }
        if (!form.password || form.password.length < 6) { setError('A palavra-passe deve ter pelo menos 6 caracteres.'); return false }
        if (form.password !== form.confirmPassword) { setError('As palavras-passe não coincidem.'); return false }
        if (form.accountType === 'empresa' && !form.tipo_servico) { setError('Selecione a categoria do serviço.'); return false }
        return true
      default: return true
    }
  }

  async function handleSubmit() {
    setError(''); setLoading(true)
    try {
      await authApi.register({
        nome: form.nome || '', email: form.email || '', telefone: form.telefone || undefined,
        localizacao: form.localizacao || undefined, password: form.password || '',
        tipo_conta: form.accountType || 'cidadao', nif: form.nif_empresa || undefined,
        area_atuacao: form.tipo_servico || undefined,
      })
      if (form.documentos) {
        for (const [tipo, file] of Object.entries(form.documentos).filter(([, f]) => f !== null)) {
          if (file) await documentosApi.upload(tipo, file)
        }
      }
      await login(form.email || '', form.password || '')
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao registar. Tente novamente.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #FEF2F2, #FFFFFF, #EEF2FF)', padding: '32px 16px' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: '100%', maxWidth: 640 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src={logoUrl} alt="Socorro!" style={{ height: 64, width: 64, margin: '0 auto 16px', borderRadius: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.12)' }} />
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: '-0.025em' }}>Criar Conta</h1>
          <p style={{ color: '#6B7280', marginTop: 4, fontSize: 15 }}>Junte-se à comunidade Socorro!</p>
        </div>

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 32, padding: '0 16px' }}>
          {steps.map((label, i) => {
            const done = i < currentStep
            const active = i === currentStep
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <motion.div
                    layout
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: '#FFF',
                      background: done ? '#059669' : active ? '#DC2626' : '#E5E7EB',
                      boxShadow: active ? '0 4px 14px rgba(220,38,38,0.30)' : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {done ? <CheckCircle2 size={18} /> : i + 1}
                  </motion.div>
                  <span style={{
                    fontSize: 10, marginTop: 6, fontWeight: 500, whiteSpace: 'nowrap',
                    color: active ? '#DC2626' : '#9CA3AF',
                  }} className="hidden sm:block">{label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    height: 3, width: 32, margin: '0 4px', borderRadius: 2,
                    background: done ? '#059669' : '#E5E7EB',
                    transition: 'background 0.3s ease',
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Glass card */}
        <div style={s.card}>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', marginBottom: 24, fontSize: 14, color: '#B91C1C' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={currentStep} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: 'easeInOut' }}>

              {/* ═══ STEP 0 — Account Type ═══ */}
              {currentStep === 0 && (
                <div>
                  <h2 style={s.stepTitle}>Tipo de Conta</h2>
                  <p style={s.stepDesc}>Escolha se pretende registar como cidadão ou empresa.</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Cidadão */}
                    <motion.button type="button" onClick={() => update('accountType', 'cidadao')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      style={{
                        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                        borderRadius: 16, padding: '32px 24px', border: `2px solid ${form.accountType === 'cidadao' ? '#DC2626' : '#E5E7EB'}`,
                        background: form.accountType === 'cidadao' ? '#FEF2F2' : '#F9FAFB',
                        boxShadow: form.accountType === 'cidadao' ? '0 4px 14px rgba(220,38,38,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
                        cursor: 'pointer', transition: 'all 0.2s ease',
                      }}>
                      {form.accountType === 'cidadao' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', top: 12, right: 12 }}><CheckCircle2 size={20} color="#DC2626" /></motion.div>}
                      <div style={{ width: 64, height: 64, borderRadius: 16, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={32} color="#DC2626" />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 700, color: '#111827', fontSize: 16 }}>Cidadão</p>
                        <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Procuro serviços profissionais</p>
                      </div>
                    </motion.button>

                    {/* Empresa */}
                    <motion.button type="button" onClick={() => update('accountType', 'empresa')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      style={{
                        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                        borderRadius: 16, padding: '32px 24px', border: `2px solid ${form.accountType === 'empresa' ? '#6366F1' : '#E5E7EB'}`,
                        background: form.accountType === 'empresa' ? '#EEF2FF' : '#F9FAFB',
                        boxShadow: form.accountType === 'empresa' ? '0 4px 14px rgba(99,102,241,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
                        cursor: 'pointer', transition: 'all 0.2s ease',
                      }}>
                      {form.accountType === 'empresa' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', top: 12, right: 12 }}><CheckCircle2 size={20} color="#6366F1" /></motion.div>}
                      <div style={{ width: 64, height: 64, borderRadius: 16, background: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={32} color="#6366F1" />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontWeight: 700, color: '#111827', fontSize: 16 }}>Empresa</p>
                        <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Ofereço serviços profissionais</p>
                      </div>
                    </motion.button>
                  </div>
                </div>
              )}

              {/* ═══ STEP 1 — Personal Data ═══ */}
              {currentStep === 1 && (
                <div>
                  <h2 style={s.stepTitle}>Dados Pessoais</h2>

                  <div style={s.inputRow}>
                    <label style={s.label}>Nome Completo</label>
                    <div className="input-group">
                      <User size={18} className="input-group-icon" />
                      <input type="text" value={form.nome} onChange={(e) => update('nome', e.target.value)} placeholder="João Silva" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Email</label>
                    <div className="input-group">
                      <Mail size={18} className="input-group-icon" />
                      <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="joao@exemplo.co.ao" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Telefone</label>
                    <div className="input-group">
                      <Phone size={18} className="input-group-icon" />
                      <input type="tel" value={form.telefone} onChange={(e) => update('telefone', e.target.value)} placeholder="+244 9XX XXX XXX" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Localização</label>
                    <div className="input-group">
                      <MapPin size={18} className="input-group-icon" />
                      <input type="text" value={form.localizacao} onChange={(e) => update('localizacao', e.target.value)} placeholder="Rua, Bairro, Cidade" className="auth-input" style={{ paddingLeft: 40, paddingRight: 48 }} />
                      <button type="button" onClick={fetchGps} disabled={gpsLoading} className="input-group-toggle" title="Usar GPS">
                        {gpsLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Navigation size={18} />}
                      </button>
                    </div>
                  </div>

                  {form.accountType === 'empresa' && (
                    <div style={s.inputRow}>
                      <label style={s.label}>Categoria do Serviço</label>
                      <div className="input-group">
                        <Briefcase size={18} className="input-group-icon" />
                        <select value={form.tipo_servico} onChange={(e) => update('tipo_servico', e.target.value)} className="auth-input" style={{ paddingLeft: 40, appearance: 'none' as const }}>
                          <option value="">Selecione...</option>
                          {CATEGORIAS_EMPRESA.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {form.accountType === 'empresa' && (
                    <div style={s.inputRow}>
                      <label style={s.label}>NIF da Empresa</label>
                      <div className="input-group">
                        <FileText size={18} className="input-group-icon" />
                        <input type="text" value={form.nif_empresa} onChange={(e) => update('nif_empresa', e.target.value)} placeholder="541XXXXXXX" className="auth-input" style={{ paddingLeft: 40 }} />
                      </div>
                    </div>
                  )}

                  <div style={s.inputRow}>
                    <label style={s.label}>Palavra-passe</label>
                    <div className="input-group">
                      <Lock size={18} className="input-group-icon" />
                      <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Mínimo 6 caracteres" className="auth-input" style={{ paddingLeft: 40, paddingRight: 48 }} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="input-group-toggle">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Confirmar Palavra-passe</label>
                    <div className="input-group">
                      <Lock size={18} className="input-group-icon" />
                      <input type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="Repita a palavra-passe" className="auth-input" style={{ paddingLeft: 40, paddingRight: 48 }} />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="input-group-toggle">
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP 2 — Verification ═══ */}
              {currentStep === 2 && (
                <div>
                  <h2 style={s.stepTitle}>Verificação</h2>
                  <p style={s.stepDesc}>Enviamos códigos de confirmação para o seu email e telefone.</p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', marginBottom: 24 }}>
                    <Shield size={18} color="#DC2626" style={{ flexShrink: 0 }} />
                    <p style={{ fontSize: 14, color: '#B91C1C' }}>Verifique sua caixa de entrada e mensagens SMS para obter os códigos.</p>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Código de Email</label>
                    <div className="input-group">
                      <Mail size={18} className="input-group-icon" />
                      <input type="text" maxLength={6} value={form.email_code} onChange={(e) => update('email_code', e.target.value.replace(/\D/g, ''))} placeholder="000000"
                        className="auth-input" style={{ paddingLeft: 40, letterSpacing: '0.3em', textAlign: 'center', fontSize: 18, fontFamily: 'monospace' }} />
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Código de Telefone (OTP)</label>
                    <div className="input-group">
                      <Phone size={18} className="input-group-icon" />
                      <input type="text" maxLength={6} value={form.phone_code} onChange={(e) => update('phone_code', e.target.value.replace(/\D/g, ''))} placeholder="000000"
                        className="auth-input" style={{ paddingLeft: 40, letterSpacing: '0.3em', textAlign: 'center', fontSize: 18, fontFamily: 'monospace' }} />
                    </div>
                  </div>

                  <button type="button" onClick={() => { if (form.telefone) authApi.enviarOTP(form.telefone); authApi.enviarEmailVerificacao() }} className="auth-link" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                    Reenviar códigos
                  </button>
                </div>
              )}

              {/* ═══ STEP 3 — Document Upload ═══ */}
              {currentStep === 3 && (
                <div>
                  <h2 style={s.stepTitle}>Documentos</h2>
                  <p style={s.stepDesc}>Carregue os documentos necessários para validação da sua conta.</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {docs.map((doc) => {
                      const file = form.documentos?.[doc.tipo]
                      const hasFile = file !== null && file !== undefined
                      return (
                        <motion.div key={doc.tipo} whileHover={{ scale: 1.01 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 16, borderRadius: 16, padding: 16,
                            border: `2px dashed ${hasFile ? '#34D399' : '#D1D5DB'}`,
                            background: hasFile ? '#ECFDF5' : '#F9FAFB',
                            cursor: 'pointer', transition: 'all 0.2s ease',
                          }}
                          onClick={() => fileRefs.current[doc.tipo]?.click()}>
                          <input ref={(el) => { fileRefs.current[doc.tipo] = el }} type="file" accept="image/*,.pdf" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0] ?? null; update('documentos', { ...form.documentos, [doc.tipo]: f }) }} />
                          <div style={{
                            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: hasFile ? '#D1FAE5' : '#E5E7EB',
                          }}>
                            {hasFile ? <CheckCircle2 size={24} color="#059669" /> : <Upload size={24} color="#9CA3AF" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{doc.label}</p>
                            <p style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hasFile ? file!.name : doc.desc}</p>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ═══ STEP 4 — Profile Setup ═══ */}
              {currentStep === 4 && (
                <div>
                  <h2 style={s.stepTitle}>Perfil Profissional</h2>
                  <p style={s.stepDesc}>Complete o seu perfil para atrair mais clientes.</p>

                  <div style={s.inputRow}>
                    <label style={s.label}>Descrição Profissional</label>
                    <textarea value={form.descricao} onChange={(e) => update('descricao', e.target.value)} rows={4}
                      placeholder="Descreva a sua experiência, especialidades e o que o diferencia..."
                      className="auth-input" style={{ resize: 'none', minHeight: 100 }} />
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Disponibilidade</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      {[{ value: 'integral', label: 'Integral' }, { value: 'parcial', label: 'Parcial' }, { value: 'fim_semana', label: 'Fim de Semana' }].map((opt) => (
                        <button key={opt.value} type="button" onClick={() => update('disponibilidade', opt.value)}
                          style={{
                            padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: 500,
                            border: `2px solid ${form.disponibilidade === opt.value ? '#DC2626' : '#E5E7EB'}`,
                            background: form.disponibilidade === opt.value ? '#FEF2F2' : '#F9FAFB',
                            color: form.disponibilidade === opt.value ? '#B91C1C' : '#4B5563',
                            cursor: 'pointer', transition: 'all 0.2s ease',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ ...s.label, marginBottom: 0 }}>Raio de Atuação</label>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#DC2626' }}>{form.raio_atuacao} km</span>
                    </div>
                    <input type="range" min={1} max={100} value={form.raio_atuacao} onChange={(e) => update('raio_atuacao', Number(e.target.value))}
                      style={{ width: '100%', height: 8, borderRadius: 4, appearance: 'none', background: '#E5E7EB', cursor: 'pointer', accentColor: '#DC2626' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>
                      <span>1 km</span><span>100 km</span>
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 20 }}>
                    <input type="checkbox" checked={form.aceita_termos} onChange={(e) => update('aceita_termos', e.target.checked)}
                      style={{ marginTop: 2, width: 18, height: 18, accentColor: '#DC2626' }} />
                    <span style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.5 }}>
                      Aceito os <a href="/termos" style={{ color: '#DC2626', fontWeight: 600 }} target="_blank">Termos de Uso</a> e a <a href="/privacidade" style={{ color: '#DC2626', fontWeight: 600 }} target="_blank">Política de Privacidade</a>
                    </span>
                  </label>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: '1px solid #E5E7EB' }}>
            {currentStep > 0 ? (
              <motion.button type="button" onClick={prev} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 500, color: '#4B5563', background: '#F3F4F6', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
                <ChevronLeft size={16} /> Voltar
              </motion.button>
            ) : <div />}

            {currentStep < steps.length - 1 ? (
              <motion.button type="button" onClick={() => { if (validateStep()) next() }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="auth-submit" style={{ width: 'auto', padding: '10px 24px' }}>
                Próximo <ChevronRight size={16} />
              </motion.button>
            ) : (
              <motion.button type="button" onClick={handleSubmit} disabled={loading || !form.aceita_termos} whileHover={{ scale: loading ? 1 : 1.02 }} whileTap={{ scale: loading ? 1 : 0.98 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 12,
                  fontSize: 14, fontWeight: 600, color: '#FFF', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #059669, #059669)',
                  boxShadow: '0 4px 14px rgba(5,150,105,0.30)',
                  opacity: loading || !form.aceita_termos ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}>
                {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Registando...</> : <><CheckCircle2 size={16} /> Concluir Registo</>}
              </motion.button>
            )}
          </div>
        </div>

        {/* Footer link */}
        <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7280', marginTop: 24 }}>
          Já tem uma conta?{' '}
          <Link to="/login" className="auth-link">Entrar</Link>
        </p>
      </motion.div>
    </div>
  )
}
