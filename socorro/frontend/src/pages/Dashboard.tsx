import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { pedidosApi } from '../api'
import type { PedidoOut } from '../api'
import DashboardLayout from '../components/DashboardLayout'
import { SkeletonDashboard } from '../components/LoadingSkeleton'
import EmptyState from '../components/EmptyState'
import { motion } from 'framer-motion'
import {
  Shield,
  Zap,
  AlertTriangle,
  Clock,
  Calendar,
  Search,
  MapPin,
  Plus,
  ChevronRight,
  BarChart3,
  Flame,
  CheckCircle2,
  Users,
} from 'lucide-react'

const URGENCIA_CONFIG = {
  urgente: {
    label: 'Urgente',
    color: '#DC2626',
    bg: '#FEF2F2',
    darkBg: '#450A0A',
    darkColor: '#FCA5A5',
    icon: AlertTriangle,
  },
  moderada: {
    label: 'Moderada',
    color: '#D97706',
    bg: '#FFF7ED',
    darkBg: '#451A03',
    darkColor: '#FCD34D',
    icon: Clock,
  },
  planeada: {
    label: 'Planeada',
    color: '#16A34A',
    bg: '#F0FDF4',
    darkBg: '#052E16',
    darkColor: '#86EFAC',
    icon: Calendar,
  },
}

const STATUS_CONFIG = {
  aberto: { label: 'Aberto', color: '#DC2626', darkColor: '#FCA5A5' },
  em_andamento: { label: 'Em andamento', color: '#D97706', darkColor: '#FCD34D' },
  concluido: { label: 'Concluído', color: '#16A34A', darkColor: '#86EFAC' },
}

const FILTROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'urgente', label: 'Urgente' },
  { key: 'moderada', label: 'Moderada' },
  { key: 'planeada', label: 'Planeada' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pedidos, setPedidos] = useState<PedidoOut[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAtivo, setFiltroAtivo] = useState('todos')

  useEffect(() => {
    async function fetchPedidos() {
      try {
        const data = await pedidosApi.listar()
        setPedidos(data)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchPedidos()
  }, [])

  if (loading) {
    return (
      <DashboardLayout>
        <SkeletonDashboard />
      </DashboardLayout>
    )
  }

  const firstName = user?.nome?.split(' ')[0] || 'Usuário'
  const isVerified = user?.verificado ?? false

  const pedidosFiltrados =
    filtroAtivo === 'todos'
      ? pedidos
      : pedidos.filter((p) => p.urgencia === filtroAtivo)

  const abertos = pedidos.filter((p) => p.status === 'aberto').length
  const urgentes = pedidos.filter((p) => p.urgencia === 'urgente' && p.status !== 'concluido').length
  const concluidos = pedidos.filter((p) => p.status === 'concluido').length

  const stats = [
    {
      label: 'Pedidos Abertos',
      value: abertos,
      icon: BarChart3,
      gradient: 'from-blue-500 to-indigo-600',
      darkGradient: 'from-blue-400/20 to-indigo-500/20',
      iconBg: 'bg-blue-100 dark:bg-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      ring: 'ring-blue-500/10 dark:ring-blue-400/10',
    },
    {
      label: 'Urgentes',
      value: urgentes,
      icon: Flame,
      gradient: 'from-red-500 to-rose-600',
      darkGradient: 'from-red-400/20 to-rose-500/20',
      iconBg: 'bg-red-100 dark:bg-red-500/20',
      iconColor: 'text-red-600 dark:text-red-400',
      ring: 'ring-red-500/10 dark:ring-red-400/10',
    },
    {
      label: 'Concluídos',
      value: concluidos,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-green-600',
      darkGradient: 'from-emerald-400/20 to-green-500/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      ring: 'ring-emerald-500/10 dark:ring-emerald-400/10',
    },
  ]

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 pb-24 lg:pb-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* ── Greeting ── */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-white">
                Olá, {firstName}!
              </h1>
              {user?.tipo_conta === 'admin' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 ring-1 ring-purple-500/20">
                  <Users className="w-3 h-3" />
                  Admin
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400">
              <MapPin className="w-3.5 h-3.5" />
              {user?.localizacao || 'Luanda'}
              {!isVerified && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-medium">
                  <Shield className="w-3 h-3" />
                  Não verificado
                </span>
              )}
            </div>
          </motion.div>

          {/* ── Verification Banner ── */}
          {!isVerified && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              onClick={() => navigate('/documentos')}
              className="group relative overflow-hidden rounded-2xl border border-amber-200/60 dark:border-amber-500/20 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-amber-500/10 p-4 sm:p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-amber-500/10 dark:hover:shadow-amber-500/5 hover:border-amber-300 dark:hover:border-amber-500/30"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/5 to-amber-400/0 group-hover:via-amber-400/10 transition-all" />
              <div className="relative flex items-start gap-4">
                <div className="flex-shrink-0 p-2.5 rounded-xl bg-amber-100 dark:bg-amber-500/20">
                  <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                    Verifique sua identidade
                  </p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-0.5">
                    Envie seus documentos para ter acesso completo à plataforma.
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400 dark:text-amber-500 flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </motion.div>
          )}

          {/* ── SOS Button ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 18 }}
            className="flex justify-center py-2"
          >
            <button
              onClick={() => navigate('/pedir-socorro')}
              className="group relative flex flex-col items-center gap-3 focus:outline-none"
            >
              {/* pulse rings */}
              <span className="absolute inset-0 m-auto w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-red-500/20 dark:bg-red-500/15 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
              <span className="absolute inset-0 m-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-red-500/15 dark:bg-red-500/10 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />

              {/* main circle */}
              <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-rose-700 dark:from-red-400 dark:via-red-500 dark:to-rose-600 flex items-center justify-center shadow-xl shadow-red-500/30 dark:shadow-red-500/20 group-hover:shadow-red-500/50 dark:group-hover:shadow-red-400/30 transition-all duration-300 group-hover:scale-105 ring-4 ring-red-100 dark:ring-red-500/20">
                <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-white drop-shadow-sm group-hover:rotate-[-8deg] transition-transform duration-200" />
              </div>

              <span className="relative z-10 text-sm sm:text-base font-bold text-red-600 dark:text-red-400 tracking-wide uppercase">
                Pedir Socorro
              </span>
            </button>
          </motion.div>

          {/* ── Stats Row ── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-3 gap-3"
          >
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  className={`relative overflow-hidden rounded-2xl bg-white dark:bg-surface-900 border border-surface-200/60 dark:border-surface-800/60 p-4 ring-1 ${stat.ring} shadow-sm hover:shadow-md transition-shadow duration-300 min-w-0`}
                >
                  <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${stat.gradient} dark:${stat.darkGradient} opacity-[0.07] dark:opacity-[0.12] blur-xl`} />
                  <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${stat.iconBg} mb-3`}>
                    <Icon className={`w-4.5 h-4.5 ${stat.iconColor}`} />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-surface-900 dark:text-white tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 font-medium">
                    {stat.label}
                  </p>
                </motion.div>
              )
            })}
          </motion.div>

          {/* ── Filter Tabs ── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="overflow-x-auto scrollbar-none -mx-4 px-4"
          >
            <div className="flex gap-2 w-max">
              {FILTROS.map((f) => {
                const active = filtroAtivo === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => setFiltroAtivo(f.key)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap ring-1 ${
                      active
                        ? 'bg-surface-900 text-white dark:bg-white dark:text-surface-900 ring-surface-900 dark:ring-white shadow-md'
                        : 'bg-white text-surface-600 dark:bg-surface-900 dark:text-surface-400 ring-surface-200 dark:ring-surface-800 hover:bg-surface-100 dark:hover:bg-surface-800'
                    }`}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </motion.div>

          {/* ── Pedidos List ── */}
          {pedidosFiltrados.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="py-12"
            >
              <EmptyState
                icon={<Search className="w-10 h-10 text-surface-300 dark:text-surface-600" />}
                title="Nenhum pedido encontrado"
                description={
                  filtroAtivo === 'todos'
                    ? 'Ainda não há pedidos de socorro registados.'
                    : `Nenhum pedido com urgência "${filtroAtivo}".`
                }
              />
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {pedidosFiltrados.map((pedido) => {
                const urgConfig =
                  URGENCIA_CONFIG[pedido.urgencia as keyof typeof URGENCIA_CONFIG] ||
                  URGENCIA_CONFIG.moderada
                const statusConfig =
                  STATUS_CONFIG[pedido.status as keyof typeof STATUS_CONFIG] ||
                  STATUS_CONFIG.aberto
                const UrgIcon = urgConfig.icon

                const dateStr = new Date(pedido.criado_em).toLocaleDateString('pt-MZ', {
                  day: 'numeric',
                  month: 'short',
                })

                return (
                  <motion.div
                    key={pedido.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.012, y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => navigate(`/pedido/${pedido.id}`)}
                    className="group relative rounded-2xl bg-white dark:bg-surface-900 border border-surface-200/60 dark:border-surface-800/60 p-4 sm:p-5 min-h-[44px] cursor-pointer shadow-sm hover:shadow-lg hover:shadow-surface-200/50 dark:hover:shadow-black/20 transition-shadow duration-300 overflow-hidden"
                  >
                    {/* left accent */}
                    <div
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full opacity-70"
                      style={{ backgroundColor: statusConfig.color }}
                    />

                    <div className="flex items-start gap-3.5 pl-3">
                      {/* urgency badge */}
                      <div
                        className="flex-shrink-0 mt-0.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ring-1"
                        style={{
                          color: urgConfig.color,
                          backgroundColor: urgConfig.bg,
                          boxShadow: `inset 0 0 0 1px ${urgConfig.color}30`,
                        }}
                      >
                        <UrgIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">{urgConfig.label}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-surface-900 dark:text-white text-sm sm:text-base truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {pedido.titulo || 'Sem título'}
                          </h3>
                          <span
                            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: statusConfig.color }}
                            title={statusConfig.label}
                          />
                        </div>

                        {pedido.descricao && (
                          <p className="text-xs sm:text-sm text-surface-500 dark:text-surface-400 mt-1 line-clamp-2">
                            {pedido.descricao}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2.5 text-xs text-surface-400 dark:text-surface-500">
                          {pedido.localizacao && (
                            <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {pedido.localizacao}
                            </span>
                          )}
                          {pedido.criador_nome && (
                            <span className="truncate">{pedido.criador_nome}</span>
                          )}
                          <span className="ml-auto flex-shrink-0">{dateStr}</span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-surface-300 dark:text-surface-600 group-hover:text-surface-400 dark:group-hover:text-surface-500 flex-shrink-0 mt-2 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── FAB (mobile) ── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/pedidos/novo')}
        className="fixed bottom-6 right-6 pb-[env(safe-area-inset-bottom)] z-50 lg:hidden w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 text-white shadow-xl shadow-blue-500/30 dark:shadow-blue-500/20 flex items-center justify-center hover:shadow-blue-500/50 dark:hover:shadow-blue-400/30 transition-shadow"
        aria-label="Novo pedido"
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </DashboardLayout>
  )
}
