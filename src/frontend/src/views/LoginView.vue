<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <h1 class="text-3xl font-bold mb-4">Connexion</h1>
    <button
      @click="login"
      class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
    >
      Se connecter avec Discord
    </button>
  </div>
</template>

<script setup lang="ts">
const login = () => {
  window.location.href = 'http://localhost:3002/api/auth/discord/login'
}
</script>
