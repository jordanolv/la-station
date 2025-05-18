<template>
  <div class="bg-neutral-800 p-6 rounded-xl shadow-lg h-full flex flex-col">
    <h3 class="text-xl font-semibold text-neutral-100 mb-4">🏆 Leaderboard</h3>
    <div v-if="loading" class="text-center text-neutral-400 py-5">
      <p>Chargement du classement...</p>
    </div>
    <div v-else-if="error" class="text-center text-red-400 py-5">
      <p>Impossible de charger le classement pour le moment.<br/>{{ error }}</p>
    </div>
    <div v-else-if="users.length === 0" class="text-center text-neutral-400 py-5">
      <p>Aucun utilisateur à afficher dans le classement pour le moment.</p>
    </div>
    <ul v-else class="space-y-3 overflow-y-auto flex-1">
      <li v-for="(user, index) in users" :key="user.discordId" class="flex items-center justify-between p-3 bg-neutral-750 rounded-lg">
        <div class="flex items-center">
          <span class="text-lg font-medium text-neutral-300 mr-3">{{ index + 1 }}.</span>
          <div>
            <p class="text-md font-semibold text-white">{{ user.name }}</p>
            <p class="text-xs text-neutral-400">Niv. {{ user.profil.lvl }} - {{ user.profil.exp }} XP</p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-sm text-neutral-200">{{ user.stats.totalMsg }} msgs</p>
          <p class="text-xs text-neutral-400">{{ formatVoiceTime(user.stats.voiceTime) }} vocal</p>
        </div>
      </li>
    </ul>
    <p v-if="!loading && !error && users.length > 0" class="text-xs text-neutral-500 mt-4 text-center">Le classement est mis à jour périodiquement.</p>
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3051';

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
  console.log('API_BASE_URL', API_BASE_URL);
  if (!props.guildId) {
    error.value = "ID du serveur non fourni.";
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    // API endpoint: GET /api/guilds/:guildId/leaderboard
    // This endpoint should return data conforming to LeaderboardUser[]
    // and ideally be sorted by the backend.
    const response = await axios.get<LeaderboardUser[]>(`${API_BASE_URL}/api/guilds/${props.guildId}/leaderboard`);
    // Assuming backend sorts. If not, sort here:
    // users.value = response.data.sort((a, b) => b.profil.lvl - a.profil.lvl || b.profil.exp - a.profil.exp);
    users.value = response.data;

  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
    users.value = []; 
    if (axios.isAxiosError(err)) {
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

// Note: For `bg-neutral-750` to work, ensure it's defined in your tailwind.config.js if it's a custom color.
// e.g., 'neutral-750': '#303030'
</script>

<style scoped>
/* Styling for scrollbar if needed, e.g. */
/* 
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #4f4f4f; 
  border-radius: 3px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background-color: transparent;
}
*/
</style> 