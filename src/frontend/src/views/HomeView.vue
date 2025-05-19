<template>
<<<<<<< Updated upstream
  <div class="text-neutral-200 p-8 text-center font-sans w-full">
    <div v-if="!isAuthenticated">
      <h1 class="text-5xl font-semibold text-white mb-4">Bienvenue sur La Station</h1>
      <p class="text-lg text-neutral-400 mb-8">
        Gérez vos jeux et votre serveur Discord en un seul endroit.
      </p>
      <!-- Login button could be placed here if not in AppHeader -->
      <!-- 
      <button @click="loginWithDiscord" 
              class="mt-8 px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-600 text-white rounded-lg text-lg font-medium transition-colors">
        Se connecter avec Discord
      </button>
      -->
    </div>
    <div v-else class="max-w-4xl mx-auto">
      <h2 class="text-3xl font-medium text-neutral-300 mt-10 mb-6">Vos serveurs Discord</h2>
      <GuildList @access="navigateToGuild" />
=======
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">Accueil</h1>

    <div v-if="authStore.status === 'authenticated'">
      <p>Bienvenue, {{ authStore.user?.name || 'Utilisateur inconnu' }} !</p>
      <button @click="authStore.logout" class="mt-4 p-2 bg-red-500 text-white rounded">
        Se déconnecter
      </button>
    </div>

    <div v-else>
      <p>Vous n'êtes pas connecté.</p>
>>>>>>> Stashed changes
    </div>
  </div>
</template>

<script setup lang="ts">
<<<<<<< Updated upstream
import { computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import GuildList from '../components/GuildList.vue'
// FeaturesPanel import removed

const authStore = useAuthStore()
const router = useRouter()
const isAuthenticated = computed(() => authStore.isAuthenticated)
// selectedGuild ref removed

const navigateToGuild = (guild: any) => {
  router.push(`/guild/${guild.id}`)
}

// Gérer le token dans l'URL (callback Discord)
onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  if (token) {
    authStore.setToken(token)
    // Clean the URL by replacing the current entry in history
    router.replace(router.currentRoute.value.path) 
  }
})

/* Optional: Method to trigger login if button is moved here
const loginWithDiscord = () => {
  window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051'}/api/auth/discord`;
}
*/
</script>

<!-- Removed <style scoped> as Tailwind is used -->
=======
import { useAuthStore } from '../stores/auth.store'

const authStore = useAuthStore()

authStore.fetchSession()
</script>
>>>>>>> Stashed changes
