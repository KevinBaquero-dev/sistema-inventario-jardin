// =============================================================================
// src/store/auth.store.ts
// Zustand v5 — estado global de autenticación
// =============================================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  login: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
  setUser: (user: User) => void

  // null = sin restricción (ADMIN), array = secciones permitidas
  getAllowedSectionIds: () => string[] | null
  isAdmin: () => boolean
  canAccessSection: (sectionId: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        set({ user, accessToken, refreshToken, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      setUser: (user) => set({ user }),

      getAllowedSectionIds: () => {
        const { user } = get()
        if (!user || user.role === 'ADMIN') return null
        return user.sectionAccess?.map(a => a.section.id) ?? []
      },

      isAdmin: () => get().user?.role === 'ADMIN',

      canAccessSection: (sectionId: string) => {
        const { user } = get()
        if (!user) return false
        if (user.role === 'ADMIN') return true
        return user.sectionAccess?.some(a => a.section.id === sectionId) ?? false
      },
    }),
    {
      name: 'jardin-auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
)
