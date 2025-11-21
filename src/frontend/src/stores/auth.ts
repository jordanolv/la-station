import { defineStore } from 'pinia'
import api from '../utils/axios'

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
  botPresent?: boolean;
  canManage?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as DiscordUser | null,
    guilds: [] as DiscordGuild[],
    isInitialized: false,
    authError: null as string | null
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    getUser: (state) => state.user,
    getGuilds: (state) => state.guilds
  },

  actions: {
    /**
     * Récupère les informations de l'utilisateur depuis le backend
     * Le token est stocké dans un cookie httpOnly, pas besoin de le gérer côté client
     */
    async fetchCurrentUser() {
      try {
        // Le cookie est automatiquement envoyé avec la requête
        const response = await api.get('/api/auth/me')

        this.user = response.data
        this.authError = null
        return true
      } catch (error: any) {
        console.error('Failed to fetch current user:', error)

        if (error.response?.data?.code === 'TOKEN_EXPIRED') {
          this.authError = 'SESSION_EXPIRED'
        } else if (error.response?.status === 401) {
          this.authError = 'NOT_AUTHENTICATED'
        }

        this.user = null
        return false
      }
    },

    async fetchUserGuilds() {
      try {
        // Le cookie est automatiquement envoyé
        const response = await api.get('/api/auth/guilds')

        // Enhance guild data with bot status
        const guildsWithBotStatus = await Promise.all(
          response.data.map(async (guild: DiscordGuild) => {
            try {
              const botStatusResponse = await api.get(`/api/guilds/${guild.id}/bot-status`)
              return {
                ...guild,
                botPresent: botStatusResponse.data.botPresent,
                canManage: this.hasManagePermissions(guild.permissions) || guild.owner
              }
            } catch (error) {
              return {
                ...guild,
                botPresent: false,
                canManage: this.hasManagePermissions(guild.permissions) || guild.owner
              }
            }
          })
        )

        this.guilds = guildsWithBotStatus
      } catch (error: any) {
        console.error('Failed to fetch user guilds:', error)

        // Si l'erreur est une 401, l'utilisateur n'est pas authentifié
        if (error.response?.status === 401) {
          this.user = null
          this.guilds = []
          this.authError = 'NOT_AUTHENTICATED'
        }
      }
    },

    hasManagePermissions(permissions: string): boolean {
      const perms = parseInt(permissions)
      // Check for MANAGE_GUILD (0x20) or ADMINISTRATOR (0x8) permissions
      return !!(perms & 0x20) || !!(perms & 0x8)
    },

    /**
     * Initialise l'authentification au chargement de l'application
     * Vérifie si un cookie de session existe et récupère l'utilisateur
     */
    async initialize() {
      if (this.isInitialized) {
        return
      }

      try {
        // Essayer de récupérer l'utilisateur actuel (le cookie sera envoyé automatiquement)
        const authenticated = await this.fetchCurrentUser()

        if (authenticated) {
          // Si l'utilisateur est authentifié, récupérer ses serveurs
          await this.fetchUserGuilds()
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        this.user = null
        this.guilds = []
      } finally {
        this.isInitialized = true
      }
    },

    async loginWithDiscord() {
      // Rediriger vers le flux OAuth Discord
      window.location.href = `${API_BASE_URL}/api/auth/discord`
    },

    async logout() {
      try {
        // Appeler l'API de logout pour supprimer le cookie
        await api.post('/api/auth/logout')
      } catch (error) {
        console.error('Logout failed:', error)
      } finally {
        // Réinitialiser le state
        this.user = null
        this.guilds = []
        this.authError = null
        this.isInitialized = false

        // Rediriger vers la page de login
        window.location.href = '/'
      }
    }
  }
}) 