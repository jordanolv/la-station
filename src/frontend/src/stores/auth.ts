import { defineStore } from 'pinia'
import axios from 'axios'

interface DiscordUser {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
}

<<<<<<< Updated upstream
=======
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

>>>>>>> Stashed changes
export const useAuthStore = defineStore('auth', {
  state: () => ({
    // token: localStorage.getItem('token'),
    token: null as string | null,
    user: null as DiscordUser | null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token
  },

  actions: {
    setToken(token: string) {
      this.token = token
      // localStorage.setItem('token', token)
<<<<<<< Updated upstream
=======
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
      if (!this.token) return;
      try {
        console.log('API_BASE_URL', API_BASE_URL);
        const response = await axios.get(`${API_BASE_URL}/api/auth/guilds`, {
          headers: {
            Authorization: `Bearer ${this.token}`
          }
        })
        this.guilds = response.data
      } catch (error) {
        console.error('Failed to fetch user guilds:', error)
        // Potentially set guilds to [] or handle error state
      }
>>>>>>> Stashed changes
    },

    async logout() {
      try {
<<<<<<< Updated upstream
        await axios.post('/api/auth/logout')
=======
        // Even if logout fails, we clear client-side session
        await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
          headers: {
            Authorization: `Bearer ${this.token}` // Optional: send token if backend needs it for session invalidation
          }
        })
>>>>>>> Stashed changes
      } catch (error) {
        console.error('Logout API call failed:', error)
      } finally {
        this.token = null
        this.user = null
        // localStorage.removeItem('token')
      }
    },

    // This action was referenced in HomeView for login, ensure it points to the dynamic URL
    loginWithDiscord() {
      window.location.href = `${API_BASE_URL}/api/auth/discord`;
    }
  }
}) 