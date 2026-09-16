import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { authApi } from '../api'
import logoUrl from '../assets/logo.jpeg'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-surface-50 to-surface-100 dark:from-surface-950 dark:via-surface-950 dark:to-surface-900 px-4">
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45 }}
          className="w-full max-w-md bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-surface-800 p-8 sm:p-10 text-center">

          <img src={logoUrl} alt="Socorro!" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-lg" />

          <div className="w-14 h-14 rounded-full bg-error-light dark:bg-error/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-error dark:text-red-400" />
          </div>

          <h1 className="text-xl font-bold text-surface-900 dark:text-white mb-2">Link Inválido</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed mb-6">
            O link de redefinição de palavra-passe é inválido ou expirou.
          </p>

          <Link to="/esqueci-password" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
            <ArrowLeft size={16} /> Solicitar novo link
          </Link>
        </motion.div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('As palavras-passe não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A palavra-passe deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    try { await authApi.redefinirPassword(token, password); setSuccess(true) }
    catch (err: any) { setError(err.response?.data?.detail || 'Erro ao redefinir palavra-passe. Tente novamente.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-surface-50 to-surface-100 dark:from-surface-950 dark:via-surface-950 dark:to-surface-900 px-4">
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45 }}
        className="w-full max-w-md bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/40 dark:border-surface-800 p-8 sm:p-10">

        <div className="text-center mb-8">
          <motion.img src={logoUrl} alt="Socorro!" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-4 shadow-lg"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.4 }} />
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Nova Palavra-passe</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1.5">Indica a tua nova palavra-passe.</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-error-light dark:bg-error/20 border border-error/20 dark:border-error/30 text-error dark:text-red-400 rounded-xl px-4 py-3 mb-6 text-sm">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {success ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }} className="text-center">
            <div className="w-14 h-14 rounded-full bg-success-light dark:bg-success/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-success dark:text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-white mb-1.5">Palavra-passe Redefinida!</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed mb-6">
              A tua palavra-passe foi alterada com sucesso.
            </p>
            <button onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-600/25 transition-all duration-200">
              Entrar agora
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Nova palavra-passe</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6}
                  className="w-full pl-11 pr-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Confirmar palavra-passe</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repetir palavra-passe" required minLength={6}
                  className="w-full pl-11 pr-4 py-3 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all" />
              </div>
            </div>

            <motion.button type="submit" disabled={loading} whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold rounded-xl shadow-lg shadow-brand-600/25 transition-all duration-200">
              {loading ? <><Loader2 size={18} className="animate-spin" /> A redefinir...</> : 'Redefinir palavra-passe'}
            </motion.button>

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline">
                <ArrowLeft size={16} /> Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  )
}
