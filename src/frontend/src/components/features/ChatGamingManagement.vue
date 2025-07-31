<template>
  <div>
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-white mb-2">🎮 Chat Gaming</h2>
      <p class="text-gray-400">
        Créez des jeux communautaires qui génèrent automatiquement des threads et des rôles.
        Les membres peuvent réagir pour obtenir le rôle du jeu.
      </p>
    </div>

    <!-- Settings Section -->
    <div class="mb-8">
      <div class="bg-gray-700 rounded-lg p-6">
        <h3 class="text-lg font-medium text-white mb-4">⚙️ Configuration</h3>
        <div class="space-y-4">
          <!-- Channel Selection -->
          <div>
            <ChannelSelect
              v-model="settings.channelId"
              :guild-id="guildId"
              channel-type="forum"
              label="Canal pour les jeux"
              placeholder="Sélectionnez un canal"
              help-text="Canal où seront créés les threads des jeux"
            />
          </div>

          <!-- Save Settings Button -->
          <div class="flex justify-end">
            <button 
              @click="saveSettings"
              :disabled="isSavingSettings"
              class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg v-if="isSavingSettings" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ isSavingSettings ? 'Sauvegarde...' : 'Sauvegarder' }}</span>
            </button>
          </div>

          <!-- Settings Success Message -->
          <div v-if="showSettingsSuccess" class="bg-green-600 text-white p-3 rounded-lg flex items-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Configuration sauvegardée avec succès !</span>
          </div>

          <!-- Warning if no channel configured -->
          <div v-if="!settings.channelId" class="bg-yellow-600 bg-opacity-20 border border-yellow-600 rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <svg class="w-5 h-5 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p class="text-yellow-400 font-medium">Canal non configuré</p>
                <p class="text-yellow-300 text-sm">
                  Veuillez sélectionner un canal pour que les jeux puissent être créés.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Games List -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-medium text-white">Jeux créés</h3>
        <button 
          @click="showCreateModal = true"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Créer un jeu</span>
        </button>
      </div>

      <div v-if="isLoadingGames" class="text-center py-8">
        <div class="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-gray-400 mt-2">Chargement des jeux...</p>
      </div>

      <div v-else-if="games.length === 0" class="text-center py-8 bg-gray-700 rounded-lg">
        <div class="text-4xl mb-2">🎮</div>
        <p class="text-gray-400">Aucun jeu créé pour le moment</p>
        <p class="text-gray-500 text-sm">Créez votre premier jeu pour commencer !</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="game in games" 
          :key="game._id"
          class="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <h4 class="text-white font-medium">{{ game.name }}</h4>
              <p v-if="game.description" class="text-gray-400 text-sm mt-1">{{ game.description }}</p>
            </div>
            <div v-if="game.image" class="ml-3">
              <img :src="getImageUrl(game.image)" :alt="game.name" class="w-12 h-12 rounded-lg object-cover">
            </div>
          </div>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <div 
                class="w-4 h-4 rounded-full border-2"
                :style="{ backgroundColor: game.color || '#55CCFC' }"
              ></div>
              <span class="text-gray-400 text-sm">{{ game.color || '#55CCFC' }}</span>
            </div>
            <button 
              @click="deleteGame(game)"
              class="text-red-400 hover:text-red-300 transition-colors p-1"
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

    <!-- Create Game Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">Créer un nouveau jeu</h3>
          <button 
            @click="closeCreateModal"
            class="text-gray-400 hover:text-white transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="createGame" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Nom du jeu</label>
            <input 
              v-model="newGame.name"
              type="text" 
              required
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Ex: Minecraft, Valorant..."
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Description (optionnel)</label>
            <textarea 
              v-model="newGame.description"
              rows="3"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Description du jeu..."
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Couleur</label>
            <input 
              v-model="newGame.color"
              type="color"
              class="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Image (optionnel)</label>
            <input 
              @change="handleImageUpload"
              type="file"
              accept="image/*"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
          </div>

          <div class="flex space-x-3 pt-4">
            <button 
              type="submit"
              :disabled="isCreatingGame || !newGame.name"
              class="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
            >
              {{ isCreatingGame ? 'Création...' : 'Créer' }}
            </button>
            <button 
              type="button"
              @click="closeCreateModal"
              class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../../stores/auth'
import { useImageUrl } from '../../composables/useImageUrl'
import ChannelSelect from '../ui/ChannelSelect.vue'

interface Props {
  guildId: string
}

const props = defineProps<Props>()
const authStore = useAuthStore()
const { getImageUrl } = useImageUrl()

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051'

// Settings state
const settings = ref({
  channelId: ''
})
const isSavingSettings = ref(false)
const showSettingsSuccess = ref(false)

// Games state
const games = ref<any[]>([])
const isLoadingGames = ref(true)
const showCreateModal = ref(false)
const isCreatingGame = ref(false)

const newGame = ref({
  name: '',
  description: '',
  color: '#55CCFC',
  image: null as File | null
})

// Settings functions
const loadSettings = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/guilds/${props.guildId}/features/chat-gaming/settings`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    
    if (response.data.settings) {
      settings.value = {
        channelId: response.data.settings.channelId || ''
      }
    }
  } catch (error) {
    console.error('Error loading chat-gaming settings:', error)
  }
}

const saveSettings = async () => {
  try {
    isSavingSettings.value = true
    
    const payload = {
      channelId: settings.value.channelId
    }
    
    await axios.put(`${API_BASE_URL}/api/guilds/${props.guildId}/features/chat-gaming/settings`, payload, {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    showSettingsSuccess.value = true
    setTimeout(() => {
      showSettingsSuccess.value = false
    }, 3000)
  } catch (error) {
    console.error('Error saving chat-gaming settings:', error)
  } finally {
    isSavingSettings.value = false
  }
}

const loadGames = async () => {
  try {
    isLoadingGames.value = true
    const response = await axios.get(`${API_BASE_URL}/api/chat-gaming`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    games.value = response.data.games || []
  } catch (error) {
    console.error('Error loading games:', error)
  } finally {
    isLoadingGames.value = false
  }
}

const createGame = async () => {
  try {
    isCreatingGame.value = true
    
    const formData = new FormData()
    formData.append('gamename', newGame.value.name)
    formData.append('gamedescription', newGame.value.description)
    formData.append('gamecolor', newGame.value.color)
    
    if (newGame.value.image) {
      formData.append('gameimage', newGame.value.image)
    }

    await axios.post(`${API_BASE_URL}/api/chat-gaming`, formData, {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    await loadGames()
    closeCreateModal()
  } catch (error) {
    console.error('Error creating game:', error)
  } finally {
    isCreatingGame.value = false
  }
}

const deleteGame = async (game: any) => {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer le jeu "${game.name}" ?`)) {
    return
  }

  try {
    await axios.delete(`${API_BASE_URL}/api/chat-gaming/${game._id}`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    await loadGames()
  } catch (error) {
    console.error('Error deleting game:', error)
  }
}

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    newGame.value.image = target.files[0]
  }
}

const closeCreateModal = () => {
  showCreateModal.value = false
  newGame.value = {
    name: '',
    description: '',
    color: '#55CCFC',
    image: null
  }
}

onMounted(() => {
  loadSettings()
  loadGames()
})
</script>