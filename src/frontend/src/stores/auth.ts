import { defineStore } from 'pinia'
import axios from 'axios'

interface DiscordUser {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token'),
    user: null as DiscordUser | null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token
  },

  actions: {
    setToken(token: string) {
      this.token = token
      localStorage.setItem('token', token)
    },

    async logout() {
      try {
        await axios.post('/api/auth/logout')
      } catch (error) {
        console.error('Logout failed:', error)
      } finally {
        this.token = null
        this.user = null
        localStorage.removeItem('token')
      }
    }
  }
}) 