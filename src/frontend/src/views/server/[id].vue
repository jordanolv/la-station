<template>
  <div class="server-config-page">
    <div v-if="serverStore.loading && !serverStore.currentServer" class="loading-full-page">
      <p>Chargement de la configuration du serveur...</p>
      <!-- Add a cool spinner/loader here later -->
    </div>

    <div v-else-if="serverStore.error && !serverStore.currentServer" class="error-full-page">
      <p>Erreur: {{ serverStore.error }}</p>
      <button @click="retryLoad">Réessayer</button>
    </div>

    <div v-else-if="serverStore.currentServer" class="server-content-grid">
      <!-- Server Header Card -->
      <header class="server-header-card frosted-glass">
        <div class="server-icon-wrapper">
          <img v-if="serverStore.currentServer.botGuildInfo?.icon" 
               :src="getServerIconUrl()" 
               :alt="serverStore.currentServer.name" 
               class="server-icon" />
          <div v-else class="server-icon placeholder-icon">
            {{ getInitials(serverStore.currentServer.name || '') }}
          </div>
        </div>
        <div class="server-info">
          <h1>{{ serverStore.currentServer.name || 'Configuration du serveur' }}</h1>
          <p class="server-id">ID: {{ serverStore.currentServer.id }}</p>
        </div>
      </header>

      <!-- Features Section -->
      <section class="features-section">
        <h2 class="section-title">Fonctionnalités</h2>
        <div v-if="serverStore.loading && !serverStore.serverFeatures.length" class="loading-features">
          <p>Chargement des fonctionnalités...</p>
        </div>
        <div v-else-if="!serverStore.serverFeatures.length && !serverStore.loading" class="no-features">
            <p>Aucune fonctionnalité disponible pour ce serveur ou en cours de chargement.</p>
        </div>
        <div v-else class="features-grid">
          <FeatureCard 
            v-for="feature in serverStore.serverFeatures" 
            :key="feature.name" 
            :feature="feature"
          />
        </div>
      </section>

      <!-- Placeholder for other sections like stats, activity, etc. -->
      <section class="placeholder-section frosted-glass">
        <h3>Statistiques du serveur</h3>
        <p>Bientôt disponible: Graphiques et données d'utilisation.</p>
      </section>

      <section class="placeholder-section frosted-glass">
        <h3>Activité récente</h3>
        <p>Bientôt disponible: Journal des actions importantes.</p>
      </section>

    </div>

    <div v-else class="no-server-data">
        <p>Aucune donnée de serveur à afficher. Veuillez sélectionner un serveur.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useServerStore } from '../../stores/server.store'
import FeatureCard from '../../components/FeatureCard.vue'

const route = useRoute()
const serverId = computed(() => route.params.serverId as string)
const serverStore = useServerStore()

const getServerIconUrl = (): string => {
  if (!serverStore.currentServer?.botGuildInfo?.icon) return ''
  return `https://cdn.discordapp.com/icons/${serverStore.currentServer.id}/${serverStore.currentServer.botGuildInfo.icon}.png?size=128`
}

const getInitials = (name: string): string => {
  if (!name) return 'S'
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

const retryLoad = () => {
  if (serverId.value) {
    serverStore.loadServerById(serverId.value);
    // Assuming loadServerById also triggers loading of features or serverFeatures is reactive
  }
}

onMounted(async () => {
  if (serverId.value) {
    try {
      await serverStore.loadServerById(serverId.value)
      // Features are expected to be loaded as part of serverStore or reactively
    } catch (serverErr) {
      console.error('Erreur lors du chargement des données du serveur:', serverErr)
    }
  }
})
</script>

<style scoped>
.server-config-page {
  padding: var(--padding-large);
  width: 100%;
  box-sizing: border-box;
}

.loading-full-page, .error-full-page, .no-server-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 4rem); /* Adjust based on potential header/nav height */
  text-align: center;
  color: var(--color-text-secondary);
}

.error-full-page button {
  margin-top: var(--padding-base);
  padding: var(--padding-small) var(--padding-base);
  background-color: var(--color-accent);
  color: var(--color-text-primary);
  border: none;
  border-radius: var(--border-radius-base);
  cursor: pointer;
  font-weight: 500;
}

.server-content-grid {
  display: grid;
  gap: var(--padding-large);
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.server-header-card {
  grid-column: 1 / -1; /* Span full width */
  display: flex;
  align-items: center;
  padding: var(--padding-large);
  gap: var(--padding-base);
}

.server-icon-wrapper {
  flex-shrink: 0;
}

.server-icon {
  width: 80px;
  height: 80px;
  border-radius: var(--border-radius-base);
  object-fit: cover;
  background-color: var(--color-surface-secondary);
}

.placeholder-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-text-primary);
  background-color: var(--color-accent); /* Or a different placeholder color */
}

.server-info h1 {
  font-size: 2rem; /* Slightly smaller than global h1 for page context */
  margin-bottom: 0.25rem;
}

.server-id {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-family: var(--font-monospace);
}

.features-section {
  grid-column: 1 / -1; /* Span full width, or adjust for multi-column layout */
  padding: var(--padding-base);
  background-color: var(--color-surface); /* Optional distinct background for section */
  border-radius: var(--border-radius-base);
}

.section-title {
  font-size: 1.5rem;
  margin-bottom: var(--padding-base);
  padding-bottom: var(--padding-small);
  border-bottom: 1px solid var(--color-border);
}

.loading-features, .no-features {
    text-align: center;
    color: var(--color-text-secondary);
    padding: var(--padding-large) 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--padding-base);
}

.placeholder-section {
    padding: var(--padding-large);
}
.placeholder-section h3 {
    margin-bottom: var(--padding-small);
}
.placeholder-section p {
    color: var(--color-text-secondary);
}
</style> 