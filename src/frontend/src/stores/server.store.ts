import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { serverService } from '../services/server.service.js';
import { ServerInfo, BotGuildsResponse, Channel, Feature } from '../types/server.types.js';

/**
 * Store pour gérer l'état des serveurs dans l'application
 * Sépare clairement la gestion d'état (UI) de la logique métier (services)
 */
export const useServerStore = defineStore('server', () => {
  // État
  const botServers = ref<BotGuildsResponse | null>(null);
  const currentServer = ref<ServerInfo | null>(null);
  const serverChannels = ref<Channel[]>([]);
  const features = ref<Feature[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // Getters
  const isConnected = computed(() => botServers.value?.isConnected || false);
  const serversList = computed(() => botServers.value?.guilds || []);
  const guildIds = computed(() => botServers.value?.guildIds || []);
  const botUsername = computed(() => botServers.value?.botUser?.username);
  const serversCount = computed(() => serversList.value.length);
  const serverFeatures = computed(() => features.value);
  
  // Actions
  /**
   * Charge la liste des serveurs du bot
   */
  async function loadBotServers() {
    loading.value = true;
    error.value = null;
    
    try {
      botServers.value = await serverService.getBotServers();
      return botServers.value;
    } catch (err) {
      handleError(err, 'Error loading bot servers');
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  /**
   * Charge les détails d'un serveur spécifique
   */
  async function loadServerById(serverId: string) {
    loading.value = true;
    error.value = null;
    
    try {
      currentServer.value = await serverService.getServerById(serverId);
      
      // Transformer les features en tableau
      if (currentServer.value) {
        features.value = serverService.mapFeaturesToArray(currentServer.value);
      }
      
      return currentServer.value;
    } catch (err) {
      handleError(err, `Error loading server ${serverId}`);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Charge les canaux d'un serveur spécifique
   */
  async function loadServerChannels(serverId: string) {
    loading.value = true;
    error.value = null;
    
    try {
      serverChannels.value = await serverService.getServerChannels(serverId);
      return serverChannels.value;
    } catch (err) {
      // Si erreur 403 (Forbidden) ou 404 (Not Found), on retourne un tableau vide sans propager l'erreur
      const axiosError = err as any;
      if (axiosError.response && (axiosError.response.status === 403 || axiosError.response.status === 404)) {
        console.warn('Accès non autorisé aux canaux du serveur ou serveur non trouvé. Retour d\'un tableau vide.');
        serverChannels.value = [];
        return serverChannels.value;
      }
      
      handleError(err, `Error loading channels for server ${serverId}`);
      throw err;
    } finally {
      loading.value = false;
    }
  }
  
  /**
   * Active ou désactive une fonctionnalité pour un serveur
   */
  async function toggleFeature(serverId: string, featureId: string, enabled: boolean) {
    if (!serverId || !featureId) {
      const errorMsg = 'ServerId and featureId are required';
      error.value = errorMsg;
      throw new Error(errorMsg);
    }
    
    try {
      const result = await serverService.toggleFeature(serverId, featureId, enabled);
      
      // Mettre à jour l'état local si la requête a réussi
      if (currentServer.value && currentServer.value.features) {
        if (!currentServer.value.features[featureId]) {
          currentServer.value.features[featureId] = { enabled };
        } else {
          currentServer.value.features[featureId].enabled = enabled;
        }
        
        // Mettre à jour le tableau des features
        features.value = serverService.mapFeaturesToArray(currentServer.value);
      }
      
      return result;
    } catch (err) {
      handleError(err, `Error toggling feature ${featureId}`);
      throw err;
    }
  }
  
  /**
   * Gestion centralisée des erreurs
   */
  function handleError(err: any, context: string) {
    console.error(`${context}:`, err);
    error.value = err instanceof Error ? err.message : 'Une erreur est survenue';
  }
  
  // Réinitialiser le store
  function reset() {
    botServers.value = null;
    currentServer.value = null;
    serverChannels.value = [];
    features.value = [];
    loading.value = false;
    error.value = null;
  }
  
  return {
    // État
    botServers,
    currentServer,
    serverChannels,
    features,
    loading,
    error,
    
    // Getters
    isConnected,
    serversList,
    guildIds,
    botUsername,
    serversCount,
    serverFeatures,
    
    // Actions
    loadBotServers,
    loadServerById,
    loadServerChannels,
    toggleFeature,
    reset
  };
}); 