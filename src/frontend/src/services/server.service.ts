import { apiService } from './api.service.js';
import { 
  ServerInfo, 
  BotGuildsResponse, 
  Channel, 
  Feature
} from '../types/server.types.js';

/**
 * Service pour gérer les opérations liées aux serveurs
 * Implémente le principe de séparation des préoccupations en isolant la logique spécifique aux serveurs
 */
class ServerService {
  private readonly BASE_PATH = '/api/servers';
  
  /**
   * Récupère la liste des serveurs du bot
   */
  public async getBotServers(): Promise<BotGuildsResponse> {
    try {
      return await apiService.get<BotGuildsResponse>(`${this.BASE_PATH}/public/bot-guilds`);
    } catch (error) {
      console.error('Error fetching bot servers:', error);
      throw this.formatError(error, 'Impossible de récupérer la liste des serveurs');
    }
  }
  
  /**
   * Récupère les détails d'un serveur spécifique
   */
  public async getServerById(serverId: string): Promise<ServerInfo> {
    try {
      if (!serverId) {
        throw new Error('ServerId is required');
      }
      return await apiService.get<ServerInfo>(`${this.BASE_PATH}/${serverId}`);
    } catch (error) {
      console.error(`Error fetching server ${serverId}:`, error);
      throw this.formatError(error, `Impossible de récupérer le serveur ${serverId}`);
    }
  }
  
  /**
   * Active ou désactive une fonctionnalité pour un serveur
   */
  public async toggleFeature(serverId: string, featureId: string, enabled: boolean): Promise<ServerInfo> {
    try {
      if (!serverId || !featureId) {
        throw new Error('ServerId and featureId are required');
      }
      return await apiService.patch<ServerInfo>(
        `${this.BASE_PATH}/${serverId}/features/${featureId}`, 
        { enabled }
      );
    } catch (error) {
      console.error(`Error toggling feature ${featureId} for server ${serverId}:`, error);
      throw this.formatError(error, `Impossible de modifier la fonctionnalité ${featureId}`);
    }
  }
  
  /**
   * Récupère les canaux d'un serveur
   */
  public async getServerChannels(serverId: string): Promise<Channel[]> {
    try {
      if (!serverId) {
        throw new Error('ServerId is required');
      }
      const response = await apiService.get<Channel[]>(`${this.BASE_PATH}/public/${serverId}/channels`);
      return response || [];
    } catch (error) {
      console.error(`Error fetching channels for server ${serverId}:`, error);
      // En cas d'erreur, retourner un tableau vide plutôt que de propager l'erreur
      return [];
    }
  }

  /**
   * Transforme les features du serveur en tableau avec un format cohérent
   */
  public mapFeaturesToArray(serverInfo: ServerInfo): Feature[] {
    if (!serverInfo?.features) return [];
    
    return Object.entries(serverInfo.features).map(([name, config]) => ({
      name,
      serverId: serverInfo.id,
      ...config
    }));
  }

  /**
   * Formate les erreurs pour une meilleure gestion côté client
   */
  private formatError(error: any, defaultMessage: string): Error {
    if (error?.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    return new Error(error instanceof Error ? error.message : defaultMessage);
  }
}

// Export une instance singleton
export const serverService = new ServerService(); 