import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Building2, Mail, Lock, Phone, MapPin,
  AlertCircle, Loader2, CheckCircle2, ChevronRight, ChevronLeft,
  FileText, Briefcase, Navigation, Globe, Share2, MessageCircle,
  Camera, Clock, ShieldCheck, UserCheck, Check, Image,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoUrl from '../assets/logo.jpeg'

const CATEGORIAS_EMPRESA = [
  'Electricidade', 'Canalização', 'Climatização', 'Mecânica', 'Construção',
  'Transporte', 'Informática', 'Saúde', 'Segurança', 'Limpeza',
  'Eletrónica', 'Alimentação', 'Educação', 'Mudanças', 'Outro',
]

const TIPOS_ENTIDADE = ['empresa', 'eni', 'oficina', 'prestador']

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

const optStyle: React.CSSProperties = { fontSize: 12, fontWeight: 400, color: '#9CA3AF' }

/* ──────── shared inline styles ──────── */
const s: any = {
  label: { display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 },
  inputRow: { marginBottom: 20 },
  card: {
    background: '#FFFFFF', borderRadius: 24, padding: '32px 28px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.03)',
    border: '1px solid rgba(229,231,235,0.6)',
  },
  stepTitle: { fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4 },
  stepDesc: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  label2: { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 8 },
  small: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
}

