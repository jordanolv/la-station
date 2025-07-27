<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-semibold text-white mb-2">Gestion des Soirées</h2>
      <p class="text-gray-400">Organisez des événements et soirées gaming pour votre communauté</p>
    </div>

    <!-- Configuration -->
    <div class="bg-gray-800 rounded-lg p-6">
      <h3 class="text-lg font-medium text-white mb-4 flex items-center space-x-2">
        <svg class="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Configuration</span>
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RoleSelect
          v-model="defaultRoleId"
          :guild-id="guildId"
          label="Rôle par défaut pour les jeux personnalisés"
          placeholder="Aucun rôle sélectionné"
          help-text="Ce rôle sera tagué lors de la création d'événements avec des jeux personnalisés"
          @update:model-value="updateDefaultRole"
        />
      </div>
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
      
      <div class="flex items-center justify-between gap-4">
        <!-- Compteur d'événements avec icône -->
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span class="text-sm font-medium text-gray-300">
            <span class="text-pink-400">{{ filteredEvents.length }}</span> affiché(s) / <span class="text-gray-400">{{ party.events.value.length }}</span> total
          </span>
        </div>
        
        <!-- Événements terminés cliquable avec style pill -->
        <button 
          @click="showCompletedEvents = !showCompletedEvents"
          class="px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 hover:scale-105"
          :class="showCompletedEvents 
            ? 'bg-pink-600/20 border-pink-500/50 text-pink-400 shadow-sm shadow-pink-500/20' 
            : 'bg-gray-700/50 border-gray-600/50 text-gray-400 hover:bg-gray-600/50 hover:border-gray-500/50 hover:text-gray-300'"
        >
          ✓ Événements terminés
        </button>
      </div>
    </div>

    <!-- Events List -->
    <div v-if="party.loading.value" class="text-center py-8">
      <div class="text-gray-400">Chargement des événements...</div>
    </div>

    <div v-else-if="filteredEvents.length === 0 && party.events.value.length === 0" class="text-center py-12 bg-gray-800 rounded-lg">
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

    <!-- Message si tous les événements sont terminés mais la checkbox n'est pas cochée -->
    <div v-else-if="filteredEvents.length === 0 && party.events.value.length > 0" class="text-center py-12 bg-gray-800 rounded-lg">
      <div class="text-4xl mb-4">✅</div>
      <h3 class="text-lg font-medium text-white mb-2">Tous les événements sont terminés</h3>
      <p class="text-gray-400 mb-4">Cochez "Afficher les événements terminés" pour les voir ou créez un nouvel événement</p>
    </div>

    <div v-else class="grid gap-4">
      <!-- Message d'erreur si il y en a une -->
      <div v-if="party.error.value" class="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded mb-4">
        {{ party.error.value }}
        <button @click="party.clearError()" class="ml-2 text-red-400 hover:text-red-200">×</button>
      </div>
      
      <div
        v-for="event in filteredEvents"
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
                <span>{{ party.formatDate(event.date) }}</span>
              </div>
              
              <div class="flex items-center space-x-2 text-gray-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{{ event.time }}</span>
              </div>
              
              <button 
                @click="toggleParticipantsDisplay(event._id)"
                class="flex items-center space-x-2 text-gray-400 hover:text-gray-300 transition-colors cursor-pointer"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{{ event.currentSlots }}/{{ event.maxSlots }} participants</span>
                <svg 
                  class="w-3 h-3 transition-transform duration-200" 
                  :class="expandedParticipants.has(event._id) ? 'rotate-180' : ''"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <!-- Description -->
            <p v-if="event.description" class="text-gray-300 mb-4">{{ event.description }}</p>

            <!-- Liste des participants (affichage conditionnel) -->
            <div v-if="expandedParticipants.has(event._id) && event.participants.length > 0" class="mb-4">
              <div class="bg-gray-700/50 rounded-lg p-3 border border-gray-600/50">
                <h4 class="text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                  <svg class="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span>Participants inscrits</span>
                </h4>
                
                <!-- Affichage des participants -->
                <div v-if="eventParticipants[event._id]?.length > 0" class="flex flex-wrap gap-2">
                  <div
                    v-for="participant in eventParticipants[event._id]"
                    :key="participant.id"
                    class="px-2 py-1 bg-gray-600/50 rounded text-xs text-gray-300 border border-gray-500/50"
                  >
                    {{ participant.displayName || participant.name }}
                  </div>
                </div>
                
                <!-- Message si les participants n'ont pas pu être chargés -->
                <div v-else class="text-xs text-gray-400">
                  Chargement des participants...
                </div>
              </div>
            </div>
            
            <!-- Message si aucun participant -->
            <div v-else-if="expandedParticipants.has(event._id) && event.participants.length === 0" class="mb-4">
              <div class="bg-gray-700/50 rounded-lg p-3 border border-gray-600/50 text-center">
                <p class="text-xs text-gray-400">Aucun participant inscrit pour le moment</p>
              </div>
            </div>

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
                :class="party.getEventStatusClass(event)"
              >
                {{ party.getEventStatus(event) }}
              </span>
              
              <span v-if="event.roleId" class="text-xs text-pink-400">
                @{{ event.name.toLowerCase().replace(/\s+/g, '-') }}
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
            <!-- Bouton Démarrer (visible seulement si status = pending et date passée) -->
            <button
              v-if="party.canStartEvent(event)"
              @click="startEvent(event)"
              class="bg-green-600 hover:bg-green-700 text-white p-2 rounded transition-colors"
              title="Démarrer la soirée"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>

            <!-- Bouton Terminer (visible seulement si status = started) -->
            <button
              v-if="party.canEndEvent(event)"
              @click="prepareEndEvent(event)"
              class="text-orange-400 hover:text-orange-300 p-2 rounded transition-colors"
              title="Terminer la soirée"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            
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

    <!-- End Event Modal -->
    <div v-if="showEndModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-semibold text-white">
            Terminer la soirée
          </h3>
          <button
            @click="closeEndModal"
            class="text-gray-400 hover:text-white transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="endingEvent" class="space-y-6">
          <!-- Event Info -->
          <div class="bg-gray-700 rounded-lg p-4">
            <h4 class="font-semibold text-white mb-2">{{ endingEvent.name }}</h4>
            <p class="text-gray-300 text-sm">{{ endingEvent.game }}</p>
          </div>

                      <!-- Participants Selection -->
            <div>
              <h4 class="text-lg font-medium text-white mb-4">
                Participants présents
                <span class="text-sm text-gray-400">({{ selectedParticipants.length }}/{{ participantsInfo.length }})</span>
              </h4>
              
              <!-- Select All / Deselect All -->
              <div class="mb-4">
                <button
                  @click="selectedParticipants = participantsInfo.map(p => p.id)"
                  class="text-sm text-blue-400 hover:text-blue-300 mr-4"
                >
                  Tout sélectionner
                </button>
                <button
                  @click="selectedParticipants = []"
                  class="text-sm text-gray-400 hover:text-gray-300"
                >
                  Tout désélectionner
                </button>
              </div>

              <!-- Participants List with Clickable Labels -->
              <div class="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                <div
                  v-for="participant in participantsInfo"
                  :key="participant.id"
                  @click="toggleParticipant(participant.id)"
                  class="px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 select-none"
                  :class="selectedParticipants.includes(participant.id) 
                    ? 'bg-pink-600 text-white border border-pink-500' 
                    : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'"
                >
                  <span class="font-medium">{{ participant.displayName }}</span>
                </div>
              </div>
            </div>

                      <!-- Reward Amount -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Montant à distribuer (optionnel)
              </label>
              <div class="flex items-center space-x-2">
                <input
                  v-model.number="rewardAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <span class="text-gray-400">€</span>
              </div>
              <p class="text-xs text-gray-400 mt-1">
                Ce montant sera distribué équitablement entre les participants présents
              </p>
            </div>

            <!-- XP Amount -->
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                XP à distribuer (optionnel)
              </label>
              <div class="flex items-center space-x-2">
                <input
                  v-model.number="xpAmount"
                  type="number"
                  min="0"
                  step="1"
                  class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="0"
                />
                <span class="text-gray-400">XP</span>
              </div>
              <p class="text-xs text-gray-400 mt-1">
                Ce montant d'XP sera distribué équitablement entre les participants présents
              </p>
            </div>

          <!-- Actions -->
          <div class="flex items-center justify-end space-x-3 pt-6 border-t border-gray-700">
            <button
              @click="closeEndModal"
              class="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            
            <button
              @click="endEvent"
              :disabled="selectedParticipants.length === 0"
              class="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors"
            >
              Terminer la soirée
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useParty } from '../../composables/useParty'
import { useImageUrl } from '../../composables/useImageUrl'
import { useAuthStore } from '../../stores/auth'
import { useApi } from '../../composables/useApi'
import EventModal from './party/EventModal.vue'
import RoleSelect from '../ui/RoleSelect.vue'
import type { Event, ParticipantInfo } from '../../stores/party'

