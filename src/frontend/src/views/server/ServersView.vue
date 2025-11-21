<template>
  <div class="space-y-8">
    <!-- Header Section -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-white tracking-tight mb-1">Servers</h1>
        <p class="text-muted">Select a server to manage or invite the bot.</p>
      </div>
      <button
        @click="handleLogout"
        class="px-4 py-2 text-sm font-medium text-muted hover:text-white bg-surface hover:bg-surface-hover border border-border rounded-md transition-all"
      >
        Sign Out
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-24 space-y-4">
      <div class="w-8 h-8 border-2 border-border border-t-white rounded-full animate-spin"></div>
      <p class="text-muted text-sm">Loading your command center...</p>
    </div>

    <!-- Not Authenticated State -->
    <div v-else-if="!authStore.isAuthenticated" class="flex flex-col items-center justify-center py-24 text-center border border-border border-dashed rounded-xl bg-surface/30">
      <div class="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" x2="6.01" y1="1" y2="1"/><line x1="10" x2="10.01" y1="1" y2="1"/><line x1="14" x2="14.01" y1="1" y2="1"/></svg>
      </div>
      <h2 class="text-lg font-medium text-white mb-1">Not Authenticated</h2>
      <p class="text-muted max-w-sm mb-4">Please log in to view your servers.</p>
      <button
        @click="router.push('/')"
        class="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-all"
      >
        Go to Login
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="managableGuilds.length === 0" class="flex flex-col items-center justify-center py-24 text-center border border-border border-dashed rounded-xl bg-surface/30">
      <div class="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
      </div>
      <h2 class="text-lg font-medium text-white mb-1">No Servers Found</h2>
      <p class="text-muted max-w-sm">You don't have administrative permissions on any servers, or the bot hasn't been added yet.</p>
    </div>

    <!-- Server Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div 
        v-for="guild in managableGuilds" 
        :key="guild.id"
        class="group relative bg-surface border border-border rounded-xl p-4 hover:border-border-hover transition-all duration-200 hover:shadow-lg hover:shadow-black/20 overflow-hidden"
      >
        <!-- Hover Glow Effect -->
        <div class="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        <div class="relative flex items-start justify-between mb-4">
          <!-- Server Icon -->
          <div class="relative">
            <img 
              v-if="guild.icon" 
              :src="`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`"
              :alt="guild.name"
              class="w-12 h-12 rounded-lg shadow-sm"
            />
            <div v-else class="w-12 h-12 rounded-lg bg-surface-hover border border-border flex items-center justify-center text-white font-bold text-lg">
              {{ guild.name.charAt(0).toUpperCase() }}
            </div>
            
            <!-- Status Indicator -->
            <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-surface rounded-full flex items-center justify-center">
              <div :class="['w-2.5 h-2.5 rounded-full', guild.botPresent ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500']"></div>
            </div>
          </div>

          <!-- Badges -->
          <div class="flex gap-2">
            <span v-if="guild.owner" class="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded">
              Owner
            </span>
            <span v-else class="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-400 bg-blue-400/10 border border-blue-400/20 rounded">
              Admin
            </span>
          </div>
        </div>

        <!-- Server Info -->
        <div class="relative mb-4">
          <h3 class="text-base font-medium text-white truncate pr-2">{{ guild.name }}</h3>
          <p class="text-xs text-muted mt-0.5 flex items-center gap-1.5">
            <span v-if="guild.botPresent" class="text-emerald-500">Active</span>
            <span v-else class="text-amber-500">Not Configured</span>
          </p>
        </div>

        <!-- Actions -->
        <div class="relative">
          <button 
            v-if="guild.botPresent"
            @click="navigateToServer(guild)"
            class="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Manage Server
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
          <a 
            v-else
            :href="getInviteUrl(guild.id)"
            target="_blank"
            class="w-full flex items-center justify-center gap-2 bg-surface-hover hover:bg-surface border border-border hover:border-border-hover text-white px-4 py-2 rounded-md text-sm font-medium transition-all"
          >
            Invite Bot
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const isLoading = ref(true)

const managableGuilds = computed(() => 
  authStore.getGuilds.filter(guild => guild.canManage)
    .sort((a, b) => {
      // Sort by bot presence (active first), then by ownership, then name
      if (a.botPresent !== b.botPresent) return a.botPresent ? -1 : 1;
      if (a.owner !== b.owner) return a.owner ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
)

const navigateToServer = (guild: any) => {
  router.push(`/server/${guild.id}`)
}

const getInviteUrl = (guildId: string) => {
  return `https://discord.com/api/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_CLIENT_ID}&permissions=8&scope=bot&guild_id=${guildId}`
}

const handleLogout = async () => {
  await authStore.logout()
}

onMounted(async () => {
  if (!authStore.getGuilds.length) {
    await authStore.fetchUserGuilds()
  }
  isLoading.value = false
})
</script>