const STEPS_CIDADAO = ['Conta', 'Dados']
const STEPS_EMPRESA = ['Conta', 'Dados', 'Dados Comerciais', 'Localização', 'Contactos', 'Verificação']

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
}

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<EmpresaForm>(initialForm)

  const steps = form.accountType === 'empresa' ? STEPS_EMPRESA : STEPS_CIDADAO

  function update<K extends keyof EmpresaForm>(key: K, value: EmpresaForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }
  function next() { if (currentStep < steps.length - 1) { setDirection(1); setCurrentStep((s) => s + 1); setError('') } }
  function prev() { if (currentStep > 0) { setDirection(-1); setCurrentStep((s) => s - 1); setError('') } }

  function fetchGps() {
    if (!navigator.geolocation) { setError('Geolocalização não suportada.'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => update('localizacao', `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`),
      () => setError('Não foi possível obter a localização.'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function validateStep(): boolean {
    switch (currentStep) {
      case 0: if (!form.accountType) { setError('Selecione um tipo de conta.'); return false } return true
      case 1:
        if (!form.nome?.trim()) { setError('Nome é obrigatório.'); return false }
        if (!form.email?.trim()) { setError('Email é obrigatório.'); return false }
        if (!form.telefone?.trim()) { setError('Telefone é obrigatório.'); return false }
        if (!form.password || form.password.length < 6) { setError('A palavra-passe deve ter pelo menos 6 caracteres.'); return false }
        if (form.password !== form.confirmPassword) { setError('As palavras-passe não coincidem.'); return false }
        return true
      // Empresa — campos essenciais (resto é opcional)
      case 2:
        if (!form.categorias_servico?.trim()) { setError('Selecione a categoria/serviço da empresa.'); return false }
        return true
      case 3:
        if (!form.endereco?.trim() && !form.bairro?.trim()) { setError('Indique o endereço ou bairro (obrigatório).'); return false }
        return true
      case 4:
        if (!form.telefone_whatsapp?.trim()) { setError('Telefone WhatsApp é obrigatório.'); return false }
        if (!form.logo?.trim()) { setError('Carregue o logotipo/foto da empresa (obrigatório).'); return false }
        return true
      case 5:
        if (!form.aceita_termos) { setError('É necessário aceitar os Termos e a Política de Privacidade.'); return false }
        return true
      default: return true
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
        area_atuacao: form.categorias_servico,
        atende_estabelecimento: form.atende_estabelecimento,
        atende_domicilio: form.atende_domicilio,
        areas_atendidas: form.areas_atendidas, atendimento_24h: form.atendimento_24h,
        // Verificação / representante
        representante_nome: form.representante_nome,
        representante_cargo: form.representante_cargo,
        representante_telefone: form.representante_telefone,
      })
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao registar. Tente novamente.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB', padding: '32px 16px' }}>
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
                  <motion.div style={{
                    width: 36, height: 36, borderRadius: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#FFF',
                    background: done ? '#059669' : active ? '#DC2626' : '#E5E7EB',
                    boxShadow: active ? '0 4px 14px rgba(220,38,38,0.30)' : 'none',
                    transition: 'all 0.3s ease',
                  }}>
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
                      {form.accountType === 'cidadao' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', top: 12, right: 12 }}><Check size={20} color="#DC2626" /></motion.div>}
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
                      {form.accountType === 'empresa' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', top: 12, right: 12 }}><Check size={20} color="#6366F1" /></motion.div>}
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
                  <p style={s.stepDesc}>Informações de contacto e palavra-passe.</p>

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
                      <button type="button" onClick={fetchGps} className="input-group-toggle" title="Usar GPS"><Navigation size={18} /></button>
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Palavra-passe</label>
                    <div className="input-group">
                      <Lock size={18} className="input-group-icon" />
                      <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Mínimo 6 caracteres" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Confirmar Palavra-passe</label>
                    <div className="input-group">
                      <Lock size={18} className="input-group-icon" />
                      <input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="Repita a palavra-passe" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 20 }}>
                    <input type="checkbox" checked={form.aceita_termos} onChange={(e) => update('aceita_termos', e.target.checked)} style={{ marginTop: 2, width: 18, height: 18, accentColor: '#DC2626' }} />
                    <span style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.5 }}>
                      Aceito os <a href="/termos" style={{ color: '#DC2626', fontWeight: 600 }} target="_blank">Termos de Uso</a> e a <a href="/privacidade" style={{ color: '#DC2626', fontWeight: 600 }} target="_blank">Política de Privacidade</a>
                    </span>
                  </label>
                </div>
              )}

              {/* ═══ STEP 2 — Empresa: Dados Comerciais ═══ */}
              {currentStep === 2 && form.accountType === 'empresa' && (
                <div>
                  <h2 style={s.stepTitle}>Dados Comerciais</h2>
                  <p style={s.stepDesc}>Identidade legal e comercial da sua empresa.</p>

                  <div style={s.inputRow}>
                    <label style={s.label}>Nome Comercial</label>
                    <div className="input-group">
                      <Building2 size={18} className="input-group-icon" />
                      <input type="text" value={form.nome_comercial} onChange={(e) => update('nome_comercial', e.target.value)} placeholder="Ex.: Mecânica Kianda" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                    <p style={s.small}>Se diferente do nome legal (opcional).</p>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>NIF</label>
                    <div className="input-group">
                      <FileText size={18} className="input-group-icon" />
                      <input type="text" value={form.nif} onChange={(e) => update('nif', e.target.value)} placeholder="541XXXXXXX" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Tipo de Entidade</label>
                    <div className="input-group">
                      <Briefcase size={18} className="input-group-icon" />
                      <select value={form.tipo_entidade} onChange={(e) => update('tipo_entidade', e.target.value)} className="auth-input" style={{ paddingLeft: 40 }}>
                        {TIPOS_ENTIDADE.map((t) => <option key={t} value={t}>{t === 'eni' ? 'ENI' : t[0].toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Descrição</label>
                    <textarea value={form.descricao} onChange={(e) => update('descricao', e.target.value)} rows={3} placeholder="Descreva a sua atividade, experiência e o que o diferencia..." className="auth-input" style={{ resize: 'none', minHeight: 84 }} />
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Categoria / Serviço</label>
                    <div className="input-group">
                      <Briefcase size={18} className="input-group-icon" />
                      <select value={form.categorias_servico} onChange={(e) => update('categorias_servico', e.target.value)} className="auth-input" style={{ paddingLeft: 40 }}>
                        <option value="">Selecione...</option>
                        {CATEGORIAS_EMPRESA.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Cidadão — Dados Pessoais extra */}
              {currentStep === 2 && form.accountType !== 'empresa' && (
                <div>
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ width: 96, height: 96, borderRadius: 24, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                      <CheckCircle2 size={48} color="#DC2626" />
                    </motion.div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Conta Criada!</h3>
                    <p style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>O seu registo está pronto. Faça login para começar.</p>
                  </div>
                </div>
              )}

              {/* ═══ STEP 3 — Empresa: Localização e Serviços ═══ */}
              {currentStep === 3 && form.accountType === 'empresa' && (
                <div>
                  <h2 style={s.stepTitle}>Localização e Serviços</h2>
                  <p style={s.stepDesc}>Diga onde está e que áreas atende.</p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={s.inputRow}>
                      <label style={s.label}>Província</label>
                      <input type="text" value={form.provincia} onChange={(e) => update('provincia', e.target.value)} placeholder="Luanda" className="auth-input" />
                    </div>
                    <div style={s.inputRow}>
                      <label style={s.label}>Município</label>
                      <input type="text" value={form.municipio} onChange={(e) => update('municipio', e.target.value)} placeholder="Talatona" className="auth-input" />
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Bairro</label>
                    <input type="text" value={form.bairro} onChange={(e) => update('bairro', e.target.value)} placeholder="Benfica" className="auth-input" />
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Endereço</label>
                    <div className="input-group">
                      <MapPin size={18} className="input-group-icon" />
                      <input type="text" value={form.endereco} onChange={(e) => update('endereco', e.target.value)} placeholder="Rua, Nº, Porta" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Ponto de Referência</label>
                    <input type="text" value={form.ponto_referencia} onChange={(e) => update('ponto_referencia', e.target.value)} placeholder="Perto do mercado central" className="auth-input" />
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Áreas Atendidas</label>
                    <input type="text" value={form.areas_atendidas} onChange={(e) => update('areas_atendidas', e.target.value)} placeholder="Talatona, Benfica, Kilamba (separadas por vírgula)" className="auth-input" />
                  </div>

                  {/* Modalidades de atendimento */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <button type="button" onClick={() => update('atende_estabelecimento', !form.atende_estabelecimento)}
                      style={{ padding: '14px 12px', borderRadius: 12, border: `2px solid ${form.atende_estabelecimento ? '#6366F1' : '#E5E7EB'}`, background: form.atende_estabelecimento ? '#EEF2FF' : '#F9FAFB', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: form.atende_estabelecimento ? '#4338CA' : '#4B5563' }}>
                      {form.atende_estabelecimento ? <Check size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : null} Atendo no Estabelecimento
                    </button>
                    <button type="button" onClick={() => update('atende_domicilio', !form.atende_domicilio)}
                      style={{ padding: '14px 12px', borderRadius: 12, border: `2px solid ${form.atende_domicilio ? '#059669' : '#E5E7EB'}`, background: form.atende_domicilio ? '#ECFDF5' : '#F9FAFB', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: form.atende_domicilio ? '#047857' : '#4B5563' }}>
                      {form.atende_domicilio ? <Check size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> : null} Atendo ao Domicílio
                    </button>
                  </div>

                  {/* Radios — raio */}
                  <div style={s.inputRow}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ ...s.label, marginBottom: 0 }}>Raio de Atuação</label>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#DC2626' }}>{form.raio_atuacao} km</span>
                    </div>
                    <input type="range" min={1} max={100} value={form.raio_atuacao} onChange={(e) => update('raio_atuacao', Number(e.target.value))}
                      style={{ width: '100%', height: 8, borderRadius: 4, appearance: 'none', background: '#E5E7EB', cursor: 'pointer', accentColor: '#DC2626' }} />
                  </div>

                  {/* Atendimento 24h */}
                  <button type="button" onClick={() => update('atendimento_24h', !form.atendimento_24h)}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: `1px solid ${form.atendimento_24h ? '#F59E0B' : '#E5E7EB'}`, background: form.atendimento_24h ? '#FFFBEB' : '#F9FAFB', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: form.atendimento_24h ? '#B45309' : '#6B7280', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Clock size={18} /> Atendimento 24h {form.atendimento_24h && <Check size={16} />}
                  </button>
                </div>
              )}

              {/* ═══ STEP 4? — Empresa: Contactos ═══ */}
              {currentStep === 4 && form.accountType === 'empresa' && (
                <div>
                  <h2 style={s.stepTitle}>Contactos</h2>
                  <p style={s.stepDesc}>Como os clientes o podem contactar.</p>

                  <div style={s.inputRow}>
                    <label style={s.label}>Telefone WhatsApp</label>
                    <div className="input-group">
                      <MessageCircle size={18} className="input-group-icon" />
                      <input type="tel" value={form.telefone_whatsapp} onChange={(e) => update('telefone_whatsapp', e.target.value)} placeholder="+244 9XX XXX XXX" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Website <span style={optStyle}>opcional</span></label>
                    <div className="input-group">
                      <Globe size={18} className="input-group-icon" />
                      <input type="url" value={form.website} onChange={(e) => update('website', e.target.value)} placeholder="https://minhaempresa.ao" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Redes Sociais <span style={optStyle}>opcional</span></label>
                    <div className="input-group">
                      <Share2 size={18} className="input-group-icon" />
                      <input type="text" value={form.redes_sociais} onChange={(e) => update('redes_sociais', e.target.value)} placeholder='{"facebook": "…", "instagram": "…"}' className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>

                <div style={s.inputRow}>
                  <label style={s.label}>Logotipo (URL) <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF' }}>opcional</span></label>
                  <div className="input-group">
                    <Image size={18} className="input-group-icon" />
                    <input type="text" value={form.logo} onChange={(e) => update('logo', e.target.value)} placeholder="https://…/logo.png" className="auth-input" style={{ paddingLeft: 40 }} />
                  </div>
                </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Fotografia de Capa (URL)</label>
                    <div className="input-group">
                      <Camera size={18} className="input-group-icon" />
                      <input type="text" value={form.foto_capa} onChange={(e) => update('foto_capa', e.target.value)} placeholder="https://…/capa.jpg" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP 5? — Empresa: Verificação ═══ */}
              {currentStep === 5 && form.accountType === 'empresa' && (
                <div>
                  <h2 style={s.stepTitle}>Verificação</h2>
                  <p style={s.stepDesc}>Dados do representante para verificação da empresa.</p>

                  <div style={s.inputRow}>
                    <label style={s.label}>Nome do Representante</label>
                    <div className="input-group">
                      <UserCheck size={18} className="input-group-icon" />
                      <input type="text" value={form.representante_nome} onChange={(e) => update('representante_nome', e.target.value)} placeholder="Nome completo" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Cargo</label>
                    <div className="input-group">
                      <Building2 size={18} className="input-group-icon" />
                      <input type="text" value={form.representante_cargo} onChange={(e) => update('representante_cargo', e.target.value)} placeholder="Gerente / Representante Legal" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>

                  <div style={s.inputRow}>
                    <label style={s.label}>Telefone do Representante</label>
                    <div className="input-group">
                      <Phone size={18} className="input-group-icon" />
                      <input type="tel" value={form.representante_telefone} onChange={(e) => update('representante_telefone', e.target.value)} placeholder="+244 9XX XXX XXX" className="auth-input" style={{ paddingLeft: 40 }} />
                    </div>
                  </div>

                  <div style={{
                    background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12,
                    padding: '14px 16px', fontSize: 13, color: '#166534', display: 'flex', alignItems: 'center', gap: 10, marginTop: 8,
                  }}>
                    <ShieldCheck size={18} />
                    Os seus dados serão analisados pela equipa de verificação (certidão comercial, documentos do representante e licença) após o registo.
                  </div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 20 }}>
                    <input type="checkbox" checked={form.aceita_termos} onChange={(e) => update('aceita_termos', e.target.checked)} style={{ marginTop: 2, width: 18, height: 18, accentColor: '#DC2626' }} />
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
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#FFF', border: 'none', cursor: 'pointer', background: '#DC2626', boxShadow: '0 4px 14px rgba(220,38,38,0.25)' }}>
                Próximo <ChevronRight size={16} />
              </motion.button>
            ) : (
              <motion.button type="button" onClick={handleSubmit} disabled={loading || !form.aceita_termos} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#FFF', border: 'none', cursor: 'pointer', background: '#059669', boxShadow: '0 4px 14px rgba(5,150,105,0.30)', opacity: loading || !form.aceita_termos ? 0.6 : 1, transition: 'all 0.2s ease' }}>
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
