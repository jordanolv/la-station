import { computed, watch } from 'vue'
import { usePartyStore, type Event } from '../stores/party'

/**
 * Composable unifié pour la gestion des soirées
 * Centralise toute la logique métier et évite les appels API redondants
 */
export function useParty(guildId: string) {
  const store = usePartyStore()

  // État réactif du store
  const events = computed(() => {
    return store.events || []
  })
  const chatGamingGames = computed(() => store.chatGamingGames || [])
  const loading = computed(() => store.loading)
  const error = computed(() => store.error)

  // Computed properties utiles  
  const eventsByStatus = computed(() => store.eventsByStatus)
  const eventCount = computed(() => store.eventCount)

  // Filtres utiles
  const upcomingEvents = computed(() => 
    events.value.filter(event => {
      const eventDate = new Date(`${event.date}T${event.time}`)
      return eventDate > new Date() && event.status === 'pending'
    })
  )

  const activeEvents = computed(() => 
    events.value.filter(event => event.status === 'started')
  )

  const pastEvents = computed(() => 
    events.value.filter(event => event.status === 'ended')
  )

  // Actions simplifiées avec gestion d'erreur automatique
  const loadEvents = async () => {
    if (!guildId) {
      console.error('[USE_PARTY] Pas de guildId fourni')
      return
    }
    return await store.loadEvents(guildId)
  }

  const loadGames = async () => {
    if (!guildId) {
      console.error('[USE_PARTY] Pas de guildId fourni')
      return
    }
    return store.loadChatGamingGames(guildId)
  }

  const createEvent = async (eventData: FormData) => {
    try {
      const event = await store.createEvent(guildId, eventData)
      return { success: true, event }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const updateEvent = async (eventId: string, eventData: FormData) => {
    try {
      const event = await store.updateEvent(eventId, eventData)
      return { success: true, event }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const deleteEvent = async (eventId: string) => {
    try {
      await store.deleteEvent(eventId)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const startEvent = async (eventId: string) => {
    try {
      const event = await store.startEvent(eventId)
      return { success: true, event }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const endEvent = async (eventId: string, endData: { 
    attendedParticipants: string[]
    rewardAmount: number
    xpAmount: number 
  }) => {
    try {
      const event = await store.endEvent(eventId, endData)
      return { success: true, event }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const loadParticipants = async (eventId: string) => {
    try {
      const participants = await store.loadParticipants(eventId)
      return { success: true, participants }
    } catch (error: any) {
      return { success: false, error: error.message, participants: [] }
    }
  }

  // Utilitaires
  const getEvent = (eventId: string) => store.getEventById(eventId)

  const getEventStatus = (event: Event): string => {
    if (event.status === 'ended') {
      return 'Terminé'
    } else if (event.status === 'started') {
      return 'En cours'
    } else if (event.status === 'pending') {
      const eventDate = new Date(`${event.date}T${event.time}`)
      const now = new Date()
      
      if (eventDate < now) {
        return 'Doit être démarré'
      } else if (event.currentSlots >= event.maxSlots) {
        return 'Complet'
      } else {
        return 'Ouvert'
      }
    }
    
    return 'Inconnu'
  }

  const getEventStatusClass = (event: Event): string => {
    const status = getEventStatus(event)
    
    switch (status) {
      case 'Terminé':
        return 'bg-gray-600 text-gray-200'
      case 'En cours':
        return 'bg-blue-600 text-white'
      case 'Doit être démarré':
        return 'bg-orange-600 text-white'
      case 'Complet':
        return 'bg-red-600 text-white'
      case 'Ouvert':
        return 'bg-green-600 text-white'
      default:
        return 'bg-gray-600 text-gray-200'
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const canStartEvent = (event: Event): boolean => {
    return event.status === 'pending'
  }

  const canEndEvent = (event: Event): boolean => {
    return event.status === 'started'
  }

  // Auto-chargement initial
  const initialize = async () => {
    try {
      await Promise.all([
        loadEvents(),
        loadGames()
      ])
    } catch (error) {
      console.error('[USE_PARTY] Erreur d\'initialisation:', error)
      // S'assurer que loading est remis à false en cas d'erreur
      store.forceStopLoading()
    }
  }

  // Watcher pour recharger automatiquement si l'erreur est clearée
  watch(() => store.error, (newError) => {
    if (!newError) {
      // L'erreur a été clearée, on peut recharger si nécessaire
    }
  })

  // Méthodes de gestion d'erreur
  const clearError = () => store.clearError()

  return {
    // État - computed refs pour la réactivité  
    events,
    chatGamingGames,
    loading,
    error,
    
    // Computed - computed refs pour la réactivité
    eventsByStatus,
    eventCount,
    upcomingEvents,
    activeEvents,
    pastEvents,
    
    // Actions
    loadEvents,
    loadGames,
    createEvent,
    updateEvent,
    deleteEvent,
    startEvent,
    endEvent,
    loadParticipants,
    
    // Utilitaires
    getEvent,
    getEventStatus,
    getEventStatusClass,
    formatDate,
    canStartEvent,
    canEndEvent,
    
    // Lifecycle
    initialize,
    clearError
  }
}

export type UsePartyReturn = ReturnType<typeof useParty>