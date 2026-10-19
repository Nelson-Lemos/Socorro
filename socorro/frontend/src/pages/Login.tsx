import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
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
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Credenciais inválidas. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* ─── Left branded panel ──────────────────────────────── */}
      <div className="auth-visual" style={{ background: '#B91C1C' }}>
        <div className="auth-visual-pattern" />

        {/* Image collage */}
        <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12, padding: 64, opacity: 0.30 }}>
          {collageImages.map((img, i) => (
            <motion.div
              key={img.alt}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.6 }}
              style={{ borderRadius: 16, overflow: 'hidden', position: 'relative' }}
            >
              <img src={img.src} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(127,29,29,0.6), transparent)' }} />
            </motion.div>
          ))}
        </div>

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0 48px' }}>
          <motion.img
            src={logoUrl}
            alt="Socorro! Logo"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{ height: 80, width: 80, borderRadius: 20, boxShadow: '0 25px 50px rgba(0,0,0,0.4)', marginBottom: 24, objectFit: 'cover' }}
          />
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            style={{ fontSize: 48, fontWeight: 800, color: '#FFF', letterSpacing: '-0.025em', marginBottom: 12, textAlign: 'center' }}
          >
            Socorro<span style={{ color: '#FDE047' }}>!</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{ color: '#FCA5A5', fontSize: 18, textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}
          >
            Conectando você aos melhores profissionais de confiança em Angola.
          </motion.p>
        </div>
      </div>

      {/* ─── Right form panel ────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Mobile header */}
        <div style={{ padding: '32px 16px', textAlign: 'center', background: '#B91C1C' }} className="lg:!hidden">
          <img src={logoUrl} alt="Socorro!" style={{ height: 56, width: 56, margin: '0 auto 12px', borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} />
          <h1 style={{ fontSize: 30, fontWeight: 800, color: '#FFF' }}>
            Socorro<span style={{ color: '#FDE047' }}>!</span>
          </h1>
          <p style={{ color: '#FCA5A5', fontSize: 14, marginTop: 4 }}>Faça login para continuar</p>
        </div>

        {/* Form area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="auth-form-card"
          >
            {/* Desktop greeting */}
            <div className="hidden lg:block" style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.025em' }}>Bem-vindo de volta</h2>
              <p style={{ color: '#6B7280', marginTop: 4, fontSize: 15 }}>Entre na sua conta para continuar</p>
            </div>

            {/* Form card */}
            <div style={{
              background: '#FFFFFF',
              borderRadius: 24,
              padding: 32,
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.03)',
              border: '1px solid rgba(229,231,235,0.6)',
            }}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    borderRadius: 12, padding: '12px 16px', marginBottom: 24,
                    fontSize: 14, color: '#B91C1C',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </motion.div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Email */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email</label>
                  <div className="input-group">
                    <Mail size={18} className="input-group-icon" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@exemplo.co.ao"
                      className="auth-input"
                      style={{ paddingLeft: 40 }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Palavra-passe</label>
                  <div className="input-group">
                    <Lock size={18} className="input-group-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="auth-input"
                      style={{ paddingLeft: 40, paddingRight: 48 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="input-group-toggle"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Forgot password */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                  <Link to="/esqueci-password" className="auth-link">Esqueci a palavra-passe</Link>
                </div>

                {/* Submit */}
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.01 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="auth-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      Entrando...
                    </>
                  ) : 'Entrar'}
                </motion.button>
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                <span style={{ fontSize: 12, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ou</span>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              </div>

              {/* Register link */}
              <p style={{ textAlign: 'center', fontSize: 14, color: '#6B7280' }}>
                Ainda não tem conta?{' '}
                <Link to="/register" className="auth-link">Criar conta</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