const props = defineProps<{
  guildId: string
}>()

const authStore = useAuthStore()
const { getImageUrl } = useImageUrl()
const { get, put } = useApi()

// Récupération du composable party
const party = useParty(props.guildId)

// Configuration du rôle par défaut
const defaultRoleId = ref('')

// État local pour les modals
const showCreateModal = ref(false)
const editingEvent = ref<Event | null>(null)

// État pour le filtre des événements terminés
const showCompletedEvents = ref(false)

// État pour l'affichage des participants
const expandedParticipants = ref<Set<string>>(new Set())
const eventParticipants = ref<Record<string, ParticipantInfo[]>>({})

// Événements filtrés selon l'état de la checkbox
const filteredEvents = computed(() => {
  if (showCompletedEvents.value) {
    return party.events.value // Afficher tous les événements
  } else {
    // Afficher seulement les événements non terminés (status !== 'ended')
    return party.events.value.filter(event => event.status !== 'ended')
  }
})

// Gestion du cycle de vie des soirées
const showEndModal = ref(false)
const endingEvent = ref<Event | null>(null)
const selectedParticipants = ref<string[]>([])
const participantsInfo = ref<ParticipantInfo[]>([])
const rewardAmount = ref<number>(0)
const xpAmount = ref<number>(0)

