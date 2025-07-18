<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-semibold text-white mb-2">Gestion des Soirées</h2>
      <p class="text-gray-400">Organisez des événements et soirées gaming pour votre communauté</p>
    </div>

    <!-- Create Event Button -->
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-4">
        <button
          @click="showCreateModal = true"
          class="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Créer un événement</span>
        </button>
      </div>
      
      <div class="text-sm text-gray-400">
        {{ events.length }} événement(s) programmé(s)
      </div>
    </div>

    <!-- Events List -->
    <div v-if="loading" class="text-center py-8">
      <div class="text-gray-400">Chargement des événements...</div>
    </div>

    <div v-else-if="events.length === 0" class="text-center py-12 bg-gray-800 rounded-lg">
      <div class="text-4xl mb-4">🎉</div>
      <h3 class="text-lg font-medium text-white mb-2">Aucun événement programmé</h3>
      <p class="text-gray-400 mb-4">Créez votre premier événement pour rassembler votre communauté</p>
      <button
        @click="showCreateModal = true"
        class="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg transition-colors"
      >
        Créer un événement
      </button>
    </div>

    <div v-else class="grid gap-4">
      <div
        v-for="event in events"
        :key="event._id"
        class="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <!-- Event Header -->
            <div class="flex items-center space-x-3 mb-3">
              <div 
                class="w-4 h-4 rounded-full"
                :style="{ backgroundColor: event.color }"
              ></div>
              <h3 class="text-lg font-semibold text-white">{{ event.name }}</h3>
              <span class="bg-gray-700 text-gray-300 px-2 py-1 text-xs rounded">{{ event.game }}</span>
            </div>

            <!-- Event Info -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div class="flex items-center space-x-2 text-gray-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{{ formatDate(event.date) }}</span>
              </div>
              
              <div class="flex items-center space-x-2 text-gray-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ event.time }}</span>
              </div>
              
              <div class="flex items-center space-x-2 text-gray-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{{ event.currentSlots }}/{{ event.maxSlots }} participants</span>
              </div>
            </div>

            <!-- Description -->
            <p v-if="event.description" class="text-gray-300 mb-4">{{ event.description }}</p>

            <!-- Participants Progress -->
            <div class="mb-4">
              <div class="flex justify-between text-sm text-gray-400 mb-1">
                <span>Participants</span>
                <span>{{ event.currentSlots }}/{{ event.maxSlots }}</span>
              </div>
              <div class="w-full bg-gray-700 rounded-full h-2">
                <div 
                  class="h-2 rounded-full transition-all duration-300"
                  :style="{ 
                    width: `${(event.currentSlots / event.maxSlots) * 100}%`,
                    backgroundColor: event.color 
                  }"
                ></div>
              </div>
            </div>

            <!-- Event Status -->
            <div class="flex items-center space-x-2">
              <span 
                class="px-2 py-1 text-xs font-medium rounded-full"
                :class="getEventStatusClass(event)"
              >
                {{ getEventStatus(event) }}
              </span>
              
              <span v-if="event.roleId" class="text-xs text-gray-400">
                Rôle Discord créé
              </span>
            </div>
          </div>

          <!-- Event Image -->
          <div v-if="event.image" class="ml-6">
            <img 
              :src="event.image" 
              :alt="event.name"
              class="w-24 h-24 object-cover rounded-lg"
            />
          </div>

          <!-- Actions -->
          <div class="ml-6 flex flex-col space-y-2">
            <button
              @click="editEvent(event)"
              class="text-gray-400 hover:text-white p-2 rounded transition-colors"
              title="Modifier"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            
            <button
              @click="deleteEvent(event._id)"
              class="text-red-400 hover:text-red-300 p-2 rounded transition-colors"
              title="Supprimer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Event Modal -->
    <EventModal
      v-if="showCreateModal || editingEvent"
      :event="editingEvent"
      :guild-id="guildId"
      @close="closeModal"
      @save="saveEvent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '../../composables/useApi'
import { useAuthStore } from '../../stores/auth'
import EventModal from './party/EventModal.vue'

interface Event {
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
}

const props = defineProps<{
  guildId: string
}>()

const { get, delete: del } = useApi()
const authStore = useAuthStore()
const events = ref<Event[]>([])
const loading = ref(true)
const showCreateModal = ref(false)
const editingEvent = ref<Event | null>(null)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051'

async function loadEvents() {
  try {
    loading.value = true
    const data = await get<{ events: Event[] }>(`/api/party?guildId=${props.guildId}`)
    events.value = data.events
  } catch (error) {
    console.error('Erreur lors du chargement des événements:', error)
  } finally {
    loading.value = false
  }
}

async function saveEvent(eventData: FormData) {
  try {
    let url = `${API_BASE_URL}/api/party`
    let method = 'POST'
    
    if (editingEvent.value) {
      url = `${API_BASE_URL}/api/party/${editingEvent.value._id}`
      method = 'PUT'
    } else {
      eventData.append('guildId', props.guildId)
      eventData.append('createdBy', authStore.user?.id || 'unknown-user')
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      },
      body: eventData
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    await loadEvents()
    closeModal()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
  }
}

async function deleteEvent(eventId: string) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ? Cette action supprimera également le rôle Discord associé.')) {
    return
  }

  try {
    await del(`/api/party/${eventId}`)
    await loadEvents()
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
  }
}

function editEvent(event: Event) {
  editingEvent.value = event
}

function closeModal() {
  showCreateModal.value = false
  editingEvent.value = null
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function getEventStatus(event: Event): string {
  const eventDate = new Date(`${event.date}T${event.time}`)
  const now = new Date()
  
  if (eventDate < now) {
    return 'Terminé'
  } else if (event.currentSlots >= event.maxSlots) {
    return 'Complet'
  } else {
    return 'Ouvert'
  }
}

function getEventStatusClass(event: Event): string {
  const status = getEventStatus(event)
  
  switch (status) {
    case 'Terminé':
      return 'bg-gray-600 text-gray-200'
    case 'Complet':
      return 'bg-red-600 text-white'
    case 'Ouvert':
      return 'bg-green-600 text-white'
    default:
      return 'bg-gray-600 text-gray-200'
  }
}

onMounted(() => {
  loadEvents()
})
</script>