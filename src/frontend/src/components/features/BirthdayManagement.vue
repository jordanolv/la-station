<template>
  <div>
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-white mb-2">🎂 Anniversaires</h2>
      <p class="text-gray-400">
        Configurez les notifications d'anniversaires automatiques pour les membres de votre serveur.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-8">
      <div class="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-gray-400 mt-2">Chargement des paramètres...</p>
    </div>

    <!-- Settings Form -->
    <div v-else class="space-y-6">
      <!-- Channel Configuration -->
      <div class="bg-gray-700 rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-medium text-white">Canal d'anniversaires</h3>
            <p class="text-gray-400 text-sm">Choisissez où envoyer les notifications d'anniversaires</p>
          </div>
        </div>
        
        <div class="space-y-4">
          <div>
            <ChannelSelect
              v-model="settings.channel"
              :guild-id="guildId"
              channel-type="text"
              label="Canal d'anniversaires"
              placeholder="Sélectionnez un canal"
              help-text="Canal où seront envoyées les notifications d'anniversaires"
            />
          </div>

          <!-- Preview -->
          <div v-if="settings.channel" class="bg-gray-800 rounded-lg p-4">
            <h4 class="text-sm font-medium text-gray-300 mb-2">Aperçu de notification</h4>
            <div class="bg-blue-600 bg-opacity-20 border-l-4 border-blue-600 p-3 rounded">
              <div class="flex items-center space-x-2">
                <span class="text-2xl">🎂</span>
                <div>
                  <p class="text-white font-medium">Joyeux anniversaire !</p>
                  <p class="text-gray-300 text-sm">Aujourd'hui, nous célébrons l'anniversaire de <strong>@MemberName</strong> ! 🎉</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- How it works -->
      <div class="bg-gray-700 rounded-lg p-6">
        <h3 class="text-lg font-medium text-white mb-4">Comment ça fonctionne</h3>
        <div class="space-y-3 text-gray-300">
          <div class="flex items-start space-x-3">
            <div class="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="text-white text-xs font-bold">1</span>
            </div>
            <div>
              <p class="font-medium">Les membres définissent leur anniversaire</p>
              <p class="text-gray-400 text-sm">Ils utilisent la commande <code class="bg-gray-800 px-1 rounded">/birthday</code> pour enregistrer leur date</p>
            </div>
          </div>
          
          <div class="flex items-start space-x-3">
            <div class="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="text-white text-xs font-bold">2</span>
            </div>
            <div>
              <p class="font-medium">Vérification automatique</p>
              <p class="text-gray-400 text-sm">Le bot vérifie chaque jour à minuit (heure de Paris) les anniversaires</p>
            </div>
          </div>
          
          <div class="flex items-start space-x-3">
            <div class="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span class="text-white text-xs font-bold">3</span>
            </div>
            <div>
              <p class="font-medium">Notification envoyée</p>
              <p class="text-gray-400 text-sm">Un message de félicitations est envoyé dans le canal configuré</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Warning if no channel -->
      <div v-if="!settings.channel" class="bg-yellow-600 bg-opacity-20 border border-yellow-600 rounded-lg p-4">
        <div class="flex items-start space-x-3">
          <svg class="w-5 h-5 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p class="text-yellow-400 font-medium">Aucun canal configuré</p>
            <p class="text-yellow-300 text-sm">
              Sans canal configuré, les notifications d'anniversaires ne seront pas envoyées.
            </p>
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

const props = defineProps<Props>()
const authStore = useAuthStore()

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051'

const isLoading = ref(true)
const isSaving = ref(false)
const showSuccessMessage = ref(false)

const settings = ref({
  channel: ''
})

const loadSettings = async () => {
  try {
    isLoading.value = true
    const response = await axios.get(`${API_BASE_URL}/api/guilds/${props.guildId}/features/birthday/settings`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    
    if (response.data.settings) {
      settings.value = {
        channel: response.data.settings.channel || ''
      }
    }
  } catch (error) {
    console.error('Error loading birthday settings:', error)
  } finally {
    isLoading.value = false
  }
}

const saveSettings = async () => {
  try {
    isSaving.value = true
    
    const payload = {
      channel: settings.value.channel
    }
    
    await axios.put(`${API_BASE_URL}/api/guilds/${props.guildId}/features/birthday/settings`, payload, {
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
    console.error('Error saving birthday settings:', error)
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>