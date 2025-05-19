import { defineStore } from 'pinia'
import { apiService } from '../services/api.service.js'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any | null,
    status: 'idle' as 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  }),

  getters: {
    isAuthenticated: (state) => state.status === 'authenticated'
  },

  actions: {
    async fetchSession() {
      this.status = 'loading'
      try {
        const res = await apiService.get('/auth/session', { withCredentials: true })
        this.user = res.user
        this.status = 'authenticated'
      } catch (error) {
        this.user = null
        this.status = 'unauthenticated'
      }
    },

    logout() {
      window.location.href = '/api/auth/signout' // à adapter selon ton backend
    }
  }
})