// Plus besoin de loadEvents(), géré par le store

async function saveEvent(eventData: FormData) {
  try {
    console.log('Sauvegarde événement:', {
      isEditing: !!editingEvent.value,
      eventId: editingEvent.value?._id,
      formData: Object.fromEntries(eventData.entries())
    })
    
    if (editingEvent.value) {
      const result = await party.updateEvent(editingEvent.value._id, eventData)
      console.log('Résultat update:', result)
      if (!result.success) {
        console.error('Erreur lors de la modification:', result.error)
        return
      }
    } else {
      eventData.append('createdBy', authStore.user?.id || 'unknown-user')
      const result = await party.createEvent(eventData)
      console.log('Résultat create:', result)
      if (!result.success) {
        console.error('Erreur lors de la création:', result.error)
        return
      }
    }
    
    closeModal()
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
  }
}

async function deleteEvent(eventId: string) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ?')) {
    return
  }

  const result = await party.deleteEvent(eventId)
  if (!result.success) {
    console.error('Erreur lors de la suppression:', result.error)
  }
}

function editEvent(event: Event) {
  editingEvent.value = event
}

function closeModal() {
  showCreateModal.value = false
  editingEvent.value = null
}

// Démarrer une soirée
async function startEvent(event: Event) {
  if (!confirm(`Êtes-vous sûr de vouloir démarrer la soirée "${event.name}" ?`)) {
    return
  }

  const result = await party.startEvent(event._id)
  if (!result.success) {
    console.error('Erreur lors du démarrage:', result.error)
  }
}

