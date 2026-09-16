import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react'
import toast from 'react-hot-toast'

type ToastType = 'success' | 'error' | 'info' | 'warning'

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle size={20} className="text-success" />,
  error: <AlertTriangle size={20} className="text-error" />,
  info: <Info size={20} className="text-brand-500" />,
  warning: <AlertTriangle size={20} className="text-warning" />,
}

export function showToast(type: ToastType, message: string) {
  toast.custom((t) => (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border backdrop-blur-xl max-w-sm w-full ${
        t.visible ? 'animate-enter' : 'animate-leave'
      } bg-white/90 dark:bg-surface-800/90 border-surface-200 dark:border-surface-700`}
    >
      {icons[type]}
      <p className="flex-1 text-sm font-medium text-surface-900 dark:text-white">{message}</p>
      <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
        <X size={14} className="text-surface-400" />
      </button>
    </motion.div>
  ), { duration: 4000 })
}

export { toast }
