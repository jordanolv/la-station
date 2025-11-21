import axios, { AxiosInstance } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051'

// Créer une instance axios personnalisée
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Toujours envoyer les cookies
  headers: {
    'Content-Type': 'application/json'
  }
})

// Intercepteur de réponse pour gérer les erreurs d'authentification
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide - rediriger vers login
      if (error.response?.data?.code === 'TOKEN_EXPIRED' ||
          error.response?.data?.code === 'INVALID_TOKEN') {

        // Rediriger vers la page de login
        // Le store sera nettoyé au chargement de la page de login
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          window.location.href = '/'
        }
      }
    }

    return Promise.reject(error)
  }
)

// Export par défaut de l'instance configurée
export default apiClient

// Export nommé pour compatibilité
export const api = apiClient
