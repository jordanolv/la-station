import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useApi } from '../composables/useApi'
import api from '../utils/axios'

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
  const { get, post, delete: del } = useApi()

  // État réactif
  const events = ref<Event[]>([])
  const chatGamingGames = ref<ChatGamingGame[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)


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

  const forceStopLoading = () => {
    loading.value = false
  }

  // Actions pour les événements
  const loadEvents = async (guildId: string) => {
    try {
      loading.value = true
      clearError()
      
      const data = await get<{ events: Event[] }>(`/api/party?guildId=${guildId}`)
      events.value = data.events || []
    } catch (err: any) {
      handleError(err, 'chargement des événements')
      if (events.value.length === 0) {
        events.value = []
      }
    } finally {
      loading.value = false
    }
  }

  const createEvent = async (guildId: string, eventData: FormData) => {
    try {
      loading.value = true
      clearError()

      eventData.append('guildId', guildId)

      const response = await api.post('/api/party', eventData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      // Mise à jour optimiste du cache
      events.value.unshift(response.data.event)

      return response.data.event
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

      const response = await api.put(`/api/party/${eventId}`, eventData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      // Mise à jour optimiste du cache
      const index = events.value.findIndex(e => e._id === eventId)
      if (index !== -1) {
        events.value[index] = response.data.event
      }

      return response.data.event
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

      const result = await post<{ event: Event }>(`/api/party/${eventId}/start`)
      
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

      const result = await post<{ event: Event }>(`/api/party/${eventId}/end`, endData)
      
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
  const loadChatGamingGames = async (guildId: string) => {
    try {
      const data = await get<{ games: ChatGamingGame[] }>(`/api/party/games?guildId=${guildId}`)
      chatGamingGames.value = data.games
    } catch (err: any) {
      handleError(err, 'chargement des jeux')
    }
  }

  // Actions pour les participants
  const loadParticipants = async (eventId: string) => {
    try {
      const data = await get<{ participants: ParticipantInfo[] }>(`/api/party/${eventId}/participants`)
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

  const reset = () => {
    events.value = []
    chatGamingGames.value = []
    loading.value = false
    error.value = null
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
    reset,
    clearError,
    forceStopLoading
  }
})