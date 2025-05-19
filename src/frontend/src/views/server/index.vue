<template>
  <div class="servers-view-page">
    <header class="page-header">
      <h1>Mes Serveurs Discord</h1>
    </header>
    
    <div v-if="loading" class="status-message loading-state frosted-glass">
      <p>Chargement des serveurs...</p>
      <!-- Add a spinner here -->
    </div>
    
    <div v-else-if="error" class="status-message error-state frosted-glass">
      <p>{{ error }}</p>
      <button @click="reloadData" class="action-button">Réessayer</button>
    </div>
    
    <div v-else-if="!adminGuilds.length" class="status-message empty-state frosted-glass">
      <p>Vous n'avez pas de serveurs Discord où vous êtes administrateur.</p>
      <a href="https://discord.com/app" target="_blank" class="action-button discord-link">
        Créer un serveur Discord
      </a>
    </div>

    <div v-else class="servers-content-layout">
      <aside v-if="botInfo" class="bot-status-card frosted-glass">
        <h3>Statut du Bot</h3>
        <div class="status-indicator" :class="{ 
          online: botInfo.isConnected, 
          offline: !botInfo.isConnected 
        }">
          {{ botInfo.isConnected ? 'En ligne' : 'Hors ligne' }}
        </div>
        <p v-if="botInfo.isConnected">
          Connecté en tant que <strong>{{ botInfo.username }}</strong>
          <br>
          Présent sur {{ botInfo.guildCount }} serveur(s)
        </p>
        <p v-else class="error-text">
          {{ botInfo.error || 'Le bot n\'est pas connecté.' }}
        </p>
      </aside>
    
      <main class="servers-main-area">
        <section class="servers-section" v-if="serversWithBot.length">
          <h2>Serveurs avec La Station</h2>
          <div class="servers-grid">
            <div v-for="server in serversWithBot" :key="server.id" class="server-card frosted-glass">
              <div class="server-icon-wrapper">
                <img v-if="server.icon" :src="getGuildIconUrl(server)" :alt="server.name" class="server-icon-img"/>
                <div v-else class="server-icon-img placeholder">
                  {{ getInitials(server.name) }}
                </div>
              </div>
              <span class="server-name">{{ server.name }}</span>
              <router-link :to="`/servers/${server.id}`" class="action-button manage-button">
                Gérer
              </router-link>
            </div>
          </div>
        </section>

        <section class="servers-section" v-if="serversWithoutBot.length">
          <h2>Inviter La Station</h2>
          <div class="servers-grid">
            <div v-for="server in serversWithoutBot" :key="server.id" class="server-card frosted-glass">
               <div class="server-icon-wrapper">
                <img v-if="server.icon" :src="getGuildIconUrl(server)" :alt="server.name" class="server-icon-img"/>
                <div v-else class="server-icon-img placeholder">
                  {{ getInitials(server.name) }}
                </div>
              </div>
              <span class="server-name">{{ server.name }}</span>
              <button @click="inviteBot(server.id)" class="action-button invite-button">
                Inviter le Bot
              </button>
            </div>
          </div>
        </section>
        
        <div class="status-message empty-section-message frosted-glass" v-if="!serversWithBot.length && !serversWithoutBot.length">
          <p>Vous êtes administrateur de serveurs Discord mais La Station n'est disponible sur aucun d'eux pour le moment.</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../../stores/auth.store'
import { computed, ref, onMounted } from 'vue'

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  hasBot?: boolean;
  permissions: number;
}

interface BotInfo {
  isConnected: boolean;
  username?: string;
  avatar?: string;
  guildCount: number;
  error?: string;
  guilds?: { id: string; name: string }[];
}

const authStore = useAuthStore()
const loading = ref(true)
const error = ref('')
const botGuildIds = ref<string[]>([])
const botInfo = ref<BotInfo | null>(null)

const adminGuilds = computed<DiscordGuild[]>(() => {
  return authStore.guilds.map(guild => ({
    ...guild,
    hasBot: botGuildIds.value.includes(guild.id)
  }))
})

const serversWithBot = computed(() => adminGuilds.value.filter(guild => guild.hasBot));
const serversWithoutBot = computed(() => adminGuilds.value.filter(guild => !guild.hasBot));

const getGuildIconUrl = (guild: DiscordGuild): string => {
  if (!guild.icon) return ''
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
}

const getInitials = (name: string): string => {
  if (!name) return 'S';
  return name
    .split(' ')
    .map((word: string) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

const inviteBot = (guildId: string) => {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || 'YOUR_BOT_CLIENT_ID'; // Ensure VITE_ prefix for Vite env vars
  const permissions = '8';
  const scope = 'bot applications.commands';
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=${scope}&guild_id=${guildId}&disable_guild_select=true`;
  window.open(inviteUrl, '_blank');
}

const loadBotServers = async () => {
  error.value = ''; // Reset error before loading
  try {
    const response = await fetch('/api/servers/public/bot-guilds')
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Erreur ${response.status}: ${errorData.message || response.statusText}`)
    }
    const data = await response.json();
    botInfo.value = {
      isConnected: data.isConnected,
      username: data.botUser?.username,
      avatar: data.botUser?.avatar,
      guildCount: data.guilds?.length || 0,
      error: data.error,
      guilds: data.guilds || []
    }
    botGuildIds.value = data.isConnected ? (data.guildIds || []) : [];
  } catch (e) {
    console.error('Erreur lors du chargement des serveurs du bot:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    botInfo.value = {
      isConnected: false,
      guildCount: 0,
      error: errorMessage,
      guilds: []
    };
    // Do not set main error.value here, let loadData handle it if authStore.fetchGuilds also fails
  }
};

