<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
    <div class="text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-purple-600 bg-opacity-20">
        <svg class="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-white mb-2">Authentification en cours...</h2>
      <p class="text-gray-400">Vous allez être redirigé dans un instant</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  try {
    // Le cookie a été défini par le backend
    // On initialise juste l'auth store pour récupérer l'utilisateur
    await authStore.initialize()

    if (authStore.isAuthenticated) {
      // Rediriger vers la page des serveurs
      router.push('/servers')
    } else {
      // Si l'authentification a échoué, rediriger vers la page de login
      console.error('Authentication failed')
      router.push('/')
    }
  } catch (error) {
    console.error('Callback error:', error)
    router.push('/')
  }
})
</script>
