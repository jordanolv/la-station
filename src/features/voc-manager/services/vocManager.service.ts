import { ChannelType, VoiceState } from 'discord.js';
import { BotClient } from '../../../bot/client';
import { IVocManager, IVocManagerDoc, IJoinChannel } from '../models/vocManagerConfig.model';
import GuildModel from '../../discord/models/guild.model';
import { GuildService } from '../../discord/services/guild.service';

export class VocManagerService {
  /**
   * Récupère la configuration VocManager pour une guilde
   */
  static async getVocManager(guildId: string): Promise<IVocManager | null> {
    const guild = await GuildModel.findOne({ guildId });
    return guild?.features?.vocManager || null;
  }

  /**
   * Crée une configuration VocManager pour une guilde
   */
  static async createVocManager(
    guildId: string, 
    enabled: boolean = false
  ): Promise<IVocManager> {
    const guild = await GuildService.getOrCreateGuild(guildId);

    const vocManagerConfig: IVocManager = {
      enabled,
      joinChannels: [],
      createdChannels: [],
      channelCount: 0
    };

    guild.features = guild.features || {};
    guild.features.vocManager = vocManagerConfig;
    await guild.save();

    return vocManagerConfig;
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
    const guild = await GuildService.getOrCreateGuild(guildId);

    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = {
        enabled: false,
        joinChannels: [],
        createdChannels: [],
        channelCount: 0
      };
    }

    guild.features.vocManager.createdChannels.push(channelId);
    guild.features.vocManager.channelCount += 1;
    
    await guild.save();
    return guild.features.vocManager;
  }

  /**
   * Supprime un canal de la liste des canaux créés
   */
  static async removeChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
    const guild = await GuildService.getOrCreateGuild(guildId);

    if (!guild.features?.vocManager) return null;

    guild.features.vocManager.createdChannels = guild.features.vocManager.createdChannels.filter(
      (id: string) => id !== channelId
    );
    
    await guild.save();
    return guild.features.vocManager;
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
<<<<<<< Updated upstream
    const guild = await GuildModel.findOne({ guildId });
    if (!guild?.features?.vocManager) return null;

    const vocManagerData = guild.features.vocManager;
=======
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = {
        enabled: false,
        joinChannels: [],
        createdChannels: [],
        channelCount: 0
      };
    }
>>>>>>> Stashed changes

    // Vérifier si ce canal existe déjà
    const existingIndex = guild.features.vocManager.joinChannels.findIndex(channel => channel.id === channelId);
    
    if (existingIndex !== -1) {
      // Mettre à jour le canal existant
      guild.features.vocManager.joinChannels[existingIndex] = {
        id: channelId,
        nameTemplate,
        category,
      };
    } else {
      // Ajouter un nouveau canal
<<<<<<< Updated upstream
      vocManagerData.joinChannels.push({
=======
      guild.features.vocManager.joinChannels.push({
>>>>>>> Stashed changes
        id: channelId,
        nameTemplate,
        category,
      });
    }

    await guild.save();
<<<<<<< Updated upstream
    return vocManagerData;
=======
    return guild.features.vocManager;
>>>>>>> Stashed changes
  }

  /**
   * Supprime un canal de jointure
   */
  static async removeJoinChannel(guildId: string, channelId: string): Promise<IVocManager | null> {
<<<<<<< Updated upstream
    const guild = await GuildModel.findOne({ guildId });
    if (!guild?.features?.vocManager) return null;

    const vocManagerData = guild.features.vocManager;
=======
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features?.vocManager) return null;
>>>>>>> Stashed changes

    guild.features.vocManager.joinChannels = guild.features.vocManager.joinChannels.filter(
      channel => channel.id !== channelId
    );
    
    await guild.save();
<<<<<<< Updated upstream
    return vocManagerData;
=======
    return guild.features.vocManager;
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    const guild = await GuildModel.findOne({ guildId });
    if (!guild?.features?.vocManager) return null;

    const vocManagerData = guild.features.vocManager;
=======
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features?.vocManager) return null;
>>>>>>> Stashed changes

    const channelIndex = guild.features.vocManager.joinChannels.findIndex(channel => channel.id === channelId);
    if (channelIndex === -1) return null;

    if (nameTemplate !== undefined) {
      guild.features.vocManager.joinChannels[channelIndex].nameTemplate = nameTemplate;
    }
    
    if (category !== undefined) {
<<<<<<< Updated upstream
      vocManagerData.joinChannels[channelIndex].category = category;
    }

    await guild.save();
    return vocManagerData;
=======
      guild.features.vocManager.joinChannels[channelIndex].category = category;
    }

    await guild.save();
    return guild.features.vocManager;
>>>>>>> Stashed changes
  }

  /**
   * Active ou désactive la fonctionnalité
   */
  static async toggleFeature(guildId: string, enabled: boolean): Promise<IVocManager | null> {
<<<<<<< Updated upstream
    const guild = await GuildModel.findOne({ guildId });
    if (!guild?.features?.vocManager) return null;
=======
    const guild = await GuildService.getOrCreateGuild(guildId);
    
    if (!guild.features) guild.features = {};
    if (!guild.features.vocManager) {
      guild.features.vocManager = {
        enabled: false,
        joinChannels: [],
        createdChannels: [],
        channelCount: 0
      };
    }
>>>>>>> Stashed changes

    guild.features.vocManager.enabled = enabled;
    await guild.save();
    return guild.features.vocManager;
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
          await this.addChannel(guildId, newChannel.id);
          
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