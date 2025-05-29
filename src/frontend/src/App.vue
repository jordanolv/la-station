<template>
  <div class="app min-h-screen bg-[#23272A] text-white">
    <Sidebar v-if="isAuthenticated" />
    <div :class="{ 'pl-64': isAuthenticated }">
      <AppHeader v-if="!isAuthenticated" />
      <main class="flex flex-col flex-1">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import Sidebar from './components/Sidebar.vue'
import { useAuthStore } from './stores/auth'
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const isAuthenticated = computed(() => authStore.isAuthenticated)

// Rediriger vers le dashboard si l'utilisateur est authentifié
onMounted(() => {
  if (isAuthenticated.value && router.currentRoute.value.path === '/') {
    router.push('/dashboard')
  }
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
    Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
