<template>
  <div class="min-h-screen bg-gray-900 p-6">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center space-x-4 mb-4">
          <button 
            @click="$router.push(`/server/${$route.params.id}`)"
            class="text-gray-400 hover:text-white transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-white">{{ featureName }}</h1>
            <p class="text-gray-400">Configuration et gestion</p>
          </div>
        </div>
      </div>

      <!-- Feature Content -->
      <div class="bg-gray-800 rounded-lg p-6">
        <!-- Chat Gaming Feature -->
        <div v-if="$route.params.feature === 'chat-gaming'">
          <ChatGamingManagement :guild-id="$route.params.id as string" />
        </div>

        <!-- Leveling Feature -->
        <div v-else-if="$route.params.feature === 'leveling'">
          <LevelingManagement :guild-id="$route.params.id as string" />
        </div>

        <!-- Voice Channels Feature -->
        <div v-else-if="$route.params.feature === 'voice-channels'">
          <VocManagerManagement :guild-id="$route.params.id as string" />
        </div>

        <!-- Birthday Feature -->
        <div v-else-if="$route.params.feature === 'birthday'">
          <BirthdayManagement :guild-id="$route.params.id as string" />
        </div>

        <!-- Unknown Feature -->
        <div v-else>
          <div class="text-center py-12">
            <div class="text-6xl mb-4">❓</div>
            <h2 class="text-xl font-semibold text-white mb-2">Fonctionnalité inconnue</h2>
            <p class="text-gray-400">Cette fonctionnalité n'existe pas.</p>
            <button 
              @click="$router.push(`/server/${$route.params.id}`)"
              class="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Retour au tableau de bord
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ChatGamingManagement from '../../../components/features/ChatGamingManagement.vue'
import LevelingManagement from '../../../components/features/LevelingManagement.vue'
import VocManagerManagement from '../../../components/features/VocManagerManagement.vue'
import BirthdayManagement from '../../../components/features/BirthdayManagement.vue'

const route = useRoute()

const featureName = computed(() => {
  const featureMap: Record<string, string> = {
    'chat-gaming': 'Chat Gaming',
    'leveling': 'Système de niveaux',
    'voice-channels': 'Salons vocaux',
    'birthday': 'Anniversaires'
  }
  return featureMap[route.params.feature as string] || 'Fonctionnalité inconnue'
})
</script>