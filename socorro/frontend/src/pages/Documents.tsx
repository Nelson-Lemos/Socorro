import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Upload, CheckCircle, XCircle, Clock, Phone, AlertCircle,
  FileText, Camera, ShieldCheck, Loader2,
} from 'lucide-react'
import { documentosApi, authApi } from '../api'
import type { DocumentoOut, StatusVerificacao } from '../api'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'

const DOC_META: Record<string, { label: string; desc: string; required: boolean }> = {
  bi_frente: { label: 'BI (Frente)', desc: 'Frente do Bilhete de Identidade', required: true },
  bi_verso: { label: 'BI (Verso)', desc: 'Verso do Bilhete de Identidade', required: true },
  alvara: { label: 'Alvará Comercial', desc: 'Documento de licença comercial', required: true },
  certidao: { label: 'Certidão de Registo', desc: 'Certidão de Registo Comercial', required: true },
  nif: { label: 'NIF', desc: 'Número de Identificação Fiscal', required: true },
}

const STATUS_CFG: Record<string, { label: string; cls: string; icon: typeof CheckCircle }> = {
  pendente: { label: 'Pendente', cls: 'bg-warning-light text-warning dark:bg-warning/20 dark:text-yellow-400', icon: Clock },
  aprovado: { label: 'Aprovado', cls: 'bg-success-light text-success dark:bg-success/20 dark:text-emerald-400', icon: CheckCircle },
  rejeitado: { label: 'Rejeitado', cls: 'bg-error-light text-error dark:bg-error/20 dark:text-red-400', icon: XCircle },
}