// Préparer la fin d'une soirée (ouvre la modal de sélection)
async function prepareEndEvent(event: Event) {
  endingEvent.value = event
  selectedParticipants.value = [...event.participants] // Par défaut, tous les participants sont sélectionnés
  rewardAmount.value = 0
  xpAmount.value = 0
  
  // Récupérer les informations des participants
  const result = await party.loadParticipants(event._id)
  if (result.success) {
    participantsInfo.value = result.participants
  } else {
    console.error('Erreur lors de la récupération des participants:', result.error)
    // En cas d'erreur, créer une liste basique avec les IDs
    participantsInfo.value = event.participants.map(id => ({
      id,
      name: `User-${id}`,
      displayName: `User-${id}`
    }))
  }
  
  showEndModal.value = true
}

// Terminer une soirée avec les participants sélectionnés et le montant
async function endEvent() {
  if (!endingEvent.value) return
  
  if (selectedParticipants.value.length === 0) {
    alert('Veuillez sélectionner au moins un participant présent.')
    return
  }

  if (rewardAmount.value < 0) {
    alert('Le montant de récompense ne peut pas être négatif.')
    return
  }

  if (xpAmount.value < 0) {
    alert('Le montant d\'XP ne peut pas être négatif.')
    return
  }

  const result = await party.endEvent(endingEvent.value._id, {
    attendedParticipants: selectedParticipants.value,
    rewardAmount: rewardAmount.value,
    xpAmount: xpAmount.value
  })
  
  if (result.success) {
    closeEndModal()
  } else {
    console.error('Erreur lors de la fin de la soirée:', result.error)
  }
}

// Fermer la modal de fin de soirée
function closeEndModal() {
  showEndModal.value = false
  endingEvent.value = null
  selectedParticipants.value = []
  participantsInfo.value = []
  rewardAmount.value = 0
  xpAmount.value = 0
}

// Toggle la sélection d'un participant
function toggleParticipant(participantId: string) {
  const index = selectedParticipants.value.indexOf(participantId)
  if (index > -1) {
    selectedParticipants.value.splice(index, 1)
  } else {
    selectedParticipants.value.push(participantId)
  }
}

// Toggle l'affichage des participants d'un événement
function toggleParticipantsDisplay(eventId: string) {
  if (expandedParticipants.value.has(eventId)) {
    expandedParticipants.value.delete(eventId)
  } else {
    expandedParticipants.value.add(eventId)
    // Charger les informations des participants si pas déjà fait
    loadEventParticipants(eventId)
  }
}

// Charger les participants d'un événement
async function loadEventParticipants(eventId: string) {
  const result = await party.loadParticipants(eventId)
  if (result.success) {
    eventParticipants.value[eventId] = result.participants
  } else {
    console.error('Erreur lors de la récupération des participants:', result.error)
  }
}

// Charger la configuration du rôle par défaut
async function loadDefaultRole() {
  try {
    const response = await get(`/api/guilds/${props.guildId}/features/party/settings`)
    if (response.settings?.defaultRoleId) {
      defaultRoleId.value = response.settings.defaultRoleId
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la config party:', error)
  }
}

// Mettre à jour le rôle par défaut
async function updateDefaultRole(roleId: string) {
  try {
    await put(`/api/guilds/${props.guildId}/features/party/settings`, {
      defaultRoleId: roleId
    })
    console.log('Rôle par défaut mis à jour:', roleId)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rôle:', error)
  }
}

onMounted(async () => {
  if (props.guildId) {
    await party.initialize()
    await loadDefaultRole()
  } else {
    console.error('[PARTY_MANAGEMENT] Pas de guildId fourni')
  }
})
</script>