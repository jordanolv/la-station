<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <button 
          @click="$router.push('/servers')"
          class="p-2 text-muted hover:text-white hover:bg-surface-hover rounded-md transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        
        <div class="flex items-center gap-4">
          <div class="relative">
            <img 
              v-if="currentGuild?.icon" 
              :src="`https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png`"
              :alt="currentGuild.name"
              class="w-12 h-12 rounded-xl shadow-sm"
            />
            <div v-else class="w-12 h-12 rounded-xl bg-surface-hover border border-border flex items-center justify-center text-white font-bold text-lg">
              {{ currentGuild?.name?.charAt(0).toUpperCase() }}
            </div>
            <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-background rounded-full flex items-center justify-center">
              <div class="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
            </div>
          </div>
          
          <div>
            <h1 class="text-2xl font-bold text-white tracking-tight">{{ currentGuild?.name }}</h1>
            <p class="text-muted text-sm flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              System Operational
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <button class="px-4 py-2 text-sm font-medium text-white bg-surface hover:bg-surface-hover border border-border rounded-md transition-all flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
          Billing
        </button>
        <button class="px-4 py-2 text-sm font-medium text-black bg-white hover:bg-gray-200 rounded-md transition-all flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          Settings
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-24 space-y-4">
      <div class="w-8 h-8 border-2 border-border border-t-white rounded-full animate-spin"></div>
      <p class="text-muted text-sm">Syncing modules...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-24 text-center border border-red-500/20 bg-red-500/5 rounded-xl">
      <div class="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
      </div>
      <h2 class="text-lg font-medium text-white mb-1">Connection Error</h2>
      <p class="text-muted max-w-sm mb-4">{{ error }}</p>
      <button 
        @click="loadFeatures"
        class="px-4 py-2 text-sm font-medium text-white bg-surface hover:bg-surface-hover border border-border rounded-md transition-all"
      >
        Retry Connection
      </button>
    </div>

    <!-- Features Grid (Bento Box) -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="feature in features" 
        :key="feature.id"
        class="group relative bg-surface border border-border rounded-xl p-5 hover:border-border-hover transition-all duration-200 overflow-hidden"
      >
        <!-- Hover Glow -->
        <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        <div class="relative flex justify-between items-start mb-4">
          <div class="p-2 rounded-lg bg-surface-hover border border-border text-white">
            <!-- Dynamic Icon Placeholder (Assuming emoji for now based on previous code) -->
            <span class="text-xl leading-none">{{ feature.icon }}</span>
          </div>
          
          <!-- Toggle Switch -->
          <button 
            @click="toggleFeature(feature)"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-white/20"
            :class="feature.enabled ? 'bg-white' : 'bg-surface-hover border border-border'"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-black transition-transform"
              :class="feature.enabled ? 'translate-x-6' : 'translate-x-1 bg-muted'"
            />
          </button>
        </div>

        <div class="relative">
          <h3 class="text-lg font-semibold text-white mb-1">{{ feature.name }}</h3>
          <p class="text-sm text-muted line-clamp-2 mb-4 h-10">{{ feature.description }}</p>
          
          <div class="flex items-center justify-between pt-4 border-t border-border">
            <span class="text-xs font-medium flex items-center gap-1.5">
              <span :class="['w-1.5 h-1.5 rounded-full', feature.enabled ? 'bg-emerald-500' : 'bg-muted']"></span>
              {{ feature.enabled ? 'Active' : 'Disabled' }}
            </span>
            
            <button 
              v-if="feature.enabled"
              @click="manageFeature(feature)"
              class="text-xs font-medium text-white hover:text-accent transition-colors flex items-center gap-1"
            >
              Configure
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!isLoading && !error && features.length === 0" class="flex flex-col items-center justify-center py-24 text-center border border-border border-dashed rounded-xl bg-surface/30">
      <div class="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
      </div>
      <h2 class="text-lg font-medium text-white mb-1">No Modules Available</h2>
      <p class="text-muted max-w-sm">The system hasn't detected any configurable modules for this server.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import api from '../../utils/axios'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(true)
const error = ref<string | null>(null)
const features = ref<any[]>([])

const currentGuild = computed(() => 
  authStore.getGuilds.find(guild => guild.id === route.params.id)
)

const loadFeatures = async () => {
  try {
    isLoading.value = true
    error.value = null

    const response = await api.get(`/api/guilds/${route.params.id}/features`)

    features.value = response.data.features
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to load modules'
  } finally {
    isLoading.value = false
  }
}

const toggleFeature = async (feature: any) => {
  try {
    const newEnabled = !feature.enabled

    await api.post(`/api/guilds/${route.params.id}/features/${feature.id}/toggle`, {
      enabled: newEnabled
    })
    
    feature.enabled = newEnabled
  } catch (err: any) {
    console.error('Error toggling feature:', err)
    // Ideally show a toast notification here
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