<template>
  <div>
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-white mb-2">📈 Système de niveaux</h2>
      <p class="text-gray-400">
        Configurez le système de niveaux et d'expérience pour les membres de votre serveur.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-8">
      <div class="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-gray-400 mt-2">Chargement des paramètres...</p>
    </div>

    <!-- Settings Form -->
    <div v-else class="space-y-6">
      <!-- XP Rate Setting -->
      <div class="bg-gray-700 rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-medium text-white">Taux d'expérience</h3>
            <p class="text-gray-400 text-sm">Multiplicateur pour l'expérience gagnée</p>
          </div>
        </div>
        
        <div class="flex items-center space-x-4">
          <input 
            v-model.number="settings.taux"
            type="number"
            min="0.1"
            max="10"
            step="0.1"
            class="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white w-24 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
          <span class="text-gray-400">×</span>
          <span class="text-gray-300">
            ({{ settings.taux }}× plus d'XP que la normale)
          </span>
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

interface Props {
  guildId: string
}

const props = defineProps<Props>()
const authStore = useAuthStore()

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051'

const isLoading = ref(true)
const isSaving = ref(false)
const showSuccessMessage = ref(false)

const settings = ref({
  taux: 1,
  notifLevelUp: true,
  channelNotif: ''
})

const loadSettings = async () => {
  try {
    isLoading.value = true
    const response = await axios.get(`${API_BASE_URL}/api/guilds/${props.guildId}/features/leveling/settings`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    
    if (response.data.settings) {
      settings.value = {
        taux: response.data.settings.taux || 1,
        notifLevelUp: response.data.settings.notifLevelUp ?? true,
        channelNotif: response.data.settings.channelNotif || ''
      }
    }
  } catch (error) {
    console.error('Error loading leveling settings:', error)
  } finally {
    isLoading.value = false
  }
}

const saveSettings = async () => {
  try {
    isSaving.value = true
    
    const payload = {
      taux: settings.value.taux,
      notifLevelUp: settings.value.notifLevelUp,
      channelNotif: settings.value.channelNotif || null
    }
    
    await axios.put(`${API_BASE_URL}/api/guilds/${props.guildId}/features/leveling/settings`, payload, {
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
    console.error('Error saving leveling settings:', error)
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>