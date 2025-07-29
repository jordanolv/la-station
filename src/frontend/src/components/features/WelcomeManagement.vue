<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-semibold text-white mb-2">👋 Messages de bienvenue</h2>
      <p class="text-gray-400">Configurez les messages automatiques et l'attribution de rôles pour les nouveaux membres</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-8">
      <div class="inline-block w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-gray-400 mt-2">Chargement des paramètres...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <!-- Configuration Form -->
    <div v-else class="space-y-6">
      <!-- Feature Toggle -->
      <div class="bg-gray-800 rounded-lg p-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-medium text-white">Activer la fonctionnalité Welcome/Goodbye</h3>
            <p class="text-gray-400 text-sm">Active ou désactive complètement cette fonctionnalité</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              v-model="settings.enabled" 
              @change="updateSettings"
              class="sr-only peer"
            >
            <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
          </label>
        </div>
      </div>

      <!-- Welcome Messages Section -->
      <div v-if="settings.enabled" class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-lg font-medium text-white mb-4 flex items-center space-x-2">
          <span>🎉</span>
          <span>Messages de bienvenue</span>
        </h3>
        
        <div class="space-y-4">
          <!-- Welcome Toggle -->
          <div class="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <div>
              <h4 class="text-white font-medium">Messages de bienvenue</h4>
              <p class="text-gray-400 text-sm">Envoyer un message quand quelqu'un rejoint le serveur</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                v-model="settings.welcomeEnabled" 
                @change="updateSettings"
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          <!-- Welcome Channel & Message -->
          <div v-if="settings.welcomeEnabled" class="space-y-4 pl-4 border-l-2 border-green-500">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Canal pour les messages de bienvenue
              </label>
              <ChannelSelect
                v-model="settings.welcomeChannelId"
                :guild-id="guildId"
                placeholder="Sélectionnez un canal"
                @update:model-value="updateSettings"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Message de bienvenue
              </label>
              <textarea
                v-model="settings.welcomeMessage"
                @blur="updateSettings"
                rows="3"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Bienvenue {user} sur le serveur!"
              ></textarea>
              <p class="text-xs text-gray-400 mt-1">
                Utilisez {user} pour mentionner le nouveau membre
              </p>
            </div>

            <!-- Image Generation Toggle -->
            <div class="flex items-center justify-between p-3 bg-gray-600 rounded">
              <div>
                <span class="text-white text-sm font-medium">Générer une image automatiquement</span>
                <p class="text-gray-400 text-xs">Créer une image avec la photo et le pseudo du membre</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="settings.generateWelcomeImage" 
                  @change="updateSettings"
                  class="sr-only peer"
                >
                <div class="w-9 h-5 bg-gray-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>

          <!-- Goodbye Toggle -->
          <div class="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
            <div>
              <h4 class="text-white font-medium">Messages d'au revoir</h4>
              <p class="text-gray-400 text-sm">Envoyer un message quand quelqu'un quitte le serveur</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                v-model="settings.goodbyeEnabled" 
                @change="updateSettings"
                class="sr-only peer"
              >
              <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <!-- Goodbye Channel & Message -->
          <div v-if="settings.goodbyeEnabled" class="space-y-4 pl-4 border-l-2 border-orange-500">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Canal pour les messages d'au revoir
              </label>
              <ChannelSelect
                v-model="settings.goodbyeChannelId"
                :guild-id="guildId"  
                placeholder="Sélectionnez un canal"
                @update:model-value="updateSettings"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Message d'au revoir
              </label>
              <textarea
                v-model="settings.goodbyeMessage"
                @blur="updateSettings"
                rows="3"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Au revoir {user}!"
              ></textarea>
              <p class="text-xs text-gray-400 mt-1">
                Utilisez {user} pour mentionner le membre qui part
              </p>
            </div>

            <!-- Image Generation Toggle -->
            <div class="flex items-center justify-between p-3 bg-gray-600 rounded">
              <div>
                <span class="text-white text-sm font-medium">Générer une image automatiquement</span>
                <p class="text-gray-400 text-xs">Créer une image avec la photo et le pseudo du membre</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="settings.generateGoodbyeImage" 
                  @change="updateSettings"
                  class="sr-only peer"
                >
                <div class="w-9 h-5 bg-gray-500 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Auto Roles Section -->
      <div v-if="settings.enabled" class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-lg font-medium text-white mb-4 flex items-center space-x-2">
          <span>🎭</span>
          <span>Rôles automatiques</span>
        </h3>
        
        <div class="space-y-4">
          <p class="text-gray-400 text-sm">
            Sélectionnez les rôles à attribuer automatiquement aux nouveaux membres
          </p>
          
          <RoleMultiSelect
            v-model="settings.autoRoles"
            :guild-id="guildId"
            @update:model-value="updateSettings"
          />
        </div>
      </div>

      <!-- Save Indicator -->
      <div v-if="isSaving" class="text-center py-4">
        <div class="inline-flex items-center space-x-2 text-green-400">
          <div class="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Sauvegarde en cours...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useApi } from '../../composables/useApi'
import ChannelSelect from '../ui/ChannelSelect.vue'
import RoleMultiSelect from '../ui/RoleMultiSelect.vue'

const props = defineProps<{
  guildId: string
}>()

const { get, put } = useApi()

// State
const isLoading = ref(true)
const isSaving = ref(false)
const error = ref<string | null>(null)

// Default settings
const settings = ref({
  enabled: false,
  welcomeEnabled: false,
  goodbyeEnabled: false,
  welcomeChannelId: null as string | null,
  goodbyeChannelId: null as string | null,
  welcomeMessage: 'Bienvenue {user} sur le serveur!',
  goodbyeMessage: 'Au revoir {user}!',
  generateWelcomeImage: false,
  generateGoodbyeImage: false,
  autoRoles: [] as string[]
})

// Load settings
async function loadSettings() {
  try {
    isLoading.value = true
    error.value = null
    
    const response = await get(`/api/guilds/${props.guildId}/features/welcome/settings`) as any
    
    if (response?.settings) {
      settings.value = { ...settings.value, ...response.settings }
    }
  } catch (err) {
    console.error('Erreur lors du chargement des paramètres:', err)
    error.value = 'Impossible de charger les paramètres'
  } finally {
    isLoading.value = false
  }
}

// Save settings
async function updateSettings() {
  try {
    isSaving.value = true
    
    await put(`/api/guilds/${props.guildId}/features/welcome/settings`, settings.value)
    
    // Brief feedback
    setTimeout(() => {
      isSaving.value = false
    }, 500)
  } catch (err) {
    console.error('Erreur lors de la sauvegarde:', err)
    error.value = 'Impossible de sauvegarder les paramètres'
    isSaving.value = false
  }
}

// Auto-save with debounce
let saveTimeout: NodeJS.Timeout | null = null
watch(settings, () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    updateSettings()
  }, 1000)
}, { deep: true })

onMounted(() => {
  loadSettings()
})
</script>