const reloadData = async () => {
  loading.value = true;
  error.value = '';
  try {
    await authStore.fetchGuilds();
    await loadBotServers();
    // WORKAROUND logic from original onMounted can be kept if still needed
    if (authStore.guilds.length === 0 && botInfo.value?.isConnected && botInfo.value?.guilds && botInfo.value.guilds.length > 0) {
      const botGuildsFormatted = botInfo.value.guilds.map(g => ({
        id: g.id,
        name: g.name,
        icon: null, // Assuming bot guilds from this source might not have icons readily available in DiscordGuild format
        permissions: 8, 
        hasBot: true
      }));
      // This direct mutation is generally not recommended for Pinia state outside actions.
      // Consider moving this logic into an authStore action if this workaround is permanent.
      // @ts-ignore
      authStore.guilds = botGuildsFormatted;
    }

  } catch (err) {
    console.error('Erreur lors du rechargement des données:', err);
    error.value = 'Impossible de recharger les données. Veuillez réessayer.';
  } finally {
    loading.value = false;
  }
};

onMounted(reloadData);
</script>

<style scoped>
.servers-view-page {
  padding: var(--padding-large);
  color: var(--color-text-primary);
  min-height: 100vh;
}

.page-header {
  text-align: center;
  margin-bottom: var(--padding-large);
}

.page-header h1 {
  font-size: 2.5rem; /* Larger page title */
  color: var(--color-text-primary);
}

.status-message {
  padding: var(--padding-large);
  margin: var(--padding-large) auto;
  text-align: center;
  max-width: 600px; /* Limit width of status messages */
}

.loading-state p,
.error-state p,
.empty-state p,
.empty-section-message p {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  margin-bottom: var(--padding-base);
}

.servers-content-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--padding-large);
}

@media (min-width: 992px) { /* Adjust breakpoint as needed */
  .servers-content-layout {
    grid-template-columns: 280px 1fr; /* Sidebar and main content */
  }
}

.bot-status-card {
  padding: var(--padding-base);
  text-align: center;
}

.bot-status-card h3 {
  font-size: 1.3rem;
  margin-bottom: var(--padding-base);
  color: var(--color-text-primary);
}

.status-indicator {
  padding: 0.4em 0.8em;
  border-radius: var(--border-radius-base);
  font-weight: 500;
  margin-bottom: var(--padding-base);
  display: inline-block;
  font-size: 0.9rem;
}

.status-indicator.online {
  background-color: rgba(76, 175, 80, 0.3); /* Greenish with alpha */
  color: #4CAF50;
}

.status-indicator.offline {
  background-color: rgba(244, 67, 54, 0.3); /* Reddish with alpha */
  color: #f44336;
}

.bot-status-card p {
  font-size: 0.95rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.bot-status-card .error-text {
  color: #f44336; /* Emphasize bot error messages */
}

.servers-main-area {
  display: flex;
  flex-direction: column;
  gap: var(--padding-large);
}

.servers-section h2 {
  font-size: 1.75rem;
  margin-bottom: var(--padding-base);
  color: var(--color-text-primary);
  padding-bottom: var(--padding-small);
  border-bottom: 1px solid var(--color-border);
}

.servers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--padding-base);
}

.server-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--padding-base);
  text-align: center;
  gap: var(--padding-small);
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.server-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-strong);
}

.server-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: var(--border-radius-base); /* Match overall card rounding */
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-surface-secondary); /* BG for placeholder */
}

.server-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.server-icon-img.placeholder {
  color: var(--color-text-primary);
  font-weight: bold;
  font-size: 1.8rem;
  background-color: var(--color-accent); /* Placeholder BG */
}

.server-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-button {
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  border: none;
  transition: background-color 0.2s ease, transform 0.1s ease;
  width: 100%;
  margin-top: auto; /* Pushes button to bottom of flex card */
  font-size: 0.9rem;
}

.action-button:hover {
  transform: scale(1.03);
}

.manage-button {
  background-color: var(--color-accent);
  color: var(--color-text-primary);
}

.manage-button:hover {
  background-color: color-mix(in srgb, var(--color-accent), #fff 10%);
}

.invite-button {
  background-color: #4CAF50; /* A distinct green for invite */
  color: white;
}

.invite-button:hover {
  background-color: color-mix(in srgb, #4CAF50, #000 10%);
}

.discord-link {
    background-color: #5865F2; /* Discord blue */
    color: white;
}
.discord-link:hover {
    background-color: color-mix(in srgb, #5865F2, #000 10%);
}
</style> 