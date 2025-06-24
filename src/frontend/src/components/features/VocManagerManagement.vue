<template>
  <div>
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-white mb-2">🔊 Salons vocaux automatiques</h2>
      <p class="text-gray-400">
        Configurez des salons vocaux qui créent automatiquement des canaux temporaires lorsqu'un membre les rejoint.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-8">
      <div class="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-gray-400 mt-2">Chargement des paramètres...</p>
    </div>

    <!-- Settings Content -->
    <div v-else class="space-y-6">
      <!-- Join Channels Configuration -->
      <div class="bg-gray-700 rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-medium text-white">Salons de création</h3>
            <p class="text-gray-400 text-sm">Configurez les salons qui créent des canaux temporaires</p>
          </div>
          <button 
            @click="addJoinChannel"
            class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Ajouter</span>
          </button>
        </div>

        <!-- No join channels message -->
        <div v-if="settings.joinChannels.length === 0" class="text-center py-8 bg-gray-800 rounded-lg">
          <div class="text-4xl mb-2">🔊</div>
          <p class="text-gray-400">Aucun salon de création configuré</p>
          <p class="text-gray-500 text-sm">Ajoutez un salon pour commencer !</p>
        </div>

        <!-- Join channels list -->
        <div v-else class="space-y-4">
          <div 
            v-for="(channel, index) in settings.joinChannels" 
            :key="index"
            class="bg-gray-800 rounded-lg p-4"
          >
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <ChannelSelect
                  v-model="channel.id"
                  :guild-id="guildId"
                  channel-type="voice"
                  label="Salon vocal de création"
                  placeholder="Sélectionnez un salon vocal"
                  :group-by-category="false"
                />
              </div>
              
              <div>
                <ChannelSelect
                  v-model="channel.category"
                  :guild-id="guildId"
                  channel-type="category"
                  label="Catégorie de destination"
                  placeholder="Sélectionnez une catégorie"
                  :group-by-category="false"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-1">Modèle de nom</label>
                <div class="flex items-center space-x-2">
                  <input 
                    v-model="channel.nameTemplate"
                    type="text"
                    placeholder="🎮 {username}"
                    class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                  <button 
                    @click="removeJoinChannel(index)"
                    class="text-red-400 hover:text-red-300 transition-colors p-2"
                    title="Supprimer"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <p class="text-gray-500 text-xs mt-1">
                  Utilisez {username} pour le nom de l'utilisateur
                  ou {count} pour le nombre de channels créés
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Statistics -->
      <div class="bg-gray-700 rounded-lg p-6">
        <h3 class="text-lg font-medium text-white mb-4">Statistiques</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gray-800 rounded-lg p-4">
            <div class="flex items-center space-x-3">
              <div class="bg-blue-600 rounded-lg p-2">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-5 7v5m-4-2h8m-8 0V9a1 1 0 011-1h6a1 1 0 011 1v5" />
                </svg>
              </div>
              <div>
                <p class="text-2xl font-bold text-white">{{ settings.channelCount }}</p>
                <p class="text-gray-400 text-sm">Canaux créés au total</p>
              </div>
            </div>
          </div>
          
          <div class="bg-gray-800 rounded-lg p-4">
            <div class="flex items-center space-x-3">
              <div class="bg-green-600 rounded-lg p-2">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <p class="text-2xl font-bold text-white">{{ settings.createdChannels.length }}</p>
                <p class="text-gray-400 text-sm">Canaux actifs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Channels (if any) -->
      <div v-if="settings.createdChannels.length > 0" class="bg-gray-700 rounded-lg p-6">
        <h3 class="text-lg font-medium text-white mb-4">Canaux actifs</h3>
        <div class="space-y-2">
          <div 
            v-for="channelId in settings.createdChannels" 
            :key="channelId"
            class="bg-gray-800 rounded-lg p-3 flex items-center justify-between"
          >
            <div class="flex items-center space-x-3">
              <div class="w-2 h-2 bg-green-500 rounded-full"></div>
              <span class="text-gray-300 font-mono text-sm">{{ channelId }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end">
        <button 
          @click="saveSettings"
          :disabled="isSaving"
          class="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
        >
          <svg v-if="isSaving" class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{{ isSaving ? 'Sauvegarde...' : 'Sauvegarder' }}</span>
        </button>
      </div>

      <!-- Success Message -->
      <div v-if="showSuccessMessage" class="bg-green-600 text-white p-3 rounded-lg flex items-center space-x-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>Paramètres sauvegardés avec succès !</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../../stores/auth'
import ChannelSelect from '../ui/ChannelSelect.vue'

interface Props {
  guildId: string
}

interface JoinChannel {
  id: string
  category: string
  nameTemplate: string
}

const props = defineProps<Props>()
const authStore = useAuthStore()

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051'

const isLoading = ref(true)
const isSaving = ref(false)
const showSuccessMessage = ref(false)

const settings = ref({
  joinChannels: [] as JoinChannel[],
  createdChannels: [] as string[],
  channelCount: 0
})

const loadSettings = async () => {
  try {
    isLoading.value = true
    const response = await axios.get(`${API_BASE_URL}/api/guilds/${props.guildId}/features/voice-channels/settings`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    
    if (response.data.settings) {
      settings.value = {
        joinChannels: response.data.settings.joinChannels || [],
        createdChannels: response.data.settings.createdChannels || [],
        channelCount: response.data.settings.channelCount || 0
      }
    }
  } catch (error) {
    console.error('Error loading voice manager settings:', error)
  } finally {
    isLoading.value = false
  }
}

const addJoinChannel = () => {
  settings.value.joinChannels.push({
    id: '',
    category: '',
    nameTemplate: '🎮 {username}'
  })
}

const removeJoinChannel = (index: number) => {
  settings.value.joinChannels.splice(index, 1)
}

const saveSettings = async () => {
  try {
    isSaving.value = true
    
    // Filter out empty join channels
    const validJoinChannels = settings.value.joinChannels.filter(
      channel => channel.id.trim() && channel.category.trim()
    )
    
    const payload = {
      joinChannels: validJoinChannels,
      createdChannels: settings.value.createdChannels,
      channelCount: settings.value.channelCount
    }
    
    await axios.put(`${API_BASE_URL}/api/guilds/${props.guildId}/features/voice-channels/settings`, payload, {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      }
    })
    
    showSuccessMessage.value = true
    setTimeout(() => {
      showSuccessMessage.value = false
    }, 3000)
  } catch (error) {
    console.error('Error saving voice manager settings:', error)
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>