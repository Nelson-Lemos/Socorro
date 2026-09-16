import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../api'
import type { UserOut } from '../api'

interface AuthCtx {
  user: UserOut | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
  updateUser: (data: Partial<UserOut>) => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('socorro_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      authApi.me()
        .then(setUser)
        .catch(() => { localStorage.removeItem('socorro_token'); setToken(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    localStorage.setItem('socorro_token', data.access_token)
    setToken(data.access_token)
    setUser(data.user)
  }

  const register = async (formData: any) => {
    const data = await authApi.register(formData)
    localStorage.setItem('socorro_token', data.access_token)
    setToken(data.access_token)
    setUser(data.user)
  }

  const updateUser = async (data: Partial<UserOut>) => {
    const updated = await authApi.updateMe(data)
    setUser(updated)
  }

  const logout = () => {
    localStorage.removeItem('socorro_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
