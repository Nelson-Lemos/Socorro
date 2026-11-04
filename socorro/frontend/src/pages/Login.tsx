import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, Zap, Star } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logoUrl from '../assets/logo.jpeg'
import medicoImg from '../assets/img/medico.jpg'
import mecanicoImg from '../assets/img/mecanico.jpg'
import construcaoImg from '../assets/img/construção.jpg'
import eletricistaImg from '../assets/img/electrecista.jpg'

const collageImages = [
  { src: medicoImg, alt: 'Médico' },
  { src: mecanicoImg, alt: 'Mecânico' },
  { src: construcaoImg, alt: 'Construção' },
  { src: eletricistaImg, alt: 'Eletricista' },
]

const DESTAQUES = [
  { Icon: Zap, texto: 'Resposta rápida perto de si' },
  { Icon: ShieldCheck, texto: 'Profissionais verificados' },
  { Icon: Star, texto: 'Avaliações reais de clientes' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Preencha o email e a palavra-passe.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Credenciais inválidas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* ─── Painel visual ──────────────────────────────── */}
      <div className="auth-visual" style={{ background: '#B91C1C' }}>
        <div className="auth-visual-pattern" />
        <div className="blob" style={{ width: 380, height: 380, background: '#FCA5A5', top: -120, left: -110, opacity: 0.5 }} />
        <div className="blob" style={{ width: 300, height: 300, background: '#FDBA74', bottom: -100, right: -80, opacity: 0.45, animationDelay: '1.8s' }} />

        {/* Colagem de imagens */}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12, padding: 60, opacity: 0.28 }}>
          {collageImages.map((img, i) => (
            <motion.div
              key={img.alt}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.6 }}
              style={{ borderRadius: 18, overflow: 'hidden', position: 'relative' }}
            >
              <img src={img.src} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(127,29,29,0.7), transparent)' }} />
            </motion.div>
          ))}
        </div>

        {/* Conteúdo central */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0 48px' }}>
          <motion.img
            src={logoUrl}
            alt="Socorro! Logo"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6 }}
            style={{ height: 84, width: 84, borderRadius: 22, boxShadow: '0 28px 56px rgba(0,0,0,0.45)', marginBottom: 22, objectFit: 'cover' }}
          />
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            style={{ fontSize: 52, fontWeight: 900, color: '#FFF', letterSpacing: '-0.035em', marginBottom: 12, textAlign: 'center' }}
          >
            Socorro<span style={{ color: '#FDE047' }}>!</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{ color: '#FECACA', fontSize: 17, textAlign: 'center', maxWidth: 360, lineHeight: 1.6, fontWeight: 500 }}
          >
            Conectamos você aos melhores profissionais de confiança em Angola.
          </motion.p>

          {/* Destaques */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 34, width: '100%', maxWidth: 340 }}
          >
            {DESTAQUES.map(({ Icon, texto }, i) => (
              <motion.div
                key={texto}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + i * 0.12, duration: 0.5 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.22)', borderRadius: 14, padding: '12px 16px',
                }}
              >
                <span style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(253,224,71,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={17} color="#FDE047" />
                </span>
                <span style={{ color: '#FFFFFF', fontSize: 14.5, fontWeight: 600 }}>{texto}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ─── Painel de formulário ──────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Cabeçalho mobile */}
        <div style={{ padding: '32px 16px', textAlign: 'center', background: 'linear-gradient(135deg,#DC2626,#B91C1C 60%,#9A3412)' }} className="lg:!hidden">
          <img src={logoUrl} alt="Socorro!" style={{ height: 56, width: 56, margin: '0 auto 12px', borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} />
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#FFF', letterSpacing: '-0.03em' }}>
            Socorro<span style={{ color: '#FDE047' }}>!</span>
          </h1>
          <p style={{ color: '#FECACA', fontSize: 14, marginTop: 4, fontWeight: 500 }}>Faça login para continuar</p>
        </div>

        {/* Área do formulário */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', position: 'relative', overflow: 'hidden' }}>
          <div className="blob lg:!hidden" style={{ width: 260, height: 260, background: '#FECACA', top: -60, right: -70, opacity: 0.6 }} />

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="auth-form-card"
            style={{ position: 'relative', zIndex: 1 }}
          >
            <div className="hidden lg:block" style={{ marginBottom: 26 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: '-0.025em' }}>Bem-vindo de volta</h2>
              <p style={{ color: '#6B7280', marginTop: 4, fontSize: 15 }}>Entre na sua conta para continuar</p>
            </div>

            <div className="card-vivo" style={{ padding: 30, borderRadius: 24 }}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    borderRadius: 14, padding: '12px 16px', marginBottom: 22,
                    fontSize: 14, color: '#B91C1C', fontWeight: 600,
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#374151', marginBottom: 7 }}>Email</label>
                  <div className="input-group">
                    <Mail size={17} className="input-group-icon" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@exemplo.co.ao"
                      className="auth-input"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#374151', marginBottom: 7 }}>Palavra-passe</label>
                  <div className="input-group">
                    <Lock size={17} className="input-group-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="auth-input"
                      style={{ paddingRight: 48 }}
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="input-group-toggle" title={showPassword ? 'Ocultar' : 'Mostrar'}>
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 22 }}>
                  <Link to="/esqueci-password" className="auth-link" style={{ fontSize: 13 }}>Esqueci a palavra-passe</Link>
                </div>

                <button type="submit" disabled={loading} className="btn-vivo" style={{ width: '100%', padding: '14px 24px', fontSize: 15.5 }}>
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Entrando...
                    </>
                  ) : 'Entrar'}
                </button>
              </form>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '22px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#F3F4F6' }} />
                <span style={{ fontSize: 11.5, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>ou</span>
                <div style={{ flex: 1, height: 1, background: '#F3F4F6' }} />
              </div>

              <Link to="/register" className="btn-ghost" style={{ width: '100%', padding: '13px 24px', fontSize: 14.5, textDecoration: 'none' }}>
                Criar uma conta nova
              </Link>
            </div>

            <p style={{ textAlign: 'center', fontSize: 12.5, color: '#9CA3AF', marginTop: 18, lineHeight: 1.6 }}>
              Ao continuar, concorda com os{' '}
              <a href="/termos" style={{ color: '#DC2626', fontWeight: 600 }}>Termos</a> e a{' '}
              <a href="/privacidade" style={{ color: '#DC2626', fontWeight: 600 }}>Política de Privacidade</a>.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
