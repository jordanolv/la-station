<template>
  <div class="flex min-h-screen bg-background text-white font-sans selection:bg-accent selection:text-white">
    <!-- Sidebar -->
    <aside 
      class="fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-surface/50 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 flex flex-col"
      :class="[isSidebarOpen ? 'translate-x-0' : '-translate-x-full']"
    >
      <!-- Logo / Brand -->
      <div class="h-16 flex items-center px-6 border-b border-border">
        <div class="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-white to-neutral-400 flex items-center justify-center text-black">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </div>
          The Ridge
        </div>
      </div>

      <!-- Server Selector -->
      <div class="p-4 border-b border-border">
        <div class="relative">
          <button 
            @click="isServerDropdownOpen = !isServerDropdownOpen"
            class="w-full flex items-center justify-between p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border transition-colors text-left"
          >
            <div class="flex items-center gap-3 overflow-hidden">
              <div v-if="currentGuild" class="w-8 h-8 rounded bg-neutral-700 flex-shrink-0 bg-cover bg-center" :style="currentGuild.icon ? `background-image: url(https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png)` : ''">
                <span v-if="!currentGuild.icon" class="w-full h-full flex items-center justify-center text-xs font-bold">{{ currentGuild.name.charAt(0) }}</span>
              </div>
              <div v-else class="w-8 h-8 rounded bg-neutral-700 flex-shrink-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              </div>
              <div class="truncate">
                <div class="text-sm font-medium truncate">{{ currentGuild?.name || 'Select Server' }}</div>
                <div class="text-xs text-muted truncate">{{ currentGuild ? 'Manage' : 'No server selected' }}</div>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted transition-transform duration-200" :class="{ 'rotate-180': isServerDropdownOpen }"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          <!-- Dropdown Menu -->
          <div v-if="isServerDropdownOpen" class="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto py-1">
            <button 
              v-for="guild in authStore.guilds" 
              :key="guild.id"
              @click="selectGuild(guild.id)"
              class="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-hover transition-colors text-left"
              :class="{ 'bg-surface-hover': currentGuild?.id === guild.id }"
            >
              <div class="w-6 h-6 rounded bg-neutral-700 flex-shrink-0 bg-cover bg-center" :style="guild.icon ? `background-image: url(https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png)` : ''">
                <span v-if="!guild.icon" class="w-full h-full flex items-center justify-center text-[10px] font-bold">{{ guild.name.charAt(0) }}</span>
              </div>
              <span class="text-sm truncate">{{ guild.name }}</span>
              <svg v-if="currentGuild?.id === guild.id" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-auto text-accent"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto p-4 space-y-6">
        <!-- Main -->
        <div v-if="currentGuild">
          <div class="text-xs font-semibold text-muted uppercase tracking-wider mb-3 px-2">Overview</div>
          <ul class="space-y-1">
            <li>
              <router-link
                :to="`/server/${currentGuild.id}`"
                class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted hover:text-white hover:bg-surface-hover transition-colors"
                active-class="bg-surface-hover text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
                Dashboard
              </router-link>
            </li>
            <li>
              <router-link
                :to="`/leaderboard/${currentGuild.id}`"
                class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted hover:text-white hover:bg-surface-hover transition-colors"
                active-class="bg-surface-hover text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                Leaderboard
              </router-link>
            </li>
          </ul>
        </div>

        <!-- Features -->
        <div v-if="currentGuild">
          <div class="text-xs font-semibold text-muted uppercase tracking-wider mb-3 px-2 flex justify-between items-center">
            <span>Features</span>
            <span v-if="guildStore.loading" class="w-3 h-3 border border-muted border-t-transparent rounded-full animate-spin"></span>
          </div>
          <ul class="space-y-1">
            <li v-for="feature in guildStore.features" :key="feature.id" class="group">
              <div class="flex items-center justify-between pr-2 rounded-md hover:bg-surface-hover transition-colors">
                  <router-link 
                    :to="`/server/${currentGuild.id}/feature/${feature.id}`" 
                    class="flex-1 flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted group-hover:text-white transition-colors min-w-0"
                    active-class="text-white font-semibold"
                  >
                    <span class="text-lg flex-shrink-0">{{ feature.icon }}</span>
                    <span class="truncate">{{ feature.name }}</span>
                  </router-link>
                
                <!-- Toggle Switch -->
                <button 
                  @click.stop="toggleFeature(feature.id, !feature.enabled)"
                  class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface focus:ring-accent"
                  :class="feature.enabled ? 'bg-emerald-500' : 'bg-neutral-700'"
                  :title="feature.enabled ? 'Disable feature' : 'Enable feature'"
                >
                  <span 
                    class="inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ease-in-out"
                    :class="feature.enabled ? 'translate-x-5' : 'translate-x-1'"
                  />
                </button>
              </div>
            </li>
          </ul>
        </div>

        <!-- Global Nav (Always visible) -->
        <div>
          <div class="text-xs font-semibold text-muted uppercase tracking-wider mb-3 px-2">Global</div>
          <ul class="space-y-1">
            <li>
              <router-link to="/servers" class="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted hover:text-white hover:bg-surface-hover transition-colors" active-class="bg-surface-hover text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/></svg>
                All Servers
              </router-link>
            </li>
          </ul>
        </div>
      </nav>

      <!-- User Profile -->
      <div class="p-4 border-t border-border bg-surface/30">
        <div class="flex items-center gap-3">
          <img 
            v-if="authStore.user?.avatar" 
            :src="`https://cdn.discordapp.com/avatars/${authStore.user.id}/${authStore.user.avatar}.png`" 
            class="w-9 h-9 rounded-full border border-border"
            alt="User Avatar"
          >
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-white truncate">{{ authStore.user?.username }}</div>
            <div class="text-xs text-muted truncate">Online</div>
          </div>
          <button @click="authStore.logout(); router.push('/')" class="text-muted hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header (Mobile Toggle only) -->
      <header class="lg:hidden h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-6">
        <button @click="isSidebarOpen = true" class="text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
        </button>
        <div class="font-bold text-lg">The Ridge</div>
        <div class="w-6"></div> <!-- Spacer -->
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-6 lg:p-8 scroll-smooth">
        <div class="max-w-7xl mx-auto animate-fade-in">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>
    
    <!-- Overlay -->
    <div 
      v-if="isSidebarOpen" 
      @click="isSidebarOpen = false"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useGuildStore } from '../stores/guild'

const isSidebarOpen = ref(false)
const isServerDropdownOpen = ref(false)
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const guildStore = useGuildStore()

const currentGuild = computed(() => {
  const guildId = route.params.id as string
  if (!guildId) return null
  return authStore.guilds.find(g => g.id === guildId)
})

const selectGuild = (guildId: string) => {
  isServerDropdownOpen.value = false
  router.push(`/server/${guildId}`)
}

const toggleFeature = async (featureId: string, enabled: boolean) => {
  if (!currentGuild.value) return
  try {
    await guildStore.toggleFeature(currentGuild.value.id, featureId, enabled)
  } catch (error) {
    // Error handling is done in store
  }
}

// Watch for route changes to fetch features
watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      await guildStore.fetchFeatures(newId as string)
    } else {
      guildStore.clearCurrentGuild()
    }
  },
  { immediate: true }
)

// Close dropdown when clicking outside (simple implementation)
onMounted(() => {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target.closest('.relative')) {
      isServerDropdownOpen.value = false
    }
  })
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
