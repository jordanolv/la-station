import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '../composables/useApi'

export interface ParticipantInfo {
  id: string
  name: string
  displayName: string
}

export interface Event {
  _id: string
  name: string
  game: string
  description?: string
  date: string
  time: string
  maxSlots: number
  currentSlots: number
  image?: string
  color: string
  guildId: string
  channelId: string
  threadId?: string
  messageId?: string
  roleId?: string
  participants: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
  status: 'pending' | 'started' | 'ended'
  attendedParticipants: string[]
  rewardAmount?: number
  xpAmount?: number
  startedAt?: string
  endedAt?: string
}

export interface ChatGamingGame {
  id: string
  name: string
  color: string
  roleId: string
}

export const usePartyStore = defineStore('party', () => {
  const { get, post, put, delete: del } = useApi()
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051'

  // État réactif
  const events = ref<Event[]>([])
  const chatGamingGames = ref<ChatGamingGame[]>([])
  const participantsCache = ref<Map<string, ParticipantInfo[]>>(new Map())
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Cache timestamps pour invalidation intelligente
  const eventsLastFetch = ref<number>(0)
  const gamesLastFetch = ref<number>(0)
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  // Computed properties
  const eventsByStatus = computed(() => ({
    pending: events.value.filter(e => e.status === 'pending'),
    started: events.value.filter(e => e.status === 'started'),
    ended: events.value.filter(e => e.status === 'ended')
  }))

  const eventCount = computed(() => events.value.length)

  // Helpers pour la gestion d'erreur
  const handleError = (err: any, operation: string) => {
    error.value = `Erreur lors de ${operation}: ${err.message || 'Erreur inconnue'}`
    console.error(`[PARTY_STORE] ${operation}:`, err)
  }

  const clearError = () => {
    error.value = null
  }

  // Actions pour les événements
  const loadEvents = async (guildId: string, force = false) => {
    const now = Date.now()
    if (!force && now - eventsLastFetch.value < CACHE_DURATION) {
      console.log(`[PARTY_STORE] Utilisation du cache pour guildId: ${guildId}`)
      return // Utiliser le cache
    }

    try {
      loading.value = true
      clearError()
      
      console.log(`[PARTY_STORE] Chargement des événements pour guildId: ${guildId}`)
      const data = await get<{ events: Event[] }>(`/api/party?guildId=${guildId}`)
      console.log(`[PARTY_STORE] Événements reçus:`, data.events)
      events.value = data.events
      eventsLastFetch.value = now
    } catch (err: any) {
      console.error(`[PARTY_STORE] Erreur lors du chargement pour guildId ${guildId}:`, err)
      handleError(err, 'chargement des événements')
    } finally {
      loading.value = false
    }
  }

  const createEvent = async (guildId: string, eventData: FormData) => {
    try {
      loading.value = true
      clearError()

      eventData.append('guildId', guildId)
      
      const authStore = useAuthStore()
      const response = await fetch(`${API_BASE_URL}/api/party`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        },
        body: eventData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Mise à jour optimiste du cache
      events.value.unshift(result.event)
      
      return result.event
    } catch (err: any) {
      handleError(err, 'création d\'événement')
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateEvent = async (eventId: string, eventData: FormData) => {
    try {
      loading.value = true
      clearError()

      const authStore = useAuthStore()
      const response = await fetch(`${API_BASE_URL}/api/party/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authStore.token}`
        },
        body: eventData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Mise à jour optimiste du cache
      const index = events.value.findIndex(e => e._id === eventId)
      if (index !== -1) {
        events.value[index] = result.event
      }
      
      return result.event
    } catch (err: any) {
      handleError(err, 'modification d\'événement')
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteEvent = async (eventId: string) => {
    try {
      loading.value = true
      clearError()

      await del(`/api/party/${eventId}`)
      
      // Mise à jour optimiste du cache
      const index = events.value.findIndex(e => e._id === eventId)
      if (index !== -1) {
        events.value.splice(index, 1)
      }
    } catch (err: any) {
      handleError(err, 'suppression d\'événement')
      throw err
    } finally {
      loading.value = false
    }
  }

  const startEvent = async (eventId: string) => {
    try {
      loading.value = true
      clearError()

      const result = await post(`/api/party/${eventId}/start`)
      
      // Mise à jour optimiste du cache
      const index = events.value.findIndex(e => e._id === eventId)
      if (index !== -1) {
        events.value[index] = { ...events.value[index], ...result.event }
      }
      
      return result.event
    } catch (err: any) {
      handleError(err, 'démarrage d\'événement')
      throw err
    } finally {
      loading.value = false
    }
  }

  const endEvent = async (eventId: string, endData: { attendedParticipants: string[], rewardAmount: number, xpAmount: number }) => {
    try {
      loading.value = true
      clearError()

      const result = await post(`/api/party/${eventId}/end`, endData)
      
      // Mise à jour optimiste du cache
      const index = events.value.findIndex(e => e._id === eventId)
      if (index !== -1) {
        events.value[index] = { ...events.value[index], ...result.event }
      }
      
      return result.event
    } catch (err: any) {
      handleError(err, 'fin d\'événement')
      throw err
    } finally {
      loading.value = false
    }
  }

  // Actions pour les jeux chat-gaming
  const loadChatGamingGames = async (guildId: string, force = false) => {
    const now = Date.now()
    if (!force && now - gamesLastFetch.value < CACHE_DURATION) {
      return // Utiliser le cache
    }

    try {
      const data = await get<{ games: ChatGamingGame[] }>(`/api/party/games?guildId=${guildId}`)
      chatGamingGames.value = data.games
      gamesLastFetch.value = now
    } catch (err: any) {
      handleError(err, 'chargement des jeux')
    }
  }

  // Actions pour les participants
  const loadParticipants = async (eventId: string, force = false) => {
    if (!force && participantsCache.value.has(eventId)) {
      return participantsCache.value.get(eventId)!
    }

    try {
      const data = await get<{ participants: ParticipantInfo[] }>(`/api/party/${eventId}/participants`)
      participantsCache.value.set(eventId, data.participants)
      return data.participants
    } catch (err: any) {
      handleError(err, 'chargement des participants')
      return []
    }
  }

  // Utilitaires
  const getEventById = (eventId: string) => {
    return events.value.find(e => e._id === eventId)
  }

  const invalidateCache = () => {
    eventsLastFetch.value = 0
    gamesLastFetch.value = 0
    participantsCache.value.clear()
  }

  const reset = () => {
    events.value = []
    chatGamingGames.value = []
    participantsCache.value.clear()
    loading.value = false
    error.value = null
    eventsLastFetch.value = 0
    gamesLastFetch.value = 0
  }

  return {
    // État
    events,
    chatGamingGames,
    loading,
    error,
    
    // Computed
    eventsByStatus,
    eventCount,
    
    // Actions
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    startEvent,
    endEvent,
    loadChatGamingGames,
    loadParticipants,
    
    // Utilitaires
    getEventById,
    invalidateCache,
    reset,
    clearError
  }
})

// Import nécessaire pour useAuthStore
import { useAuthStore } from './auth'