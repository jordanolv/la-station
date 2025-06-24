<template>
  <nav class="fixed top-0 left-0 w-full flex items-center justify-between px-8 py-3 bg-transparent shadow-lg z-50">
    <div class="flex items-center gap-6">
      <router-link to="/" class="text-neutral-100 font-semibold text-lg tracking-wide hover:text-indigo-400 transition-colors">Accueil</router-link>
    </div>
    <div class="flex items-center gap-4">
      <span v-if="isAuthenticated" class="text-neutral-300 font-medium">👤 {{ user?.username }}</span>
      <button
        v-if="isAuthenticated"
        @click="logoutAction"
        class="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-md hover:from-violet-500 hover:to-indigo-500 transition-all duration-150"
      >Déconnexion</button>
      <button
        v-else
        @click="loginAction"
        class="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-violet-600 text-white font-semibold shadow-md hover:from-pink-400 hover:to-violet-500 transition-all duration-150"
      >Connexion Discord</button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import { computed } from 'vue'
import router from '../router'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
const user = computed(() => authStore.user)


const loginAction = () => {
  authStore.loginWithDiscord()
}

const logoutAction = () => {
  authStore.logout()
  router.push('/')
}
</script>


