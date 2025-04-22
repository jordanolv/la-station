<template>
  <div class="login">
    <h1>Connexion</h1>
    <button @click="loginWithDiscord" :disabled="loading">
      {{ loading ? 'Connexion...' : 'Se connecter avec Discord' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const loading = ref(false)
const error = ref('')
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Vérifier si nous avons un token dans l'URL (callback Discord)
if (route.query.token) {
  authStore.setToken(route.query.token as string)
  router.push('/')
}

const loginWithDiscord = () => {
  window.location.href = 'http://94.130.72.168:3002/api/auth/discord'
}
</script>

<style scoped>
.login {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

button {
  width: 100%;
  padding: 0.75rem;
  background-color: #5865F2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error {
  color: #e74c3c;
  margin-top: 1rem;
  text-align: center;
}
</style> 