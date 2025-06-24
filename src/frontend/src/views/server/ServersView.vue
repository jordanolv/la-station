<template>
  <div class="min-h-screen bg-gray-900 p-6">
    <div class="max-w-6xl mx-auto">
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-white mb-2">Mes Serveurs</h1>
            <p class="text-gray-400">Sélectionnez un serveur pour le gérer</p>
          </div>
          <button 
            @click="authStore.logout(); $router.push('/')"
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="text-center py-12">
        <div class="inline-block w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-gray-400 mt-4">Chargement de vos serveurs...</p>
      </div>

      <div v-else-if="managableGuilds.length === 0" class="text-center py-12">
        <div class="text-6xl mb-4">🏠</div>
        <h2 class="text-xl font-semibold text-white mb-2">Aucun serveur trouvé</h2>
        <p class="text-gray-400">Vous n'avez les permissions de gestion sur aucun serveur.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="guild in managableGuilds" 
          :key="guild.id"
          class="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-200"
        >
          <div class="p-6">
            <div class="flex items-center space-x-4 mb-4">
              <div class="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                <img 
                  v-if="guild.icon" 
                  :src="`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`"
                  :alt="guild.name"
                  class="w-12 h-12 rounded-full"
                />
                <span v-else class="text-white font-semibold">
                  {{ guild.name.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-white">{{ guild.name }}</h3>
                <div class="flex items-center space-x-2">
                  <span 
                    v-if="guild.owner" 
                    class="text-xs bg-yellow-600 text-white px-2 py-1 rounded-full"
                  >
                    Propriétaire
                  </span>
                  <span 
                    v-else 
                    class="text-xs bg-blue-600 text-white px-2 py-1 rounded-full"
                  >
                    Administrateur
                  </span>
                </div>
              </div>
            </div>

            <!-- <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-2">
                <div :class="[
                  'w-3 h-3 rounded-full',
                  guild.botPresent ? 'bg-green-500' : 'bg-red-500'
                ]"></div>
                <span class="text-sm text-gray-400">
                  {{ guild.botPresent ? 'Bot présent' : 'Bot absent' }}
                </span>
              </div>
            </div> -->

            <div class="space-y-2">
              <button 
                v-if="guild.botPresent"
                @click="navigateToServer(guild)"
                class="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors font-medium"
              >
                Accéder au tableau de bord
              </button>
              <a 
                v-else
                :href="getInviteUrl(guild.id)"
                target="_blank"
                class="block w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors font-medium text-center"
              >
                Inviter le bot
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const isLoading = ref(true)

const managableGuilds = computed(() => 
  authStore.getGuilds.filter(guild => guild.canManage)
    .sort((a, b) => {
      if (a.botPresent && !b.botPresent) return -1;
      if (!a.botPresent && b.botPresent) return 1;
      return 0;
    })
)

const navigateToServer = (guild: any) => {
  router.push(`/server/${guild.id}`)
}

const getInviteUrl = (guildId: string) => {
  return `https://discord.com/api/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_CLIENT_ID}&permissions=8&scope=bot&guild_id=${guildId}`
}

onMounted(async () => {
  if (!authStore.getGuilds.length) {
    await authStore.fetchUserGuilds()
  }
  isLoading.value = false
})
</script>