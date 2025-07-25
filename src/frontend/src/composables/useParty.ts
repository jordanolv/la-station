import { computed, watch } from 'vue'
import { usePartyStore, type Event, type ParticipantInfo, type ChatGamingGame } from '../stores/party'

/**
 * Composable unifié pour la gestion des soirées
 * Centralise toute la logique métier et évite les appels API redondants
 */
export function useParty(guildId: string) {
  const store = usePartyStore()

  // État réactif du store
  const events = computed(() => {
    console.log(`[USE_PARTY] events computed - store.events.value:`, store.events.value)
    return store.events.value || []
  })
  const chatGamingGames = computed(() => store.chatGamingGames.value || [])
  const loading = computed(() => store.loading.value)
  const error = computed(() => store.error.value)

  // Computed properties utiles
  const eventsByStatus = computed(() => store.eventsByStatus.value)
  const eventCount = computed(() => store.eventCount.value)

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
  const loadEvents = async (force = false) => {
    console.log(`[USE_PARTY] loadEvents - guildId: ${guildId}, force: ${force}`)
    if (!guildId) {
      console.error('[USE_PARTY] Pas de guildId fourni')
      return
    }
    const result = await store.loadEvents(guildId, force)
    console.log(`[USE_PARTY] loadEvents terminé - events count: ${events.value?.length || 0}`)
    return result
  }

  const loadGames = async (force = false) => {
    console.log(`[USE_PARTY] loadGames - guildId: ${guildId}, force: ${force}`)
    if (!guildId) {
      console.error('[USE_PARTY] Pas de guildId fourni')
      return
    }
    return store.loadChatGamingGames(guildId, force)
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

  const loadParticipants = async (eventId: string, force = false) => {
    try {
      const participants = await store.loadParticipants(eventId, force)
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
    return event.status === 'pending' && new Date(`${event.date}T${event.time}`) <= new Date()
  }

  const canEndEvent = (event: Event): boolean => {
    return event.status === 'started'
  }

  // Auto-chargement initial avec cache intelligent
  const initialize = async () => {
    // Vérifier si déjà chargé pour éviter les doublons
    if (store.loading) {
      console.log('[USE_PARTY] Déjà en cours de chargement, skip')
      return
    }
    
    console.log('[USE_PARTY] Initialisation pour guildId:', guildId)
    
    try {
      await Promise.all([
        loadEvents(),
        loadGames()
      ])
      console.log('[USE_PARTY] Initialisation terminée')
    } catch (error) {
      console.error('[USE_PARTY] Erreur d\'initialisation:', error)
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
  const refreshCache = () => store.invalidateCache()

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
    clearError,
    refreshCache
  }
}

export type UsePartyReturn = ReturnType<typeof useParty>