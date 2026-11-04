import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, MessageCircle, Phone, Search, X, Calendar,
  CheckCheck, Wifi, WifiOff, Paperclip, ChevronDown,
} from 'lucide-react'
import { api, getWebSocketUrl, chatApi } from '../api'
import type { MensagemOut } from '../api'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import VoiceCall from '../components/VoiceCall'
import type { VoiceCallHandle, CallParticipant } from '../components/VoiceCall'
import { normalizarTexto } from '../constants'

interface Pedido {
  id: string
  titulo: string
  criador_nome: string | null
  criador_foto: string | null
  prestador_nome: string | null
  prestador_foto: string | null
  criado_por_id: string
  prestador_id: string | null
}

const diaLabel = (iso: string) => {
  const d = new Date(iso)
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(hoje.getDate() - 1)
  const mesmoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (mesmoDia(d, hoje)) return 'Hoje'
  if (mesmoDia(d, ontem)) return 'Ontem'
  return d.toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })
}

const horaLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [mensagens, setMensagens] = useState<MensagemOut[]>([])
  const [novoTexto, setNovoTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [mostrarFiltro, setMostrarFiltro] = useState(false)
  const [aCarregar, setACarregar] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const filtroRef = useRef<HTMLInputElement>(null)
  const callRef = useRef<VoiceCallHandle>(null)
  const [callActive, setCallActive] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/pedidos/${id}`).then(res => setPedido(res.data)).catch(() => navigate('/dashboard'))
  }, [id, navigate])

  useEffect(() => {
    if (!id) return
    setACarregar(true)
    chatApi.listarMensagens(id, 0, 120)
      .then(res => setMensagens(res))
      .catch(() => {})
      .finally(() => setACarregar(false))
  }, [id])

  useEffect(() => {
    if (!id || !token) return
    const wsUrl = `${getWebSocketUrl(id)}?token=${token}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => setWsConnected(true)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setMensagens(prev => {
          if (prev.some(m => m.id === data.id)) return prev
          return [...prev, {
            id: data.id, pedido_id: data.pedido_id, remetente_id: data.remetente_id,
            conteudo: data.conteudo, tipo: data.tipo, lida: data.lida,
            criado_em: data.criado_em, remetente_nome: data.remetente_nome,
          }]
        })
      } catch { /* ignora payload inválido */ }
    }
    ws.onclose = () => setWsConnected(false)
    ws.onerror = () => setWsConnected(false)
    return () => { ws.close() }
  }, [id, token])

  useEffect(() => {
    if (!filtro) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, filtro])

  // Abrir o filtro e focar imediatamente — resposta instantânea.
  const abrirFiltro = useCallback(() => {
    setMostrarFiltro(true)
    requestAnimationFrame(() => filtroRef.current?.focus())
  }, [])

  const fecharFiltro = useCallback(() => {
    setMostrarFiltro(false)
    setFiltro('')
  }, [])

  // Filtro local instantâneo (sem rede) — tolerante a acentos.
  const filtradas = useMemo(() => {
    const termo = normalizarTexto(filtro)
    if (!termo) return mensagens
    return mensagens.filter(m => normalizarTexto(m.conteudo).includes(termo))
  }, [mensagens, filtro])

  const enviar = async () => {
    if (!novoTexto.trim() || !id || enviando) return
    setEnviando(true)
    try {
      const res = await chatApi.enviarMensagem(id, novoTexto.trim(), 'texto')
      setMensagens(prev => prev.some(m => m.id === res.id) ? prev : [...prev, res])
      setNovoTexto('')
      inputRef.current?.focus()
    } catch { /* mantém o texto para nova tentativa */ }
    setEnviando(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  if (!pedido) {
    return (
      <div className="h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">S!</span>
          </div>
          <div className="w-6 h-6 border-2.5 border-surface-200 dark:border-surface-700 border-t-brand-600 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  const isCriador = user?.id === pedido.criado_por_id
  const outroNome = isCriador
    ? (pedido.prestador_nome || 'Prestador')
    : (pedido.criador_nome || 'Criador')
  const outroFoto = isCriador ? pedido.prestador_foto : pedido.criador_foto
  const peer: CallParticipant = isCriador
    ? { id: pedido.prestador_id || '', nome: pedido.prestador_nome || 'Prestador', foto_perfil: pedido.prestador_foto }
    : { id: pedido.criado_por_id, nome: pedido.criador_nome || 'Criador', foto_perfil: pedido.criador_foto }
  const canCall = !!user && !!token && !!peer.id && peer.id !== user.id

  return (
    <div className="h-screen bg-surface-50 dark:bg-surface-950 flex flex-col">
      {/* ── Cabeçalho ── */}
      <div className="flex-shrink-0 bg-white/90 dark:bg-surface-900/90 backdrop-blur-xl border-b border-surface-200 dark:border-surface-800">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-3 sm:px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} className="text-surface-600 dark:text-surface-400" />
          </button>

          <Avatar src={outroFoto} nome={outroNome} size={40} />

          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-surface-900 dark:text-white truncate">{outroNome}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              {wsConnected ? (
                <><Wifi size={11} className="text-emerald-500" /><span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Ligado em tempo real</span></>
              ) : (
                <><WifiOff size={11} className="text-surface-400" /><span className="text-[11px] text-surface-400 font-medium">A reconectar...</span></>
              )}
            </div>
          </div>

          {/* Filtro — botão sempre visível */}
          <button
            onClick={() => (mostrarFiltro ? fecharFiltro() : abrirFiltro())}
            className={`p-2.5 rounded-xl transition-colors shrink-0 ${mostrarFiltro ? 'bg-brand-600 text-white' : 'hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-300'}`}
            aria-label="Filtrar mensagens"
            title="Filtrar mensagens"
          >
            <Search size={18} />
          </button>

          {/* Chamada de voz — sempre visível quando aplicável */}
          {canCall && (
            <button
              onClick={() => { setCallActive(true); callRef.current?.startCall() }}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all active:scale-95 shrink-0"
              aria-label={`Chamar ${peer.nome}`}
              title={`Chamar ${peer.nome}`}
            >
              <Phone size={17} />
              <span className="hidden sm:inline text-xs font-bold">Chamar</span>
            </button>
          )}
        </div>

        {/* Barra de filtro — aparece imediatamente */}
        <AnimatePresence>
          {mostrarFiltro && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden border-t border-surface-200 dark:border-surface-800"
            >
              <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                  <input
                    ref={filtroRef}
                    value={filtro}
                    onChange={e => setFiltro(e.target.value)}
                    placeholder="Filtrar mensagens nesta conversa..."
                    className="w-full pl-9 pr-9 py-2 rounded-xl bg-surface-100 dark:bg-surface-800 border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-surface-900 outline-none text-sm text-surface-900 dark:text-white placeholder-surface-400 transition-colors"
                  />
                  {filtro && (
                    <button onClick={() => setFiltro('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400" aria-label="Limpar filtro">
                      <X size={15} />
                    </button>
                  )}
                </div>
                {filtro && (
                  <span className="text-xs font-semibold text-surface-500 whitespace-nowrap">
                    {filtradas.length} de {mensagens.length}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mensagens ── */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4">
        <div className="max-w-3xl mx-auto space-y-2">
          {aCarregar ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2.5 border-surface-200 dark:border-surface-700 border-t-brand-600 rounded-full animate-spin" />
            </div>
          ) : mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center mb-4">
                <MessageCircle size={28} className="text-brand-500" />
              </div>
              <p className="text-sm font-semibold text-surface-700 dark:text-surface-200">Nenhuma mensagem ainda</p>
              <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">Inicie a conversa para combinar o serviço.</p>
            </div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-16">
              <Search size={24} className="mx-auto text-surface-300 dark:text-surface-600 mb-3" />
              <p className="text-sm font-semibold text-surface-600 dark:text-surface-300">Sem mensagens para "{filtro}"</p>
              <button onClick={() => setFiltro('')} className="mt-2 text-xs font-semibold text-brand-600">Limpar filtro</button>
            </div>
          ) : (
            filtradas.map((msg, i) => {
              const isOwn = msg.remetente_id === user?.id
              const anterior = filtradas[i - 1]
              const novoDia = !anterior || diaLabel(anterior.criado_em) !== diaLabel(msg.criado_em)
              const mesmaPessoa = anterior && anterior.remetente_id === msg.remetente_id
              return (
                <div key={msg.id}>
                  {novoDia && !filtro && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" />
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-surface-400 uppercase tracking-wide">
                        <Calendar size={11} /> {diaLabel(msg.criado_em)}
                      </span>
                      <div className="flex-1 h-px bg-surface-200 dark:bg-surface-800" />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${mesmaPessoa ? 'mt-0.5' : 'mt-2.5'}`}
                  >
                    <div className={`max-w-[82%] sm:max-w-[70%] px-4 py-2.5 ${
                      isOwn
                        ? 'bg-brand-600 text-white rounded-2xl rounded-br-md'
                        : 'bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-200 dark:border-surface-700 rounded-2xl rounded-bl-md'
                    }`}>
                      {!isOwn && (!mesmaPessoa || novoDia) && (
                        <p className="text-[11px] font-bold text-brand-600 dark:text-brand-400 mb-1">{msg.remetente_nome || outroNome}</p>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.conteudo}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'text-white/65' : 'text-surface-400 dark:text-surface-500'}`}>
                        <span className="text-[10px]">{horaLabel(msg.criado_em)}</span>
                        {isOwn && <CheckCheck size={12} />}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Indicador de chamada ativa ── */}
      <AnimatePresence>
        {callActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-200 dark:border-emerald-800"
          >
            <div className="max-w-3xl mx-auto px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Chamada de voz em curso com {peer.nome}</span>
              <button onClick={() => setCallActive(false)} className="ml-auto text-emerald-700 dark:text-emerald-300" aria-label="Fechar aviso">
                <ChevronDown size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Caixa de escrita ── */}
      <div className="flex-shrink-0 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-end gap-2">
            <button
              onClick={enviar}
              disabled
              className="hidden sm:flex flex-shrink-0 w-[44px] h-[44px] rounded-xl items-center justify-center bg-surface-100 dark:bg-surface-800 text-surface-400 cursor-default"
              aria-label="Anexos (em breve)"
              title="Anexos — em breve"
            >
              <Paperclip size={18} />
            </button>
            <textarea
              ref={inputRef}
              value={novoTexto}
              onChange={e => setNovoTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escrever mensagem..."
              rows={1}
              className="flex-1 px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none min-h-[44px] max-h-[120px] font-sans"
            />
            <button
              onClick={enviar}
              disabled={!novoTexto.trim() || enviando}
              className={`flex-shrink-0 w-[44px] h-[44px] rounded-xl flex items-center justify-center transition-all duration-200 ${
                novoTexto.trim()
                  ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/25'
                  : 'bg-surface-200 dark:bg-surface-700 text-surface-400 cursor-default'
              }`}
              aria-label="Enviar mensagem"
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      </div>

      {user && token && (
        <VoiceCall
          ref={callRef}
          pedidoId={id!}
          token={token}
          self={{ id: user.id, nome: user.nome, foto_perfil: user.foto_perfil }}
          peer={peer}
        />
      )}
    </div>
  )
}
