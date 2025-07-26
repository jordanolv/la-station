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
import { useAuthStore } from '../../stores/auth'

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

</script> 