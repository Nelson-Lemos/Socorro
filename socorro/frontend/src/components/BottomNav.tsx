import { useNavigate, useLocation } from 'react-router-dom'
import { Home, Map as MapIcon, ClipboardList, User } from 'lucide-react'

const ITEMS = [
  { path: '/dashboard', label: 'Início', icon: Home },
  { path: '/mapa', label: 'Mapa', icon: MapIcon },
  { path: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { path: '/perfil', label: 'Perfil', icon: User },
]

export default function BottomNav() {
  const nav = useNavigate()
  const location = useLocation()

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-surface-900/90 backdrop-blur-xl border-t border-surface-200 dark:border-surface-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => nav(item.path)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
            >
              <Icon size={22} color={active ? '#DC2626' : '#6B7280'} strokeWidth={active ? 2.4 : 1.8} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  color: active ? '#DC2626' : '#6B7280',
                }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}