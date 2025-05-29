<template>
  <div class="sidebar w-64 bg-[#1E2124] h-screen fixed left-0 top-0 flex flex-col shadow-xl z-40">
    <!-- Logo -->
    <div class="p-4 flex items-center space-x-3 border-b border-[#36393F]">
      <div class="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
        <span class="text-white font-bold text-xl">LS</span>
      </div>
      <span class="text-white font-bold text-xl">La Station</span>
    </div>

    <!-- Server selector -->
    <div class="p-4 border-b border-[#36393F]">
      <div class="flex items-center space-x-2 bg-[#2A2D31] p-2 rounded-md cursor-pointer hover:bg-[#32353B] transition-colors">
        <div v-if="selectedGuild" class="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center overflow-hidden">
          <img v-if="selectedGuild.icon" :src="`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`" class="w-full h-full object-cover" :alt="selectedGuild.name">
          <span v-else class="text-white font-bold text-sm">{{ getInitials(selectedGuild.name) }}</span>
        </div>
        <div v-else class="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center">
          <span class="text-white font-bold text-sm">?</span>
        </div>
        <span class="text-white font-medium text-sm truncate flex-1">{{ selectedGuild ? selectedGuild.name : 'Sélectionner un serveur' }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>

    <!-- Menu items -->
    <nav class="flex-1 overflow-y-auto py-4">
      <ul>
        <li v-for="(item, index) in menuItems" :key="index" class="mb-1">
          <router-link :to="item.route" class="flex items-center px-4 py-2 text-gray-300 hover:bg-[#32353B] hover:text-white transition-colors" :class="{ 'bg-[#32353B] text-white': isActive(item.route) }">
            <component :is="item.icon" class="w-5 h-5 mr-3" />
            <span>{{ item.label }}</span>
            <div v-if="item.new" class="ml-auto bg-green-600 text-xs font-bold text-white px-2 py-0.5 rounded-full">NEW</div>
          </router-link>
        </li>
      </ul>
    </nav>

    <!-- Bottom section -->
    <div class="p-4 border-t border-[#36393F]">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
          <img v-if="user?.avatar" :src="`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`" class="w-full h-full object-cover" :alt="user?.username">
          <span v-else class="text-white font-bold text-sm">{{ user ? getInitials(user.username) : '?' }}</span>
        </div>
        <div class="flex-1">
          <p class="text-white text-sm font-medium">{{ user?.username || 'Non connecté' }}</p>
          <p class="text-gray-400 text-xs">{{ user?.id || '' }}</p>
        </div>
        <button @click="logout" class="text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm7 2a1 1 0 00-1 1v1a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

interface Guild {
  id: string;
  name: string;
  icon?: string;
}

interface MenuItem {
  label: string;
  route: string;
  icon: string;
  new: boolean;
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const user = computed(() => authStore.user)
const guilds = computed(() => authStore.getGuilds)
const selectedGuild = ref<Guild | null>(null)

// Menu items
const menuItems: MenuItem[] = [
  { 
    label: 'Dashboard', 
    route: '/dashboard', 
    icon: 'svg-dashboard',
    new: false 
  },
  { 
    label: 'Leaderboard', 
    route: '/leaderboard', 
    icon: 'svg-leaderboard',
    new: false 
  },
  { 
    label: 'Leveling', 
    route: '/leveling', 
    icon: 'svg-leveling',
    new: false 
  },
  { 
    label: 'Voice Channels', 
    route: '/voice-channels', 
    icon: 'svg-channels',
    new: true 
  },
  { 
    label: 'Settings', 
    route: '/settings', 
    icon: 'svg-settings',
    new: false 
  }
]

const isActive = (path: string): boolean => {
  return route.path.startsWith(path)
}

const getInitials = (name: string): string => {
  if (!name) return '?'
  return name.split(' ')
    .map((word: string) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

const logout = () => {
  authStore.logout()
  router.push('/')
}

// Custom icon components
const components = {
  'svg-dashboard': {
    template: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    `
  },
  'svg-leaderboard': {
    template: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    `
  },
  'svg-leveling': {
    template: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    `
  },
  'svg-channels': {
    template: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    `
  },
  'svg-settings': {
    template: `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    `
  }
}
</script> 