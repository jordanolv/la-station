import { ChannelType, VoiceState } from 'discord.js';
import { BotClient } from '../../bot/client';
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
      channelCount: 0,
      channelStats: []
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
  static async addChannel(guildId: string, channelId: string, createdBy?: string): Promise<IVocManager | null> {
    const vocManagerData = await this.getVocManager(guildId);
    if (!vocManagerData) return null;

    vocManagerData.createdChannels.push(channelId);
    vocManagerData.channelCount += 1;
    
    // Ajouter les statistiques du canal
    if (createdBy) {
      vocManagerData.channelStats.push({
        channelId,
        createdAt: new Date(),
        createdBy,
        totalUsers: 0,
        sessionDuration: 0,
        lastActivity: new Date()
      });
    }
    
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
    
    // Supprimer aussi les stats du canal
    vocManagerData.channelStats = vocManagerData.channelStats.filter(
      (stat) => stat.channelId !== channelId
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
    nameTemplate: string = '🎮 {username} #{count}'
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

  /**
   * Gère l'événement quand un utilisateur rejoint un canal vocal
   */
  static async handleUserJoinChannel(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    try {
      // Ignorer les bots
      if (newState.member?.user.bot) return;
      
      const guildId = newState.guild.id;
      
      // Récupérer la configuration du gestionnaire de canaux vocaux
      const vocManager = await this.getVocManager(guildId);
      if (!vocManager || !vocManager.enabled) return;
      
      // Vérifier si le canal rejoint est un canal de jointure
      const joinChannel = vocManager.joinChannels.find(channel => channel.id === newState.channelId);
      
      if (joinChannel) {
        // Créer un nouveau canal vocal
        const username = newState.member?.user.username || 'Utilisateur';
        const channelNumber = vocManager.channelCount + 1;
        
        let channelName = joinChannel.nameTemplate
          .replace('{username}', username)
          .replace('{count}', channelNumber.toString())
          .replace('{total}', channelNumber.toString());
        
        try {
          // Créer le canal vocal
          const newChannel = await newState.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: joinChannel.category,
          });
          
          // Déplacer l'utilisateur dans le nouveau canal
          if (newState.member && newState.member.voice.channel) {
            await newState.member.voice.setChannel(newChannel).catch(error => {
              console.error('Erreur lors du déplacement de l\'utilisateur:', error);
            });
          }
          
          // Mettre à jour la base de données
          await this.addChannel(guildId, newChannel.id, newState.member?.user.id);
          
          console.log(`[VocManager] Canal vocal créé: ${newChannel.name} pour ${username}`);
        } catch (error) {
          console.error('Erreur lors de la création du canal vocal:', error);
        }
      }
    } catch (error) {
      console.error('Erreur dans handleUserJoinChannel:', error);
    }
  }

  /**
   * Gère l'événement quand un utilisateur quitte un canal vocal
   */
  static async handleUserLeaveChannel(client: BotClient, oldState: VoiceState, newState: VoiceState): Promise<void> {
    try {
      // Ignorer les bots
      if (oldState.member?.user.bot) return;
      
      const guildId = oldState.guild.id;
      
      // Récupérer la configuration du gestionnaire de canaux vocaux
      const vocManager = await this.getVocManager(guildId);
      if (!vocManager || !vocManager.enabled) return;
      
      // Vérifier si le canal quitté est un canal créé par le gestionnaire
      if (vocManager.createdChannels.includes(oldState.channelId || '')) {
        const channel = oldState.channel;
        
        // Si le canal est vide, le supprimer
        if (channel && channel.members.size === 0) {
          try {
            await channel.delete();
            
            // Mettre à jour la base de données
            await this.removeChannel(guildId, oldState.channelId || '');
            
            console.log(`[VocManager] Canal vocal supprimé: ${channel.name}`);
          } catch (error) {
            console.error('Erreur lors de la suppression du canal vocal:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erreur dans handleUserLeaveChannel:', error);
    }
  }
} 