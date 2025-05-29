import VocManagerModel, { IVocManager, IJoinChannel } from './vocManager.model';

export class VocManagerService {
  /**
   * Récupère la configuration VocManager pour une guilde
   */
  static async getVocManager(guildId: string): Promise<IVocManager | null> {
    return VocManagerModel.findOne({ guildId });
  }

  /**
   * Crée une configuration VocManager pour une guilde
   */
  static async createVocManager(
    guildId: string, 
    enabled: boolean = false
  ): Promise<IVocManager> {
    return VocManagerModel.create({
      guildId,
      enabled,
      joinChannels: [],
      createdChannels: [],
      channelCount: 0
    });
  }

  /**
   * Récupère ou crée une configuration VocManager pour une guilde
   */
  static async getOrCreateVocManager(
    guildId: string, 
    enabled: boolean = false
  ): Promise<IVocManager> {
    const vocManager = await this.getVocManager(guildId);
    if (vocManager) {
      return vocManager;
    }
    
    return this.createVocManager(guildId, enabled);
  }

  /**
   * Ajoute un canal à la liste des canaux créés
   */
  static async addChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const vocManagerData = await this.getVocManager(guildId);
    if (!vocManagerData) return null;

    vocManagerData.createdChannels.push(channelId);
    vocManagerData.channelCount += 1;
    return vocManagerData.save();
  }

  /**
   * Supprime un canal de la liste des canaux créés
   */
  static async removeChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const vocManagerData = await this.getVocManager(guildId);
    if (!vocManagerData) return null;

    vocManagerData.createdChannels = vocManagerData.createdChannels.filter(
      (id: string) => id !== channelId
    );
    
    return vocManagerData.save();
  }

  /**
   * Ajoute un canal de jointure avec ses paramètres
   */
  static async addJoinChannel(
    guildId: string, 
    channelId: string, 
    category: string,
    nameTemplate: string = '🎮 {username}'
  ): Promise<IVocManager | null> {
    const vocManagerData = await this.getVocManager(guildId);
    if (!vocManagerData) return null;

    // Vérifier si ce canal existe déjà
    const existingIndex = vocManagerData.joinChannels.findIndex(channel => channel.id === channelId);
    
    if (existingIndex !== -1) {
      // Mettre à jour le canal existant
      vocManagerData.joinChannels[existingIndex] = {
        id: channelId,
        nameTemplate,
        category,
      };
    } else {
      // Ajouter un nouveau canal
      // @ts-ignore - Le schéma nécessite 'category' mais l'interface ne le déclare pas
      vocManagerData.joinChannels.push({
        id: channelId,
        nameTemplate,
        category,
      });
    }

    return vocManagerData.save();
  }

  /**
   * Supprime un canal de jointure
   */
  static async removeJoinChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const vocManagerData = await this.getVocManager(guildId);
    if (!vocManagerData) return null;

    vocManagerData.joinChannels = vocManagerData.joinChannels.filter(
      channel => channel.id !== channelId
    );
    
    return vocManagerData.save();
  }

  /**
   * Modifie les paramètres d'un canal de jointure spécifique
   */
  static async updateJoinChannelSettings(
    guildId: string, 
    channelId: string, 
    nameTemplate?: string,
    category?: string
  ): Promise<IVocManager | null> {
    const vocManagerData = await this.getVocManager(guildId);
    if (!vocManagerData) return null;

    const channelIndex = vocManagerData.joinChannels.findIndex(channel => channel.id === channelId);
    if (channelIndex === -1) return null;

    if (nameTemplate !== undefined) {
      vocManagerData.joinChannels[channelIndex].nameTemplate = nameTemplate;
    }
    
    if (category !== undefined) {
      // @ts-ignore - Le schéma nécessite 'category' mais l'interface ne le déclare pas
      vocManagerData.joinChannels[channelIndex].category = category;
    }

    return vocManagerData.save();
  }

  /**
   * Active ou désactive la fonctionnalité
   */
  static async toggleFeature(guildId: string, enabled: boolean): Promise<IVocManager | null> {
    const vocManagerData = await this.getVocManager(guildId);
    if (!vocManagerData) return null;

    vocManagerData.enabled = enabled;
    return vocManagerData.save();
  }

  /**
   * Récupère les paramètres d'un canal de jointure spécifique
   */
  static async getJoinChannelSettings(
    guildId: string, 
    channelId: string
  ): Promise<IJoinChannel | null> {
    const vocManagerData = await this.getVocManager(guildId);
    if (!vocManagerData) return null;

    const joinChannel = vocManagerData.joinChannels.find(channel => channel.id === channelId);
    return joinChannel || null;
  }
} 