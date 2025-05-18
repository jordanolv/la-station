import { defineStore } from 'pinia'
import axios from 'axios'
import { jwtDecode } from 'jwt-decode'

interface DiscordUser {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string;
  owner: boolean;
  permissions: string;
}

interface JwtPayload {
  id: string;
  name: string;
  avatar: string;
  discriminator: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    // token: localStorage.getItem('token'),
    token: null as string | null,
    user: null as DiscordUser | null,
    guilds: [] as DiscordGuild[]
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    getUser: (state) => state.user,
    getGuilds: (state) => state.guilds
  },

  actions: {
    setToken(token: string) {
      this.token = token
      // localStorage.setItem('token', token)
      // Décoder le token pour obtenir les informations de l'utilisateur
      const decoded = jwtDecode<JwtPayload>(token)
      this.user = {
        id: decoded.id,
        username: decoded.name,
        avatar: decoded.avatar,
        discriminator: decoded.discriminator
      }
      // Récupérer les serveurs de l'utilisateur
      this.fetchUserGuilds()
    },

    async fetchUserGuilds() {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/guilds`, {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        })
        this.guilds = response.data
      } catch (error) {
        console.error('Failed to fetch user guilds:', error)
      }
    },

    async loginWithDiscord() {
      window.location.href = `${API_BASE_URL}/api/auth/discord`;
    },

    async logout() {
      try {
        await axios.post(`${API_BASE_URL}/api/auth/logout`)
      } catch (error) {
        console.error('Logout failed:', error)
      } finally {
        this.token = null
        this.user = null
        this.guilds = []
        // localStorage.removeItem('token')
      }
    }
  }
}) 