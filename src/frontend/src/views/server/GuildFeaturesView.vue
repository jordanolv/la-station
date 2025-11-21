<template>
  <div class="w-full space-y-8">
    <div v-if="loading && !guild" class="flex flex-col items-center justify-center py-24 space-y-4">
      <div class="w-8 h-8 border-2 border-border border-t-white rounded-full animate-spin"></div>
      <p class="text-muted text-sm">Chargement des informations du serveur...</p>
    </div>

    <div v-else-if="!guild" class="flex flex-col items-center justify-center py-24 text-center border border-border border-dashed rounded-xl bg-surface/30">
      <div class="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4 text-red-500">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
      </div>
      <h2 class="text-lg font-medium text-white mb-1">Serveur introuvable</h2>
      <p class="text-muted max-w-sm mb-6">Impossible de trouver les informations pour ce serveur (ID: {{ guildId }}).<br/>Vérifiez l'ID ou que vous avez accès à ce serveur.</p>
      <router-link to="/" class="px-4 py-2 text-sm font-medium text-white bg-surface hover:bg-surface-hover border border-border rounded-md transition-all">Retour à l'accueil</router-link>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Stats & Feature Cards -->
      <div class="lg:col-span-2 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Nom du Serveur" :value="guild.name" description="Nom Discord actuel du serveur" />
          <StatCard title="Préfixe du Bot" :value="guild.config?.prefix || 'Non défini'" />
          <StatCard title="Date d'enregistrement">
            <p class="text-2xl font-bold text-white tracking-tight">{{ formatDate(guild.registeredAt) }}</p>
          </StatCard>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
           <StatCard title="Voc Channels Créés" :value="guild.features?.vocGaming?.nbChannelsCreated || 0" description="Nombre de salons vocaux temporaires créés" />
           <StatCard title="Forums Gaming Créés" :value="guild.features?.chatGaming?.nbForumCreated || 0" description="Nombre de forums de jeu créés"/>
           <StatCard title="Couleur Principale">
             <div v-if="guild.config?.colors?.primary" class="flex items-center space-x-3 mt-2">
                <div class="w-10 h-10 rounded-lg border border-border shadow-sm" :style="{ backgroundColor: guild.config.colors.primary }"></div>
                <span class="text-xl font-mono font-medium text-white">{{ guild.config.colors.primary }}</span>
             </div>
             <p v-else class="text-xl font-bold text-muted">(Non définie)</p>
           </StatCard>
        </div>

        <div class="bg-surface border border-border rounded-xl p-6 shadow-sm">
          <h3 class="text-lg font-semibold text-white mb-6">État des Fonctionnalités</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <FeatureStatusCard featureName="Logs" :status="guild.features?.logs?.enabled" :details="guild.features?.logs?.channel ? `# ${getChannelName(guild.features.logs.channel)}` : 'Canal non défini'" />
            <FeatureStatusCard featureName="Voc Gaming" :status="guild.features?.vocGaming?.enabled" :details="guild.features?.vocGaming?.channelToJoin ? `Salon à rejoindre: ${getChannelName(guild.features.vocGaming.channelToJoin)}` : 'Canal non défini'" />
            <FeatureStatusCard featureName="Chat Gaming" :status="guild.features?.chatGaming?.enabled" :details="guild.features?.chatGaming?.channelId ?  `Forum: ${getChannelName(guild.features.chatGaming.channelId)}` : 'Canal non défini'" />
            <FeatureStatusCard featureName="Leveling" :status="guild.features?.leveling?.enabled" :details="guild.features?.leveling?.taux ? `Taux XP: x${guild.features.leveling.taux}` : ''" />
            <FeatureStatusCard featureName="Anniversaires" :status="!!guild.config?.channels?.birthday" :details="guild.config?.channels?.birthday ? `# ${getChannelName(guild.config.channels.birthday)}` : 'Canal non défini'" />
            <FeatureStatusCard featureName="Suggestions" :status="guild.features?.suggestions?.enabled" :details="guild.features?.suggestions?.channelCount ? `${guild.features.suggestions.channelCount} channels configurés` : 'Aucun channel configuré'" />
          </div>
        </div>
      </div>

      <!-- Leaderboard Area -->
      <div class="lg:col-span-1 h-full min-h-[400px]">
        <GuildUserLeaderboard :guildId="guildId" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import StatCard from '../../components/ui/StatCard.vue'
import GuildUserLeaderboard from '../../components/guild/GuildUserLeaderboard.vue'

// A simple component for feature status, could be in its own file
const FeatureStatusCard = {
  props: { featureName: String, status: Boolean, details: String },
  template: `
    <div class="bg-surface-hover/50 border border-border p-4 rounded-lg transition-colors hover:border-border-hover">
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-sm font-medium text-white">{{ featureName }}</h4>
        <div :class="status ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'" class="px-1.5 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide">
          {{ status ? 'ON' : 'OFF' }}
        </div>
      </div>
      <p v-if="details" class="text-xs text-muted truncate" :title="details">{{ details }}</p>
    </div>
  `
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const guild = ref<any>(null) // Will hold the full IGuild structure from Guild.ts
const loading = ref(true)
const initialGuildsLoadAttempted = ref(false)

const guildId = computed(() => route.params.id as string)

const attemptToFindGuild = () => {
  if (!guildId.value) { loading.value = false; return; }

  if (authStore.guilds.length === 0) {
    if(initialGuildsLoadAttempted.value) { loading.value = false; guild.value = null; }
    return;
  }

  const foundGuild = authStore.guilds.find(g => g.id === guildId.value)
  if (foundGuild) {
    guild.value = foundGuild // This should be the full guild object from authStore
  } else {
    console.warn(`GuildFeaturesView: Guild with ID ${guildId.value} not found in store.`)
    guild.value = null
  }
  loading.value = false
}


const formatDate = (dateString: string | Date) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Placeholder - in a real app, you'd fetch channel names or have them in guild data
const getChannelName = (channelId: string) => channelId;

onMounted(() => {
  if (!authStore.isAuthenticated) { router.replace('/'); return; }
  if (authStore.guilds.length > 0) {
    initialGuildsLoadAttempted.value = true;
    attemptToFindGuild()
  } else {
    // Watcher will handle it if guilds are not yet loaded
  }
})

watch(guildId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    loading.value = true; guild.value = null; initialGuildsLoadAttempted.value = false;
    if (authStore.guilds.length > 0) {
      initialGuildsLoadAttempted.value = true;
      attemptToFindGuild()
    }
  }
})

watch(() => authStore.guilds, (newGuilds) => {
  if (newGuilds && !guild.value) {
    initialGuildsLoadAttempted.value = true;
    attemptToFindGuild()
  }
}, { deep: true, immediate: authStore.guilds.length > 0 });

</script> 