export default function Documents() {
  const { user } = useAuth()
  const [docs, setDocs] = useState<DocumentoOut[]>([])
  const [status, setStatus] = useState<StatusVerificacao | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [phone, setPhone] = useState(user?.telefone || '')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(user?.telefone_verificado || false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [docsData, statusData] = await Promise.all([documentosApi.listar(), documentosApi.statusVerificacao()])
      setDocs(docsData)
      setStatus(statusData)
    } catch { /* empty */ } finally { setLoading(false) }
  }

  const handleUpload = async (tipo: string, file: File) => {
    setUploading(tipo)
    setError('')
    try { await documentosApi.upload(tipo, file); await loadData() }
    catch (e: any) { setError(e.response?.data?.detail || 'Erro ao enviar documento') }
    finally { setUploading(null) }
  }

  const handleSendOTP = async () => {
    if (!phone) return
    setError('')
    try { await authApi.enviarOTP(phone); setOtpSent(true) }
    catch (e: any) { setError(e.response?.data?.detail || 'Erro ao enviar OTP') }
  }

  const handleVerifyOTP = async () => {
    if (!otpCode) return
    setError('')
    try { await authApi.verificarOTP(phone, otpCode); setPhoneVerified(true); setOtpSent(false) }
    catch (e: any) { setError(e.response?.data?.detail || 'Código inválido') }
  }

  const docsByType = new Map(docs.map(d => [d.tipo, d]))
  const requiredDocs = user?.tipo_conta === 'empresa'
    ? ['bi_frente', 'bi_verso', 'alvara', 'certidao', 'nif']
    : ['bi_frente', 'bi_verso']

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 px-4 py-6">
        <div className="max-w-xl mx-auto space-y-5">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-1">Documentos & Verificação</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">Envia os documentos necessários para verificar a tua conta.</p>
          </motion.div>

          {/* Phone Verification */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.35 }} className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white mb-4">
              <Phone size={16} className="text-brand-600 dark:text-brand-400" /> Verificação de Telefone
            </h2>
            {phoneVerified ? (
              <div className="flex items-center gap-2 bg-success-light dark:bg-success/20 text-success dark:text-emerald-400 rounded-xl px-4 py-3 text-sm font-medium">
                <CheckCircle size={16} /> Telefone verificado
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1.5">Número de telefone</label>
                  <input type="tel" placeholder="+244 9xx xxx xxx" value={phone} onChange={e => setPhone(e.target.value)} disabled={otpSent}
                    className="w-full px-3.5 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all disabled:opacity-50" />
                </div>
                {!otpSent ? (
                  <button onClick={handleSendOTP} disabled={!phone} className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-semibold rounded-xl transition-colors">
                    Enviar código OTP
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1.5">Código de verificação</label>
                      <input type="text" placeholder="000000" value={otpCode} onChange={e => setOtpCode(e.target.value)} maxLength={6}
                        className="w-full px-3.5 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all tracking-widest text-center font-mono" />
                    </div>
                    <button onClick={handleVerifyOTP} disabled={otpCode.length !== 6} className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-semibold rounded-xl transition-colors">
                      Verificar código
                    </button>
                    <button onClick={handleSendOTP} className="w-full text-center text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline">Reenviar código</button>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-error-light dark:bg-error/20 text-error dark:text-red-400 rounded-xl px-4 py-3 text-sm font-medium">
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}

          {/* Documents */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35 }} className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white mb-1">
              <FileText size={16} className="text-brand-600 dark:text-brand-400" /> Documentos de Identificação
            </h2>
            <p className="text-xs text-surface-500 dark:text-surface-400 mb-4">
              Para verificar a tua conta, precisa de: BI (frente e verso).
            </p>

            {loading ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 size={24} className="animate-spin text-brand-600" />
                <p className="text-xs text-surface-500 dark:text-surface-400">A carregar documentos...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(requiredDocs as string[]).map(tipo => {
                  const meta = DOC_META[tipo]
                  const doc = docsByType.get(tipo)
                  const st = doc ? STATUS_CFG[doc.status] : null
                  const StIcon = st?.icon
                  const isUploading = uploading === tipo

                  return (
                    <motion.div key={tipo} layout className={`rounded-xl border-2 p-4 transition-colors ${dragOver === tipo ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'border-surface-200 dark:border-surface-700'}`}
                      onDragOver={e => { e.preventDefault(); setDragOver(tipo) }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={e => { e.preventDefault(); setDragOver(null); const f = e.dataTransfer.files[0]; if (f) handleUpload(tipo, f) }}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                          <FileText size={18} className="text-surface-500 dark:text-surface-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-surface-900 dark:text-white">
                            {meta?.label}
                            {meta?.required && !doc && <span className="text-error ml-1">*</span>}
                          </p>
                          <p className="text-xs text-surface-500 dark:text-surface-400">{meta?.desc}</p>
                        </div>
                        {st && StIcon && (
                          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${st.cls}`}>
                            <StIcon size={11} /> {st.label}
                          </span>
                        )}
                      </div>

                      {doc?.status === 'rejeitado' && doc.motivo_rejeicao && (
                        <div className="bg-error-light dark:bg-error/10 rounded-lg px-3 py-2 mb-3 text-xs text-error dark:text-red-400">
                          <strong>Motivo:</strong> {doc.motivo_rejeicao}
                        </div>
                      )}

                      <button onClick={() => fileRefs.current[tipo]?.click()} disabled={isUploading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl text-xs font-medium text-brand-600 dark:text-brand-400 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-all disabled:opacity-50">
                        {isUploading ? (
                          <><Loader2 size={14} className="animate-spin" /> A enviar...</>
                        ) : doc ? (
                          <><Upload size={14} /> Substituir documento</>
                        ) : (
                          <><Camera size={14} /> Carregar documento</>
                        )}
                      </button>
                      <input ref={el => { fileRefs.current[tipo] = el }} type="file" accept="image/*,.pdf" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(tipo, f) }} />
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Verification Status */}
          {status && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.35 }} className="bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-bold text-surface-900 dark:text-white mb-4">
                <ShieldCheck size={16} className="text-brand-600 dark:text-brand-400" /> Estado da Verificação
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-800">
                  <span className="text-xs text-surface-600 dark:text-surface-400">Documentos enviados</span>
                  <span className="text-sm font-semibold text-surface-900 dark:text-white">{status.documentos_enviados.length} / {status.documentos_requeridos.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-800">
                  <span className="text-xs text-surface-600 dark:text-surface-400">Aprovados</span>
                  <span className="text-sm font-semibold text-success dark:text-emerald-400">{status.documentos_aprovados.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-surface-100 dark:border-surface-800">
                  <span className="text-xs text-surface-600 dark:text-surface-400">Pendentes</span>
                  <span className="text-sm font-semibold text-warning dark:text-yellow-400">{status.documentos_pendentes.length}</span>
                </div>
              </div>
              {status.todos_aprovados && phoneVerified && (
                <div className="flex items-center justify-center gap-2 bg-success-light dark:bg-success/20 rounded-xl px-4 py-3 mt-4 text-sm font-semibold text-success dark:text-emerald-400">
                  <CheckCircle size={18} /> Conta totalmente verificada!
                </div>
              )}
              {!status.todos_enviados && (
                <p className="text-center text-xs text-surface-400 dark:text-surface-500 mt-3">
                  Envie todos os documentos obrigatórios para solicitar verificação.
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
