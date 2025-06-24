<template>
  <div class="min-h-screen bg-gray-900 p-6">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button 
              @click="$router.push('/servers')"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div class="flex items-center space-x-3">
              <div class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                <img 
                  v-if="currentGuild?.icon" 
                  :src="`https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png`"
                  :alt="currentGuild.name"
                  class="w-12 h-12 rounded-full"
                />
                <span v-else class="text-white font-semibold text-xl">
                  {{ currentGuild?.name?.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div>
                <h1 class="text-2xl font-bold text-white">{{ currentGuild?.name }}</h1>
                <p class="text-gray-400">Gestion des fonctionnalités</p>
              </div>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <div :class="[
              'w-3 h-3 rounded-full',
              currentGuild?.botPresent ? 'bg-green-500' : 'bg-red-500'
            ]"></div>
            <span class="text-sm text-gray-400">
              {{ currentGuild?.botPresent ? 'Bot connecté' : 'Bot déconnecté' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="text-center py-12">
        <div class="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-gray-400 mt-4">Chargement des fonctionnalités...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-12">
        <div class="text-6xl mb-4">⚠️</div>
        <h2 class="text-xl font-semibold text-white mb-2">Erreur</h2>
        <p class="text-gray-400 mb-4">{{ error }}</p>
        <button 
          @click="loadFeatures"
          class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Réessayer
        </button>
      </div>

      <!-- Features Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="feature in features" 
          :key="feature.id"
          class="bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-200"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center space-x-3">
              <div class="text-3xl">{{ feature.icon }}</div>
              <div>
                <h3 class="text-lg font-semibold text-white">{{ feature.name }}</h3>
                <p class="text-gray-400 text-sm">{{ feature.description }}</p>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                :checked="feature.enabled" 
                @change="toggleFeature(feature)"
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <span :class="[
              'text-sm font-medium',
              feature.enabled ? 'text-green-400' : 'text-gray-500'
            ]">
              {{ feature.enabled ? 'Activé' : 'Désactivé' }}
            </span>
            <button 
              v-if="feature.enabled"
              @click="manageFeature(feature)"
              class="bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1 rounded transition-colors"
            >
              Gérer
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!isLoading && !error && features.length === 0" class="text-center py-12">
        <div class="text-6xl mb-4">🔧</div>
        <h2 class="text-xl font-semibold text-white mb-2">Aucune fonctionnalité disponible</h2>
        <p class="text-gray-400">Les fonctionnalités du bot seront bientôt disponibles.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import axios from 'axios'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(true)
const error = ref<string | null>(null)
const features = ref<any[]>([])

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051'

const currentGuild = computed(() => 
  authStore.getGuilds.find(guild => guild.id === route.params.id)
)

const loadFeatures = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await axios.get(`${API_BASE_URL}/api/guilds/${route.params.id}/features`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    
    features.value = response.data.features
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Erreur lors du chargement des fonctionnalités'
  } finally {
    isLoading.value = false
  }
}

const toggleFeature = async (feature: any) => {
  try {
    const newEnabled = !feature.enabled
    
    await axios.post(`${API_BASE_URL}/api/guilds/${route.params.id}/features/${feature.id}/toggle`, {
      enabled: newEnabled
    }, {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    })
    
    feature.enabled = newEnabled
  } catch (err: any) {
    console.error('Error toggling feature:', err)
    // TODO: Show error message to user
  }
}

const manageFeature = (feature: any) => {
  router.push(`/server/${route.params.id}/feature/${feature.id}`)
}

onMounted(async () => {
  if (!currentGuild.value) {
    // If guild not found, redirect to servers
    router.push('/servers')
    return
  }
  
  await loadFeatures()
})
</script>