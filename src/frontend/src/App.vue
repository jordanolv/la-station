<template>
  <div class="app min-h-screen bg-gradient-to-br from-[#181a20] via-[#23272f] to-[#181a20]">
    <AppHeader />
    <main class="flex flex-col items-center justify-start flex-1 pt-24">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import { useAuthStore } from './stores/auth'
import { computed } from 'vue'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

const logout = () => {
  authStore.logout()
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background-color: #2c3e50;
  padding: 1rem;
  display: flex;
  gap: 1rem;
}

.navbar a {
  color: white;
  text-decoration: none;
}

.navbar a:hover {
  text-decoration: underline;
}

main {
  flex: 1;
}
</style>
