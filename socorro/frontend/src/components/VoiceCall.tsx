import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X, User } from 'lucide-react'
import { getCallWebSocketUrl } from '../api'

export interface CallParticipant {
  id: string
  nome: string
  foto_perfil?: string | null
}

interface Props {
  pedidoId: string
  token: string
  self: CallParticipant
  peer: CallParticipant
}

export interface VoiceCallHandle {
  startCall: () => Promise<void>
}

type CallState = 'idle' | 'calling' | 'incoming' | 'connecting' | 'connected'

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

const VoiceCall = forwardRef<VoiceCallHandle, Props>(({ pedidoId, token, self, peer }, ref) => {
  const [state, setState] = useState<CallState>('idle')
  const [seconds, setSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const pendingRef = useRef<Array<Record<string, unknown>>>([])
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const timerRef = useRef<number | null>(null)
  const stateRef = useRef<CallState>('idle')
  stateRef.current = state

  const send = (data: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    } else {
      pendingRef.current.push(data)
    }
  }

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (audioRef.current) audioRef.current.srcObject = null
  }

  const closePeer = () => {
    pcRef.current?.close()
    pcRef.current = null
    pendingCandidatesRef.current = []
  }

  const resetTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    setSeconds(0)
  }

  const cleanupCall = () => {
    closePeer()
    stopStream()
    resetTimer()
    setMuted(false)
    setSpeaker(true)
  }

  const reset = () => {
    cleanupCall()
    setState('idle')
  }

  const endCall = (notify = true) => {
    if (
      notify &&
      stateRef.current !== 'idle'
    ) {
      send({ type: 'call-end' })
    }
    reset()
  }

  const ensurePeer = async (): Promise<RTCPeerConnection> => {
    if (pcRef.current) return pcRef.current
    const pc = new RTCPeerConnection(ICE_CONFIG)
    pcRef.current = pc
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => pc.addTrack(t, streamRef.current!))
    }
    pc.onicecandidate = (e) => {
      if (e.candidate) send({ type: 'ice', candidate: e.candidate.toJSON() })
    }
    pc.ontrack = (e) => {
      if (audioRef.current) {
        audioRef.current.srcObject = e.streams[0]
        audioRef.current.volume = speaker ? 1 : 0
      }
    }
    return pc
  }

  const flushCandidates = () => {
    const pc = pcRef.current
    if (!pc || !pc.remoteDescription) return
    const pending = pendingCandidatesRef.current
    pendingCandidatesRef.current = []
    pending.forEach((c) => pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}))
  }

  const addIce = (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current
    if (pc && pc.remoteDescription) {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {})
    } else {
      pendingCandidatesRef.current.push(candidate)
    }
  }

  const startCall = async () => {
    if (stateRef.current !== 'idle') return
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      await ensurePeer()
      setState('calling')
      send({ type: 'call-start', from_name: self.nome })
    } catch {
      stopStream()
      setError('Não foi possível aceder ao microfone.')
    }
  }

  const acceptCall = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      await ensurePeer()
      setState('connecting')
      send({ type: 'call-accept' })
    } catch {
      stopStream()
      setState('idle')
      setError('Não foi possível aceder ao microfone.')
      send({ type: 'call-reject' })
    }
  }

  const rejectCall = () => {
    send({ type: 'call-reject' })
    reset()
  }

  const cancelCall = () => {
    send({ type: 'call-cancel' })
    reset()
  }

  useImperativeHandle(ref, () => ({ startCall }))

  useEffect(() => {
    const ws = new WebSocket(`${getCallWebSocketUrl(pedidoId)}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      const pending = pendingRef.current
      pendingRef.current = []
      pending.forEach((m) => ws.send(JSON.stringify(m)))
    }

    ws.onmessage = async (event) => {
      let data: Record<string, any>
      try {
        data = JSON.parse(event.data)
      } catch {
        return
      }
      const type = data.type as string

      if (type === 'incoming-call') {
        if (stateRef.current !== 'idle') {
          send({ type: 'call-busy' })
          return
        }
        setState('incoming')
      } else if (type === 'call-accepted') {
        if (stateRef.current !== 'calling') return
        try {
          await ensurePeer()
          setState('connecting')
          const pc = pcRef.current!
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          send({ type: 'offer', sdp: pc.localDescription })
        } catch {
          endCall(true)
        }
      } else if (type === 'offer') {
        if (stateRef.current !== 'connecting') return
        const pc = pcRef.current
        if (!pc) return
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
        flushCandidates()
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        send({ type: 'answer', sdp: pc.localDescription })
        setState('connected')
      } else if (type === 'answer') {
        const pc = pcRef.current
        if (!pc || stateRef.current !== 'connecting') return
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
        flushCandidates()
        setState('connected')
      } else if (type === 'ice') {
        addIce(data.candidate)
      } else if (type === 'call-end' || type === 'peer-left') {
        if (stateRef.current !== 'idle') reset()
      } else if (type === 'call-reject' || type === 'call-cancel') {
        reset()
        setError('A chamada foi recusada.')
      } else if (type === 'call-busy') {
        reset()
        setError('A pessoa está ocupada neste momento.')
      } else if (type === 'peer-unavailable') {
        reset()
        setError('A outra pessoa está offline neste momento.')
      }
    }

    ws.onclose = () => {
      pendingRef.current = []
      if (
        stateRef.current === 'connected' ||
        stateRef.current === 'calling' ||
        stateRef.current === 'connecting'
      ) {
        reset()
      }
    }

    return () => {
      ws.close()
      cleanupCall()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId, token])

  useEffect(() => {
    if (state !== 'connected') return
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [state])

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next))
  }

  const toggleSpeaker = () => {
    const next = !speaker
    setSpeaker(next)
    if (audioRef.current) audioRef.current.volume = next ? 1 : 0
  }

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
  }

  const status = () => {
    switch (state) {
      case 'calling':
        return `A chamar ${peer.nome}...`
      case 'incoming':
        return 'Chamada recebida'
      case 'connecting':
        return 'A ligar...'
      case 'connected':
        return fmtTime(seconds)
      default:
        return ''
    }
  }

  const showOverlay = state !== 'idle' || !!error

  return (
    <>
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-surface-950/80 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.94, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm bg-surface-900 border border-surface-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl"
            >
              {/* Avatar */}
              <div className="relative">
                {peer.foto_perfil ? (
                  <img
                    src={peer.foto_perfil}
                    alt={peer.nome}
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-brand-600/30"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-brand-600/20 text-brand-400 flex items-center justify-center ring-4 ring-brand-600/30">
                    <User size={34} />
                  </div>
                )}
                {state !== 'idle' && (
                  <span
                    className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-surface-900 ${
                      state === 'connected' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                )}
              </div>

              <h3 className="mt-5 text-lg font-bold text-white">{peer.nome}</h3>
              <p className="text-sm font-medium text-brand-400 mt-0.5">{status()}</p>

              {error && (
                <p className="mt-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                  {error}
                </p>
              )}

              {/* Ações */}
              <div className="mt-8 flex items-center justify-center gap-5">
                {state === 'incoming' && (
                  <>
                    <button
                      onClick={rejectCall}
                      className="flex flex-col items-center gap-2"
                      aria-label="Rejeitar chamada"
                    >
                      <span className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-transform">
                        <PhoneOff size={22} />
                      </span>
                      <span className="text-[11px] text-surface-400">Rejeitar</span>
                    </button>
                    <button
                      onClick={acceptCall}
                      className="flex flex-col items-center gap-2"
                      aria-label="Atender chamada"
                    >
                      <span className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 active:scale-95 transition-transform">
                        <Phone size={22} />
                      </span>
                      <span className="text-[11px] text-surface-400">Atender</span>
                    </button>
                  </>
                )}

                {state === 'calling' && (
                  <button
                    onClick={cancelCall}
                    className="flex flex-col items-center gap-2"
                    aria-label="Cancelar chamada"
                  >
                    <span className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-transform">
                      <PhoneOff size={22} />
                    </span>
                    <span className="text-[11px] text-surface-400">Cancelar</span>
                  </button>
                )}

                {(state === 'connecting' || state === 'connected') && (
                  <>
                    <button
                      onClick={toggleMute}
                      className="flex flex-col items-center gap-2"
                      aria-label="Silenciar microfone"
                    >
                      <span
                        className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                          muted
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                            : 'bg-surface-700 text-white'
                        }`}
                      >
                        {muted ? <MicOff size={22} /> : <Mic size={22} />}
                      </span>
                      <span className="text-[11px] text-surface-400">Silenciar</span>
                    </button>

                    <button
                      onClick={toggleSpeaker}
                      className="flex flex-col items-center gap-2"
                      aria-label="Alto-falante"
                    >
                      <span
                        className={`w-14 h-14 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                          speaker ? 'bg-surface-700 text-white' : 'bg-amber-500 text-white'
                        }`}
                      >
                        {speaker ? <Volume2 size={22} /> : <VolumeX size={22} />}
                      </span>
                      <span className="text-[11px] text-surface-400">Som</span>
                    </button>

                    <button
                      onClick={() => endCall(true)}
                      className="flex flex-col items-center gap-2"
                      aria-label="Terminar chamada"
                    >
                      <span className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition-transform">
                        <PhoneOff size={22} />
                      </span>
                      <span className="text-[11px] text-surface-400">Terminar</span>
                    </button>
                  </>
                )}

                {error && state === 'idle' && (
                  <button
                    onClick={() => setError(null)}
                    className="flex flex-col items-center gap-2"
                    aria-label="Fechar"
                  >
                    <span className="w-14 h-14 rounded-full bg-surface-700 text-white flex items-center justify-center active:scale-95 transition-transform">
                      <X size={22} />
                    </span>
                    <span className="text-[11px] text-surface-400">Fechar</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
})

VoiceCall.displayName = 'VoiceCall'

export default VoiceCall