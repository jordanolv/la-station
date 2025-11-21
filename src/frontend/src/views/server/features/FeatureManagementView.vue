<template>
  <div class="min-h-screen">
    <!-- Header -->
    <div class="mb-8 flex items-center space-x-4">
      <button 
        @click="router.push(`/server/${route.params.id}`)"
        class="text-muted hover:text-white transition-colors p-2 hover:bg-surface-hover rounded-md"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">{{ featureName }}</h1>
        <p class="text-sm text-muted">Configuration et gestion</p>
      </div>
    </div>

    <!-- Feature Content -->
    <div class="bg-surface border border-border rounded-xl p-6 shadow-sm">
      <!-- Chat Gaming Feature -->
      <div v-if="route.params.feature === 'chat-gaming'">
        <ChatGamingManagement :guild-id="route.params.id as string" />
      </div>

      <!-- Leveling Feature -->
      <div v-else-if="route.params.feature === 'leveling'">
        <LevelingView />
      </div>

      <!-- Voice Channels Feature -->
      <div v-else-if="route.params.feature === 'voice-channels'">
        <VoiceChannelsView />
      </div>

      <!-- Birthday Feature -->
      <div v-else-if="route.params.feature === 'birthday'">
        <BirthdayManagement :guild-id="route.params.id as string" />
      </div>

      <!-- Suggestions Feature -->
      <div v-else-if="route.params.feature === 'suggestions'">
        <SuggestionsManagement :guild-id="route.params.id as string" />
      </div>

      <!-- Party Feature -->
      <div v-else-if="route.params.feature === 'party'">
        <PartyManagement :guild-id="route.params.id as string" />
      </div>

      <!-- Unknown Feature -->
      <div v-else>
        <div class="text-center py-24">
          <div class="text-4xl mb-4">❓</div>
          <h2 class="text-xl font-semibold text-white mb-2">Fonctionnalité inconnue</h2>
          <p class="text-muted mb-6">Cette fonctionnalité n'existe pas ou n'est pas encore implémentée.</p>
          <button 
            @click="router.push(`/server/${route.params.id}`)"
            class="bg-surface hover:bg-surface-hover text-white px-4 py-2 rounded-md border border-border transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChatGamingManagement from '../../../components/features/ChatGamingManagement.vue'
// Import new views
import LevelingView from './LevelingView.vue'
import VoiceChannelsView from './VoiceChannelsView.vue'
// Keep old components for unmigrated features
import BirthdayManagement from '../../../components/features/BirthdayManagement.vue'
import SuggestionsManagement from '../../../components/features/SuggestionsManagement.vue'
import PartyManagement from '../../../components/features/PartyManagement.vue'

const route = useRoute()
const router = useRouter()

const featureName = computed(() => {
  const featureMap: Record<string, string> = {
    'chat-gaming': 'Chat Gaming',
    'leveling': 'Système de niveaux',
    'voice-channels': 'Salons vocaux',
    'birthday': 'Anniversaires',
    'suggestions': 'Système de Suggestions',
    'party': 'Gestion des Soirées'
  }
  return featureMap[route.params.feature as string] || 'Fonctionnalité inconnue'
})
</script>