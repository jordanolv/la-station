<template>
  <div class="w-full p-4 md:p-8">
    <div v-if="loading && !guild" class="text-center text-neutral-400 py-10">
      <p>Chargement des informations du serveur...</p>
    </div>
    <div v-else-if="!guild" class="text-center text-red-500 py-10">
      <h2 class="text-2xl font-semibold mb-4">Serveur introuvable</h2>
      <p class="text-neutral-400 mb-6">Impossible de trouver les informations pour ce serveur (ID: {{ guildId }}).<br/>Vérifiez l'ID ou que vous avez accès à ce serveur.</p>
      <router-link to="/" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow transition-colors duration-150">Retour à l'accueil</router-link>
    </div>

    <div v-else class="dashboard-grid">
      <!-- Main Stats & Feature Cards -->
      <div class="main-content-area space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Nom du Serveur" :value="guild.name" description="Nom Discord actuel du serveur" />
          <StatCard title="Préfixe du Bot" :value="guild.config?.prefix || 'Non défini'" />
          <StatCard title="Date d'enregistrement">
            <p class="text-3xl font-bold text-white">{{ formatDate(guild.registeredAt) }}</p>
          </StatCard>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
           <StatCard title="Voc Channels Créés" :value="guild.features?.vocGaming?.nbChannelsCreated || 0" description="Nombre de salons vocaux temporaires créés" />
           <StatCard title="Forums Gaming Créés" :value="guild.features?.chatGaming?.nbForumCreated || 0" description="Nombre de forums de jeu créés"/>
           <StatCard title="Couleur Principale">
             <div v-if="guild.config?.colors?.primary" class="flex items-center space-x-2 mt-2">
                <div class="w-8 h-8 rounded border border-neutral-600" :style="{ backgroundColor: guild.config.colors.primary }"></div>
                <span class="text-2xl font-bold text-white">{{ guild.config.colors.primary }}</span>
             </div>
             <p v-else class="text-2xl font-bold text-neutral-500">(Non définie)</p>
           </StatCard>
        </div>

        <div class="bg-neutral-800 p-6 rounded-xl shadow-lg">
          <h3 class="text-xl font-semibold text-neutral-100 mb-4">État des Fonctionnalités</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <FeatureStatusCard featureName="Logs" :status="guild.features?.logs?.enabled" :details="guild.features?.logs?.channel ? `# ${getChannelName(guild.features.logs.channel)}` : 'Canal non défini'" />
            <FeatureStatusCard featureName="Voc Gaming" :status="guild.features?.vocGaming?.enabled" :details="guild.features?.vocGaming?.channelToJoin ? `Salon à rejoindre: ${getChannelName(guild.features.vocGaming.channelToJoin)}` : 'Canal non défini'" />
            <FeatureStatusCard featureName="Chat Gaming" :status="guild.features?.chatGaming?.enabled" :details="guild.features?.chatGaming?.channelId ?  `Forum: ${getChannelName(guild.features.chatGaming.channelId)}` : 'Canal non défini'" />
            <FeatureStatusCard featureName="Leveling" :status="guild.features?.leveling?.enabled" :details="guild.features?.leveling?.taux ? `Taux XP: x${guild.features.leveling.taux}` : ''" />
            <FeatureStatusCard featureName="Anniversaires" :status="!!guild.config?.channels?.birthday" :details="guild.config?.channels?.birthday ? `# ${getChannelName(guild.config.channels.birthday)}` : 'Canal non défini'" />
          </div>
        </div>

         <!-- You can add more StatCard or custom cards here -->
         <!-- Example: 
         <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard title="Voc Gaming Channels Créés" :value="guild.features?.vocGaming?.nbChannelsCreated || 0" />
            <StatCard title="Forums Chat Gaming Créés" :value="guild.features?.chatGaming?.nbForumCreated || 0" />
         </div>
         -->
      </div>

      <!-- Leaderboard Area -->
      <div class="leaderboard-area">
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
    <div class="bg-neutral-750 p-4 rounded-lg shadow">
      <h4 class="text-md font-semibold text-neutral-200">{{ featureName }}</h4>
      <p :class="status ? 'text-green-400' : 'text-red-400'" class="text-sm font-medium">{{ status ? 'Activé' : 'Désactivé' }}</p>
      <p v-if="details" class="text-xs text-neutral-400 mt-1">{{ details }}</p>
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

const goHome = () => { router.push('/') }

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

<style scoped>
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr)); /* Single column on small screens */
  gap: 1.5rem; /* 24px */
}

@media (min-width: 1024px) { /* lg breakpoint */
  .dashboard-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr)); /* Three columns on large screens */
  }
  .main-content-area {
    grid-column: span 2 / span 2; /* Main content takes 2 columns */
  }
  .leaderboard-area {
    grid-column: span 1 / span 1; /* Leaderboard takes 1 column */
  }
}

/* Ensure cards within the main content area's grid take full width */
.main-content-area .grid > * {
  width: 100%;
}
</style> 