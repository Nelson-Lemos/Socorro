import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import PedirSocorro from './pages/PedirSocorro'
import PedidoDetail from './pages/PedidoDetail'
import ChatPage from './pages/ChatPage'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Documents from './pages/Documents'

function PrivateRoute({ children }: { children: any }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-xl">S!</span>
        </div>
        <div className="w-6 h-6 border-2.5 border-surface-200 dark:border-surface-700 border-t-brand-600 rounded-full animate-spin mx-auto" />
      </div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: any }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? children : <Navigate to="/dashboard" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/esqueci-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/redefinir-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path="/verificar-email" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/pedir-socorro" element={<PrivateRoute><PedirSocorro /></PrivateRoute>} />
      <Route path="/pedido/:id" element={<PrivateRoute><PedidoDetail /></PrivateRoute>} />
      <Route path="/chat/:id" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/documentos" element={<PrivateRoute><Documents /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
