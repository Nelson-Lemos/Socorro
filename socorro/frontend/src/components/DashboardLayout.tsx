import { useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import BottomNav from './BottomNav'
import {
  LayoutDashboard, PlusCircle, Map as MapIcon, ClipboardList, User,
  LogOut, Menu, X, Sun, Moon, Bell, ChevronRight,
} from 'lucide-react'
import logoUrl from '../assets/logo.jpeg'

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { path: '/mapa', label: 'Mapa', icon: MapIcon },
  { path: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { path: '/pedir-socorro', label: 'Pedir Socorro', icon: PlusCircle },
  { path: '/perfil', label: 'Perfil', icon: User },
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const nav = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 z-40">
        <div className="flex items-center gap-3 px-5 h-16 border-b border-surface-100 dark:border-surface-800">
          <img src={logoUrl} alt="Socorro!" className="w-9 h-9 rounded-xl object-cover" />
          <span className="text-lg font-bold text-surface-900 dark:text-white tracking-tight">Socorro!</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => nav(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-white'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                {item.label}
              </button>
            )
          })}
        </nav>
        <div className="px-3 pb-4 space-y-1">
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all"
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
            {dark ? 'Modo Claro' : 'Modo Escuro'}
          </button>
          <button
            onClick={() => { logout(); nav('/') }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
        <div className="px-4 py-3 border-t border-surface-100 dark:border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
              <User size={16} className="text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{user?.nome || 'Utilizador'}</p>
              <p className="text-xs text-surface-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-16 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-200 dark:border-surface-800 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <Menu size={22} className="text-surface-700 dark:text-surface-300" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logoUrl} alt="Socorro!" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-surface-900 dark:text-white">Socorro!</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors relative">
            <Bell size={20} className="text-surface-600 dark:text-surface-400" />
          </button>
          <button onClick={toggle} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            {dark ? <Sun size={20} className="text-surface-600" /> : <Moon size={20} className="text-surface-600" />}
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-white dark:bg-surface-900 z-50 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 h-16 border-b border-surface-100 dark:border-surface-800">
                <div className="flex items-center gap-3">
                  <img src={logoUrl} alt="Socorro!" className="w-9 h-9 rounded-xl object-cover" />
                  <span className="text-lg font-bold text-surface-900 dark:text-white">Socorro!</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800">
                  <X size={20} className="text-surface-500" />
                </button>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV_ITEMS.map(item => {
                  const Icon = item.icon
                  const active = location.pathname === item.path
                  return (
                    <button
                      key={item.path}
                      onClick={() => { nav(item.path); setSidebarOpen(false) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                          : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'
                      }`}
                    >
                      <Icon size={20} />
                      {item.label}
                    </button>
                  )
                })}
              </nav>
              <div className="px-3 pb-4 space-y-1">
                <button
                  onClick={toggle}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all"
                >
                  {dark ? <Sun size={20} /> : <Moon size={20} />}
                  {dark ? 'Modo Claro' : 'Modo Escuro'}
                </button>
                <button
                  onClick={() => { logout(); nav('/') }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                >
                  <LogOut size={20} />
                  Sair
                </button>
              </div>
              <div className="px-4 py-3 border-t border-surface-100 dark:border-surface-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center">
                    <User size={16} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900 dark:text-white truncate">{user?.nome || 'Utilizador'}</p>
                    <p className="text-xs text-surface-500 truncate">{user?.email}</p>
                  </div>
                  <ChevronRight size={16} className="text-surface-400" />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 min-h-screen pb-20 lg:pb-0">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  )
}
