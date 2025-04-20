<template>
  <div class="app">
    <nav class="navbar">
      <router-link to="/">Accueil</router-link>
      <router-link to="/games">Jeux</router-link>
      <router-link to="/login" v-if="!isAuthenticated">Connexion</router-link>
      <button v-else @click="logout">Déconnexion</button>
    </nav>
    
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
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
  padding: 2rem;
}
</style>
