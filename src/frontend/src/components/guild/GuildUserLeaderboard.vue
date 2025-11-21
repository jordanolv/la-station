<template>
  <div class="bg-surface border border-border p-6 rounded-xl shadow-sm h-full flex flex-col">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-semibold text-white">🏆 Leaderboard</h3>
      <span class="text-xs text-muted bg-surface-hover px-2 py-1 rounded border border-border">Top Members</span>
    </div>

    <div v-if="loading" class="flex-1 flex flex-col items-center justify-center py-10 space-y-3">
      <div class="w-6 h-6 border-2 border-border border-t-white rounded-full animate-spin"></div>
      <p class="text-sm text-muted">Chargement du classement...</p>
    </div>

    <div v-else-if="error" class="flex-1 flex flex-col items-center justify-center py-10 text-center">
      <div class="text-red-400 mb-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
      </div>
      <p class="text-sm text-muted">{{ error }}</p>
    </div>

    <div v-else-if="users.length === 0" class="flex-1 flex flex-col items-center justify-center py-10 text-center">
      <p class="text-sm text-muted">Aucun utilisateur à afficher dans le classement pour le moment.</p>
    </div>

    <ul v-else class="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
      <li v-for="(user, index) in users" :key="user.discordId" 
        class="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors group border border-transparent hover:border-border"
      >
        <div class="flex items-center gap-4">
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-surface-hover border border-border text-sm font-bold text-muted group-hover:text-white transition-colors">
            {{ index + 1 }}
          </div>
          <div>
            <p class="text-sm font-medium text-white group-hover:text-accent transition-colors">{{ user.name }}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-xs text-muted bg-surface-hover px-1.5 py-0.5 rounded">Lvl {{ user.profil.lvl }}</span>
              <span class="text-xs text-muted">{{ user.profil.exp }} XP</span>
            </div>
          </div>
        </div>
        <div class="text-right">
          <p class="text-xs font-medium text-white">{{ user.stats.totalMsg }} msgs</p>
          <p class="text-[10px] text-muted uppercase tracking-wide mt-0.5">{{ formatVoiceTime(user.stats.voiceTime) }} vocal</p>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, PropType, watch } from 'vue';
import axios, { AxiosError } from 'axios';

interface UserProfil {
  money: number;
  exp: number;
  lvl: number;
}

interface UserStats {
  totalMsg: number;
  voiceTime: number; // Assuming this is in seconds or minutes
}

export interface LeaderboardUser { // Exporting for potential use elsewhere
  discordId: string;
  name: string;
  profil: UserProfil;
  stats: UserStats;
  // Add avatar if available from backend
  // avatar?: string;
}


const props = defineProps({
  guildId: {
    type: String as PropType<string>,
    required: true,
  },
});

const users = ref<LeaderboardUser[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const fetchLeaderboard = async () => {
  if (!props.guildId) {
    error.value = "ID du serveur non fourni.";
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const response = await api.get<LeaderboardUser[]>(`/api/guilds/${props.guildId}/leaderboard`);
    users.value = response.data;

  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
    users.value = []; 
    if (api.isAxiosError(err)) {
      const axiosError = err as AxiosError;
      if (axiosError.response?.status === 404) {
        error.value = "Aucune donnée de classement trouvée pour ce serveur.";
      } else {
        error.value = axiosError.message || "Une erreur réseau est survenue.";
      }
    } else {
      error.value = "Une erreur inattendue est survenue.";
    }
  } finally {
    loading.value = false;
  }
};

const formatVoiceTime = (seconds: number = 0) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

// Fetch leaderboard when component is mounted or guildId changes
onMounted(() => {
  fetchLeaderboard();
});

watch(() => props.guildId, (newGuildId, oldGuildId) => {
  if (newGuildId && newGuildId !== oldGuildId) {
    fetchLeaderboard();
  }
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--color-muted);
}
</style> 