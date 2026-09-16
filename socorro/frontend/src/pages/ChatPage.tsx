import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Send, Circle, MessageCircle } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

interface Mensagem {
  id: string
  pedido_id: string
  remetente_id: string
  conteudo: string
  tipo: string
  lida: boolean
  criado_em: string
  remetente_nome: string
}

interface Pedido {
  id: string
  titulo: string
  criador_nome: string | null
  prestador_nome: string | null
  criado_por_id: string
  prestador_id: string | null
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [novoTexto, setNovoTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!id) return
    api.get(`/pedidos/${id}`).then(res => setPedido(res.data)).catch(() => navigate('/dashboard'))
  }, [id])

  useEffect(() => {
    if (!id) return
    api.get(`/chat/${id}/mensagens`, { params: { limit: 100 } })
      .then(res => setMensagens(res.data))
      .catch(() => {})
  }, [id])

  useEffect(() => {
    if (!id || !token) return
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${window.location.host}/chat/${id}/ws?token=${token}`
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
      } catch { /* empty */ }
    }
    ws.onclose = () => setWsConnected(false)
    ws.onerror = () => setWsConnected(false)
    return () => { ws.close() }
  }, [id, token])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  const enviar = async () => {
    if (!novoTexto.trim() || !id || enviando) return
    setEnviando(true)
    try {
      await api.post(`/chat/${id}/mensagens`, { conteudo: novoTexto.trim(), tipo: 'texto' })
      setNovoTexto('')
      inputRef.current?.focus()
    } catch { /* empty */ }
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

  const outroNome = user?.id === pedido.criado_por_id
    ? (pedido.prestador_nome || 'Prestador')
    : (pedido.criador_nome || 'Criador')

  return (
    <div className="h-screen bg-surface-50 dark:bg-surface-950 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-200 dark:border-surface-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <ArrowLeft size={20} className="text-surface-600 dark:text-surface-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-surface-900 dark:text-white truncate">{pedido.titulo}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Circle size={7} className={wsConnected ? 'fill-emerald-500 text-emerald-500' : 'fill-red-500 text-red-500'} />
              <span className="text-[11px] text-surface-500 dark:text-surface-400">Conversa com {outroNome}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {mensagens.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
              <MessageCircle size={24} className="text-surface-400" />
            </div>
            <p className="text-sm text-surface-500 dark:text-surface-400">Nenhuma mensagem ainda.</p>
            <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">Inicia a conversa!</p>
          </div>
        )}

        {mensagens.map((msg, i) => {
          const isOwn = msg.remetente_id === user?.id
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.2, delay: i > mensagens.length - 3 ? 0.05 : 0 }}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] px-4 py-2.5 ${
                isOwn
                  ? 'bg-brand-600 text-white rounded-2xl rounded-br-md'
                  : 'bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 border border-surface-200 dark:border-surface-700 rounded-2xl rounded-bl-md'
              }`}>
                {!isOwn && (
                  <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 mb-1">{msg.remetente_nome}</p>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.conteudo}</p>
                <p className={`text-[10px] mt-1.5 text-right ${isOwn ? 'text-white/60' : 'text-surface-400 dark:text-surface-500'}`}>
                  {new Date(msg.criado_em).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={novoTexto}
            onChange={e => setNovoTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escrever mensagem..."
            rows={1}
            className="flex-1 px-4 py-2.5 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-none min-h-[42px] max-h-[120px] font-sans"
          />
          <button
            onClick={enviar}
            disabled={!novoTexto.trim() || enviando}
            className={`flex-shrink-0 w-[42px] h-[42px] rounded-xl flex items-center justify-center transition-all duration-200 ${
              novoTexto.trim()
                ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/25'
                : 'bg-surface-200 dark:bg-surface-700 text-surface-400 cursor-default'
            }`}
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
